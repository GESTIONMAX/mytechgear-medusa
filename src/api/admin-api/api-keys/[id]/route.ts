/**
 * API Key Detail API - GET/PUT/DELETE API key by ID
 *
 * GET /admin-api/api-keys/[id] - Get API key details
 * PUT /admin-api/api-keys/[id] - Update API key
 * DELETE /admin-api/api-keys/[id] - Delete API key
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/api-keys/[id]
 * Get API key details by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const apiKeyService = req.scope.resolve(Modules.API_KEY);
    const { id } = req.params;

    const apiKey = await apiKeyService.retrieveApiKey(id);

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    return res.status(200).json({
      api_key: apiKey,
    });

  } catch (error: any) {
    console.error('[API Key Detail API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch API key',
      details: error.message
    });
  }
}

/**
 * PUT /admin-api/api-keys/[id]
 * Update API key by ID
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const apiKeyService = req.scope.resolve(Modules.API_KEY);
    const { id } = req.params;

    const apiKey = await apiKeyService.updateApiKeys(id, req.body as any);

    return res.status(200).json({
      api_key: apiKey,
    });

  } catch (error: any) {
    console.error('[API Key Detail API] PUT Error:', error);
    return res.status(500).json({
      error: 'Failed to update API key',
      details: error.message
    });
  }
}

/**
 * DELETE /admin-api/api-keys/[id]
 * Delete API key by ID
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const apiKeyService = req.scope.resolve(Modules.API_KEY);
    const { id } = req.params;

    await apiKeyService.deleteApiKeys([id]);

    return res.status(200).json({
      id,
      deleted: true,
    });

  } catch (error: any) {
    console.error('[API Key Detail API] DELETE Error:', error);
    return res.status(500).json({
      error: 'Failed to delete API key',
      details: error.message
    });
  }
}
