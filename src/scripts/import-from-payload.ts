import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createCollectionsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs"
import * as path from "path"

type PayloadVariant = {
  id: string
  name: string
  sku: string
  price: number
  priceInEuros: string
  productId: string
  productName: string
}

type PayloadProduct = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  priceInEuros: string
  salePrice?: number
  salePriceInEuros?: string | null
  category: string
  variants: any[]
}

type PayloadExport = {
  exportDate: string
  products: PayloadProduct[]
  variants: PayloadVariant[]
  summary: {
    totalProducts: number
    totalVariants: number
    productsWithVariants: number
  }
}

export default async function importFromPayload({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModuleService = container.resolve(Modules.PRODUCT)

  logger.info("📦 Starting import from Payload...")

  // Lire le fichier d'export
  const exportPath = path.join(
    "/home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace/mytechgear-backend/exports",
    "products-variants-export-2026-02-01.json"
  )

  const exportData: PayloadExport = JSON.parse(
    fs.readFileSync(exportPath, "utf-8")
  )

  logger.info(`📊 Found ${exportData.summary.totalProducts} products and ${exportData.summary.totalVariants} variants`)

  // Créer ou récupérer les catégories de produits
  const uniqueCategories = [...new Set(exportData.products.map(p => p.category))]

  logger.info("🏷️  Creating collections...")
  const categoryMapping = new Map<string, string>()

  // Créer les collections (pour l'affichage dans l'admin)
  const { result: collectionResult } = await createCollectionsWorkflow(
    container
  ).run({
    input: {
      collections: uniqueCategories.map(cat => ({
        title: cat,
        handle: cat.toLowerCase(),
      })),
    },
  })

  collectionResult.forEach(collection => {
    categoryMapping.set(collection.title, collection.id)
  })

  logger.info(`  ✓ Created ${collectionResult.length} collections`)

  // Aussi utiliser les catégories pour la hiérarchie
  const productCategoryMapping = new Map<string, string>()
  productCategoryMapping.set("PRISMATIC", "pcat_01KGBS24KFT0VW7DFZZT7R3K2Q")
  productCategoryMapping.set("LIFESTYLE", "pcat_01KGBS24KF2J4JKHEF7MZ2EGVN")
  productCategoryMapping.set("SPORT", "pcat_01KGBS24KG6YME924C8WKMV3X0")

  // Créer un mapping des variantes Payload par productId
  const variantsByProduct = new Map<string, PayloadVariant[]>()
  for (const variant of exportData.variants) {
    if (!variantsByProduct.has(variant.productId)) {
      variantsByProduct.set(variant.productId, [])
    }
    variantsByProduct.get(variant.productId)!.push(variant)
  }

  // Parser les options des variantes (Monture, Verres, Audio)
  const parseVariantOptions = (variantName: string, productName: string) => {
    // Format: "ProductName - Monture XXX, Verres YYY"
    const optionsPart = variantName.replace(productName + " - ", "")
    const parts = optionsPart.split(", ")

    const options: { [key: string]: string } = {}
    for (const part of parts) {
      if (part.includes("Monture ")) {
        options.frame = part.replace("Monture ", "")
      } else if (part.includes("Verres ")) {
        options.lens = part.replace("Verres ", "").replace(" avec audio", "").replace(" sans audio", "")
      } else if (part.includes("audio")) {
        options.audio = part.includes("avec audio") ? "Avec Audio" : "Sans Audio"
      }
    }

    return options
  }

  // Préparer les produits pour le workflow
  logger.info("\n📦 Preparing products for import...")

  const productsToCreate = exportData.products.map(payloadProduct => {
    const payloadVariants = variantsByProduct.get(payloadProduct.id) || []

    // Déterminer les options uniques pour ce produit
    const allOptions = payloadVariants.map(v =>
      parseVariantOptions(v.name, payloadProduct.name)
    )

    const frameOptions = [...new Set(allOptions.map(o => o.frame).filter(Boolean))]
    const lensOptions = [...new Set(allOptions.map(o => o.lens).filter(Boolean))]
    const audioOptions = [...new Set(allOptions.map(o => o.audio).filter(Boolean))]

    const productOptions: Array<{ title: string; values: string[] }> = []
    if (frameOptions.length > 0) {
      productOptions.push({
        title: "Monture",
        values: frameOptions
      })
    }
    if (lensOptions.length > 0) {
      productOptions.push({
        title: "Verres",
        values: lensOptions
      })
    }
    if (audioOptions.length > 0) {
      productOptions.push({
        title: "Audio",
        values: audioOptions
      })
    }

    // Si pas de variantes, créer un produit simple avec une option par défaut
    if (payloadVariants.length === 0) {
      return {
        title: payloadProduct.name,
        handle: payloadProduct.slug,
        description: payloadProduct.description,
        status: ProductStatus.PUBLISHED,
        collection_id: categoryMapping.get(payloadProduct.category)!,
        category_ids: [productCategoryMapping.get(payloadProduct.category)!],
        options: [
          {
            title: "Default",
            values: ["Default"]
          }
        ],
        variants: [
          {
            title: "Default",
            sku: `${payloadProduct.slug.toUpperCase()}-DEFAULT`,
            manage_inventory: false,
            options: {
              "Default": "Default"
            },
            prices: [
              {
                amount: payloadProduct.price,
                currency_code: "eur",
              },
            ],
          },
        ],
      }
    }

    return {
      title: payloadProduct.name,
      handle: payloadProduct.slug,
      description: payloadProduct.description,
      status: ProductStatus.PUBLISHED,
      collection_id: categoryMapping.get(payloadProduct.category)!,
      category_ids: [productCategoryMapping.get(payloadProduct.category)!],
      options: productOptions,
      variants: payloadVariants.map((variant) => {
            const options = parseVariantOptions(variant.name, payloadProduct.name)

            // Construire les options comme Record<string, string>
            const variantOptions: Record<string, string> = {}
            if (frameOptions.length > 0) {
              variantOptions["Monture"] = options.frame || frameOptions[0]
            }
            if (lensOptions.length > 0) {
              variantOptions["Verres"] = options.lens || lensOptions[0]
            }
            if (audioOptions.length > 0) {
              variantOptions["Audio"] = options.audio || audioOptions[0]
            }

            return {
              title: variant.name,
              sku: variant.sku,
              manage_inventory: false,
              options: variantOptions,
              prices: [
                {
                  amount: variant.price,
                  currency_code: "eur",
                },
              ],
            }
          }),
    }
  })

  logger.info("🚀 Importing products...")
  await createProductsWorkflow(container).run({
    input: {
      products: productsToCreate,
    },
  })

  logger.info("\n✅ Import completed!")
  logger.info(`   Products created: ${productsToCreate.length}`)
  logger.info(`   Total variants: ${exportData.summary.totalVariants}`)
}
