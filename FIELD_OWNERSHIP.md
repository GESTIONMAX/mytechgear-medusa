# Field Ownership: PIM 5, OPS Backend, and Medusa

**Document Version**: 1.0
**Date**: 2026-03-08
**Status**: ✅ Approved

---

## Executive Summary

This document defines clear field ownership between:
- **PIM 5** (Product Information Management via import scripts)
- **OPS Backend** (Operations API via `/ops/catalog/metadata`)
- **Medusa** (Runtime product metadata)

**Critical Finding**: `seo_keywords` is currently written by both PIM and OPS, creating a conflict risk.

**Recommendation**: Establish strict ownership boundaries with OPS owning marketing/UI fields and PIM owning technical specifications.

---

## Section A — Fields Owned by PIM

**Principle**: PIM is the authoritative source for product identity and immutable technical specifications that originate from manufacturers.

### A.1 Product Identification
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `brand` | string | "Chamelo", "Generic" | Manufacturer identity |
| `product_family` | string | "shield", "aura", "lifestyle", "aroza" | Product line grouping |
| `has_audio` | boolean | true, false | Hardware capability flag |
| `bluetooth` | boolean | true, false | Hardware capability flag |
| `related_product_audio` | string | "music-shield" | Handle of audio variant |
| `related_product_no_audio` | string | "shield" | Handle of non-audio variant |

### A.2 Physical Specifications
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `weight_grams` | number | 37, 49 | Frame weight |
| `frame_height_mm` | number | 61 | Vertical lens size |
| `bridge_width_mm` | number | 160 | Nose bridge width |
| `arm_length_mm` | number | 140 | Temple/arm length |
| `temple_width_mm` | number | 142 | Temple width |
| `frame_material` | string | "TR90", "Stainless steel" | Material composition |
| `frame_style` | string | "Rimless square", "Cat-eye" | Design style |
| `frame_integration` | string | "Seamless" | Construction method |
| `design_style` | string | "Sport", "Lifestyle" | Design category |
| `unisex` | boolean | true, false | Gender-neutral design |

### A.3 Optical/Lens Specifications
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `lens_technology` | string | "Eclipse™ Tint-Adjustable" | Core lens technology |
| `light_transmission_range` | string | "54-17%" | Min-max light passage |
| `tint_adjustment_speed_seconds` | number | 0.1 | Tint change speed |
| `tint_levels` | number | 5 | Number of tint levels |
| `color_change_speed_seconds` | number | 0.8 | Color change speed (Prismatic) |
| `color_count` | number | 7 | Number of colors (Prismatic) |
| `calm_colors` | string | "Amber, Blue, Lavender" | Calm color options |
| `energy_colors` | string | "Fire, Neon, Electric" | Energy color options |
| `uv_protection` | string | "100%", "UV400" | UV blocking level |
| `polarization` | string | "Full", "Partial", "None" | Glare reduction |

### A.4 Electronics & Battery
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `battery_mah` | number | 25, 180 | Battery capacity |
| `battery_tint_hours` | number | 52 | Tint mode battery life |
| `battery_audio_hours` | number | 7 | Audio mode battery life |
| `battery_color_hours` | number | 48 | Color mode battery life |
| `charge_time_minutes` | number | 60 | Full charge time |
| `charge_80_percent_minutes` | number | 30 | Fast charge time |
| `control_type` | string | "Manual slider", "Touch control" | User control method |
| `autopilot_mode` | boolean | true, false | Auto-adjustment capability |
| `ambient_light_sensor` | boolean | true, false | Light sensor present |
| `manual_tint_control` | boolean | true, false | Manual control available |
| `enhanced_grip` | boolean | true, false | Grip enhancement feature |
| `audio_type` | string | "Open-ear speakers" | Audio system type |
| `audio_bluetooth_version` | string | "5.0" | Bluetooth version |

### A.5 Durability & Compliance
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `water_resistance` | string | "IPX4", "IPX-4" | Water resistance rating |
| `sweatproof` | boolean | true, false | Sweat resistance |
| `impact_resistant` | boolean | true, false | Impact/drop resistance |
| `warranty_years` | number | 1, 2 | Warranty duration (years) |
| `ce_certified` | boolean | true, false | EU CE certification |
| `weee_compliant` | boolean | true, false | E-waste compliance |

### A.6 Categorization & Marketing (PIM-Sourced)
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `use_case` | string | "Sport, outdoor activities" | Primary usage category |
| `color_options` | number | 3, 6 | Available colorways count |
| `bestseller` | boolean | true, false | Bestseller flag from source |
| `bestseller_rank` | number | 1-10 | Bestseller ranking |
| `limited_edition` | boolean | true, false | Limited edition flag |

