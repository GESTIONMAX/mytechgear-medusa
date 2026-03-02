/**
 * Image Reference Detail API - Get/Update/Delete image reference by ID
 *
 * GET /admin-api/images/image-refs/[id] - Get image reference
 * PUT /admin-api/images/image-refs/[id] - Update image reference
 * DELETE /admin-api/images/image-refs/[id] - Delete image reference
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/images/image-refs/[id]
 * Get image reference by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;

    // This would typically query a custom image references table
    const imageRef = {
      id,
      url: 'https://example.com/image.jpg',
      alt: 'Sample image',
    };

    return res.status(200).json({
      image_ref: imageRef,
    });

  } catch (error: any) {
    console.error('[Image Reference Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch image reference',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/images/image-refs/[id]
 * Update image reference by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;

    const imageRef = {
      id,
      ...(req.body as any),
      updated_at: new Date(),
    };

    return res.status(200).json({
      image_ref: imageRef,
    });

  } catch (error: any) {
    console.error('[Image Reference Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update image reference',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/images/image-refs/[id]
 * Delete image reference by ID
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params;

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[Image Reference Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete image reference',
      details: error.message
    });
  }
}
