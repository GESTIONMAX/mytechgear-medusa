/**
 * Product Detail API - GET/PUT/DELETE product by ID
 *
 * GET /admin-api/products/[id] - Get product details
 * PUT /admin-api/products/[id] - Update product
 * DELETE /admin-api/products/[id] - Delete product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/products/[id]
 * Get product details by ID
 *
 * Query params:
 * - fields: Comma-separated list of relations to include (e.g., "*options,*options.values,*variants")
 *   Format: *relationName includes that relation
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    // Parse fields parameter to determine relations
    const fieldsParam = req.query?.fields as string | undefined;
    // Note: sales_channels is NOT a direct relation in Product Module (Medusa v2 uses links)
    let relations: string[] = ['variants', 'options', 'options.values', 'images', 'categories', 'collection'];

    if (fieldsParam) {
      // Parse fields like "*options,*options.values" or "+options,+options.values"
      // Support both * and + prefixes for compatibility
      const fields = fieldsParam.split(',');
      const customRelations: string[] = [];

      // Valid Product Module relations (Medusa v2)
      const validRelations = [
        'variants',
        'options',
        'options.values',
        'images',
        'categories',
        'collection',
        'tags',
        'type'
      ];

      for (const field of fields) {
        if (field.startsWith('*') || field.startsWith('+')) {
          // *options.values or +options.values -> "options.values"
          let relationPath = field.substring(1);

          // Remove wildcard suffix if present (collection.* -> collection)
          if (relationPath.endsWith('.*')) {
            relationPath = relationPath.substring(0, relationPath.length - 2);
          }

          // Only include valid Product Module relations
          // Skip sales_channels (Link Module), variants.prices (Pricing Module), variants.options (complex join)
          if (validRelations.includes(relationPath)) {
            customRelations.push(relationPath);
          }
        }
      }

      if (customRelations.length > 0) {
        // Use custom relations if provided
        relations = customRelations;
      }
    }

    const product = await productService.retrieveProduct(id, {
      relations,
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
      });
    }

    // If sales_channels were requested, fetch them via Remote Query
    const shouldIncludeSalesChannels = fieldsParam?.includes('sales_channels');

    // Cast to any to allow adding sales_channels dynamically
    const productWithSalesChannels: any = product;

    if (shouldIncludeSalesChannels) {
      try {
        const query = req.scope.resolve("query");

        // Use Remote Query to fetch product-sales_channel links
        const { data: salesChannelLinks } = await query.graph({
          entity: "product_sales_channel",
          fields: ["sales_channel_id", "sales_channel.*"],
          filters: { product_id: id },
        });

        // Extract sales channels from links
        if (salesChannelLinks && salesChannelLinks.length > 0) {
          productWithSalesChannels.sales_channels = salesChannelLinks.map((link: any) => link.sales_channel);
        } else {
          productWithSalesChannels.sales_channels = [];
        }
      } catch (queryError: any) {
        console.warn('[Product GET] Could not fetch sales channels via Remote Query:', queryError.message);
        // Don't fail the whole request, just omit sales_channels
        productWithSalesChannels.sales_channels = [];
      }
    }

    return res.status(200).json({
      product: productWithSalesChannels,
    });

  } catch (error: any) {
    console.error('[Product Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch product',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/products/[id]
 * Update product by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    const product = await productService.updateProducts(id, req.body as any);

    return res.status(200).json({
      product,
    });

  } catch (error: any) {
    console.error('[Product Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update product',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/products/[id]
 * Delete product by ID
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;

    await productService.deleteProducts([id]);

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Product Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete product',
      details: error.message
    });
  }
}
