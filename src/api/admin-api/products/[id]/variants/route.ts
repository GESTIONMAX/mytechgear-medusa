/**
 * Product Variants API - Manage product variants
 *
 * GET /admin-api/products/[id]/variants - List product variants
 * POST /admin-api/products/[id]/variants - Create variant for product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products/[id]/variants
 * List variants for a product
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const product = await productService.retrieveProduct(id, {
      relations: ['variants', 'variants.options'],
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    return res.status(200).json({
      variants: product.variants || [],
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
      },
    });

  } catch (error: any) {
    console.error('[Product Variants API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product variants',
      details: error.message
    });
  }
}

/**
 * POST /admin-api/products/[id]/variants
 * Create a variant for a product
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id: productId } = req.params;
    const body = req.body as any;

    console.log('[Variant Create] Creating variant for product:', productId);
    console.log('[Variant Create] Request body:', JSON.stringify(body, null, 2));

    // Extract options if present (format: { "Frame Color": "Black", "Lens Color": "Red" })
    const optionsMap = body.options || {};
    delete body.options; // Remove from body as we'll handle it separately

    // Get product to access its options
    const product = await productService.retrieveProduct(productId, {
      relations: ['options'],
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    // Transform options map to Medusa format: [{ option_id, value }]
    const optionsArray: any[] = [];
    if (Object.keys(optionsMap).length > 0) {
      for (const [optionTitle, optionValue] of Object.entries(optionsMap)) {
        // Find the matching product option
        const productOption = product.options?.find((opt: any) =>
          opt.title.toLowerCase() === optionTitle.toLowerCase()
        );

        if (productOption) {
          optionsArray.push({
            option_id: productOption.id,
            value: optionValue as string,
          });
        } else {
          console.warn(`[Variant Create] Option "${optionTitle}" not found on product`);
        }
      }
    }

    console.log('[Variant Create] Transformed options:', optionsArray);

    // Create variant with options
    const variantData = {
      product_id: productId,
      ...body,
      ...(optionsArray.length > 0 && { options: optionsArray }),
    };

    console.log('[Variant Create] Final variant data:', JSON.stringify(variantData, null, 2));

    const variants = await productService.createProductVariants(variantData);
    const variant = Array.isArray(variants) ? variants[0] : variants;

    console.log('[Variant Create] Success:', variant?.id);

    return res.status(201).json({
      variant,
    });

  } catch (error: any) {
    console.error('[Product Variants API] POST Error:', error);
    return res.status(500).json({
      error: 'Failed to create product variant',
      details: error.message
    });
  }
}