### A.7 PIM Namespace (Import Tracking)
| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `pim.source_keywords` | string[] | ["lunettes sport", "UV"] | Original PIM keywords |
| `pim.import_timestamp` | string | "2026-03-08T10:00:00Z" | Last import date (ISO 8601) |
| `pim.import_source` | string | "chamelo-shopify", "payload-cms" | Import source identifier |

**Total: ~40 PIM-owned fields**

---

## Section B — Fields Owned by OPS

**Principle**: OPS is the authoritative source for UI enrichment, marketing content, and SEO optimization that requires frequent updates independent of PIM.

### B.1 UI Enrichment

#### `features[]` - Array of FeatureDTO
Structured product features displayed on product pages with icons and descriptions.

**Schema**:
```typescript
interface FeatureDTO {
  key: string           // Unique identifier, e.g., "audio_bluetooth"
  title: string         // Display title, e.g., "Audio Bluetooth Intégré"
  description: string   // Feature description, e.g., "Son cristallin sans fil"
  icon: string          // Lucide icon key or emoji, e.g., "music", "🎵"
  priority: number      // Display order (lower = higher priority)
  enabled: boolean      // Show/hide toggle
  category?: string     // Group, e.g., "Audio", "Display", "Battery"
  condition?: string    // Conditional display, e.g., "audio=With Audio"
  imageUrl?: string     // Lifestyle image URL
}
```

**Example**:
```json
{
  "features": [
    {
      "key": "audio_bluetooth",
      "title": "Audio Bluetooth Intégré",
      "description": "Son cristallin sans fil",
      "icon": "music",
      "priority": 10,
      "enabled": true,
      "category": "Audio"
    },
    {
      "key": "lenses_eclipse",
      "title": "Verres Eclipse™ Ajustables",
      "description": "Teinte réglable en temps réel",
      "icon": "sun",
      "priority": 20,
      "enabled": true,
      "category": "Display"
    }
  ]
}
```

#### `specs[]` - Array of SpecDTO
Formatted technical specifications for display (derived from PIM raw data).

**Schema**:
```typescript
interface SpecDTO {
  label: string       // Spec label, e.g., "Poids"
  value: string       // Formatted value, e.g., "49 g"
  unit?: string       // Unit, e.g., "g", "mm", "h"
  category?: string   // Group, e.g., "Dimensions", "Battery"
  condition?: string  // Conditional display, e.g., "size=Large"
}
```

**Example**:
```json
{
  "specs": [
    { "label": "Poids", "value": "49 g", "unit": "g", "category": "Dimensions" },
    { "label": "Autonomie", "value": "7 h", "unit": "h", "category": "Battery" },
    { "label": "Protection UV", "value": "100%", "category": "Optical" }
  ]
}
```

**Note**: OPS transforms PIM raw data (e.g., `weight_grams: 49`) into formatted specs. Both can coexist.

### B.2 Social Proof & Marketing

#### `rating` - ReviewsSummaryDTO
Customer rating and review summary.

**Schema**:
```typescript
interface ReviewsSummaryDTO {
  value: number      // Average rating, e.g., 4.9
  count: number      // Number of reviews, e.g., 134
  isMock: boolean    // Flag for development/test data
}
```

**Example**:
```json
{
  "rating": {
    "value": 4.9,
    "count": 134,
    "isMock": true
  }
}
```

#### `badges[]` - Array of BadgeDTO or strings
Product badges for marketing (new, sale, free shipping, etc.).

**Schema (rich)**:
```typescript
interface BadgeDTO {
  text: string                           // Badge text, e.g., "NOUVEAU", "-20%"
  color?: 'blue' | 'red' | 'green' | ... // Badge color
  position?: 'top-left' | 'top-right'    // Position on card
}
```

**Example**:
```json
{
  "badges": [
    { "text": "NOUVEAU", "color": "blue", "position": "top-left" },
    { "text": "Livraison gratuite", "color": "green" }
  ]
}
```

**Simple format**:
```json
{
  "badges": ["Livraison gratuite", "Garantie 2 ans"]
}
```

#### `usps[]` - Unique Selling Points
Key selling points with icons for marketing.

**Schema**:
```typescript
interface UspDTO {
  icon: string    // Icon or emoji, e.g., "✅", "🚚"
  text: string    // USP text, e.g., "Livraison gratuite"
  order?: number  // Display order
}
```

### B.3 Product Content

#### `inTheBox[]` - Array of strings
Items included in product packaging.

**Example**:
```json
{
  "inTheBox": [
    "Lunettes Shield",
    "Étui de protection",
    "Câble USB-C",
    "Chiffon microfibre",
    "Manuel d'utilisation"
  ]
}
```

#### `warranty` - Warranty object
Rich warranty information (overrides simple `warranty_years` from PIM).

