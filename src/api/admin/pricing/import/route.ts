/**
 * CSV Import/Export API for Bulk Price Updates
 *
 * POST /admin/pricing/import - Import prices from CSV
 * GET /admin/pricing/export - Export prices to CSV
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import { bulkSetVariantPrices, formatPrice, listVariantsWithPrices } from "../../../../lib/pricing";
import type {
  PriceImportRow,
  PriceExportRow,
  ImportResult,
  SupportedCurrency,
} from "../../../../types/pricing";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface ImportRequest {
  csv_data: string  // Base64 or plain text CSV
  format?: 'base64' | 'text'
  dry_run?: boolean
}

interface ImportResponse {
  result: ImportResult
  dry_run: boolean
}

interface ExportQueryParams {
  product_id?: string
  currency_code?: string
  region_id?: string
}

/**
 * POST /admin/pricing/import
 *
 * Import prices from CSV
 *
 * CSV Format:
 * variant_id,sku,currency_code,amount,region_id,min_quantity,max_quantity
 * variant_123,,eur,2999,,,
 * ,SKU-001,usd,3299,,,
 *
 * Request body:
 * {
 *   "csv_data": "base64_encoded_csv" or "plain text csv",
 *   "format": "base64" | "text",
 *   "dry_run": true  // Preview changes without applying
 * }
 */
export async function POST(
  req: MedusaRequest<ImportRequest>,
  res: MedusaResponse<ImportResponse>
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { csv_data, format = 'text', dry_run = false } = req.body;

    if (!csv_data) {
      return res.status(400).json({
        error: 'Missing required field: csv_data'
      } as any);
    }

    // Decode CSV if base64
    const csvText = format === 'base64'
      ? Buffer.from(csv_data, 'base64').toString('utf-8')
      : csv_data;

    // Parse CSV
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    // Validate headers
    const requiredHeaders = ['currency_code', 'amount'];
    const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));

    if (!hasRequiredHeaders) {
      return res.status(400).json({
        error: 'CSV must have headers: currency_code, amount (and either variant_id or sku)'
      } as any);
    }

    const rows: PriceImportRow[] = [];
    const result: ImportResult = {
      total_rows: lines.length - 1,  // Exclude header
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Parse each row
    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || undefined;
      });

      // Validate row
      if (!row.variant_id && !row.sku) {
        result.errors.push({
          row: lineNum,
          error: 'Missing variant_id or sku',
        });
        result.failed++;
        continue;
      }

      if (!row.currency_code || !row.amount) {
        result.errors.push({
          row: lineNum,
          variant_id: row.variant_id,
          sku: row.sku,
          error: 'Missing currency_code or amount',
        });
        result.failed++;
        continue;
      }

      rows.push({
        variant_id: row.variant_id,
        sku: row.sku,
        currency_code: row.currency_code.toLowerCase(),
        amount: parseInt(row.amount, 10),
        region_id: row.region_id,
        min_quantity: row.min_quantity ? parseInt(row.min_quantity, 10) : undefined,
        max_quantity: row.max_quantity ? parseInt(row.max_quantity, 10) : undefined,
      });
    }

    // Process rows
    if (!dry_run) {
      for (const row of rows) {
        try {
          // Resolve variant_id from SKU if needed
          let variantId = row.variant_id;

          if (!variantId && row.sku) {
            // Query variant by SKU
            try {
              const variants = await productService.listVariants(
                { sku: row.sku },
                { take: 1 }
              );

              if (variants && variants.length > 0) {
                variantId = variants[0].id;
              } else {
                result.errors.push({
                  row: rows.indexOf(row) + 2,
                  sku: row.sku,
                  error: `Variant not found for SKU: ${row.sku}`,
                });
                result.failed++;
                continue;
              }
            } catch (lookupError: any) {
              result.errors.push({
                row: rows.indexOf(row) + 2,
                sku: row.sku,
                error: `SKU lookup failed: ${lookupError.message}`,
              });
              result.failed++;
              continue;
            }
          }

          if (!variantId) {
            result.errors.push({
              row: rows.indexOf(row) + 2,
              error: 'Missing both variant_id and sku',
            });
            result.failed++;
            continue;
          }

          // Set price
          await bulkSetVariantPrices(pricingService, variantId!, [
            {
              currency_code: row.currency_code,
              amount: row.amount,
              min_quantity: row.min_quantity,
              max_quantity: row.max_quantity,
            },
          ]);

          result.successful++;

        } catch (error: any) {
          result.errors.push({
            row: rows.indexOf(row) + 2,
            variant_id: row.variant_id,
            sku: row.sku,
            error: error.message,
          });
          result.failed++;
        }
      }
    } else {
      // Dry run - just validate
      result.successful = rows.length;
    }

    return res.status(200).json({
      result,
      dry_run,
    });

  } catch (error: any) {
    console.error('[CSV Import API] Error importing prices:', error);

    return res.status(500).json({
      error: 'Failed to import prices',
      details: error.message
    } as any);
  }
}

