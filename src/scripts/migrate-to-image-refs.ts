/**
 * Migration Script: Re-upload Images to ImageRef System
 *
 * Reads the latest media snapshot and re-uploads all images to MinIO
 * using the new ImageRef system with collision-resistant keys.
 *
 * Usage:
 *   DRY_RUN=true npm exec medusa exec ./src/scripts/migrate-to-image-refs.ts  # Preview
 *   npm exec medusa exec ./src/scripts/migrate-to-image-refs.ts                # Execute
 *
 * Features:
 *   - DRY_RUN mode (default: true)
 *   - Batch progress logging
 *   - Error handling per image (continues on failure)
 *   - Summary report
 *   - Re-uploads to MinIO with format: products/{handle}/{YYYYMMDD}-{uuid8}.{ext}
 */

import { Modules } from "@medusajs/framework/utils";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { uploadImage, syncProductImages } from "../lib/image-ref";
import { ImageRef } from "../types/image-ref";
import { assertRemoteDatabase } from '../utils/assert-remote-db';

// Configuration
const DRY_RUN = process.env.DRY_RUN !== "false"; // Default: true (safe)
const EXPORTS_DIR = path.join(process.cwd(), "exports");

// Statistics
interface MigrationStats {
  productsProcessed: number;
  productsWithImages: number;
  imagesTotal: number;
  imagesSuccess: number;
  imagesFailed: number;
  imagesSkipped: number;
  errors: Array<{ productHandle: string; imageUrl: string; error: string }>;
}

const stats: MigrationStats = {
  productsProcessed: 0,
  productsWithImages: 0,
  imagesTotal: 0,
  imagesSuccess: 0,
  imagesFailed: 0,
  imagesSkipped: 0,
  errors: [],
};

/**
 * Find the latest snapshot file
 */
function findLatestSnapshot(): string | null {
  if (!fs.existsSync(EXPORTS_DIR)) {
    return null;
  }

  const files = fs
    .readdirSync(EXPORTS_DIR)
    .filter((f) => f.startsWith("medusa-media-snapshot-") && f.endsWith(".json"))
    .sort()
    .reverse();

  return files.length > 0 ? path.join(EXPORTS_DIR, files[0]) : null;
}

/**
 * Load snapshot data
 */
function loadSnapshot(filePath: string): any {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000, // 10 seconds
    });

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`  ❌ Failed to download: ${error.message}`);
    return null;
  }
}

/**
 * Extract filename from URL
 */
function extractFilename(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1];
}

/**
 * Detect MIME type from filename
 */
function detectMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg"; // Fallback
  }
}

/**
 * Migrate a single product
 */