**Schema**:
```typescript
interface WarrantyInfo {
  moneyBack: number        // Money-back guarantee period
  manufacturer: number     // Manufacturer warranty period
  unit: 'days' | 'months' | 'years'
}
```

**Example**:
```json
{
  "warranty": {
    "moneyBack": 30,
    "manufacturer": 2,
    "unit": "years"
  }
}
```

#### `related` - ProductRelated object
Cross-selling and product relationship information.

**Schema**:
```typescript
interface ProductRelated {
  withAudio?: string      // Handle of audio variant
  withoutAudio?: string   // Handle of non-audio variant
  variant: 'audio' | 'no-audio'
}
```

#### `faq[]` - Frequently Asked Questions
Product-specific FAQ items.

**Schema**:
```typescript
interface FAQItemDTO {
  question: string
  answer: string
  order?: number
}
```

#### `pdp.accordions[]` - Product Detail Page Accordions
Complex UI structure for product page accordion sections.

**Schema**:
```typescript
interface PdpAccordionItemDTO {
  id: string
  title: string
  kind: 'richText' | 'bullets' | 'sizeFit' | 'custom'
  body?: string
  bullets?: Array<{label: string, value: string}>
  links?: Array<{text: string, url: string}>
  defaultOpen?: boolean
  order?: number
}
```

### B.4 SEO & Media

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `seo_description` | string | "Lunettes sport Eclipse..." | Meta description override |
| `seo_keywords` | string | "lunettes,sport,bluetooth" | **OPS owns after migration** |
| `lensTechnology` | string | "Eclipse™" | Formatted lens tech for UI |
| `videoUrl` | string | "https://youtube.com/..." | Product demo video |
| `sizeGuideUrl` | string | "/guides/sizing" | Sizing guide link |

### B.5 UI-Specific Metadata

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `fallback_emoji` | string | "🕶️" | Emoji if no images |
| `badge` | string | "NEW" | Legacy badge field (singular) |
| `badge_color` | string | "blue" | Badge styling |
| `badge_position` | string | "top-left" | Badge position |

**Total: ~15 OPS-owned field domains**

---

## Section C — Overlaps Found

### C.1 CONFLICT: `seo_keywords`

**Status**: ⚠️ Active conflict

**Current State**:
- **PIM writes**: During product import (e.g., `"lunettes sport,verres électrochromiques,teinte ajustable"`)
  - Location: [import-chamelo-shield.ts](../mytechgear-medusa/src/scripts/import-chamelo-shield.ts)
- **OPS writes**: Via `/ops/catalog/metadata` endpoint
  - Location: [route.ts](./src/api/ops/catalog/metadata/route.ts)

**Problem**:
- PIM re-import overwrites SEO optimizations made by marketing team
- No clear owner = confusion and potential data loss

**Resolution**: **→ OPS Ownership Recommended**

**Rationale**:
1. SEO optimization is an ongoing marketing activity
2. Keywords evolve based on search performance data
3. Marketing shouldn't depend on PIM re-import for updates
4. PIM has no SEO expertise

**Migration Strategy**:

**Phase 1** (Immediate - Backward Compatible):
- PIM continues writing `seo_keywords` during initial import
- OPS can overwrite via metadata endpoint
- Document this as temporary state

**Phase 2** (Week 2 - Transition):
- Add `pim.source_keywords` field
- PIM writes original keywords to `pim.source_keywords` instead of `seo_keywords`
- OPS merges PIM keywords + marketing keywords → `seo_keywords`
- Example:
  ```json
  {
    "pim": {
      "source_keywords": ["lunettes sport", "verres électrochromiques"]
    },
    "seo_keywords": "lunettes sport,verres électrochromiques,bluetooth audio,teinte ajustable"
  }
  ```

**Phase 3** (Week 3 - Final):
- Remove `seo_keywords` from all PIM import scripts
- OPS is authoritative source
- `pim.source_keywords` remains as reference only

### C.2 NO CONFLICT: Technical Specs vs UI Specs

**Current Pattern**:
- **PIM writes**: Raw technical data (e.g., `weight_grams: 49`)
- **OPS writes**: Formatted specs array (e.g., `specs: [{label: "Poids", value: "49 g"}]`)

**Status**: ✅ No conflict - different purposes

**Resolution**:
- Both coexist peacefully
- PIM owns raw data (source of truth)
- OPS owns presentation (derived from raw data)
- Frontend prioritizes `specs[]` if present, derives from raw if missing

**Rule**:
- ✅ OPS can transform PIM raw data into `specs[]`
- ❌ PIM must NEVER write to `specs[]` array
- ✅ Acceptable to have both: raw (`weight_grams`) + formatted (`specs[]`)

### C.3 MINOR OVERLAP: Warranty Information

