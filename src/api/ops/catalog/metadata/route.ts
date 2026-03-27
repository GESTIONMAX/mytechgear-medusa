/**
 * OPS Endpoint - Catalog Metadata Update
 *
 * Endpoint privé pour mettre à jour les metadata produits sans UI.
 * Authentification via X-OPS-KEY header.
 *
 * Usage:
 * POST /ops/catalog/metadata
 * Headers: { "X-OPS-KEY": "secret-from-env" }
 * Body: { productId, metadata }
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const OPS_KEY = process.env.OPS_SECRET_KEY || ""
const OPS_ENABLED = process.env.OPS_ENDPOINTS_ENABLED === "true"

/**
 * Middleware de sécurité OPS
 */
function requireOpsAuth(
  req: MedusaRequest,
  res: MedusaResponse,
  next: () => void
) {
  // Vérifier si les endpoints OPS sont activés
  if (!OPS_ENABLED) {
    return res.status(403).json({
      error: "OPS endpoints are disabled",
      message: "Set OPS_ENDPOINTS_ENABLED=true in .env to enable",
    })
  }

  // Vérifier si OPS_KEY est configurée
  if (!OPS_KEY || OPS_KEY.length < 32) {
    console.error("❌ [OPS Security] OPS_SECRET_KEY not configured or too short")
    return res.status(500).json({
      error: "OPS authentication not configured",
      message: "Server configuration error",
    })
  }

  // Vérifier le header X-OPS-KEY
  const providedKey = req.headers["x-ops-key"] as string

  if (!providedKey || providedKey !== OPS_KEY) {
    console.warn("⚠️ [OPS Security] Unauthorized access attempt", {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      timestamp: new Date().toISOString(),
    })

    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid X-OPS-KEY header",
    })
  }

  // Auth OK
  next()
}

/**
 * POST /ops/catalog/metadata
 * Met à jour les metadata d'un produit
 *
 * Body Parameters:
 *   productId: string - Product ID (required)
 *   metadata: object - Metadata to write (required)
 *   merge: boolean - Merge with existing (default: true)
 *   mode: 'safe' | 'force' - Validation mode (default: 'safe')
 *
 * Mode:
 *   safe: Blocks writes to PIM-owned fields (recommended)
 *   force: Allows overriding PIM fields (requires explicit mode='force')
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Auth OPS
    requireOpsAuth(req, res, () => {})
    if (res.headersSent) return // Auth failed

    const { productId, metadata, merge = true, mode = "safe" } = req.body

    // Validation
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({
        error: "Invalid request",
        message: "productId is required (string)",
      })
    }

    if (!metadata || typeof metadata !== "object") {
      return res.status(400).json({
        error: "Invalid request",
        message: "metadata is required (object)",
      })
    }

    if (mode !== "safe" && mode !== "force") {
      return res.status(400).json({
        error: "Invalid request",
        message: "mode must be 'safe' or 'force'",
      })
    }

    // Import ownership validation
    const { detectOpsConflicts } = await import("../../../../lib/metadata-ownership")

    // Check for PIM field conflicts (in safe mode)
    if (mode === "safe") {
      const validation = detectOpsConflicts(metadata)

      if (!validation.valid) {
        console.warn("⚠️ [OPS Catalog] PIM field conflict detected:", {
          productId,
          conflicts: validation.conflicts,
          timestamp: new Date().toISOString(),
        })

        return res.status(400).json({
          error: "Ownership conflict",
          message: "Attempting to modify PIM-owned fields. These fields are managed by PIM imports and should not be modified via OPS endpoint.",
          conflicts: validation.conflicts,
          suggestion: "Remove PIM-owned fields from your request, or use mode='force' to override (not recommended)",
          documentation: "See FIELD_OWNERSHIP.md for field ownership rules",
        })
      }

      // Log warnings (non-blocking)
      if (validation.warnings.length > 0) {
        console.warn("⚠️ [OPS Catalog] Warnings:", {
          productId,
          warnings: validation.warnings,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      // Force mode - log override
      const validation = detectOpsConflicts(metadata)
      if (validation.conflicts.length > 0) {
        console.warn("⚠️ [OPS Catalog] FORCE mode - Overriding PIM fields:", {
          productId,
          conflicts: validation.conflicts,
          timestamp: new Date().toISOString(),
        })
      }
    }

    // Récupérer le service produit
    const productService = req.scope.resolve("productService")

    // Récupérer le produit actuel
    const product = await productService.retrieve(productId, {
      select: ["id", "title", "handle", "metadata"],
    })

    // Fusionner ou remplacer metadata
    let newMetadata
    if (!merge) {
      // Replace mode - warn if no force
      if (mode !== "force") {
        console.warn("⚠️ [OPS Catalog] Replace mode without force - may lose data")
      }
      newMetadata = metadata
    } else {
      // Merge mode
      newMetadata = { ...product.metadata, ...metadata }
    }

    // Mettre à jour
    const updatedProduct = await productService.update(productId, {
      metadata: newMetadata,
    })

    console.log("✅ [OPS Catalog] Metadata updated:", {
      productId,
      productTitle: product.title,
      productHandle: product.handle,
      metadataKeys: Object.keys(metadata),
      merge,
      mode,
      timestamp: new Date().toISOString(),
    })

    return res.json({
      success: true,
      product: {
        id: updatedProduct.id,
        title: updatedProduct.title,
        handle: updatedProduct.handle,
        metadata: updatedProduct.metadata,
      },
      message: "Metadata updated successfully",
      mode,
    })
  } catch (error: any) {
    console.error("❌ [OPS Catalog] Error updating metadata:", error)

    if (error.type === "not_found") {
      return res.status(404).json({
        error: "Product not found",
        message: `No product with id: ${req.body.productId}`,
      })
    }

    return res.status(500).json({
      error: "Internal server error",
      message: error.message || "Failed to update metadata",
    })
  }
}
