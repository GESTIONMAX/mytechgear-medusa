/**
 * Image References API - Single Image Operations
 *
 * GET /admin/image-refs/[id] - Get single image
 * PUT /admin/image-refs/[id] - Update image metadata
 * DELETE /admin/image-refs/[id] - Delete image
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";
import { deleteImage, syncProductImages, findProductByImageRefId } from "../../../../lib/image-ref";
import {
  UpdateImageRefRequest,
  ImageRefResponse,
} from "../../../../types/image-ref";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

/**
 * GET /admin/image-refs/[id]
 *
 * Get single image reference by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<ImageRefResponse>
) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const imageRefId = req.params.id;

    // Find product containing this ImageRef
    const result = await findProductByImageRefId(productModuleService, imageRefId);

    if (!result) {
      return res.status(404).json({
        error: 'ImageRef not found',
        details: `No ImageRef with ID: ${imageRefId}`
      } as any);
    }

    return res.status(200).json({
      imageRef: result.imageRef,
    });

  } catch (error: any) {
    console.error('Error fetching image ref:', error);

    return res.status(500).json({
      error: 'Failed to fetch image ref',
      details: error.message
    } as any);
  }
}

/**
 * PUT /admin/image-refs/[id]
 *
 * Update image metadata (sortOrder, role)
 * Note: Cannot change URL/file (delete and re-upload instead)
 */
export async function PUT(
  req: MedusaRequest<UpdateImageRefRequest>,
  res: MedusaResponse<ImageRefResponse>
) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const imageRefId = req.params.id;
    const body = req.body;

    // Find product containing this ImageRef
    const result = await findProductByImageRefId(productModuleService, imageRefId);

    if (!result) {
      return res.status(404).json({
        error: 'ImageRef not found',
        details: `No ImageRef with ID: ${imageRefId}`
      } as any);
    }

    const { product, imageRef } = result;

    // Update ImageRef fields
    const updatedImageRef = {
      ...imageRef,
      sortOrder: body.sortOrder !== undefined ? body.sortOrder : imageRef.sortOrder,
      role: body.role || imageRef.role,
      updatedAt: new Date().toISOString(),
    };

    // Update refs array
    const refs = product.metadata.media.refs;
    const updatedRefs = refs.map((ref: any) =>
      ref.id === imageRefId ? updatedImageRef : ref
    );

    // Save to product
    await productModuleService.updateProducts(product.id, {
      metadata: {
        ...product.metadata,
        media: {
          refs: updatedRefs,
          version: '1.0.0',
        },
      },
      // Sync to product.images
      images: syncProductImages(updatedRefs),
      // Update thumbnail if role changed to thumbnail
      ...(body.role === 'thumbnail'
        ? { thumbnail: updatedImageRef.url }
        : {}
      ),
    });

    return res.status(200).json({
      imageRef: updatedImageRef,
    });

  } catch (error: any) {
    console.error('Error updating image ref:', error);

    return res.status(500).json({
      error: 'Failed to update image ref',
      details: error.message
    } as any);
  }
}

/**
 * DELETE /admin/image-refs/[id]
 *
 * Delete image from MinIO and remove from product metadata
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const imageRefId = req.params.id;

    // Find product containing this ImageRef
    const result = await findProductByImageRefId(productModuleService, imageRefId);

    if (!result) {
      return res.status(404).json({
        error: 'ImageRef not found',
        details: `No ImageRef with ID: ${imageRefId}`
      } as any);
    }

    const { product, imageRef } = result;

    // Delete from MinIO
    await deleteImage(imageRef);

    // Remove from refs array
    const updatedRefs = product.metadata.media.refs.filter(
      (ref: any) => ref.id !== imageRefId
    );

    // Determine new thumbnail (if deleted image was thumbnail)
    const newThumbnail = product.thumbnail === imageRef.url
      ? (updatedRefs[0]?.url || null)
      : product.thumbnail;

    // Save to product
    await productModuleService.updateProducts(product.id, {
      metadata: {
        ...product.metadata,
        media: {
          refs: updatedRefs,
          version: '1.0.0',
        },
      },
      // Sync to product.images
      images: syncProductImages(updatedRefs),
      // Update thumbnail
      thumbnail: newThumbnail,
    });

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting image ref:', error);

    return res.status(500).json({
      error: 'Failed to delete image ref',
      details: error.message
    } as any);
  }
}
