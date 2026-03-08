# Metadata Ownership Implementation Guide

**Status**: ✅ Fully Implemented
**Date**: 2026-03-08
**Version**: 1.0

---

## Overview

This document provides a complete reference for the metadata ownership safeguards implemented to prevent data loss during PIM re-imports.

**Problem Solved**: PIM re-imports were overwriting OPS-enriched metadata (features, ratings, badges), causing data loss.

**Solution**: Field ownership boundaries with safe merge logic and validation at both PIM import and OPS endpoint levels.

---

## Architecture

### Single Source of Truth

**All backend code lives in `/mytechgear-medusa`**

The previous `/mytechgear-backend` directory has been deprecated and its contents migrated here.

### Data Flow

```
PIM Import Scripts → Medusa Products → OPS Enrichment → Frontend
     (Safe Merge)         (Metadata)      (Protected)
```

### Field Ownership

- **PIM owns**: Technical specifications (weight, battery, lens tech, etc.)
- **OPS owns**: Marketing & UI (features[], rating, badges[], etc.)

---

## File Structure

### Core Implementation

```
src/
├── lib/
│   └── metadata-ownership.ts         # Ownership validation library
│
├── api/
│   └── ops/
│       └── catalog/
│           └── metadata/
│               └── route.ts           # OPS endpoint with validation
│
└── scripts/
    ├── import-chamelo-shield.ts       # Updated with safe merge ✅
    ├── export-product-metadata.ts     # Backup tool
    ├── verify-post-import.ts          # Verification tool
    └── test-safe-import.ts            # Single-product test
```

### Documentation

```
Root/
├── FIELD_OWNERSHIP.md                 # Complete ownership reference (40KB)
├── OPS_ENDPOINT_GUIDE.md              # OPS API documentation
└── SAFE_IMPORT_PROCEDURE.md           # Step-by-step import guide
```

---

## Components

### 1. Ownership Library

**File**: [`src/lib/metadata-ownership.ts`](src/lib/metadata-ownership.ts)

**Exports**:
- `OPS_PROTECTED_FIELDS` - Array of 16 OPS-owned fields
- `PIM_TECHNICAL_FIELDS` - Array of 40+ PIM-owned fields
- `PIM_FIELD_PATTERNS` - Regex patterns for `frame_*_mm`, `battery_*_hours`, etc.

**Functions**:
```typescript
isPimOwnedField(key: string): boolean
isOpsProtectedField(key: string): boolean
preserveOpsFields(existing, newPim, source): object
detectOpsConflicts(metadata): ValidationResult
getOpsProtectedFieldsInMetadata(metadata): string[]
getOwnershipSummary(metadata): { pimFields, opsFields, unknownFields }
```

### 2. OPS Endpoint Protection

**File**: [`src/api/ops/catalog/metadata/route.ts`](src/api/ops/catalog/metadata/route.ts)

**Endpoint**: `POST /ops/catalog/metadata`

**Parameters**:
- `productId` (string, required) - Product ID
- `metadata` (object, required) - Metadata to write
- `merge` (boolean, default: true) - Merge with existing
- `mode` ('safe' | 'force', default: 'safe') - Validation mode

**Safe Mode** (default):
- Blocks writes to PIM-owned fields
- Returns 400 error with conflict list
- Logs security warnings

**Force Mode**:
- Allows PIM field override (requires explicit `mode='force'`)
- Logs override warnings
- Use sparingly

**Example**:
```bash
# Safe mode - blocks PIM fields
curl -X POST /ops/catalog/metadata \
  -H "X-OPS-KEY: secret" \
  -d '{"productId": "prod_X", "metadata": {"features": [...]}}'
# ✅ Allowed

curl -X POST /ops/catalog/metadata \
  -H "X-OPS-KEY: secret" \
  -d '{"productId": "prod_X", "metadata": {"weight_grams": 50}}'
# ❌ 400 Ownership conflict
```

### 3. Safe Merge in Import Scripts

**File**: [`src/scripts/import-chamelo-shield.ts`](src/scripts/import-chamelo-shield.ts) (lines 388-451)

**How it works**:
1. Check if product exists
2. Load current metadata
3. Detect OPS enrichment
4. If OPS fields present → use `preserveOpsFields()`
5. If no OPS fields → just add PIM tracking
6. Import with merged metadata

**Log output**:
```
🔍 Checking for existing products...
   ✏️  Updating existing: music-shield
      Preserving 4 OPS fields: features, rating, badges, specs
🚀 Importing 2 products with safe merge...
✅ Chamelo Shield import completed!
```

### 4. Backup Tool

**File**: [`src/scripts/export-product-metadata.ts`](src/scripts/export-product-metadata.ts)

**Usage**:
```bash
npm run medusa exec scripts/export-product-metadata.ts
```

**Output**:
- Creates `backups/metadata/backup-{timestamp}.json`
- Identifies OPS-enriched products
- Shows file size and product count

**Backup structure**:
```json
{
  "exportDate": "2026-03-08T10:00:00.000Z",
  "productCount": 25,
  "products": [
    {
      "id": "prod_X",
      "handle": "music-shield",
      "title": "Music Shield",
      "metadata": { ... }
    }
  ]
}
```

### 5. Verification Tool

**File**: [`src/scripts/verify-post-import.ts`](src/scripts/verify-post-import.ts)

**Usage**:
```bash
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-2026-03-08.json
```

**Options**:
- `--backup-file=PATH` (required) - Backup to compare against
- `--product-handle=X` (optional) - Verify single product
- `--auto-restore=true` (optional) - Auto-restore lost fields