**Current State**:
- **PIM writes**: `warranty_years: 2` (simple number)
- **OPS writes**: `warranty: {moneyBack: 30, manufacturer: 2, unit: 'years'}` (rich object)

**Status**: ✅ Low risk - frontend handles both

**Resolution**:
- OPS owns rich warranty object
- PIM writes simple `warranty_years` only during initial import
- Frontend prioritizes `warranty` object if present, falls back to `warranty_years`

**Migration** (Optional):
- OPS should import PIM's `warranty_years` into warranty object structure
- Once migrated, PIM can stop writing `warranty_years`

---

## Section D — Recommended Ownership Model

### D.1 Core Principles

#### Principle 1: Separation of Concerns
- **PIM = Source of Truth for Product Identity & Technical Specs**
  - What the product IS (immutable hardware characteristics)
  - Origin: Manufacturer data, supplier catalogs, ERP systems

- **OPS = Source of Truth for Marketing, UI Enrichment & SEO**
  - How the product is PRESENTED (mutable marketing content)
  - Origin: Marketing team, content team, SEO specialists

#### Principle 2: Single Writer Per Field
- Every field has exactly ONE authoritative writer
- No shared write access (except during migration periods)
- Prevents race conditions and data loss

#### Principle 3: Frontend Reads, Never Writes
- Frontend consumes merged metadata
- Frontend never modifies metadata directly
- Frontend prioritizes OPS fields, falls back to PIM

### D.2 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Manufacturer/Supplier (Chamelo, Payload CMS, etc.)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PIM Import Scripts (src/scripts/)                      │
│  • Creates product in Medusa                            │
│  • Writes technical metadata (~40 fields)               │
│  • Preserves existing OPS fields during re-import       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Medusa Product Database                                │
│  • product.metadata = { ...pim_fields, ...ops_fields }  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ├──────────────────────┐
                     ▼                      ▼
┌──────────────────────────────┐  ┌─────────────────────┐
│  OPS Enrichment              │  │  Medusa Store API   │
│  POST /ops/catalog/metadata  │  │  GET /store/products│
│  • Adds marketing metadata   │  └──────────┬──────────┘
│  • Adds UI enrichment        │             │
│  • Updates SEO fields        │             ▼
│  • Validates no PIM overlap  │  ┌─────────────────────┐
└──────────────┬───────────────┘  │  Next.js Frontend   │
               │                  │  • Reads metadata   │
               └─────────────────→│  • Displays features│
                                  │  • Shows ratings    │
                                  └─────────────────────┘
