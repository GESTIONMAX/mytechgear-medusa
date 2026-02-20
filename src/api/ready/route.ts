/**
 * GET /ready
 *
 * Readiness check — vérifie que le serveur, la DB et la config sont prêts.
 * 200 = prêt à recevoir du trafic
 * 503 = DB injoignable OU variable critique manquante
 *
 * Pas de secrets exposés : noms de variables uniquement (jamais les valeurs).
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// Variables requises pour un fonctionnement correct en production.
// On vérifie la PRÉSENCE (pas la valeur — jamais exposée).
const REQUIRED_ENV_VARS = ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET"];

// ─── Checks ───────────────────────────────────────────────────────────────────

async function checkDatabase(req: MedusaRequest): Promise<{
  status: "ok" | "error";
  latency_ms?: number;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    const productService = req.scope.resolve("product");
    await productService.listProducts({}, { take: 1, select: ["id"] });
    return { status: "ok", latency_ms: Date.now() - t0 };
  } catch {
    return {
      status: "error",
      latency_ms: Date.now() - t0,
      error: "Database unreachable",
    };
  }
}

function checkEnvVars(): {
  status: "ok" | "error";
  missing: string[]; // noms uniquement, jamais de valeurs
} {
  const missing = REQUIRED_ENV_VARS.filter(
    (key) => !process.env[key] || process.env[key]!.trim() === ""
  );
  return { status: missing.length === 0 ? "ok" : "error", missing };
}

function checkAdminConfig(): {
  status: "ok" | "warning";
  detail?: string;
} {
  const disabled = process.env.DISABLE_MEDUSA_ADMIN === "true";
  return disabled
    ? { status: "ok" }
    : {
        status: "warning",
        detail: "DISABLE_MEDUSA_ADMIN not set — Admin UI may be exposed",
      };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [dbCheck, envCheck, adminCheck] = await Promise.all([
    checkDatabase(req),
    Promise.resolve(checkEnvVars()),
    Promise.resolve(checkAdminConfig()),
  ]);

  // Service pas prêt si DB KO ou variable critique manquante
  const isReady = dbCheck.status === "ok" && envCheck.status === "ok";

  res.status(isReady ? 200 : 503).json({
    status: isReady ? "ready" : "not_ready",
    checks: {
      db: dbCheck,
      env: envCheck,     // noms des vars manquantes (jamais les valeurs)
      admin: adminCheck, // warning si Admin UI potentiellement exposée
    },
    uptime_s: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
