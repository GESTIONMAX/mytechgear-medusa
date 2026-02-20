/**
 * S3 Client — MinIO (S3-compatible) via instance unique Coolify
 *
 * Architecture:
 * - Instance unique MinIO sur Coolify (prod)
 * - Dev local: accès via SSH tunnel (localhost:19000 → minio:9000)
 * - Prod: accès réseau Docker interne (http://minio:9000)
 * - Public: FILE_URL indépendant (CDN: https://s3.assets.mytechgear.eu)
 *
 * Variables:
 * - S3_ENDPOINT: endpoint interne (tunnel ou réseau Docker)
 * - FILE_URL: URL publique pour les assets (CDN)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ─── Configuration ────────────────────────────────────────────────────────────

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:19000";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const S3_BUCKET = process.env.S3_BUCKET || "mytechgear-assets";
const FILE_URL = process.env.FILE_URL || `${S3_ENDPOINT}/${S3_BUCKET}`;

// Client S3 configuré pour MinIO (S3-compatible)
export const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // OBLIGATOIRE pour MinIO (path-style URLs)
});

// ─── Upload ───────────────────────────────────────────────────────────────────

export interface UploadOptions {
  key: string; // chemin de l'objet dans le bucket (ex: "products/shield.jpg")
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string; // ex: "image/jpeg"
  metadata?: Record<string, string>;
}

/**
 * Upload un fichier vers MinIO
 * @returns URL publique de l'objet uploadé
 */
export async function uploadObject(options: UploadOptions): Promise<string> {
  const { key, body, contentType, metadata } = options;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });

  await s3Client.send(command);

  return buildPublicUrl(key);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/**
 * Supprime un objet de MinIO
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

// ─── URL Builder ──────────────────────────────────────────────────────────────

/**
 * Construit l'URL publique d'un objet
 * Utilise FILE_URL (CDN) si configuré, sinon fallback sur S3_ENDPOINT
 */
export function buildPublicUrl(key: string): string {
  const baseUrl = FILE_URL.endsWith("/") ? FILE_URL.slice(0, -1) : FILE_URL;
  return `${baseUrl}/${key}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extrait la clé (key) d'une URL S3
 * ex: "https://s3.assets.mytechgear.eu/products/shield.jpg" → "products/shield.jpg"
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split("/").filter((s) => s);

    // Si l'URL contient le bucket comme premier segment, l'ignorer
    // ex: http://localhost:19000/mytechgear-assets/products/shield.jpg
    if (pathSegments.length > 1 && pathSegments[0] === S3_BUCKET) {
      return pathSegments.slice(1).join("/");
    }

    // Sinon, retourner tout le path (cas CDN sans bucket dans l'URL)
    // ex: https://s3.assets.mytechgear.eu/products/shield.jpg
    return pathSegments.join("/");
  } catch {
    return null;
  }
}