```

### D.3 Namespacing Strategy

**Hybrid Approach** (balances clarity with simplicity):

#### For OPS Fields: Keep Flat
- Fields like `features[]`, `specs[]`, `rating`, `badges[]` are clearly OPS-owned
- No namespace needed: `metadata.features`, NOT `metadata.ops.features`
- **Benefit**: Simpler frontend consumption, existing code works as-is

#### For PIM Internal: Use `pim.*` Namespace
- Use `pim.*` for raw technical data that OPS shouldn't touch
- Example: `pim.source_keywords`, `pim.import_timestamp`, `pim.import_source`
- **Benefit**: Clear visual boundary for what OPS must not modify

#### Recommended Structure

```typescript
metadata = {
  // ==========================================
  // PIM ZONE (raw technical data)
  // ==========================================
  brand: "Chamelo",
  has_audio: true,
  weight_grams: 49,
  battery_mah: 180,
  lens_technology: "Eclipse™ Tint-Adjustable",
  uv_protection: "100%",
  water_resistance: "IPX4",
  // ... all PIM fields from Section A

  pim: {
    source_keywords: ["lunettes sport", "bluetooth"],  // Original PIM keywords
    import_timestamp: "2026-03-08T10:00:00Z",
    import_source: "chamelo-shopify"
  },

  // ==========================================
  // OPS ZONE (UI enrichment & marketing)
  // ==========================================
  features: [
    { key: "audio", title: "Audio Bluetooth", ... },
    { key: "tint", title: "Teinte Ajustable", ... }
  ],
  specs: [
    { label: "Poids", value: "49 g" },
    { label: "Autonomie", value: "7 h" }
  ],
  rating: { value: 4.9, count: 134, isMock: true },
  badges: ["Livraison gratuite", "Garantie 2 ans"],
  inTheBox: ["Lunettes", "Étui", "Câble USB-C"],
  warranty: { moneyBack: 30, manufacturer: 2, unit: "years" },
  seo_description: "...",
  seo_keywords: "lunettes,sport,bluetooth,teinte",  // OPS-managed
  faq: [...],
  pdp: { accordions: [...] }
}
```

### D.4 Field Protection Lists

#### OPS_PROTECTED_FIELDS (PIM must NOT overwrite)

```typescript
export const OPS_PROTECTED_FIELDS = [
  // UI Enrichment
  'features',
  'specs',

  // Social Proof
  'rating',
  'badges',
  'usps',

  // Product Content
  'inTheBox',
  'warranty',        // Object form (not warranty_years)
  'related',         // ProductRelated object
  'faq',
  'pdp',

  // SEO & Media (after migration)
  'seo_description',
  'seo_keywords',    // After Phase 3 migration
  'lensTechnology',  // Formatted display name
  'videoUrl',
  'sizeGuideUrl',

  // UI-Specific
  'fallback_emoji',
  'badge',           // Legacy singular badge
  'badge_color',
  'badge_position'
] as const
```

#### PIM_TECHNICAL_FIELDS (OPS should avoid)

```typescript
export const PIM_TECHNICAL_FIELDS = [
  // Core Identity
  'brand',
  'product_family',
  'has_audio',
  'bluetooth',
  'related_product_audio',
  'related_product_no_audio',

  // Physical Specs
  'weight_grams',
  'frame_height_mm',
  'bridge_width_mm',
  'arm_length_mm',
  'temple_width_mm',
  'frame_material',
  'frame_style',
  'frame_integration',
  'design_style',
  'unisex',

  // Optical/Lens
  'lens_technology',
  'light_transmission_range',
  'tint_adjustment_speed_seconds',
  'tint_levels',
  'color_change_speed_seconds',
  'color_count',
  'calm_colors',
  'energy_colors',
  'uv_protection',
  'polarization',

  // Electronics
  'battery_mah',
  'battery_tint_hours',
  'battery_audio_hours',
  'battery_color_hours',
  'charge_time_minutes',
  'charge_80_percent_minutes',
  'control_type',
  'autopilot_mode',
  'ambient_light_sensor',
  'manual_tint_control',
  'enhanced_grip',
  'audio_type',
  'audio_bluetooth_version',

  // Durability & Compliance
  'water_resistance',
  'sweatproof',
  'impact_resistant',
  'warranty_years',    // Simple number (before migration)
  'ce_certified',
  'weee_compliant',

  // Categorization
  'use_case',
  'color_options',
  'bestseller',
  'bestseller_rank',
  'limited_edition',

  // PIM Namespace
  'pim'  // All pim.* fields
] as const
```

**Soft Rule**: OPS CAN read PIM fields to derive `specs[]`, but should NOT modify them.

---

## Section E — Safe Next Step Before Re-Import

### E.1 Pre-Import Checklist

Before running any PIM re-import script, follow this checklist:

#### Step 1: Backup Current Metadata

```bash
# Export all product metadata to JSON backup file
cd /home/gestionmax-aur-lien/CascadeProjects/mytechgear/mytechgear-medusa

# Create backup directory
mkdir -p backups/metadata

# Run export (script to be created)
npm run medusa exec scripts/export-product-metadata.ts > backups/metadata/backup-$(date +%Y%m%d-%H%M%S).json

# Verify backup created
ls -lh backups/metadata/
```

**Expected Output**:
```
backup-20260308-100000.json  (contains all product metadata)
```

#### Step 2: Audit OPS-Enriched Products

```bash
# Check which products have OPS enrichment
npm run medusa exec scripts/check-ops-enrichment.ts
```

**Expected Output**:
```
✅ Found 12 products with OPS enrichment:
  - music-shield: features (5), rating, badges (2)
  - shield: features (4), rating
  - aura-audio: features (6), rating, badges (3), inTheBox (5)
  ...

⚠️ These products will require safe merge during re-import
```

#### Step 3: Test on Single Product First

```bash
# Test re-import on ONE product before running full import
npm run medusa exec scripts/test-safe-import.ts -- --product-handle=shield

# Verify OPS fields preserved
npm run medusa exec scripts/verify-metadata.ts -- --product-handle=shield --before-file=backups/metadata/backup-20260308-100000.json
```

**Expected Output**:
```
✅ Product 'shield' re-imported successfully
✅ All OPS fields preserved:
  - features: ✅ Unchanged (4 items)
  - rating: ✅ Unchanged (4.9, 134 reviews)
  - specs: ✅ Unchanged (8 items)

⚠️ PIM fields updated:
  - battery_mah: 25 → 30 (updated from source)
  - charge_time_minutes: 60 → 55 (updated from source)
```

#### Step 4: Verify Import Scripts Updated

```bash
# Check if import scripts have safe merge logic
grep -n "OPS_PROTECTED_FIELDS" scripts/import-*.ts

# Expected: Should find references in all import scripts
# If not found, DO NOT proceed with re-import
```

### E.2 Safe Import Implementation

#### Required Changes to Import Scripts

**File**: `scripts/import-chamelo-shield.ts`

**Current Implementation** (UNSAFE):
```typescript
const products = [
  {
    title: "Shield",
    handle: "shield",
    metadata: {
      brand: "Chamelo",
      weight_grams: 37,
      // ... new PIM data
    }
  }
]

