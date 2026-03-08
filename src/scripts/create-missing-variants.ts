import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"

/**
 * PHASE 3 - Création des variantes manquantes
 *
 * Objectif: Créer les variantes manquantes identifiées dans le diff
 * en évitant les doublons SKU
 */

export default async function createMissingVariants({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  logger.info("🔧 PHASE 3 - CRÉATION VARIANTES MANQUANTES")
  logger.info("=" .repeat(70))

  // Charger le rapport diff
  const diffReportPath = path.join(process.cwd(), "reports", "missing-variants-diff.json")
  if (!fs.existsSync(diffReportPath)) {
    logger.error("❌ Rapport diff non trouvé. Exécuter calculate-missing-variants-diff.ts d'abord")
    return
  }

  const diffReport = JSON.parse(fs.readFileSync(diffReportPath, 'utf-8'))

  logger.info(`\n📊 Rapport diff chargé: ${diffReport.allMissingVariants.length} variantes candidates\n`)

  // Vérifier tous les SKUs existants dans toute la DB (pas seulement les produits PIM)
  const allProducts = await productService.listProducts({}, { take: 200, relations: ['variants'] })
  const allExistingSkus = new Set(
    allProducts.flatMap(p => p.variants?.map(v => v.sku).filter(Boolean) || [])
  )

  logger.info(`🔍 SKUs existants en DB: ${allExistingSkus.size}\n`)

  // Filtrer les variants à créer (exclure les SKUs existants)
  const variantsToCreate = diffReport.allMissingVariants.filter((v: any) =>
    !allExistingSkus.has(v.sku)
  )

  const skipped = diffReport.allMissingVariants.filter((v: any) =>
    allExistingSkus.has(v.sku)
  )

  if (skipped.length > 0) {
    logger.warn(`⚠️  VARIANTS IGNORÉS (SKU existe déjà): ${skipped.length}`)
    skipped.forEach((v: any) => {
      logger.warn(`   - ${v.sku} (existe déjà)`)
    })
    logger.info("")
  }

  logger.info(`✅ VARIANTS À CRÉER (après filtrage): ${variantsToCreate.length}\n`)

  if (variantsToCreate.length === 0) {
    logger.info("✅ Aucune variante à créer. Catalogue déjà à jour.")
    return { created: 0, skipped: skipped.length }
  }

  // Grouper par produit
  const variantsByProduct = variantsToCreate.reduce((acc: any, v: any) => {
    if (!acc[v.product]) acc[v.product] = []
    acc[v.product].push(v)
    return acc
  }, {})

  let totalCreated = 0
  let totalFailed = 0

  const creationLog: Array<{
    product: string
    sku: string
    status: string
    error?: string
  }> = []

  // Créer les variants par produit
  for (const [productHandle, variants] of Object.entries(variantsByProduct) as any) {
    logger.info(`📦 Produit: ${productHandle.toUpperCase()}`)
    logger.info(`   ${variants.length} variantes à créer\n`)

    // Trouver le produit Medusa
    const medusaProduct = allProducts.find(p => p.handle === productHandle)

    if (!medusaProduct) {
      logger.error(`   ❌ Produit ${productHandle} non trouvé dans Medusa, ignoré`)
      variants.forEach((v: any) => {
        creationLog.push({ product: productHandle, sku: v.sku, status: "FAILED", error: "Product not found" })
        totalFailed++
      })
      continue
    }

    // Récupérer le produit complet avec options
    const fullProduct = await productService.retrieveProduct(medusaProduct.id, {
      relations: ['variants', 'options']
    })

    // Créer les variants via updateProductsWorkflow
    for (const variant of variants) {
      try {
        logger.info(`   Creating ${variant.sku}...`)

        // Préparer les données variant
        const variantData = {
          title: variant.title,
          sku: variant.sku,
          manage_inventory: true,
          allow_backorder: false,
          options: variant.options,
          prices: [
            {
              amount: variant.priceEUR,
              currency_code: "eur",
            }
          ],
        }

        // Utiliser updateProductsWorkflow pour ajouter la nouvelle variant
        const workflow = updateProductsWorkflow(container)

        // Ajouter la nouvelle variant aux variants existants
        const updatedVariants = [
          ...(fullProduct.variants || []),
          variantData as any
        ]

        await workflow.run({
          input: {
            selector: { id: fullProduct.id },
            update: {
              variants: updatedVariants
            }
          }
        })

        logger.info(`   ✅ ${variant.sku}: Créée avec succès (€${(variant.priceEUR / 100).toFixed(2)})`)

        creationLog.push({ product: productHandle, sku: variant.sku, status: "SUCCESS" })
        totalCreated++

      } catch (error: any) {
        logger.error(`   ❌ ${variant.sku}: Échec - ${error.message}`)
        creationLog.push({ product: productHandle, sku: variant.sku, status: "FAILED", error: error.message })
        totalFailed++
      }
    }

    logger.info("")
  }

  // ====================================================================
  // RÉSUMÉ CRÉATION
  // ====================================================================

  logger.info("\n" + "=".repeat(70))
  logger.info("📊 RÉSUMÉ CRÉATION VARIANTES")
  logger.info("=".repeat(70))
  logger.info(`Variantes candidates:   ${diffReport.allMissingVariants.length}`)
  logger.info(`Variantes ignorées:     ${skipped.length} (SKU existe déjà)`)
  logger.info(`Variantes à créer:      ${variantsToCreate.length}`)
  logger.info(`Variantes créées:       ${totalCreated} ✅`)
  logger.info(`Échecs:                 ${totalFailed} ❌`)
  logger.info(`Taux de succès:         ${variantsToCreate.length > 0 ? ((totalCreated / variantsToCreate.length) * 100).toFixed(1) : 0}%`)
  logger.info("=".repeat(70))

  // Journal détaillé
  if (totalCreated > 0) {
    logger.info(`\n✅ VARIANTES CRÉÉES (${totalCreated}):\n`)
    creationLog.filter(l => l.status === "SUCCESS").forEach(l => {
      logger.info(`   - [${l.product}] ${l.sku}`)
    })
  }

  if (totalFailed > 0) {
    logger.info(`\n❌ ÉCHECS (${totalFailed}):\n`)
    creationLog.filter(l => l.status === "FAILED").forEach(l => {
      logger.info(`   - [${l.product}] ${l.sku}: ${l.error}`)
    })
  }

  // Export rapport
  const creationReport = {
    timestamp: new Date().toISOString(),
    summary: {
      candidates: diffReport.allMissingVariants.length,
      skipped: skipped.length,
      toCreate: variantsToCreate.length,
      created: totalCreated,
      failed: totalFailed,
      successRate: variantsToCreate.length > 0 ? `${((totalCreated / variantsToCreate.length) * 100).toFixed(1)}%` : "N/A",
    },
    creationLog,
    skippedVariants: skipped.map((v: any) => v.sku),
  }

  const reportPath = path.join(process.cwd(), "reports", "variants-creation-report.json")
  fs.writeFileSync(reportPath, JSON.stringify(creationReport, null, 2))

  logger.info(`\n📁 Rapport création sauvegardé: ${reportPath}`)
  logger.info("")

  logger.info("🎯 PROCHAINE ÉTAPE:")
  logger.info("   Valider les variantes créées")
  logger.info("   Script: npx medusa exec ./src/scripts/validate-created-variants.ts")
  logger.info("")

  return creationReport
}
