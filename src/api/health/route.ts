/**
 * GET /health
 *
 * Liveness check — répond si le process est vivant.
 * Pas de check DB : toujours rapide, idéal pour load-balancer / uptime monitor.
 * Retourne toujours 200 tant que le serveur tourne.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime_s: Math.floor(process.uptime()),
  });
}
