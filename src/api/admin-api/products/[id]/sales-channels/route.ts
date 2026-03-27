/**
 * Product Sales Channels API
 *
 * POST /admin-api/products/[id]/sales-channels - Assign sales channels to product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /admin-api/products/[id]/sales-channels
 * Assigns sales channels to a product
 *
 * Body:
 * {
 *   "sales_channel_ids": ["sc_01XXX", "sc_02YYY"]
 * }
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const remoteLink = req.scope.resolve("remoteLink");
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const query = req.scope.resolve("query");
    const { id } = req.params;
    const { sales_channel_ids } = req.body as { sales_channel_ids: string[] };

    if (!Array.isArray(sales_channel_ids)) {
      return res.status(400).json({
        error: 'sales_channel_ids must be an array',
      });
    }

    console.log('📤 [Sales Channels] Assigning channels to product:', id);
    console.log('   Channels:', sales_channel_ids);

    // Step 1: Get existing product_sales_channel links
    const { data: existingLinks } = await query.graph({
      entity: "product_sales_channel",
      fields: ["id", "product_id", "sales_channel_id"],
      filters: { product_id: id },
    });

    console.log('   Existing links:', existingLinks);

    // Step 2: Delete existing links using remoteLink.dismiss()
    if (existingLinks && existingLinks.length > 0) {
      for (const link of existingLinks) {
        try {
          await remoteLink.dismiss({
            [Modules.PRODUCT]: { product_id: link.product_id },
            [Modules.SALES_CHANNEL]: { sales_channel_id: link.sales_channel_id }
          });
        } catch (deleteError: any) {
          console.warn('   Could not dismiss link:', deleteError.message);
        }
      }
    }

    // Step 3: Create new links using remoteLink.create()
    if (sales_channel_ids.length > 0) {
      const linksToCreate = sales_channel_ids.map((channelId: string) => ({
        [Modules.PRODUCT]: { product_id: id },
        [Modules.SALES_CHANNEL]: { sales_channel_id: channelId }
      }));

      console.log('   Creating links:', linksToCreate);

      try {
        await remoteLink.create(linksToCreate);
      } catch (createError: any) {
        console.error('   Could not create links via remoteLink:', createError.message);
        throw createError;
      }
    }

    // Step 4: Retrieve product WITHOUT sales_channels as ORM relation
    const updatedProduct = await productModuleService.retrieveProduct(id, {
      relations: ['variants', 'options', 'images'],
    });

    // Step 5: Fetch sales channels via Remote Query
    const productWithSalesChannels: any = updatedProduct;
    try {
      const { data: salesChannelLinks } = await query.graph({
        entity: "product_sales_channel",
        fields: ["sales_channel_id", "sales_channel.*"],
        filters: { product_id: id },
      });

      if (salesChannelLinks && salesChannelLinks.length > 0) {
        productWithSalesChannels.sales_channels = salesChannelLinks.map((link: any) => link.sales_channel);
      } else {
        productWithSalesChannels.sales_channels = [];
      }
    } catch (queryError: any) {
      console.warn('[Sales Channels] Could not fetch via Remote Query:', queryError.message);
      productWithSalesChannels.sales_channels = [];
    }

    console.log('✅ [Sales Channels] Assigned', sales_channel_ids.length, 'channel(s) to product');

    return res.status(200).json({
      success: true,
      product: productWithSalesChannels,
    });

  } catch (error: any) {
    console.error('❌ [Sales Channels] Error:', error);
    return res.status(500).json({
      error: 'Failed to assign sales channels',
      details: error.message,
    });
  }
}
