# Safe PIM Re-Import Procedure

**CRITICAL**: Follow this procedure BEFORE any PIM re-import to prevent data loss.

## Prerequisites

Ensure these files exist:
- [x] `/src/lib/metadata-ownership.ts` - Ownership validation library
- [x] `/src/scripts/export-product-metadata.ts` - Backup tool
- [x] `/src/scripts/verify-post-import.ts` - Verification tool
- [x] `/src/scripts/test-safe-import.ts` - Single-product test
- [x] `/src/scripts/import-chamelo-shield.ts` - Updated with safe merge

## Step-by-Step Procedure

### Step 1: Backup Current Metadata

```bash
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear/mytechgear-medusa

# Create backup
npm run medusa exec scripts/export-product-metadata.ts

# Verify backup created
ls -lh backups/metadata/

# Expected output:
# backup-2026-03-08T10-00-00.json
```

**Save the backup filename** - you'll need it for verification later.

### Step 2: Test on Single Product

```bash
# Test on a product with OPS enrichment (e.g., music-shield)
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=music-shield

# Expected output:
# ✅ TEST PASSED
# All OPS fields would be preserved during re-import
# Safe to proceed with full import
```

**If test FAILS, DO NOT proceed with full import!**

### Step 3: Review Test Results

The test should show:
```
📊 Current Metadata Analysis:
   Total fields: 32
   PIM fields: 28
   OPS fields: 4

🎯 OPS-Protected Fields Found:
   - features: Array(5)
   - rating: Object
   - badges: Array(2)
   - specs: Array(8)

✅ Verification:
   ✅ features: Preserved
   ✅ rating: Preserved
   ✅ badges: Preserved
   ✅ specs: Preserved

✅ TEST PASSED
```

### Step 4: Apply Test Changes (Optional)

To actually apply the test changes:

```bash
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=music-shield --dry-run=false

# Verify the product
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08T10-00-00.json --product-handle=music-shield
```

### Step 5: Run Full Import with Safe Merge

```bash
# The import script now includes safe merge logic
npm run medusa exec scripts/import-chamelo-shield.ts

# Expected output:
# 🔍 Checking for existing products...
#    ✏️  Updating existing: shield
#       Preserving 0 OPS fields:
#    ✏️  Updating existing: music-shield
#       Preserving 4 OPS fields: features, rating, badges, specs
#
# 🚀 Importing 2 products with safe merge...
# ✅ Chamelo Shield import completed!
```

### Step 6: Verify No Data Loss

```bash
# Run verification against backup
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08T10-00-00.json

# Expected output:
# ✅ VERIFICATION PASSED
#    12 products checked
#    All OPS fields preserved successfully
#    No data loss detected
```

### Step 7: If Verification Fails

If verification detects data loss:

```bash
# View violations
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08T10-00-00.json

# Output will show:
# ❌ VERIFICATION FAILED
#    2 products have OPS field violations
#    4 total field violations detected
#
# Violations:
#   Product: music-shield
#     ❌ Field: features
#        LOST: Field was removed
#        Before: [{"key":"audio_bluetooth",...

# Auto-restore lost fields
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08T10-00-00.json --auto-restore=true
```

## Quick Reference Commands

| Task | Command |
|------|---------|
| Backup metadata | `npm run medusa exec scripts/export-product-metadata.ts` |
| Test single product | `npm run medusa exec scripts/test-safe-import.ts -- --product-handle=X` |
| Run safe import | `npm run medusa exec scripts/import-chamelo-shield.ts` |
| Verify no data loss | `npm run medusa exec scripts/verify-post-import.ts -- --backup-file=PATH` |
| Restore from backup | `npm run medusa exec scripts/verify-post-import.ts -- --backup-file=PATH --auto-restore=true` |

## Troubleshooting

### "Product has X OPS-enriched fields that must be preserved"

This is a **warning**, not an error. It means:
- The product has OPS enrichment (features, ratings, etc.)
- The safe merge will preserve these fields
- No action needed - this is expected

### "PIM import would overwrite OPS fields"

This is an **error**. It means:
- The import script is NOT using safe merge
- Update the import script to use `preserveOpsFields()`
- See [import-chamelo-shield.ts](./src/scripts/import-chamelo-shield.ts) lines 400-430 for example

### "Field X was removed"

This means:
- An OPS field was lost during import
- Restore from backup immediately
- Debug the safe merge logic

### "Attempting to modify PIM-owned fields"

This error occurs when using the OPS endpoint. It means:
- You're trying to write to PIM-owned fields via OPS
- Remove PIM fields from your request
- Or use `mode='force'` (not recommended)

## Best Practices

1. **Always backup** before any re-import
2. **Always test** on a single product first
3. **Always verify** after full import
4. **Keep backups** for at least 7 days
5. **Never skip** the verification step

## Field Ownership Quick Reference

### PIM Owns (Technical Specs)
- `brand`, `product_family`, `has_audio`, `bluetooth`
- `weight_grams`, `frame_*_mm`, `battery_*`
- `lens_technology`, `uv_protection`, `water_resistance`
- All technical specifications

### OPS Owns (Marketing & UI)
- `features[]`, `specs[]`, `rating`, `badges[]`
- `inTheBox[]`, `warranty` (object), `faq[]`
- `seo_description`, `seo_keywords` (after migration)

See [FIELD_OWNERSHIP.md](./FIELD_OWNERSHIP.md) for complete list.

## Migration: `seo_keywords` Ownership

The `seo_keywords` field is currently written by both PIM and OPS. To migrate:

1. **Week 1**: PIM continues writing `seo_keywords` (backward compatible)
2. **Week 2**: PIM writes to `pim.source_keywords` instead
3. **Week 3**: OPS becomes sole owner of `seo_keywords`

During migration, you may see warnings like:
```
⚠️  seo_keywords is being migrated to OPS ownership
```

This is expected and non-blocking.

## Support

For issues with the safe import procedure:
1. Review [FIELD_OWNERSHIP.md](../../mytechgear-backend/FIELD_OWNERSHIP.md)
2. Check [metadata-ownership.ts](./src/lib/metadata-ownership.ts) for field lists
3. Inspect backup files in `backups/metadata/`
4. Review import script logs

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-08 | 1.0 | Initial version with safe merge implementation |
