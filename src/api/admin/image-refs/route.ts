/**
 * Image References API - Upload & List
 *
 * POST /admin/image-refs - Upload new image
 * GET /admin/image-refs?productId=X - List images for product
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";
import { uploadImage, syncProductImages, getNextSortOrder } from "../../../lib/image-ref";
import {
  CreateImageRefRequest,
  ImageRefResponse,
  ImageRefsListResponse,
} from "../../../types/image-ref";

// Apply authentication middleware
export const middlewares = [authenticateAdmin];

/**
 * POST /admin/image-refs
 *
 * Upload new image and attach to product
 *
 * Request body:
 * {
 *   "productId": "prod_123",
 *   "role": "gallery",
 *   "sortOrder": 1, // optional
 *   "file": {
 *     "content": "base64...",
 *     "filename": "image.jpg",
 *     "mimeType": "image/jpeg"
 *   },
 *   "width": 1920, // optional
 *   "height": 1080 // optional
 * }
 */
export async function POST(
  req: MedusaRequest<CreateImageRefRequest>,
  res: MedusaResponse<ImageRefResponse>
) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const body = req.body;

    // Validate request
    if (!body.productId) {
      return res.status(400).json({
        error: 'Missing required field: productId'
      } as any);
    }

    if (!body.role) {
      return res.status(400).json({
        error: 'Missing required field: role'
      } as any);
    }

    if (!body.file || !body.file.content || !body.file.filename || !body.file.mimeType) {
      return res.status(400).json({
        error: 'Missing required field: file (must include content, filename, mimeType)'
      } as any);
    }

    // Fetch product
    const product = await productModuleService.retrieveProduct(body.productId);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: `No product with ID: ${body.productId}`
      } as any);
    }

    if (!product.handle) {
      return res.status(400).json({
        error: 'Product has no handle',
        details: 'Product must have a handle to generate MinIO keys'
      } as any);
    }

    // Get existing refs
    const existingRefs = product.metadata?.media?.refs || [];

    // Determine sort order
    const sortOrder = body.sortOrder !== undefined
      ? body.sortOrder
      : getNextSortOrder(existingRefs);

    // Decode base64 content
    const content = Buffer.from(body.file.content, 'base64');

    // Upload image
    const imageRef = await uploadImage({
      content,
      filename: body.file.filename,
      mimeType: body.file.mimeType,
      productHandle: product.handle,
      sortOrder,
      role: body.role,
      width: body.width,
      height: body.height,
    });

    // Update product metadata
    const updatedRefs = [...existingRefs, imageRef];

    await productModuleService.updateProducts(body.productId, {
      metadata: {
        ...product.metadata,
        media: {
          refs: updatedRefs,
          version: '1.0.0',
        },
      },
      // Sync to product.images for backwards compatibility
      images: syncProductImages(updatedRefs),
      // Update thumbnail if this is the first image or role is thumbnail
      ...(updatedRefs.length === 1 || body.role === 'thumbnail'
        ? { thumbnail: imageRef.url }
        : {}
      ),
    });

    return res.status(201).json({
      imageRef,
    });

  } catch (error: any) {
    console.error('Error uploading image:', error);

    return res.status(500).json({
      error: 'Failed to upload image',
      details: error.message
    } as any);
  }
}

/**
 * GET /admin/image-refs?productId=prod_123
 *
 * List all images for a product
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse<ImageRefsListResponse>
) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const productId = req.query.productId as string;

    if (!productId) {
      return res.status(400).json({
        error: 'Missing required query parameter: productId'
      } as any);
    }

    // Fetch product
    const product = await productModuleService.retrieveProduct(productId);

    if (!product) {
      return res.status(404).json({
        error: 'Product not found',
        details: `No product with ID: ${productId}`
      } as any);
    }

    const imageRefs = product.metadata?.media?.refs || [];

    return res.status(200).json({
      imageRefs: imageRefs.sort((a: any, b: any) => a.sortOrder - b.sortOrder),
      total: imageRefs.length,
    });

  } catch (error: any) {
    console.error('Error fetching image refs:', error);

    return res.status(500).json({
      error: 'Failed to fetch image refs',
      details: error.message
    } as any);
  }
}
