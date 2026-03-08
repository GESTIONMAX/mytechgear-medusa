/**
 * Product Variant Detail API - Manage specific variant
 *
 * GET /admin-api/products/[id]/variants/[variantId] - Get variant details
 * POST /admin-api/products/[id]/variants/[variantId] - Update variant (Medusa v2 uses POST for updates)
 * DELETE /admin-api/products/[id]/variants/[variantId] - Delete variant
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow, deleteProductVariantsWorkflow } from "@medusajs/medusa/core-flows";
import { authenticateAdmin } from "../../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products/[id]/variants/[variantId]
 * Get variant details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    const variants = await productService.listProductVariants(
      { id: [variantId] },
      { relations: ['options', 'options.option', 'product'] }
    );

    const variant = variants?.[0];

    if (!variant) {
      return res.status(404).json({
        error: 'Variant not found',
      });
    }

    return res.status(200).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Product Variant Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch variant',
      details: error.message
    });
  }
}

/**
 * POST /admin-api/products/[id]/variants/[variantId]
 * Update variant (Medusa v2 convention: POST for updates)
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { variantId } = req.params;
    const updateData = req.body as any;

    console.log('[Variant Update] Updating variant:', variantId);
    console.log('[Variant Update] Update data:', JSON.stringify(updateData, null, 2));

    // Use the workflow for updating variants
    const workflow = updateProductVariantsWorkflow(req.scope);

    const { result } = await workflow.run({
      input: {
        selector: { id: variantId },
        update: updateData,
      }
    });

    console.log('[Variant Update] Success');

    return res.status(200).json({
      variant: result,
    });

  } catch (error: any) {
    console.error('[Product Variant Detail API] POST Error:', error);
    return res.status(500).json({
      error: 'Failed to update variant',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/products/[id]/variants/[variantId]
 * Delete variant
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { variantId } = req.params;

    console.log('[Variant Delete] Deleting variant:', variantId);

    // Use the workflow for deleting variants
    const workflow = deleteProductVariantsWorkflow(req.scope);

    await workflow.run({
      input: {
        ids: [variantId]
      }
    });

    console.log('[Variant Delete] Success');

    return res.status(200).json({
      id: variantId,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Product Variant Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete variant',
      details: error.message
    });
  }
}
