/**
 * Product Variants API - Direct variant queries
 *
 * GET /admin-api/product-variants - List/query product variants
 *
 * This endpoint allows querying variants directly by ID or other filters,
 * which is useful when you need variant details without knowing the product_id.
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/product-variants
 * Query variants by ID or other filters
 *
 * Query params:
 * - id[] : Array of variant IDs to filter
 * - fields : Comma-separated list of fields to include (e.g., "*options,*product")
 * - limit : Number of results (default: 15)
 * - offset : Pagination offset (default: 0)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 15;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    // Build filter object
    const filter: any = {};

    // Handle id[] filter (Next.js sends it as "id[]" for arrays)
    const variantIds = req.query['id[]'];
    if (variantIds) {
      // Can be a single string or array
      filter.id = Array.isArray(variantIds) ? variantIds : [variantIds];
    }

    // Parse fields parameter to determine relations
    // Format: "*options,*product" means include options and product relations
    const fieldsParam = req.query?.fields as string | undefined;
    const relations: string[] = [];

    if (fieldsParam) {
      const fields = fieldsParam.split(',');
      for (const field of fields) {
        if (field.startsWith('*')) {
          // *options -> include "options" relation
          const relationName = field.substring(1);
          relations.push(relationName);
        }
      }
    }

    // Fetch variants
    const variants = await productService.listProductVariants(
      filter,
      {
        skip: offset,
        take: limit,
        relations: relations.length > 0 ? relations : undefined,
      }
    );

    return res.status(200).json({
      variants,
      count: variants.length,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[Product Variants API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product variants',
      details: error.message
    } as any);
  }
}