await createProductsWorkflow(container).run({ input: { products } })
// ❌ This overwrites ALL metadata, losing OPS fields!
```

**Safe Implementation** (RECOMMENDED):
```typescript
import { OPS_PROTECTED_FIELDS } from '../lib/metadata-ownership'

export default async function importChameloShield({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productService = container.resolve(Modules.PRODUCT)

  const products = [
    {
      title: "Shield",
      handle: "shield",
      metadata: {
        brand: "Chamelo",
        weight_grams: 37,
        battery_mah: 25,
        // ... PIM fields
      }
    }
  ]

  for (const productDef of products) {
    // Check if product exists
    const existing = await productService.listProducts({
      handle: productDef.handle
    })

    if (existing.length > 0) {
      // ✅ Product exists - SAFE MERGE
      const existingProduct = existing[0]
      const existingMetadata = existingProduct.metadata || {}

      logger.info(`Updating ${productDef.handle} (preserving OPS fields)`)

      // Preserve OPS-protected fields
      const opsProtected = {}
      OPS_PROTECTED_FIELDS.forEach(field => {
        if (existingMetadata[field] !== undefined) {
          opsProtected[field] = existingMetadata[field]
        }
      })

      // Merge: PIM data + preserved OPS data
      productDef.metadata = {
        ...productDef.metadata,      // New PIM data
        ...opsProtected,              // Preserved OPS data
        pim: {
          ...existingMetadata.pim,
          last_import: new Date().toISOString(),
          import_source: 'chamelo-shopify'
        }
      }

      logger.info(`Preserved OPS fields: ${Object.keys(opsProtected).join(', ')}`)
    } else {
      // ✅ New product - no OPS data to preserve
      logger.info(`Creating new product: ${productDef.handle}`)

      productDef.metadata = {
        ...productDef.metadata,
        pim: {
          import_timestamp: new Date().toISOString(),
          import_source: 'chamelo-shopify'
        }
      }
    }
  }

  // Execute import with safe metadata
  await createProductsWorkflow(container).run({ input: { products } })

  logger.info("✅ Import completed with OPS field preservation")
}
```

### E.3 Post-Import Verification

After running re-import, verify no data loss:

```bash
# Run verification script
npm run medusa exec scripts/verify-post-import.ts -- --before-file=backups/metadata/backup-20260308-100000.json

# Expected output:
# ✅ Verified 12 products with OPS enrichment
# ✅ All OPS fields preserved successfully
# ✅ PIM fields updated as expected
# ✅ No data loss detected
```

If verification fails:
```bash
# ❌ 3 OPS fields were modified!
# Product: music-shield
#   - Field: features (5 items → 0 items) ❌ LOST
#   - Field: rating (4.9 → undefined) ❌ LOST

# SOLUTION: Restore from backup
npm run medusa exec scripts/restore-metadata.ts -- --backup-file=backups/metadata/backup-20260308-100000.json --products=music-shield,aura-audio
```

### E.4 Import Lock File (Prevent Concurrent Imports)

**Purpose**: Prevent multiple imports running simultaneously.

**Implementation**: Create import lock before running scripts:

```typescript
// lib/import-lock.ts
import fs from 'fs'
import path from 'path'

const LOCK_FILE = path.join(process.cwd(), '.import.lock')

export function acquireImportLock(source: string): boolean {
  if (fs.existsSync(LOCK_FILE)) {
    const lock = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'))
    const age = Date.now() - new Date(lock.timestamp).getTime()

    // Lock expires after 1 hour
    if (age < 3600000) {
      console.error(`❌ Import locked by ${lock.source} at ${lock.timestamp}`)
      console.error(`   PID: ${lock.pid}`)
      return false
    }

    console.warn(`⚠️ Stale lock found (${age}ms old), removing...`)
  }

  // Create lock
  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    source,
    timestamp: new Date().toISOString(),
    pid: process.pid
  }, null, 2))

  console.log(`🔒 Import lock acquired for: ${source}`)
  return true
}

export function releaseImportLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE)
    console.log(`🔓 Import lock released`)
  }
}

// Usage in import scripts:
if (!acquireImportLock('chamelo-shield')) {
  throw new Error('Import already in progress')
}

