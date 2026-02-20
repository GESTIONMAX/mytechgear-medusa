/**
 * GET /_diagnostics
 *
 * Endpoint de diagnostic complet — accès restreint.
 *
 * Sécurité :
 *   - DIAGNOSTICS_ENABLED=true  requis (défaut : false en production)
 *   - Header  x-debug-key: <DEBUG_KEY>  requis
 *   - Rate limit : 1 requête / 60 s par IP (in-process, sans dépendance externe)
 *   - Aucun secret exposé : pas de DATABASE_URL, JWT, API keys
 *   - Pas de stack trace dans la réponse
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

// ─── Feature flag ──────────────────────────────────────────────────────────────

function isDiagnosticsEnabled(): boolean {
  const flag = process.env.DIAGNOSTICS_ENABLED;
  if (flag === "true") return true;
  if (flag === "false") return false;
  // En l'absence de la var : désactivé en production, actif ailleurs
  return process.env.NODE_ENV !== "production";
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getDebugKey(): string | undefined {
  const key = process.env.DEBUG_KEY;
  return key && key.trim() !== "" ? key.trim() : undefined;
}

function isAuthorized(req: MedusaRequest): boolean {
  const debugKey = getDebugKey();
  if (!debugKey) return false;
  const provided = req.headers["x-debug-key"];
  return provided === debugKey;
}

// ─── Rate limit (in-process, 1 req / 60 s par IP) ────────────────────────────

const RATE_LIMIT_MS = 60_000;
const rateLimitMap = new Map<string, number>(); // ip → timestamp dernière requête autorisée

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const last = rateLimitMap.get(ip);

  if (last !== undefined && now - last < RATE_LIMIT_MS) {
    return { allowed: false, retryAfterMs: RATE_LIMIT_MS - (now - last) };
  }

  rateLimitMap.set(ip, now);

  // Nettoyage des entrées expirées (évite fuite mémoire sur longue durée)
  if (rateLimitMap.size > 500) {
    for (const [key, ts] of rateLimitMap.entries()) {
      if (now - ts > RATE_LIMIT_MS * 10) rateLimitMap.delete(key);
    }
  }

  return { allowed: true };
}

// ─── Checks ───────────────────────────────────────────────────────────────────

type CheckStatus = "ok" | "error";

async function checkDatabase(req: MedusaRequest): Promise<{
  status: CheckStatus;
  latency_ms?: number;
}> {
  const t0 = Date.now();
  try {
    const productService = req.scope.resolve("product");
    await productService.listProducts({}, { take: 1, select: ["id"] });
    return { status: "ok", latency_ms: Date.now() - t0 };
  } catch {
    return { status: "error", latency_ms: Date.now() - t0 };
  }
}

function getMemoryMb() {
  const mem = process.memoryUsage();
  return {
    rss_mb: Math.round(mem.rss / 1024 / 1024),
    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    external_mb: Math.round(mem.external / 1024 / 1024),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // 1. Feature flag — 404 si désactivé (pas d'info-leakage sur l'existence)
    if (!isDiagnosticsEnabled()) {
      return res.status(404).json({ error: "Not found" });
    }

    // 2. Auth — réponse identique clé absente ou erronée
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 3. Rate limit — après auth pour ne pas leaker le fait que l'endpoint existe
    const ip = (req.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      .trim() ?? req.socket?.remoteAddress ?? "unknown";

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      const retryAfterS = Math.ceil((rateCheck.retryAfterMs ?? RATE_LIMIT_MS) / 1000);
      res.setHeader("Retry-After", retryAfterS);
      return res.status(429).json({
        error: "Too many requests",
        retry_after_s: retryAfterS,
      });
    }

    // 4. Payload — champs safe uniquement, pas de stack trace
    const dbCheck = await checkDatabase(req);

    return res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),

      runtime: {
        node_version: process.version,
        uptime_s: Math.floor(process.uptime()),
        memory: getMemoryMb(),
      },

      // Valeurs non-sensibles uniquement — jamais de secrets, URLs de DB, clés API
      config: {
        node_env: process.env.NODE_ENV ?? "development",
        admin_disabled: process.env.DISABLE_MEDUSA_ADMIN === "true",
        store_cors: process.env.STORE_CORS ?? null,
        admin_cors: process.env.ADMIN_CORS ?? null,
        auth_cors: process.env.AUTH_CORS ?? null,
      },

      checks: {
        db: dbCheck,
      },
    });
  } catch {
    // Erreur inattendue : pas de stack trace exposée
    return res.status(500).json({ error: "Internal server error" });
  }
}
