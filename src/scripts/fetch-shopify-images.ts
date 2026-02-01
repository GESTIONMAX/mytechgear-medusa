import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

/**
 * Script de récupération des images produits depuis Shopify (chamelo.com)
 *
 * Utilise l'API publique .json de Shopify pour :
 * 1. Récupérer tous les produits avec pagination
 * 2. Extraire les URLs d'images
 * 3. Télécharger les images localement
 * 4. Créer un mapping handle → images pour l'upload Medusa
 *
 * Source: https://chamelo.com/products.json
 * Rate limiting: 2 req/sec (500ms entre requêtes)
 */

const SHOPIFY_STORE = 'chamelo.com'
const OUTPUT_DIR = './images/chamelo'
const MAPPING_FILE = './images/image-mapping.json'
const IMAGE_SIZE = '1024x1024' // Options: large, 1024x1024, 2048x2048, original

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  images: ShopifyImage[]
}

interface ShopifyImage {
  id: number
  src: string
  width: number
  height: number
}

interface ImageMapping {
  [handle: string]: string[]
}

/**
 * Utilitaire: Sleep pour rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Récupère tous les produits depuis Shopify avec pagination
 */
async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []
  let page = 1
  let hasMore = true

  console.log('🔍 Fetching products from Shopify...\n')

  while (hasMore) {
    const url = `https://${SHOPIFY_STORE}/products.json?limit=250&page=${page}`

    try {
      console.log(`   Page ${page}...`)
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data: any = await res.json()

      if (data.products.length === 0) {
        hasMore = false
      } else {
        products.push(...data.products)
        console.log(`   ✓ Found ${data.products.length} products`)
        page++
        await sleep(500) // Rate limiting: 2 req/sec
      }
    } catch (error: any) {
      console.error(`   ✗ Error fetching page ${page}: ${error.message}`)
      hasMore = false
    }
  }

  console.log(`\n✅ Total products fetched: ${products.length}\n`)
  return products
}

/**
 * Modifie l'URL Shopify pour obtenir une taille spécifique
 */
function resizeShopifyImageUrl(url: string, size: string): string {
  // Format URL: https://cdn.shopify.com/s/files/1/0XXX/product.jpg?v=123
  const [baseUrl, queryString] = url.split('?')
  const ext = path.extname(baseUrl)
  const baseWithoutExt = baseUrl.replace(ext, '')

  return `${baseWithoutExt}_${size}${ext}${queryString ? '?' + queryString : ''}`
}

/**
 * Télécharge une image depuis une URL
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Failed to download: ${res.statusText}`)
  }

  const buffer = await res.arrayBuffer()
  fs.writeFileSync(filepath, Buffer.from(buffer))
}

/**
 * Télécharge toutes les images des produits
 */
async function downloadImages(products: ShopifyProduct[]): Promise<ImageMapping> {
  // Créer le dossier de sortie
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const mapping: ImageMapping = {}
  let totalDownloaded = 0

  console.log('📥 Downloading images...\n')

  for (const product of products) {
    const handle = product.handle
    const images = product.images

    if (images.length === 0) {
      console.log(`   ⏭️  ${handle} - No images`)
      continue
    }

    console.log(`   📦 ${product.title} (${handle})`)
    mapping[handle] = []

    for (let i = 0; i < images.length; i++) {
      const image = images[i]

      // Obtenir l'URL avec la taille souhaitée
      const imageUrl = resizeShopifyImageUrl(image.src, IMAGE_SIZE)

      // Déterminer l'extension
      const ext = path.extname(image.src.split('?')[0]) || '.jpg'

      // Nom du fichier: {handle}-{index}.{ext}
      const filename = `${handle}-${i}${ext}`
      const filepath = path.join(OUTPUT_DIR, filename)

      try {
        await downloadImage(imageUrl, filepath)
        mapping[handle].push(filename)
        console.log(`      ✓ ${filename}`)
        totalDownloaded++

        // Rate limiting entre chaque image
        await sleep(200)
      } catch (error: any) {
        console.error(`      ✗ ${filename} - Error: ${error.message}`)
      }
    }
  }

  console.log(`\n✅ Total images downloaded: ${totalDownloaded}\n`)
  return mapping
}

/**
 * Sauvegarde le mapping dans un fichier JSON
 */
function saveMapping(mapping: ImageMapping): void {
  const mappingDir = path.dirname(MAPPING_FILE)
  if (!fs.existsSync(mappingDir)) {
    fs.mkdirSync(mappingDir, { recursive: true })
  }

  fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2))
  console.log(`💾 Mapping saved to: ${MAPPING_FILE}`)
}

/**
 * Main function
 */
async function main() {
  console.log('=' .repeat(60))
  console.log('📸 SHOPIFY IMAGES DOWNLOADER')
  console.log('=' .repeat(60))
  console.log(`\nStore: ${SHOPIFY_STORE}`)
  console.log(`Output: ${OUTPUT_DIR}`)
  console.log(`Size: ${IMAGE_SIZE}`)
  console.log('')

  try {
    // 1. Fetch tous les produits
    const products = await fetchAllProducts()

    // 2. Download toutes les images
    const mapping = await downloadImages(products)

    // 3. Sauvegarder le mapping
    saveMapping(mapping)

    // 4. Résumé
    console.log('\n' + '='.repeat(60))
    console.log('✅ DOWNLOAD COMPLETED!')
    console.log('='.repeat(60))
    console.log(`\n📊 Statistics:`)
    console.log(`   Products: ${products.length}`)
    console.log(`   Products with images: ${Object.keys(mapping).length}`)
    console.log(`   Total images: ${Object.values(mapping).flat().length}`)
    console.log(`\n📁 Files:`)
    console.log(`   Images: ${OUTPUT_DIR}/`)
    console.log(`   Mapping: ${MAPPING_FILE}`)
    console.log(`\n🔄 Next step:`)
    console.log(`   Run: npx medusa exec ./src/scripts/upload-product-images.ts`)

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run
main()