try {
  await runImport()
} finally {
  releaseImportLock()
}
```

### E.5 Summary: Safe Re-Import Workflow

```
┌─────────────────────────────────────┐
│ 1. Backup Current Metadata          │
│    export-product-metadata.ts       │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 2. Audit OPS Enrichment             │
│    check-ops-enrichment.ts          │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 3. Test on Single Product           │
│    test-safe-import.ts --product=X  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 4. Acquire Import Lock              │
│    acquireImportLock('source')      │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 5. Run Import with Safe Merge       │
│    import-chamelo-shield.ts         │
│    (preserves OPS fields)           │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 6. Release Import Lock              │
│    releaseImportLock()              │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 7. Verify No Data Loss              │
│    verify-post-import.ts            │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ 8. If Failed: Restore from Backup   │
│    restore-metadata.ts              │
└─────────────────────────────────────┘
```

---

## Implementation Priority & Timeline

### Priority 1: Immediate (Week 1)

**Goal**: Document ownership and add non-blocking safeguards

1. **Create metadata-ownership library**
   - File: `/mytechgear-medusa/src/lib/metadata-ownership.ts`
   - Export: `OPS_PROTECTED_FIELDS`, `PIM_TECHNICAL_FIELDS`
   - Export: Helper functions for safe merge

2. **Document in code**
   - Add JSDoc comments to import scripts
   - Mark fields as PIM-owned or OPS-owned
   - Link to this document

3. **Add warnings to OPS endpoint**
   - File: `/mytechgear-backend/src/api/ops/catalog/metadata/route.ts`
   - Add PIM field detection (non-blocking)
   - Log warnings when OPS modifies technical specs

### Priority 2: Short-term (Week 2)

**Goal**: Implement safe merge and migrate `seo_keywords`

1. **Update all PIM import scripts**
   - Files: `import-chamelo-*.ts`, `enrich-payload-products-metadata.ts`
   - Add safe merge logic (preserve OPS fields)
   - Add `pim.*` namespace tracking

2. **Migrate `seo_keywords` ownership**
   - Move PIM keywords to `pim.source_keywords`
   - OPS takes over `seo_keywords`
   - Update frontend if needed

3. **Create backup tooling**
   - Script: `export-product-metadata.ts`
   - Script: `check-ops-enrichment.ts`

### Priority 3: Medium-term (Weeks 3-4)

**Goal**: Enforce ownership and verify compliance

1. **Enhance OPS endpoint validation**
   - Add `mode` parameter ('safe' | 'force')
   - Block PIM field writes unless `mode='force'`
   - Return detailed conflict errors

2. **Create verification tooling**
   - Script: `verify-post-import.ts`
   - Script: `restore-metadata.ts`
   - Add to CI/CD if applicable

3. **Audit existing products**
   - Review all product metadata
   - Identify ownership violations
   - Fix manually or via migration script

### Priority 4: Long-term (Month 2+)

**Goal**: Runtime enforcement and monitoring

1. **Add Medusa workflow hooks**
   - Validate metadata writes at framework level
   - Prevent unauthorized field updates

2. **Admin UI warnings**
   - Show field ownership in admin panel
   - Warn when manually editing protected fields

3. **Monitoring & Alerts**
   - Log ownership violations
   - Alert on suspicious metadata changes
   - Dashboard for metadata health

---

## Critical Files Reference

### Files to Create

| File Path | Purpose | Priority |
|-----------|---------|----------|
| `/mytechgear-medusa/src/lib/metadata-ownership.ts` | Field ownership constants & helpers | P1 |
| `/mytechgear-medusa/src/lib/import-lock.ts` | Import lock mechanism | P2 |
| `/mytechgear-medusa/src/scripts/export-product-metadata.ts` | Backup metadata | P2 |
| `/mytechgear-medusa/src/scripts/check-ops-enrichment.ts` | Audit OPS enrichment | P2 |
| `/mytechgear-medusa/src/scripts/verify-post-import.ts` | Post-import verification | P3 |
| `/mytechgear-medusa/src/scripts/restore-metadata.ts` | Restore from backup | P3 |
| `/mytechgear-medusa/src/scripts/test-safe-import.ts` | Test import on single product | P2 |

### Files to Modify

| File Path | Changes Needed | Priority |
|-----------|----------------|----------|
| `/mytechgear-medusa/src/scripts/import-chamelo-shield.ts` | Add safe merge logic (lines 62-100) | P2 |
| `/mytechgear-medusa/src/scripts/import-chamelo-prismatic.ts` | Add safe merge logic | P2 |
| `/mytechgear-medusa/src/scripts/import-chamelo-lifestyle.ts` | Add safe merge logic | P2 |
| `/mytechgear-medusa/src/scripts/import-from-payload.ts` | Add safe merge logic | P2 |
| `/mytechgear-medusa/src/scripts/enrich-payload-products-metadata.ts` | Add safe merge logic | P2 |
| `/mytechgear-backend/src/api/ops/catalog/metadata/route.ts` | Add PIM field validation (lines 73-106) | P1 |

---

## Testing & Verification

### Test Cases

#### Test 1: PIM Re-Import Preserves OPS Fields
```bash
# Given: Product has OPS enrichment (features, rating)
# When: PIM re-import runs
# Then: OPS fields unchanged, PIM fields updated
```

#### Test 2: OPS Cannot Modify PIM Fields (Warning)
```bash
# Given: OPS endpoint called with PIM field update
# When: mode != 'force'
# Then: 400 error with conflict list
```

#### Test 3: Frontend Displays Merged Metadata
```bash
# Given: Product has both PIM (weight_grams) and OPS (specs[])
# When: Frontend renders product page
# Then: Shows formatted specs (OPS), not raw weight (PIM)
```

#### Test 4: Import Lock Prevents Concurrent Imports
```bash
# Given: Import script running
# When: Second import starts
# Then: Second import fails with lock error
```

### Verification Checklist

After implementation, verify:

- [ ] OPS_PROTECTED_FIELDS constant created and exported
- [ ] PIM_TECHNICAL_FIELDS constant created and exported
- [ ] All import scripts use safe merge pattern
- [ ] OPS endpoint validates PIM field writes
- [ ] Backup script created and tested
- [ ] Verification script created and tested
- [ ] Import lock mechanism implemented
- [ ] Documentation updated in all modified files
- [ ] Test re-import on staging environment
- [ ] Frontend displays correctly with merged metadata

---

## Success Criteria

### Technical Success

✅ **PIM re-import never overwrites OPS enrichment data**
  - Verified by: `verify-post-import.ts` script

✅ **OPS endpoint warns when trying to modify technical specs**
  - Verified by: API tests with PIM field updates

✅ **Frontend receives properly merged metadata**
  - Verified by: End-to-end tests on product pages

✅ **No data loss during routine imports**
  - Verified by: Pre/post import metadata comparison

✅ **Clear ownership documented in code**
  - Verified by: JSDoc comments in all relevant files

### Business Success

✅ **Marketing team can update SEO/features without PIM dependency**
  - No more waiting for PIM re-import to change badges/ratings

✅ **PIM team can re-import technical specs without fear**
  - Confidence that marketing content won't be lost

✅ **Developers understand field ownership**
  - Clear documentation prevents accidental violations

✅ **Zero production incidents related to metadata conflicts**
  - Monitoring shows no ownership violations

---

## Appendix A: Field Ownership Quick Reference

### Quick Lookup Table

| Field Name | Owner | Can OPS Read? | Can OPS Write? | Can PIM Write? |
|------------|-------|---------------|----------------|----------------|
| `brand` | PIM | ✅ Yes | ❌ No | ✅ Yes |
| `weight_grams` | PIM | ✅ Yes | ❌ No | ✅ Yes |
| `lens_technology` | PIM | ✅ Yes | ❌ No | ✅ Yes |
| `battery_mah` | PIM | ✅ Yes | ❌ No | ✅ Yes |
| `features[]` | OPS | ✅ Yes | ✅ Yes | ❌ No |
| `specs[]` | OPS | ✅ Yes | ✅ Yes | ❌ No |
| `rating` | OPS | ✅ Yes | ✅ Yes | ❌ No |
| `badges[]` | OPS | ✅ Yes | ✅ Yes | ❌ No |
| `seo_keywords` | OPS* | ✅ Yes | ✅ Yes | ❌ No (after migration) |
| `warranty_years` | PIM | ✅ Yes | ❌ No | ✅ Yes |
| `warranty` (object) | OPS | ✅ Yes | ✅ Yes | ❌ No |

*After migration (currently both)

---

## Appendix B: Migration Checklist for `seo_keywords`

### Phase 1: Preparation (Week 1)
- [ ] Audit all products with `seo_keywords`
- [ ] Document current PIM-written keywords
- [ ] Create `pim.source_keywords` field definition

### Phase 2: Implementation (Week 2)
- [ ] Update PIM scripts to write `pim.source_keywords`
- [ ] Update OPS endpoint to merge keywords
- [ ] Test on staging environment

### Phase 3: Migration (Week 3)
- [ ] Run migration script to copy `seo_keywords` → `pim.source_keywords`
- [ ] Verify all products migrated
- [ ] Update PIM scripts to stop writing `seo_keywords`

### Phase 4: Verification (Week 4)
- [ ] Verify OPS is sole writer of `seo_keywords`
- [ ] Test PIM re-import preserves `seo_keywords`
- [ ] Monitor for any issues
- [ ] Update documentation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-08 | Claude Sonnet 4.5 | Initial version - comprehensive ownership model |

---

## Contact & Questions

For questions about this ownership model:
- Review this document
- Check implementation in `/mytechgear-medusa/src/lib/metadata-ownership.ts`
- See examples in PIM import scripts

**Remember**: When in doubt, **PIM owns product specs, OPS owns marketing content**.
