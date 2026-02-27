/**
 * ImageRef Helper Library
 *
 * Business logic for image management (upload, delete, sync, validation)
 * Integrates with MinIO via S3 client
 */

import { randomUUID } from 'crypto';
import { ImageRef, ImageRefRole, IMAGE_REF_CONSTRAINTS } from '../types/image-ref';
import { uploadObject, deleteObject, buildPublicUrl } from './s3';

/**
 * Generate MinIO key with timestamp and UUID
 * Format: products/{handle}/{YYYYMMDD}-{uuid8}.{ext}
 *
 * Examples:
 *   - products/shield/20260227-f47ac10b.jpg
 *   - products/aura-audio/20260227-9b3d4c5e.png
 *
 * @param productHandle Product handle (e.g., "shield", "aura-audio")
 * @param originalFilename Original filename with extension
 * @returns MinIO key for S3 storage
 */
export function generateImageRefKey(
  productHandle: string,
  originalFilename: string
): string {
  const ext = getFileExtension(originalFilename);
  const timestamp = formatTimestamp(new Date());
  const uuid = randomUUID().split('-')[0]; // First segment only (8 chars)

  return `products/${productHandle}/${timestamp}-${uuid}.${ext}`;
}

/**
 * Format timestamp as YYYYMMDD
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Extract file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) {
    throw new Error('Invalid filename: no extension');
  }
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Validate image file upload
 *
 * @throws Error if validation fails
 */
export function validateImageFile(options: {
  content: Buffer;
  filename: string;
  mimeType: string;
}): void {
  const { content, filename, mimeType } = options;

  // Check file size
  if (content.length > IMAGE_REF_CONSTRAINTS.MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(content.length / 1024 / 1024).toFixed(2)} MB ` +
      `(max: ${IMAGE_REF_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024} MB)`
    );
  }

  // Check MIME type
  if (!IMAGE_REF_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `Invalid MIME type: ${mimeType}. ` +
      `Allowed: ${IMAGE_REF_CONSTRAINTS.ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  // Check extension
  const ext = getFileExtension(filename);
  if (!IMAGE_REF_CONSTRAINTS.ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid file extension: .${ext}. ` +
      `Allowed: ${IMAGE_REF_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')}`
    );
  }

  // Check filename length
  if (filename.length > IMAGE_REF_CONSTRAINTS.MAX_FILENAME_LENGTH) {
    throw new Error(
      `Filename too long: ${filename.length} chars ` +
      `(max: ${IMAGE_REF_CONSTRAINTS.MAX_FILENAME_LENGTH})`
    );
  }
}

/**
 * Create ImageRef object from upload result
 */
export function createImageRef(options: {
  url: string;
  minioKey: string;
  bucket: string;
  mimeType: string;
  size: number;
  sortOrder: number;
  role: ImageRefRole;
  width?: number;
  height?: number;
  originalFilename?: string;
  checksum?: string;
}): ImageRef {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    url: options.url,
    minioKey: options.minioKey,
    bucket: options.bucket,
    mimeType: options.mimeType,
    size: options.size,
    width: options.width,
    height: options.height,
    checksum: options.checksum,
    originalFilename: options.originalFilename,
    sortOrder: options.sortOrder,
    role: options.role,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Upload image to MinIO and generate ImageRef
 *
 * @param options Upload configuration
 * @returns Complete ImageRef object
 */
export async function uploadImage(options: {
  content: Buffer;
  filename: string;
  mimeType: string;
  productHandle: string;
  sortOrder: number;
  role: ImageRefRole;
  width?: number;
  height?: number;
}): Promise<ImageRef> {
  const { content, filename, mimeType, productHandle, sortOrder, role, width, height } = options;

  // Validate file
  validateImageFile({ content, filename, mimeType });

  // Generate MinIO key
  const minioKey = generateImageRefKey(productHandle, filename);

  // Upload to MinIO
  const url = await uploadObject({
    key: minioKey,
    body: content,
    contentType: mimeType,
    metadata: {
      originalFilename: filename,
      role: role,
      uploadedAt: new Date().toISOString(),
    },
  });

  // Create ImageRef
  return createImageRef({
    url,
    minioKey,
    bucket: process.env.S3_BUCKET || 'mytechgear-assets',
    mimeType,
    size: content.length,
    sortOrder,
    role,
    width,
    height,
    originalFilename: filename,
  });
}

/**
 * Delete image from MinIO
 *
 * @param imageRef ImageRef to delete
 */
export async function deleteImage(imageRef: ImageRef): Promise<void> {
  await deleteObject(imageRef.minioKey);
}

/**
 * Sync metadata.media.refs → product.images[] (backwards compatibility)
 *
 * Medusa v2 expects product.images[] format:
 * { url: string, metadata?: { alt?: string, order?: number } }
 *
 * @param imageRefs Array of ImageRefs
 * @returns Array in product.images format
 */
export function syncProductImages(
  imageRefs: ImageRef[]
): Array<{ url: string; metadata: Record<string, any> }> {
  return imageRefs
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(ref => ({
      url: ref.url,
      metadata: {
        alt: ref.originalFilename || `Image ${ref.sortOrder + 1}`,
        order: ref.sortOrder,
        role: ref.role,
        imageRefId: ref.id, // Link back to ImageRef
      },
    }));
}

/**
 * Get next available sort order for a product
 *
 * @param existingRefs Existing ImageRefs
 * @returns Next sortOrder value
 */
export function getNextSortOrder(existingRefs: ImageRef[]): number {
  if (existingRefs.length === 0) return 0;
  const maxOrder = Math.max(...existingRefs.map(ref => ref.sortOrder));
  return maxOrder + 1;
}

/**
 * Find ImageRef by ID in product metadata
 *
 * @param product Product object
 * @param imageRefId ImageRef ID to find
 * @returns ImageRef or null if not found
 */
export function findImageRefById(
  product: any,
  imageRefId: string
): ImageRef | null {
  const refs = product.metadata?.media?.refs || [];
  return refs.find((ref: ImageRef) => ref.id === imageRefId) || null;
}

/**
 * Find product containing a specific ImageRef
 *
 * @param productModuleService Product module service
 * @param imageRefId ImageRef ID to search for
 * @returns {product, imageRef} or null if not found
 */
export async function findProductByImageRefId(
  productModuleService: any,
  imageRefId: string
): Promise<{ product: any; imageRef: ImageRef } | null> {
  // Query products with metadata search
  // Note: This may require iterating through products if metadata search is not indexed
  const products = await productModuleService.listProducts({});

  for (const product of products) {
    const refs = product.metadata?.media?.refs || [];
    const imageRef = refs.find((ref: ImageRef) => ref.id === imageRefId);
    if (imageRef) {
      return { product, imageRef };
    }
  }

  return null;
}
