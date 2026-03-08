/**
 * Catalog Health Audit Script
 *
 * Validates catalog integrity and pricing layer
 */

import { Modules } from "@medusajs/framework/utils";
import { MedusaAppLoader } from "@medusajs/framework";

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
    variants_missing_images: number;
    duplicate_skus: number;
    orphan_price_sets: number;
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

async function main() {
  console.log('🔍 Starting Catalog Health Audit...\n');

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
      variants_missing_images: 0,
      duplicate_skus: 0,
      orphan_price_sets: 0,
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
    // Load Medusa app
    const { container } = await MedusaAppLoader({
      directory: process.cwd(),
    });

    const productService = container.resolve(Modules.PRODUCT);
    const pricingService = container.resolve(Modules.PRICING);

    // =============================================
    // STEP 1: Fetch all products
    // =============================================
    console.log('📦 Fetching products...');

    const products = await productService.listProducts(
      {},
      { relations: ['variants', 'variants.options', 'images'] }
    );

    report.summary.products_count = products.length;
    console.log(`   Found ${products.length} products\n`);

    // =============================================
    // STEP 2: Validate each product and variant
    // =============================================
    console.log('🔎 Validating products and variants...\n');

    const skuMap = new Map<string, string[]>(); // SKU -> variant IDs
    const variantIds: string[] = [];

    for (const product of products) {
      const productIssues: string[] = [];

      // Check product has variants
      if (!product.variants || product.variants.length === 0) {
        issues.push({
          severity: 'error',
          category: 'product',
          message: `Product "${product.title}" has no variants`,
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
            message: `Variant "${variant.title}" in product "${product.title}" has no SKU`,
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
            message: `Variant "${variant.title}" in product "${product.title}" has no canonicalId`,
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
            message: `Variant "${variant.title}" has no options`,
            details: { variant_id: variant.id, sku: variant.sku },
          });
        }
      }

      // Check product images
      if (!product.images || product.images.length === 0) {
        issues.push({
          severity: 'warning',
          category: 'product',
          message: `Product "${product.title}" has no images`,
          details: { product_id: product.id },
        });
      }

      report.products.push({
        id: product.id,
        title: product.title,
        variants_count: product.variants?.length || 0,
        has_issues: productIssues.length > 0,
      });
    }

    // =============================================
    // STEP 3: Check for duplicate SKUs
    // =============================================
    console.log('🔍 Checking for duplicate SKUs...');

    for (const [sku, variantIds] of skuMap.entries()) {
      if (variantIds.length > 1) {
        issues.push({
          severity: 'error',
          category: 'sku',
          message: `Duplicate SKU "${sku}" found in ${variantIds.length} variants`,
          details: { sku, variant_ids: variantIds },
        });
        report.summary.duplicate_skus++;
      }
    }
    console.log(`   Found ${report.summary.duplicate_skus} duplicate SKUs\n`);

    // =============================================
    // STEP 4: Validate pricing for all variants
    // =============================================
    console.log('💰 Validating pricing...\n');

    for (const variantId of variantIds) {
      try {
        // Calculate prices for this variant
        const [priceData] = await pricingService.calculatePrices(
          { id: [variantId] },
          {
            context: { currency_code: 'eur' },
          }
        );

        if (!priceData?.calculated_price?.price_set_id) {
          report.summary.variants_missing_prices++;
          issues.push({
            severity: 'error',
            category: 'pricing',
            message: `Variant ${variantId} has no price set`,
            details: { variant_id: variantId },
          });
          continue;
        }

        report.summary.variants_with_prices++;

        // Fetch price set to check currencies
        const priceSet = await pricingService.retrievePriceSet(
          priceData.calculated_price.price_set_id,
          { relations: ['prices'] }
        );

        const currencies = new Set<string>();
        for (const price of priceSet.prices || []) {
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
            message: `Variant ${variantId} missing prices for currencies: ${missingCurrencies.join(', ')}`,
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
          message: `Error checking prices for variant ${variantId}: ${error.message}`,
          details: { variant_id: variantId },
        });
      }
    }

    // =============================================
    // STEP 5: Check for orphan price sets
    // =============================================
    console.log('🗑️  Checking for orphan price sets...');

    // Note: This would require querying all price sets and comparing with variant IDs
    // Skipping for now as it requires more complex query
    console.log('   Skipped (requires additional query)\n');

    // =============================================
    // Final Report
    // =============================================
    report.issues = issues;

    console.log('═══════════════════════════════════════');
    console.log('📊 CATALOG HEALTH REPORT');
    console.log('═══════════════════════════════════════\n');

    console.log('📦 Products:', report.summary.products_count);
    console.log('📦 Variants:', report.summary.variants_count);
    console.log('💰 Variants with prices:', report.summary.variants_with_prices);
    console.log('❌ Variants missing prices:', report.summary.variants_missing_prices);
    console.log('❌ Variants missing SKU:', report.summary.variants_missing_sku);
    console.log('⚠️  Variants missing canonicalId:', report.summary.variants_missing_canonical_id);
    console.log('🔄 Duplicate SKUs:', report.summary.duplicate_skus);
    console.log('\n💱 Currency Coverage:');
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

    // Create reports directory if it doesn't exist
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n✅ Report saved to ${reportPath}`);

    // Print critical issues
    const criticalIssues = issues.filter((i) => i.severity === 'error');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:\n');
      for (const issue of criticalIssues.slice(0, 10)) {
        console.log(`   [${issue.category}] ${issue.message}`);
      }
      if (criticalIssues.length > 10) {
        console.log(`   ... and ${criticalIssues.length - 10} more`);
      }
    }

    console.log('\n═══════════════════════════════════════\n');

    process.exit(criticalIssues.length > 0 ? 1 : 0);
  } catch (error: any) {
    console.error('❌ Audit failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
