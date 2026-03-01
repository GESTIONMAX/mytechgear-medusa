/**
 * Migration: Populate Price Sets for All Variants
 *
 * Ensures all product variants have price sets with default pricing.
 * Default: 29.99 EUR for variants without prices.
 *
 * Usage:
 *   npx tsx src/scripts/migrate-price-sets.ts --dry-run  # Preview changes
 *   npx tsx src/scripts/migrate-price-sets.ts --apply    # Apply changes
 */

import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { MedusaApp } from "@medusajs/framework/utils";
import { setVariantPrice, getVariantPrices, formatPrice } from "../lib/pricing";
import { PRICING_CONSTRAINTS } from "../types/pricing";

interface MigrationStats {
  total_variants: number
  with_prices: number
  without_prices: number
  created_prices: number
  errors: number
}

const DEFAULT_PRICE = 2999; // 29.99 EUR in cents
const DEFAULT_CURRENCY = PRICING_CONSTRAINTS.DEFAULT_CURRENCY;

async function migratePriceSets(dryRun: boolean = true) {
  console.log('🚀 Starting price sets migration...\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '✅ APPLY (writing to database)'}\n`);

  const stats: MigrationStats = {
    total_variants: 0,
    with_prices: 0,
    without_prices: 0,
    created_prices: 0,
    errors: 0,
  };

  try {
    const { modules } = await MedusaApp({
      workDir: process.cwd(),
    });

    const productService = modules[Modules.PRODUCT];
    const pricingService = modules[Modules.PRICING];

    if (!productService) {
      throw new Error('Product module not available');
    }

    if (!pricingService) {
      throw new Error('Pricing module not available');
    }

    console.log('📦 Connected to Medusa modules\n');

    // Fetch all variants
    console.log('🔎 Fetching all product variants...');
    const variants = await productService.listVariants({}, {
      relations: ['product'],
      take: 1000, // Adjust if you have more than 1000 variants
    });

    stats.total_variants = variants.length;
    console.log(`✅ Found ${stats.total_variants} variants\n`);

    // Process each variant
    for (const variant of variants) {
      const variantTitle = `${variant.product?.title || 'Unknown'} - ${variant.title}`;

      try {
        // Check if variant has prices
        const existingPrices = await getVariantPrices(pricingService, variant.id);

        if (existingPrices.length > 0) {
          stats.with_prices++;
          console.log(`✓ ${variantTitle}`);
          console.log(`  Already has ${existingPrices.length} price(s):`);
          existingPrices.forEach(price => {
            console.log(`    - ${formatPrice(price.amount, price.currency_code as any)}`);
          });
          console.log('');
          continue;
        }

        // No prices - needs migration
        stats.without_prices++;
        console.log(`⚠️  ${variantTitle}`);
        console.log(`  Missing prices`);

        if (!dryRun) {
          // Create default price
          await setVariantPrice(
            pricingService,
            variant.id,
            DEFAULT_CURRENCY,
            DEFAULT_PRICE
          );

          stats.created_prices++;
          console.log(`  ✅ Created default price: ${formatPrice(DEFAULT_PRICE, DEFAULT_CURRENCY)}`);
        } else {
          console.log(`  🔍 Would create: ${formatPrice(DEFAULT_PRICE, DEFAULT_CURRENCY)} (dry run)`);
        }

        console.log('');

      } catch (error: any) {
        stats.errors++;
        console.error(`❌ Error processing ${variantTitle}:`, error.message);
        console.log('');
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total variants:           ${stats.total_variants}`);
    console.log(`Already have prices:      ${stats.with_prices} (${((stats.with_prices / stats.total_variants) * 100).toFixed(1)}%)`);
    console.log(`Missing prices:           ${stats.without_prices} (${((stats.without_prices / stats.total_variants) * 100).toFixed(1)}%)`);

    if (!dryRun) {
      console.log(`\n✅ Prices created:        ${stats.created_prices}`);
    } else {
      console.log(`\n🔍 Would create:          ${stats.without_prices} prices`);
    }

    if (stats.errors > 0) {
      console.log(`❌ Errors:                ${stats.errors}`);
    }

    console.log('='.repeat(60));

    if (dryRun && stats.without_prices > 0) {
      console.log('\n💡 To apply these changes, run:');
      console.log('   npx tsx src/scripts/migrate-price-sets.ts --apply\n');
    } else if (!dryRun && stats.created_prices > 0) {
      console.log('\n✅ Migration complete!\n');
      console.log(`Created ${stats.created_prices} default prices at ${formatPrice(DEFAULT_PRICE, DEFAULT_CURRENCY)}`);
      console.log('You can now update prices via the admin API or dashboard.\n');
    } else if (stats.without_prices === 0) {
      console.log('\n✅ All variants already have prices - nothing to do!\n');
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = !args.includes('--apply');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Price Sets Migration Script

Usage:
  npx tsx src/scripts/migrate-price-sets.ts [options]

Options:
  --dry-run    Preview changes without applying (default)
  --apply      Apply changes to database
  --help       Show this help message

Examples:
  npx tsx src/scripts/migrate-price-sets.ts                # Dry run (preview)
  npx tsx src/scripts/migrate-price-sets.ts --dry-run      # Explicit dry run
  npx tsx src/scripts/migrate-price-sets.ts --apply        # Apply migration

Default price: ${formatPrice(DEFAULT_PRICE, DEFAULT_CURRENCY)}
  `);
  process.exit(0);
}

migratePriceSets(isDryRun).catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