/**
 * GET /admin/pricing/export
 *
 * Export prices to CSV
 *
 * Query params:
 * - product_id: Filter by product (optional)
 * - currency_code: Filter by currency (optional)
 * - region_id: Filter by region (optional)
 *
 * Returns CSV with headers:
 * variant_id,sku,variant_title,product_title,currency_code,amount,formatted_amount,region_id
 */
export async function GET(
  req: MedusaRequest<never, ExportQueryParams>,
  res: MedusaResponse
) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { product_id, currency_code, region_id } = req.query;

    // Fetch variants with prices using our pricing lib
    const variantsWithPrices = await listVariantsWithPrices(
      productService,
      pricingService,
      {
        product_id: product_id as string | undefined,
        currency_code: currency_code as string | undefined,
        offset: 0,
        limit: 5000,  // Export up to 5000 variants
      }
    );

    // Build CSV rows
    const rows: PriceExportRow[] = [];

    for (const variant of variantsWithPrices) {
      // If currency filter is specified, only export that currency
      const pricesToExport = currency_code
        ? variant.prices.filter(p => p.currency_code === (currency_code as string).toLowerCase())
        : variant.prices;

      if (pricesToExport.length === 0) {
        // Include variant even if it has no prices (for easy import later)
        rows.push({
          variant_id: variant.id,
          sku: variant.sku || '',
          variant_title: variant.title,
          product_title: variant.product_title || '',
          currency_code: currency_code as string || 'eur',
          amount: 0,
          region_id: region_id as string,
        });
      } else {
        // Create one row per currency
        for (const price of pricesToExport) {
          rows.push({
            variant_id: variant.id,
            sku: variant.sku || '',
            variant_title: variant.title,
            product_title: variant.product_title || '',
            currency_code: price.currency_code,
            amount: price.amount,
            region_id: region_id as string,
          });
        }
      }
    }

    // Generate CSV
    const headers = ['variant_id', 'sku', 'variant_title', 'product_title', 'currency_code', 'amount', 'formatted_amount', 'region_id'];
    const csvLines = [headers.join(',')];

    for (const row of rows) {
      const formatted = formatPrice(row.amount, row.currency_code as SupportedCurrency);
      csvLines.push([
        row.variant_id,
        row.sku || '',
        `"${row.variant_title}"`,
        `"${row.product_title}"`,
        row.currency_code,
        row.amount.toString(),
        `"${formatted}"`,
        row.region_id || '',
      ].join(','));
    }

    const csv = csvLines.join('\n');

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="prices_export_${Date.now()}.csv"`);
    return res.send(csv);

  } catch (error: any) {
    console.error('[CSV Export API] Error exporting prices:', error);

    return res.status(500).json({
      error: 'Failed to export prices',
      details: error.message
    } as any);
  }
}