async function migrateProduct(
  productModuleService: any,
  product: any
): Promise<void> {
  stats.productsProcessed++;

  if (!product.images || product.images.length === 0) {
    console.log(`\n📦 ${product.handle} - No images to migrate`);
    return;
  }

  stats.productsWithImages++;
  stats.imagesTotal += product.images.length;

  console.log(
    `\n📦 ${product.handle} (${product.images.length} images) - ${product.title}`
  );

  if (!product.handle) {
    console.error(`  ⚠️  Product has no handle, skipping`);
    stats.imagesSkipped += product.images.length;
    return;
  }

  // Fetch full product from database
  let fullProduct;
  try {
    fullProduct = await productModuleService.retrieveProduct(product.id);
  } catch (error: any) {
    console.error(`  ❌ Failed to retrieve product: ${error.message}`);
    stats.imagesFailed += product.images.length;
    return;
  }

  // Check if already migrated
  const existingRefs = (fullProduct.metadata as any)?.media?.refs || [];
  if (existingRefs.length > 0) {
    console.log(`  ⏭️  Already migrated (${existingRefs.length} refs exist), skipping`);
    stats.imagesSkipped += product.images.length;
    return;
  }

  // Process each image
  const newRefs: ImageRef[] = [];

  for (let i = 0; i < product.images.length; i++) {
    const image = product.images[i];
    const imageNum = i + 1;

    console.log(`  [${imageNum}/${product.images.length}] ${image.url}`);

    // Download image
    const content = await downloadImage(image.url);
    if (!content) {
      stats.imagesFailed++;
      stats.errors.push({
        productHandle: product.handle,
        imageUrl: image.url,
        error: "Download failed",
      });
      continue;
    }

    // Prepare upload
    const filename = extractFilename(image.url);
    const mimeType = detectMimeType(filename);
    const sortOrder = image.metadata?.order ?? i;
    const role = i === 0 ? "thumbnail" : "gallery";

    if (DRY_RUN) {
      console.log(
        `    [DRY RUN] Would upload: ${filename} (${(content.length / 1024).toFixed(1)} KB)`
      );
      stats.imagesSuccess++;
      continue;
    }

    // Upload to MinIO
    try {
      const imageRef = await uploadImage({
        content,
        filename,
        mimeType,
        productHandle: product.handle,
        sortOrder,
        role: role as any,
      });

      newRefs.push(imageRef);

      console.log(
        `    ✅ Uploaded: ${imageRef.minioKey} (${(content.length / 1024).toFixed(1)} KB)`
      );
      stats.imagesSuccess++;
    } catch (error: any) {
      console.error(`    ❌ Upload failed: ${error.message}`);
      stats.imagesFailed++;
      stats.errors.push({
        productHandle: product.handle,
        imageUrl: image.url,
        error: error.message,
      });
    }
  }

  // Update product metadata (LIVE mode only)
  if (!DRY_RUN && newRefs.length > 0) {
    try {
      await productModuleService.updateProducts(product.id, {
        metadata: {
          ...fullProduct.metadata,
          media: {
            refs: newRefs,
            version: "1.0.0",
          },
        },
        images: syncProductImages(newRefs),
        thumbnail: newRefs[0]?.url || null,
      });

      console.log(`  ✅ Updated product metadata (${newRefs.length} refs)`);
    } catch (error: any) {
      console.error(`  ❌ Failed to update metadata: ${error.message}`);
    }
  }
}

/**
 * Print summary report
 */
function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 Migration Summary");
  console.log("=".repeat(60));
  console.log(`Mode:                ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Products processed:  ${stats.productsProcessed}`);
  console.log(`Products w/ images:  ${stats.productsWithImages}`);
  console.log(`Total images:        ${stats.imagesTotal}`);
  console.log(`✅ Success:          ${stats.imagesSuccess}`);
  console.log(`❌ Failed:           ${stats.imagesFailed}`);
  console.log(`⏭️  Skipped:          ${stats.imagesSkipped}`);

  if (stats.errors.length > 0) {
    console.log("\n❌ Errors:");
    stats.errors.forEach((err) => {
      console.log(`  - ${err.productHandle}: ${err.imageUrl}`);
      console.log(`    ${err.error}`);
    });
  }

  console.log("\n" + "=".repeat(60));

  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE - No changes made");
    console.log("To execute migration, run:");
    console.log("  npm exec medusa exec ./src/scripts/migrate-to-image-refs.ts");
  }
}

/**
 * Main migration function
 */
export default async function migrate({ container }: any) {
  // Guard: Refuse local DB usage
  assertRemoteDatabase();

  console.log("=".repeat(60));
  console.log("🚀 ImageRef Migration Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (safe)" : "LIVE (will modify database)"}`);

  // Find snapshot
  const snapshotPath = findLatestSnapshot();
  if (!snapshotPath) {
    console.error("❌ No snapshot found in exports/");
    console.error("Run this first: npm exec medusa exec ./src/scripts/purge-product-images.ts");
    process.exit(1);
  }

  console.log(`📄 Loading snapshot: ${path.basename(snapshotPath)}`);
  const snapshot = loadSnapshot(snapshotPath);

  console.log(`📦 Found ${snapshot.totalProducts} products`);
  console.log(`🖼️  Found ${snapshot.totalImages} images`);

  // Get Product Module
  const productModuleService = container.resolve(Modules.PRODUCT);

  // Migrate each product
  for (const product of snapshot.products) {
    await migrateProduct(productModuleService, product);
  }

  // Print summary
  printSummary();
}
