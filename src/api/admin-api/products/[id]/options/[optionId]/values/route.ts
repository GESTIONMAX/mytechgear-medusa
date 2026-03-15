/**
 * Product Option Values API - Manage option values
 *
 * POST /admin-api/products/[id]/options/[optionId]/values - Add value to option
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * POST /admin-api/products/[id]/options/[optionId]/values
 * Add a new value to a product option
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id: productId, optionId } = req.params;
    const { value, metadata } = req.body as { value: string; metadata?: Record<string, any> };

    if (!value || typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({
        error: 'The "value" field is required and must be a non-empty string',
      });
    }

    console.log(`[Product Option Values API] Adding value to option ${optionId}:`, {
      productId,
      optionId,
      value: value.trim(),
      metadata,
    });

    // Create the option value
    const optionValue = await productService.createProductOptionValues({
      option_id: optionId,
      value: value.trim(),
      metadata: metadata || {},
    });

    console.log(`[Product Option Values API] Value created successfully:`, optionValue);

    return res.status(201).json({
      value: optionValue,
      product_option_value: optionValue, // Alias for compatibility
    });

  } catch (error: any) {
    console.error('[Product Option Values API] POST Error:', error);

    // Check for duplicate value error
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({
        error: `Value already exists for this option`,
        details: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to create option value',
      details: error.message
    });
  }
}