**Output**:
```
✅ VERIFICATION PASSED
   12 products checked
   All OPS fields preserved successfully
   No data loss detected
```

Or on failure:
```
❌ VERIFICATION FAILED
   2 products have OPS field violations

Violations:
  Product: music-shield
    ❌ Field: features
       LOST: Field was removed
```

### 6. Single-Product Test

**File**: [`src/scripts/test-safe-import.ts`](src/scripts/test-safe-import.ts)

**Usage**:
```bash
# Dry-run (preview only)
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=music-shield

# Apply changes
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=music-shield --dry-run=false
```

**What it does**:
- Loads product
- Analyzes current metadata
- Simulates PIM changes
- Performs safe merge
- Verifies OPS fields preserved
- Reports PASS/FAIL

---

## Safe Re-Import Procedure

See [`SAFE_IMPORT_PROCEDURE.md`](SAFE_IMPORT_PROCEDURE.md) for complete step-by-step guide.

**Quick Reference**:

```bash
# 1. Backup
npm run medusa exec scripts/export-product-metadata.ts

# 2. Test single product
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=shield

# 3. Run import
npm run medusa exec scripts/import-chamelo-shield.ts

# 4. Verify
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-TIMESTAMP.json
```

---

## Field Ownership Reference

### PIM Owns (~40 fields)

**Categories**:
- Product Identity: brand, product_family, has_audio, bluetooth
- Physical Specs: weight_grams, frame_*_mm, frame_material, frame_style
- Optical: lens_technology, uv_protection, polarization, tint_*
- Electronics: battery_*, charge_*, control_type, autopilot_mode
- Durability: water_resistance, sweatproof, warranty_years, ce_certified

### OPS Owns (~15 domains)

**Categories**:
- UI Enrichment: features[], specs[]
- Social Proof: rating, badges[], usps[]
- Content: inTheBox[], warranty (object), faq[], pdp[]
- SEO: seo_description, seo_keywords, videoUrl

See [`FIELD_OWNERSHIP.md`](FIELD_OWNERSHIP.md) for complete list.

---

## Migration Status

### ✅ Completed (2026-03-08)

1. **Ownership Library** - Pattern-matching field validation
2. **OPS Endpoint** - Safe mode with PIM field blocking
3. **Import Script** - Safe merge for import-chamelo-shield.ts
4. **Backup Tool** - Metadata export functionality
5. **Verification Tool** - Post-import validation with auto-restore
6. **Test Tool** - Single-product dry-run testing
7. **Documentation** - Complete guides and references
8. **Code Migration** - Consolidated into Medusa (single source of truth)

### ⏳ Pending

1. **Other Import Scripts** - Need safe merge implementation:
   - [ ] `import-chamelo-prismatic.ts`
   - [ ] `import-chamelo-lifestyle.ts`
   - [ ] `import-from-payload.ts`
   - [ ] `enrich-payload-products-metadata.ts`

2. **seo_keywords Migration** - Transfer ownership to OPS:
   - [ ] Week 1: PIM continues writing (current state)
   - [ ] Week 2: PIM writes to `pim.source_keywords`
   - [ ] Week 3: OPS becomes sole owner

---

## Testing

### Manual Tests

1. **Test OPS endpoint protection**:
```bash
# Should succeed (OPS field)
curl -X POST http://localhost:9000/ops/catalog/metadata \
  -H "X-OPS-KEY: your-key" \
  -d '{"productId": "prod_X", "metadata": {"features": []}}'

# Should fail (PIM field)
curl -X POST http://localhost:9000/ops/catalog/metadata \
  -H "X-OPS-KEY: your-key" \
  -d '{"productId": "prod_X", "metadata": {"weight_grams": 50}}'
```

2. **Test safe merge**:
```bash
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=music-shield
# Should show: ✅ TEST PASSED
```

3. **Test full workflow**:
```bash
# Backup → Import → Verify
npm run medusa exec scripts/export-product-metadata.ts
npm run medusa exec scripts/import-chamelo-shield.ts
npm run medusa exec scripts/verify-post-import.ts -- --backup-file=backups/metadata/backup-*.json
```

---

## Troubleshooting

### "Ownership conflict" error from OPS endpoint

**Cause**: Trying to write PIM-owned field via OPS
**Solution**: Remove PIM fields from request or use `mode='force'`

### "Field X was removed" during verification

**Cause**: Safe merge logic not working correctly
**Solution**:
1. Restore from backup: `--auto-restore=true`
2. Debug safe merge in import script
3. Check `preserveOpsFields()` implementation

### Import script not preserving OPS fields

**Cause**: Import script not using safe merge
**Solution**: Update script following [`import-chamelo-shield.ts`](src/scripts/import-chamelo-shield.ts:388-451) pattern

---

## Best Practices

1. **Always backup** before re-import
2. **Always test** on single product first
3. **Always verify** after full import
4. **Never skip** verification step
5. **Use safe mode** in OPS endpoint (default)
6. **Document changes** to ownership rules
7. **Update other scripts** following the safe merge pattern

---

## Support & References

- **Complete Ownership Rules**: [`FIELD_OWNERSHIP.md`](FIELD_OWNERSHIP.md)
- **Import Procedure**: [`SAFE_IMPORT_PROCEDURE.md`](SAFE_IMPORT_PROCEDURE.md)
- **OPS API Guide**: [`OPS_ENDPOINT_GUIDE.md`](OPS_ENDPOINT_GUIDE.md)
- **Code**: [`src/lib/metadata-ownership.ts`](src/lib/metadata-ownership.ts)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-08 | Initial implementation with full safeguards |

---

**Maintained by**: Product & Engineering Teams
**Last Review**: 2026-03-08
