/**
 * ImageRef Type Definitions
 *
 * Complete type system for product image management with MinIO storage.
 * Images are stored in product.metadata.media.refs[] with dual-sync to product.images[]
 */

/**
 * ImageRef — Structured image metadata for product media
 *
 * Stored in product.metadata.media.refs[]
 * Provides complete MinIO context for uploads/deletions
 */
export interface ImageRef {
  // Identity
  id: string                    // UUID v4 (e.g., "f47ac10b-58cc-4372-a567-0e02b2c3d479")

  // Storage
  url: string                   // Public CDN URL (e.g., "https://s3.assets.mytechgear.eu/products/shield/20260227-uuid.jpg")
  minioKey: string              // S3 object key for deletion (e.g., "products/shield/20260227-uuid.jpg")
  bucket: string                // Bucket name (e.g., "mytechgear-assets")

  // File metadata
  mimeType: string              // MIME type (e.g., "image/jpeg", "image/png", "image/webp")
  size: number                  // File size in bytes
  width?: number                // Image width in pixels (optional)
  height?: number               // Image height in pixels (optional)
  checksum?: string             // SHA-256 checksum for integrity verification (optional)
  originalFilename?: string     // Original uploaded filename (optional)

  // Organization
  sortOrder: number             // Display order (0-based index)
  role: ImageRefRole            // Image purpose/type

  // Timestamps
  createdAt: string             // ISO 8601 timestamp (e.g., "2026-02-27T10:30:00.000Z")
  updatedAt: string             // ISO 8601 timestamp
}

/**
 * Image role types
 */
export type ImageRefRole =
  | 'thumbnail'   // Product thumbnail (one per product)
  | 'gallery'     // Gallery images (multiple)
  | 'variant'     // Variant-specific images
  | 'main'        // Primary hero image

/**
 * Product metadata structure with ImageRef
 */
export interface ProductMediaMetadata {
  media: {
    refs: ImageRef[]            // Array of image references
    version: string             // Metadata schema version (e.g., "1.0.0")
  }
  [key: string]: any            // Other metadata fields preserved
}

/**
 * API Request types
 */

// POST /admin/image-refs
export interface CreateImageRefRequest {
  productId: string             // Product ID to attach image to
  role: ImageRefRole            // Image role
  sortOrder?: number            // Optional sort order (auto-incremented if omitted)

  // Upload source (one of these required)
  file?: {
    content: string             // Base64-encoded file content
    filename: string            // Original filename
    mimeType: string            // MIME type
  }
  url?: string                  // Or external URL to download

  // Optional metadata
  width?: number
  height?: number
  originalFilename?: string
}

// PUT /admin/image-refs/[id]
export interface UpdateImageRefRequest {
  sortOrder?: number
  role?: ImageRefRole
  // Note: Cannot change URL/file (delete and re-upload instead)
}

// Response wrapper
export interface ImageRefResponse {
  imageRef: ImageRef
}

export interface ImageRefsListResponse {
  imageRefs: ImageRef[]
  total: number
}

// Error response
export interface ImageRefErrorResponse {
  error: string
  details?: string
}

/**
 * Validation constants
 */
export const IMAGE_REF_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,        // 10 MB
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ],
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  MAX_FILENAME_LENGTH: 255,
  MIN_DIMENSION: 100,                     // Min width/height in pixels
  MAX_DIMENSION: 8000,                    // Max width/height in pixels
} as const;
