-- ============================================
-- MyTechGear - Product Media Purge (SQL Fallback)
-- Use only if Admin API purge fails
-- Medusa v2.13.1 Schema
-- ============================================
--
-- SAFETY:
-- - This script uses ROLLBACK by default
-- - Review the "PREVIEW" section before committing
-- - Change ROLLBACK to COMMIT at the end to apply changes
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/sql/purge-product-media.sql
--
-- ============================================

BEGIN;

-- ============================================
-- PRE-PURGE VERIFICATION
-- ============================================

\echo ''
\echo '========================================='
\echo 'PRE-PURGE VERIFICATION'
\echo '========================================='
\echo ''

SELECT
  'Products with thumbnails' as metric,
  COUNT(*) as count
FROM product
WHERE thumbnail IS NOT NULL

UNION ALL

SELECT
  'Product images' as metric,
  COUNT(*) as count
FROM product_image

UNION ALL

SELECT
  'Variants with thumbnails' as metric,
  COUNT(*) as count
FROM product_variant
WHERE thumbnail IS NOT NULL

UNION ALL

SELECT
  'Variant-Image associations (ManyToMany)' as metric,
  COUNT(*) as count
FROM product_variant_product_image;

\echo ''
\echo '========================================='
\echo 'EXECUTING PURGE...'
\echo '========================================='
\echo ''

-- ============================================
-- STEP 1: Clear Product Thumbnails
-- ============================================

UPDATE product
SET thumbnail = NULL
WHERE thumbnail IS NOT NULL;

\echo 'STEP 1: Product thumbnails cleared'

-- ============================================
-- STEP 2: Clear Product Images Relationship
-- ============================================

-- Delete ProductImage entities (HasMany relationship)
-- Note: Medusa v2 uses "product_image" table, not "image"
DELETE FROM product_image;

\echo 'STEP 2: Product images deleted'

-- ============================================
-- STEP 3: Clear Product Metadata (media/minioKeys/images)
-- ============================================

UPDATE product
SET metadata = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(COALESCE(metadata, '{}'::jsonb))
  WHERE key NOT IN ('media', 'minioKeys', 'images')
)
WHERE metadata IS NOT NULL
  AND (
    metadata ? 'media' OR
    metadata ? 'minioKeys' OR
    metadata ? 'images'
  );

\echo 'STEP 3: Product metadata cleaned'

-- ============================================
-- STEP 4: Clear Variant Thumbnails
-- ============================================

UPDATE product_variant
SET thumbnail = NULL
WHERE thumbnail IS NOT NULL;

\echo 'STEP 4: Variant thumbnails cleared'

-- ============================================
-- STEP 5: Clear Variant-Image Associations (v2.11.2+ ManyToMany)
-- ============================================

-- Delete ManyToMany associations between variants and images
DELETE FROM product_variant_product_image;

\echo 'STEP 5: Variant-image associations deleted'

-- ============================================
-- STEP 6: Clear Variant Metadata
-- ============================================

UPDATE product_variant
SET metadata = (
  SELECT jsonb_object_agg(key, value)
  FROM jsonb_each(COALESCE(metadata, '{}'::jsonb))
  WHERE key NOT IN ('media', 'images', 'minioKeys')
)
WHERE metadata IS NOT NULL
  AND (
    metadata ? 'media' OR
    metadata ? 'images' OR
    metadata ? 'minioKeys'
  );

\echo 'STEP 6: Variant metadata cleaned'

-- ============================================
-- POST-PURGE VERIFICATION
-- ============================================

\echo ''
\echo '========================================='
\echo 'POST-PURGE VERIFICATION'
\echo '========================================='
\echo ''

SELECT
  'Products with thumbnails' as metric,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM product
WHERE thumbnail IS NOT NULL

UNION ALL

SELECT
  'Product images' as metric,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM product_image

UNION ALL

SELECT
  'Variants with thumbnails' as metric,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM product_variant
WHERE thumbnail IS NOT NULL

UNION ALL

SELECT
  'Variant-Image associations' as metric,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM product_variant_product_image;

\echo ''
\echo '========================================='
\echo 'SAMPLE VERIFICATION: Product Data Integrity'
\echo '========================================='
\echo ''

-- Verify that other product fields are preserved
SELECT
  id,
  title,
  handle,
  status,
  CASE WHEN description IS NOT NULL THEN 'Present' ELSE 'NULL' END as description_status
FROM product
LIMIT 5;

-- ============================================
-- FINAL ACTION: ROLLBACK (default) or COMMIT
-- ============================================

\echo ''
\echo '========================================='
\echo 'SAFETY: ROLLBACK (No changes applied)'
\echo '========================================='
\echo ''
\echo 'To apply changes, edit this file and replace ROLLBACK with COMMIT'
\echo ''

ROLLBACK;  -- SAFETY: Change to COMMIT when ready to apply

-- ============================================
-- USAGE NOTES:
-- ============================================
--
-- 1. DRY RUN (Default):
--    psql "$DATABASE_URL" -f scripts/sql/purge-product-media.sql
--
-- 2. REAL PURGE (After editing ROLLBACK → COMMIT):
--    vim scripts/sql/purge-product-media.sql
--    psql "$DATABASE_URL" -f scripts/sql/purge-product-media.sql
--
-- 3. Verify after commit:
--    psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product WHERE thumbnail IS NOT NULL"
--    psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product_image"
--    psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product_variant WHERE thumbnail IS NOT NULL"
--    psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM product_variant_product_image"
--
-- ============================================
-- ADDITIONAL VERIFICATION QUERIES:
-- ============================================
--
-- Check for remaining metadata references:
-- SELECT id, handle, jsonb_object_keys(metadata) as keys
-- FROM product
-- WHERE metadata ? 'media' OR metadata ? 'minioKeys' OR metadata ? 'images'
-- LIMIT 10;
--
-- Check variant metadata:
-- SELECT id, sku, jsonb_object_keys(metadata) as keys
-- FROM product_variant
-- WHERE metadata ? 'media' OR metadata ? 'images' OR metadata ? 'minioKeys'
-- LIMIT 10;
--
-- ============================================
