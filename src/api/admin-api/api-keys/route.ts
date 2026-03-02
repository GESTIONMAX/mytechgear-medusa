/**
 * API Keys API - Use Medusa services directly
 *
 * GET /admin-api/api-keys - List API keys using Medusa service
 */

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * GET /admin-api/api-keys
 * List API keys using Medusa service
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const apiKeyService = req.scope.resolve(Modules.API_KEY);

    // Parse query params
    const limit = req.query?.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query?.offset ? parseInt(req.query.offset as string) : 0;

    // Fetch API keys
    const [apiKeys, count] = await apiKeyService.listAndCountApiKeys(
      {},
      {
        skip: offset,
        take: limit,
      }
    );

    return res.status(200).json({
      api_keys: apiKeys,
      count,
      offset,
      limit,
    });

  } catch (error: any) {
    console.error('[API Keys API] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch API keys',
      details: error.message
    } as any);
  }
}
