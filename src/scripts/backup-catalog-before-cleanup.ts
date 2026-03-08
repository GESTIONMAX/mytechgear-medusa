import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import * as fs from "fs"
import * as path from "path"

/**
 * Backup complet du catalogue avant cleanup ciblé
 *
 * Sauvegarde:
 * - Tous les produits avec variantes
 * - Tous les price sets
 * - État actuel des liens (ou absence de liens)
 */

export default async function backupCatalogBeforeCleanup({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)
  const pricingService = container.resolve(Modules.PRICING)

  logger.info("💾 BACKUP CATALOGUE AVANT CLEANUP")
  logger.info("=" .repeat(70))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(process.cwd(), "backups", `cleanup-${timestamp}`)

  // Créer le dossier backup
  fs.mkdirSync(backupDir, { recursive: true })

  logger.info(`\n📁 Dossier backup: ${backupDir}\n`)

  // ====================================================================
  // 1. BACKUP PRODUITS ET VARIANTES
  // ====================================================================

  logger.info("📦 ÉTAPE 1: Backup produits et variantes\n")

  const products = await productService.listProducts({}, { take: 100, relations: ['variants', 'options'] })

  const productsBackup = products.map((p: any) => ({
    id: p.id,
    title: p.title,
    handle: p.handle,
    status: p.status,
    metadata: p.metadata,
    options: p.options?.map((o: any) => ({
      id: o.id,
      title: o.title,
      values: o.values
    })),
    variants: p.variants?.map((v: any) => ({
      id: v.id,
      title: v.title,
      sku: v.sku,
      options: v.options,
      price_set_id: v.price_set_id || null,
      metadata: v.metadata
    }))
  }))

  const productsBackupPath = path.join(backupDir, "products-variants.json")
  fs.writeFileSync(productsBackupPath, JSON.stringify(productsBackup, null, 2))

  logger.info(`   ✅ Sauvegardé ${products.length} produits`)
  logger.info(`   ✅ Total variantes: ${products.reduce((sum, p: any) => sum + (p.variants?.length || 0), 0)}`)
  logger.info(`   📁 ${productsBackupPath}\n`)

  // ====================================================================
  // 2. BACKUP PRICE SETS
  // ====================================================================

  logger.info("💶 ÉTAPE 2: Backup price sets\n")

  const priceSets = await pricingService.listPriceSets({}, { take: 200, relations: ['prices'] })

  const priceSetsBackup = priceSets.map((ps: any) => ({
    id: ps.id,
    prices: ps.prices?.map((p: any) => ({
      id: p.id,
      amount: p.amount,
      currency_code: p.currency_code,
      min_quantity: p.min_quantity,
      max_quantity: p.max_quantity
    }))
  }))

  const priceSetsBackupPath = path.join(backupDir, "price-sets.json")
  fs.writeFileSync(priceSetsBackupPath, JSON.stringify(priceSetsBackup, null, 2))

  logger.info(`   ✅ Sauvegardé ${priceSets.length} price sets`)
  logger.info(`   📁 ${priceSetsBackupPath}\n`)

  // ====================================================================
  // 3. BACKUP MAPPING ATTENDU (PIM)
  // ====================================================================

  logger.info("🗺️  ÉTAPE 3: Backup mapping PIM (prix attendus)\n")

  const pimPriceMapping: Record<string, number> = {
    "LFS-PRI-NBM-FIR": 29990,
    "LFS-DRA-BLKG-CAL": 29990,
    "SPR-FAL-OBS-BLU": 29990,
    "PRI-EUP-BLC-BLU": 19990,
    "PRI-EUP-GLD-ROS": 19990,
    "DUCK-CLASSIC-DEFAULT": 19990,
    "SH-MB-FIR": 21054,
    "MS-WHT-RED": 36924,
    "MSHIELD-W-R-AUD": 36924,
    "MSH-MB-SMK": 36924,
    "MS-WHT-BLU": 36924,
    "MS-BLK-FIR": 36924,
    "ZRX-FIR": 21054,
    "VEL-FIR": 21054,
    "DSK-FIR": 27508,
    "INF-FIR": 31634,
    "MR1-INF-FIR": 31634,
    "AUR-BLK-ENE": 40733,
    "AUR-AUD-BLK-CAL": 47504,
    "AUR-AUD-BLK-ENE": 47504,
    "AUR-AUD-WHT-CAL": 47504,
    "AUR-AUD-WHT-ENE": 47504,
    "ARZ-DEF": 36924,
    "DRG-SMK-GBGD": 27508,
  }

  const pimMappingPath = path.join(backupDir, "pim-price-mapping.json")
  fs.writeFileSync(pimMappingPath, JSON.stringify(pimPriceMapping, null, 2))

  logger.info(`   ✅ Sauvegardé ${Object.keys(pimPriceMapping).length} mappings PIM`)
  logger.info(`   📁 ${pimMappingPath}\n`)

  // ====================================================================
  // 4. RÉSUMÉ BACKUP
  // ====================================================================

  const summary = {
    timestamp,
    backupDir,
    stats: {
      products: products.length,
      variants: products.reduce((sum: number, p: any) => sum + (p.variants?.length || 0), 0),
      priceSets: priceSets.length,
      pimMappings: Object.keys(pimPriceMapping).length,
      variantsWithPriceSetId: productsBackup.reduce((sum: number, p: any) =>
        sum + (p.variants?.filter((v: any) => v.price_set_id).length || 0), 0
      )
    },
    files: {
      products: productsBackupPath,
      priceSets: priceSetsBackupPath,
      pimMapping: pimMappingPath
    }
  }

  const summaryPath = path.join(backupDir, "BACKUP-SUMMARY.json")
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

  logger.info("=" .repeat(70))
  logger.info("📊 RÉSUMÉ BACKUP")
  logger.info("=" .repeat(70))
  logger.info(`Timestamp: ${timestamp}`)
  logger.info(`Dossier: ${backupDir}`)
  logger.info(``)
  logger.info(`Statistiques:`)
  logger.info(`  - Produits: ${summary.stats.products}`)
  logger.info(`  - Variantes: ${summary.stats.variants}`)
  logger.info(`  - Price sets: ${summary.stats.priceSets}`)
  logger.info(`  - Variantes avec price_set_id: ${summary.stats.variantsWithPriceSetId}`)
  logger.info(``)
  logger.info(`Fichiers:`)
  logger.info(`  - ${path.basename(summary.files.products)}`)
  logger.info(`  - ${path.basename(summary.files.priceSets)}`)
  logger.info(`  - ${path.basename(summary.files.pimMapping)}`)
  logger.info(`  - BACKUP-SUMMARY.json`)
  logger.info("=" .repeat(70))
  logger.info(``)
  logger.info(`✅ Backup complet terminé!\n`)

  return summary
}
