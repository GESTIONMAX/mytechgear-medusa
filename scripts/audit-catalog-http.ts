/**
 * Catalog Health Audit Script (HTTP version)
 *
 * Uses HTTP APIs to validate catalog integrity and pricing layer
 */

interface AuditIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
}

interface CatalogHealthReport {
  timestamp: string;
  summary: {
    products_count: number;
    variants_count: number;
    variants_with_prices: number;
    variants_missing_prices: number;
    variants_missing_sku: number;
    variants_missing_canonical_id: number;
    duplicate_skus: number;
    duplicate_titles: number;
  };
  currencies: {
    configured: string[];
    coverage: Record<string, number>;
  };
  issues: AuditIssue[];
  products: Array<{
    id: string;
    title: string;
    variants_count: number;
    has_issues: boolean;
  }>;
}

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';

async function getAuthToken(): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@mytechgear.com',
      password: 'admin123',
    }),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const data = await response.json();
  return data.session.token;
}

async function fetchProducts(token: string): Promise<any[]> {
  const response = await fetch(`${BACKEND_URL}/admin-api/products?limit=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.statusText}`);
  }

  const data = await response.json();
  return data.products || [];
}

async function fetchPricing(token: string, variantId: string): Promise<any> {
  const response = await fetch(
    `${BACKEND_URL}/admin-api/pricing/${variantId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function main() {
  console.log('🔍 Starting Catalog Health Audit (HTTP)...\n');

  const issues: AuditIssue[] = [];
  const report: CatalogHealthReport = {
    timestamp: new Date().toISOString(),
    summary: {
      products_count: 0,
      variants_count: 0,
      variants_with_prices: 0,
      variants_missing_prices: 0,
      variants_missing_sku: 0,
      variants_missing_canonical_id: 0,
      duplicate_skus: 0,
      duplicate_titles: 0,
    },
    currencies: {
      configured: ['eur', 'usd', 'gbp', 'chf'],
      coverage: {
        eur: 0,
        usd: 0,
        gbp: 0,
        chf: 0,
      },
    },
    issues: [],
    products: [],
  };

  try {
    // =============================================
    // STEP 1: Authenticate
    // =============================================
    console.log('🔐 Authenticating...');
    const token = await getAuthToken();
    console.log('   ✅ Authenticated\n');

    // =============================================
    // STEP 2: Fetch all products
    // =============================================
    console.log('📦 Fetching products...');
    const products = await fetchProducts(token);
    report.summary.products_count = products.length;
    console.log(`   Found ${products.length} products\n`);

    // =============================================
    // STEP 3: Validate each product and variant
    // =============================================
    console.log('🔎 Validating products and variants...\n');

    const skuMap = new Map<string, string[]>();
    const titleMap = new Map<string, string[]>();
    const variantIds: string[] = [];

    for (const product of products) {
      const productIssues: string[] = [];

      // Track product titles for duplicates
      if (!titleMap.has(product.title)) {
        titleMap.set(product.title, []);
      }
      titleMap.get(product.title)!.push(product.id);

      // Check product has variants
      if (!product.variants || product.variants.length === 0) {
        issues.push({
          severity: 'error',
          category: 'product',
          message: `Product "${product.title}" (${product.id}) has no variants`,
          details: { product_id: product.id },
        });
        productIssues.push('no_variants');
      }

      // Validate variants
      for (const variant of product.variants || []) {
        variantIds.push(variant.id);
        report.summary.variants_count++;

        // Check SKU
        if (!variant.sku) {
          issues.push({
            severity: 'error',
            category: 'variant',
            message: `Variant "${variant.title}" in "${product.title}" has no SKU`,
            details: { variant_id: variant.id, product_id: product.id },
          });
          report.summary.variants_missing_sku++;
          productIssues.push('missing_sku');
        } else {
          // Track SKU for duplicate detection
          if (!skuMap.has(variant.sku)) {
            skuMap.set(variant.sku, []);
          }
          skuMap.get(variant.sku)!.push(variant.id);
        }

        // Check canonicalId in metadata
        if (!variant.metadata?.canonicalId) {
          issues.push({
            severity: 'warning',
            category: 'variant',
            message: `Variant "${variant.title}" in "${product.title}" has no canonicalId`,
            details: { variant_id: variant.id, sku: variant.sku },
          });
          report.summary.variants_missing_canonical_id++;
          productIssues.push('missing_canonical_id');
        }

        // Check options
        if (!variant.options || variant.options.length === 0) {
          issues.push({
            severity: 'info',
            category: 'variant',
            message: `Variant "${variant.title}" has no options (may be simple product)`,
            details: { variant_id: variant.id, sku: variant.sku },
          });
        }
      }

      report.products.push({
        id: product.id,
        title: product.title,
        variants_count: product.variants?.length || 0,
        has_issues: productIssues.length > 0,
      });
    }

    // =============================================
    // STEP 4: Check for duplicate SKUs
    // =============================================
    console.log('🔍 Checking for duplicate SKUs...');

    for (const [sku, ids] of skuMap.entries()) {
      if (ids.length > 1) {
        issues.push({
          severity: 'error',
          category: 'sku',
          message: `Duplicate SKU "${sku}" found in ${ids.length} variants`,
          details: { sku, variant_ids: ids },
        });
        report.summary.duplicate_skus++;
      }
    }
    console.log(`   Found ${report.summary.duplicate_skus} duplicate SKUs\n`);

    // =============================================
    // STEP 5: Check for duplicate titles
    // =============================================
    console.log('🔍 Checking for duplicate product titles...');

    for (const [title, ids] of titleMap.entries()) {
      if (ids.length > 1) {
        issues.push({
          severity: 'warning',
          category: 'product',
          message: `Duplicate product title "${title}" found in ${ids.length} products`,
          details: { title, product_ids: ids },
        });
        report.summary.duplicate_titles++;
      }
    }
    console.log(`   Found ${report.summary.duplicate_titles} duplicate titles\n`);

    // =============================================
    // STEP 6: Validate pricing for variants (sample)
    // =============================================
    console.log('💰 Validating pricing (sampling first 30 variants)...\n');

    const sampleVariants = variantIds.slice(0, 30);

    for (const variantId of sampleVariants) {
      try {
        const pricingData = await fetchPricing(token, variantId);

        if (!pricingData || !pricingData.prices || pricingData.prices.length === 0) {
          report.summary.variants_missing_prices++;
          issues.push({
            severity: 'error',
            category: 'pricing',
            message: `Variant ${variantId} has no prices`,
            details: { variant_id: variantId },
          });
          continue;
        }

        report.summary.variants_with_prices++;

        // Count currency coverage
        const currencies = new Set<string>();
        for (const price of pricingData.prices) {
          currencies.add(price.currency_code);

          if (report.currencies.coverage[price.currency_code] !== undefined) {
            report.currencies.coverage[price.currency_code]++;
          }
        }

        // Check if all required currencies are present
        const missingCurrencies = report.currencies.configured.filter(
          (c) => !currencies.has(c)
        );

        if (missingCurrencies.length > 0) {
          issues.push({
            severity: 'warning',
            category: 'pricing',
            message: `Variant ${variantId} missing prices for: ${missingCurrencies.join(', ')}`,
            details: {
              variant_id: variantId,
              has_currencies: Array.from(currencies),
              missing_currencies: missingCurrencies,
            },
          });
        }
      } catch (error: any) {
        issues.push({
          severity: 'error',
          category: 'pricing',
          message: `Error checking prices for ${variantId}: ${error.message}`,
          details: { variant_id: variantId },
        });
      }
    }

    console.log(`   Checked ${sampleVariants.length}/${variantIds.length} variants`);
    console.log(`   (Full pricing audit would check all ${variantIds.length} variants)\n`);

    // =============================================
    // Final Report
    // =============================================
    report.issues = issues;

    console.log('═══════════════════════════════════════');
    console.log('📊 CATALOG HEALTH REPORT');
    console.log('═══════════════════════════════════════\n');

    console.log('📦 Products:', report.summary.products_count);
    console.log('📦 Variants:', report.summary.variants_count);
    console.log('💰 Variants with prices (sampled):', report.summary.variants_with_prices);
    console.log('❌ Variants missing prices (sampled):', report.summary.variants_missing_prices);
    console.log('❌ Variants missing SKU:', report.summary.variants_missing_sku);
    console.log('⚠️  Variants missing canonicalId:', report.summary.variants_missing_canonical_id);
    console.log('🔄 Duplicate SKUs:', report.summary.duplicate_skus);
    console.log('🔄 Duplicate titles:', report.summary.duplicate_titles);
    console.log('\n💱 Currency Coverage (sampled):');
    for (const [currency, count] of Object.entries(report.currencies.coverage)) {
      console.log(`   ${currency.toUpperCase()}: ${count} variants`);
    }

    console.log(`\n⚠️  Total Issues: ${issues.length}`);
    console.log(`   Errors: ${issues.filter((i) => i.severity === 'error').length}`);
    console.log(`   Warnings: ${issues.filter((i) => i.severity === 'warning').length}`);
    console.log(`   Info: ${issues.filter((i) => i.severity === 'info').length}`);

    // Save report
    const fs = require('fs');
    const reportPath = 'reports/catalog-health.json';

    // Create reports directory
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to ${reportPath}`);

    // Print critical issues
    const criticalIssues = issues.filter((i) => i.severity === 'error');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:\n');
      for (const issue of criticalIssues.slice(0, 15)) {
        console.log(`   [${issue.category}] ${issue.message}`);
      }
      if (criticalIssues.length > 15) {
        console.log(`   ... and ${criticalIssues.length - 15} more`);
      }
    }

    console.log('\n═══════════════════════════════════════\n');

    const hasErrors = criticalIssues.length > 0;
    console.log(hasErrors ? '❌ Catalog has critical issues' : '✅ Catalog is healthy');

    process.exit(hasErrors ? 1 : 0);
  } catch (error: any) {
    console.error('❌ Audit failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
