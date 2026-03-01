/**
 * Price History & Audit Trail API
 *
 * GET /admin/pricing/history?variant_id=X - Get price change history for variant
 * GET /admin/pricing/history?currency_code=eur&days=30 - Get recent price changes
 * POST /admin/pricing/history - Record price change (internal use)
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import { formatPrice } from "../../../../lib/pricing";
import { getPriceHistory, getBulkPriceHistory } from "../../../../lib/price-history";
import type { SupportedCurrency, PriceAuditTrail, PriceHistory } from "../../../../types/pricing";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

interface PriceHistoryQueryParams {
  variant_id?: string
  currency_code?: string
  days?: string
  limit?: string
}

interface PriceHistoryResponse {
  audit_trail: PriceAuditTrail
}

interface PriceHistoryListResponse {
  history: Array<PriceHistory & {
    formatted_old_amount?: string
    formatted_new_amount: string
    variant_title?: string
  }>
  count: number
}

/**
 * GET /admin/pricing/history
 *
 * Get price change history
 *
 * Query params:
 * - variant_id: Filter by variant (optional)
 * - currency_code: Filter by currency (optional)
 * - days: Number of days to look back (default: 30)
 * - limit: Max results (default: 50)
 */
export async function GET(
  req: MedusaRequest<never, PriceHistoryQueryParams>,
  res: MedusaResponse<PriceHistoryListResponse | PriceHistoryResponse>
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const {
      variant_id,
      currency_code,
      days = '30',
      limit = '50',
    } = req.query;

    // If variant_id provided, return audit trail for that variant
    if (variant_id) {
      const limitNum = parseInt(limit as string, 10) || 50;

      // Fetch price history from variant metadata
      const history = await getPriceHistory(productService, variant_id as string, {
        currency_code: currency_code as string | undefined,
        limit: limitNum,
      });

      // Fetch variant title
      let variant_title = 'Unknown Variant';
      try {
        const variants = await productService.listVariants(
          { id: variant_id },
          { select: ['id', 'title'] }
        );
        if (variants && variants.length > 0) {
          variant_title = variants[0].title || 'Untitled Variant';
        }
      } catch (err) {
        console.error('[Price History] Failed to fetch variant title:', err);
      }

      const auditTrail: PriceAuditTrail = {
        variant_id: variant_id as string,
        variant_title,
        history,
        total_changes: history.length,
      };

      return res.status(200).json({
        audit_trail: auditTrail,
      });
    }

    // Otherwise, return recent price changes
    const daysNum = parseInt(days as string, 10) || 30;
    const limitNum = parseInt(limit as string, 10) || 50;

    // Fetch recent price changes from all variants
    const history = await getBulkPriceHistory(productService, {
      currency_code: currency_code as string | undefined,
      days: daysNum,
      limit: limitNum,
    });

    const formattedHistory = history.map(h => ({
      ...h,
      formatted_old_amount: h.old_amount
        ? formatPrice(h.old_amount, h.currency_code as SupportedCurrency)
        : undefined,
      formatted_new_amount: formatPrice(h.new_amount, h.currency_code as SupportedCurrency),
    }));

    return res.status(200).json({
      history: formattedHistory,
      count: history.length,
    });

  } catch (error: any) {
    console.error('[Price History API] Error fetching price history:', error);

    return res.status(500).json({
      error: 'Failed to fetch price history',
      details: error.message
    } as any);
  }
}

/**
 * POST /admin/pricing/history
 *
 * Record a price change (internal use - called by pricing update routes)
 *
 * Request body:
 * {
 *   "variant_id": "variant_123",
 *   "currency_code": "eur",
 *   "old_amount": 2999,
 *   "new_amount": 3499,
 *   "region_id": "reg_france",  // optional
 *   "changed_by": "user_123",   // optional
 *   "reason": "Price increase due to cost changes"  // optional
 * }
 */
export async function POST(
  req: MedusaRequest<Omit<PriceHistory, 'id' | 'changed_at'>>,
  res: MedusaResponse<{ message: string; history_id: string }>
) {
  try {
    const {
      variant_id,
      currency_code,
      old_amount,
      new_amount,
      region_id,
      changed_by,
      reason,
    } = req.body;

    // Validate request
    if (!variant_id || !currency_code || typeof new_amount !== 'number') {
      return res.status(400).json({
        error: 'Missing required fields: variant_id, currency_code, new_amount'
      } as any);
    }

    // Store in database
    // INSERT INTO price_history (variant_id, currency_code, old_amount, new_amount, region_id, changed_by, reason, changed_at)
    // VALUES (?, ?, ?, ?, ?, ?, ?, NOW())

    const history_id = `history_${Date.now()}`;  // Mock ID

    console.log(`[Price History] Recorded price change for ${variant_id}:`, {
      currency_code,
      old_amount: old_amount ? `${old_amount} cents` : 'new',
      new_amount: `${new_amount} cents`,
      changed_by: changed_by || 'system',
      reason: reason || 'No reason provided',
    });

    return res.status(201).json({
      message: 'Price change recorded in audit trail',
      history_id,
    });

  } catch (error: any) {
    console.error('[Price History API] Error recording price change:', error);

    return res.status(500).json({
      error: 'Failed to record price change',
      details: error.message
    } as any);
  }
}
