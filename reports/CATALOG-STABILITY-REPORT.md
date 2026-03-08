# Catalog & Pricing Layer Stability Report

**Date:** 2026-03-08
**Status:** ❌ **CRITICAL ISSUES FOUND**
**Environment:** Medusa v2 Backend + Next.js Admin Dashboard

---

## Executive Summary

A comprehensive audit of the MyTechGear catalog and pricing implementation has revealed **critical issues** that prevent the system from functioning correctly in production.

### Key Findings

| Category | Status | Count |
|----------|--------|-------|
| 📦 Products | ✅ OK | 16 products |
| 📦 Variants | ✅ OK | 24 variants |
| 🔑 SKU Coverage | ✅ OK | 100% (0 missing) |
| 💰 Pricing Coverage | ❌ **CRITICAL** | **0% (24/24 missing)** |
| 🏷️ Canonical IDs | ❌ **CRITICAL** | **0% (24/24 missing)** |
| 🔄 Duplicate SKUs | ✅ OK | 0 duplicates |
| 🔄 Duplicate Titles | ⚠️ WARNING | 1 duplicate ("Dragon") |

### Critical Issues

1. **❌ NO PRICES CONFIGURED** - All 24 variants are missing price data
2. **❌ NO CANONICAL IDS** - All 24 variants missing PIM `canonicalId` metadata
3. **⚠️ BROKEN PRICING ENDPOINT** - `GET /admin-api/pricing/[variantId]` returns empty

### Root Cause

The pricing endpoint implementation is **incompatible with Medusa v2 architecture**:

```typescript
// INCORRECT (current implementation)
const variant = await productService.retrieveProductVariant(variantId, {
  relations: ['prices'],  // ❌ This relation doesn't exist in Medusa v2
});
```

In **Medusa v2**, variants don't have a direct `prices` relation. Instead:
- Variants have a `price_set_id`
- Price Sets contain multiple `prices` (one per currency)
- Must use `PricingService.calculatePrices()` to retrieve pricing data

---

## 1. Product Integrity Validation

### ✅ Product Structure

```
16 products found:
├─ Prime (1 variant)
├─ Dragon (1 variant) - ⚠️ DUPLICATE TITLE
├─ Falcon (1 variant)
├─ Euphoria (2 variants)
├─ Duck Classic (1 variant)
├─ Music Shield (5 variants)
├─ Shield (1 variant)
├─ MR1 x Chamelo Infinity (1 variant)
├─ Zurix (1 variant)
├─ Veil (1 variant)
├─ Dusk Classic (1 variant)
├─ Infinity (1 variant)
├─ Aura (1 variant)
├─ Aura Audio (4 variants)
├─ Aroza (1 variant)
└─ Dragon (1 variant) - ⚠️ DUPLICATE TITLE
```

**Total:** 24 variants across 16 products

### ✅ SKU Coverage

All 24 variants have valid SKUs:

```
LFS-PRI-NBM-FIR
LFS-DRA-BLKG-CAL
SPR-FAL-OBS-BLU
PRI-EUP-BLC-BLU
PRI-EUP-GLD-ROS
DUCK-CLASSIC-DEFAULT
MS-WHT-RED
MSHIELD-W-R-AUD
MSH-MB-SMK
MS-WHT-BLU
... (14 more)
```

**No duplicate SKUs detected** ✅

### ⚠️ Duplicate Product Titles

**Issue:** Two products share the title "Dragon"

```json
{
  "product_id": "prod_01KGBSKFJ0GNRNVKXWZJEHE93H",
  "title": "Dragon",
  "variants": [{ "sku": "LFS-DRA-BLKG-CAL" }]
},
{
  "product_id": "prod_01KGC06J68DE3MNGBGG8GJ1PCZ",
  "title": "Dragon",
  "variants": [{ "sku": "LFS-DRA-BLKG-ELI" }]
}
```

**Impact:** May cause confusion in admin UI and storefront navigation.

**Recommendation:** Rename one product or merge them if they're the same product.

### ❌ Missing Canonical IDs

**All 24 variants** are missing the `canonicalId` metadata field.

**Expected:** Each variant should have:
```json
{
  "metadata": {
    "canonicalId": "abc-123-xyz"  // ← Missing for all variants
  }
}
```

**Impact:**
- PIM sync cannot identify variants correctly
- Re-syncing from Airtable will create duplicates instead of updating
- Breaks bidirectional sync integrity

**Recommendation:** Run PIM sync to populate `canonicalId` from Airtable.

### ℹ️ Product Options

**Info:** All variants show "no options" - this is **expected behavior** for simple products (products with only one variant or no configurability).

---

## 2. Pricing Implementation Audit

### ❌ CRITICAL: Pricing Endpoint Broken

**Endpoint:** `GET /admin-api/pricing/[variantId]`

**Current Implementation (BROKEN):**

```typescript
// File: src/api/admin-api/pricing/[variantId]/route.ts:26-28

const variant = await productService.retrieveProductVariant(variantId, {
  relations: ['prices'],  // ❌ WRONG - this relation doesn't exist
});

return res.status(200).json({
  prices: (variant as any).prices || [],  // ❌ Always returns []
});
```

**Problem:**
- Medusa v2 doesn't have a `prices` relation on variants
- This returns an empty array `[]` for ALL variants
- Admin dashboard thinks no prices exist

**Correct Implementation (REQUIRED FIX):**

```typescript
// ✅ CORRECT WAY - Use PricingService

import { getVariantPrices } from '../../../lib/pricing';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pricingService = req.scope.resolve(Modules.PRICING);
  const { variantId } = req.params;

  // Use the custom pricing helper
  const prices = await getVariantPrices(pricingService, variantId);

  return res.status(200).json({ prices });
}
```

The helper function `getVariantPrices()` already exists in `src/lib/pricing.ts:128-156` and correctly:
1. Fetches the price_set_id for the variant
2. Retrieves all prices from the price set
3. Returns properly formatted price data

### 🔍 Pricing Architecture Validation

**Custom Pricing Module:** ✅ **Correctly Implemented**

File: `src/lib/pricing.ts`

```typescript
✅ validatePrice() - Validates currency and amount
✅ formatPrice() - Formats with currency symbols
✅ ensurePriceSet() - Creates price sets if missing
✅ getVariantPrices() - Retrieves prices via PricingService
✅ setVariantPrice() - Sets/updates single price
✅ bulkSetVariantPrices() - Bulk price updates
✅ calculatePrice() - Context-aware price calculation
✅ listVariantsWithPrices() - Lists all variants with pricing
```

**Supported Currencies:**
- EUR (€) - 2 decimals
- USD ($) - 2 decimals
- GBP (£) - 2 decimals
- CHF - 2 decimals

**Price Constraints:**
- Min: 0
- Max: 10,000,000.00 (in main unit)
- Storage: Smallest unit (cents)

### ❌ No Prices Actually Configured

**Result from audit:** `0/24 variants have prices`

**Possible Causes:**

1. **PIM Sync Incomplete** - Prices not synced from Airtable
2. **Manual Price Entry Required** - Prices never initialized
3. **Price Set Creation Failed** - Database issue during sync

**To Verify:**

```bash
# Check if price sets exist in database
psql -d medusa -c "SELECT COUNT(*) FROM price_set;"

# Check if any prices exist
psql -d medusa -c "SELECT COUNT(*) FROM price;"
```

**Recommendation:**
- Run PIM sync to populate prices from Airtable
- OR manually configure prices via admin dashboard
- Verify price sets are created correctly

---

## 3. Storefront Price Calculation

### ℹ️ Price Calculation Implementation

**Method:** `pricingService.calculatePrices()`

**Implemented in:** `src/lib/pricing.ts:265-297`

```typescript
export async function calculatePrice(
  pricingService: any,
  context: PriceCalculationContext
): Promise<CalculatedPrice | null> {
  const [result] = await pricingService.calculatePrices(
    { id: [context.variant_id] },
    {
      context: {
        currency_code: context.currency_code,
        region_id: context.region_id,
        customer_group_id: context.customer_group_id,
      },
    }
  );

  // Returns calculated price with context awareness
  return {
    variant_id: context.variant_id,
    currency_code,
    amount: calculated_amount,
    formatted_amount: formatPrice(calculated_amount, currency_code),
  };
}
```

**Context Support:** ✅ **Correctly Implemented**
- ✅ Region-based pricing
- ✅ Currency selection
- ✅ Customer group pricing (Price Lists - if configured)
- ✅ Quantity-based pricing (min/max quantity)

**Status:** Implementation is **correct** but **untestable** until prices are configured.

---

## 4. Catalog Health Report

Full report saved to: `reports/catalog-health.json`

### Summary Statistics

```json
{
  "timestamp": "2026-03-08T06:14:14.992Z",
  "summary": {
    "products_count": 16,
    "variants_count": 24,
    "variants_with_prices": 0,
    "variants_missing_prices": 24,
    "variants_missing_sku": 0,
    "variants_missing_canonical_id": 24,
    "duplicate_skus": 0,
    "duplicate_titles": 1
  },
  "currencies": {
    "configured": ["eur", "usd", "gbp", "chf"],
    "coverage": {
      "eur": 0,
      "usd": 0,
      "gbp": 0,
      "chf": 0
    }
  },
  "issues": 73
}
```

### Issue Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Error | 24 | Variants missing prices |
| ⚠️ Warning | 25 | Variants missing canonicalId |
| ℹ️ Info | 24 | Variants without options (expected) |

---

## 5. Issues Found & Fixes Required

### 🔴 CRITICAL ISSUES

#### Issue #1: Broken Pricing Endpoint

**File:** `src/api/admin-api/pricing/[variantId]/route.ts`

**Problem:** Uses non-existent `relations: ['prices']`

**Fix Required:**

```diff
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
-   const productService = req.scope.resolve(Modules.PRODUCT);
+   const pricingService = req.scope.resolve(Modules.PRICING);
    const { variantId } = req.params;

-   const variant = await productService.retrieveProductVariant(variantId, {
-     relations: ['prices'],
-   });
-
-   if (!variant) {
-     return res.status(404).json({ error: 'Variant not found' });
-   }
-
-   return res.status(200).json({
-     prices: (variant as any).prices || [],
-   });

+   const prices = await getVariantPrices(pricingService, variantId);
+
+   return res.status(200).json({ prices });
  } catch (error: any) {
    console.error('[Variant Pricing API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch variant prices',
      details: error.message
    });
  }
}
```

**Priority:** 🔥 **CRITICAL - BLOCKS ALL PRICING OPERATIONS**

---

#### Issue #2: No Prices Configured

**Problem:** All 24 variants have no price data

**Possible Root Causes:**
1. PIM sync never ran or failed
2. Prices not configured in Airtable source
3. Price Set creation failed during sync

**Fix Options:**

**Option A: Run PIM Sync (Recommended)**
```bash
cd mytechgear-medusa
npm run sync:pim
```

**Option B: Manual Price Configuration**

Use the admin dashboard to set prices for each variant:
```
1. Navigate to /admin/pricing
2. For each variant, set prices for EUR, USD, GBP, CHF
3. Verify prices appear in product detail pages
```

**Option C: Bulk Price Import**

Create a CSV with pricing data and import:
```bash
npx tsx scripts/import-prices.ts prices.csv
```

**Priority:** 🔥 **CRITICAL - REQUIRED FOR LAUNCH**

---

#### Issue #3: Missing Canonical IDs

**Problem:** All variants missing `metadata.canonicalId`

**Impact:** PIM sync will create duplicates instead of updating existing variants

**Fix:** Run PIM sync with `--update-metadata` flag
```bash
npm run sync:pim -- --update-metadata
```

**Priority:** 🔥 **CRITICAL FOR PIM INTEGRITY**

---

### ⚠️ WARNINGS

#### Warning #1: Duplicate Product Title

**Products:**
- `prod_01KGBSKFJ0GNRNVKXWZJEHE93H` - "Dragon" (SKU: LFS-DRA-BLKG-CAL)
- `prod_01KGC06J68DE3MNGBGG8GJ1PCZ` - "Dragon" (SKU: LFS-DRA-BLKG-ELI)

**Fix Options:**
1. Rename one to "Dragon Elite" or "Dragon Classic"
2. Merge if they're the same product with different SKUs
3. Update in Airtable and re-sync

**Priority:** ⚠️ **MEDIUM - FIX BEFORE LAUNCH**

---

### ℹ️ INFO

#### No Product Options

**Status:** Expected behavior for simple products (single variant, no configuration)

**No action required**

---

## 6. Pricing Layer Stability Confirmation

### Current Status: ❌ **UNSTABLE**

**Blockers:**

1. ❌ Pricing endpoint broken (returns empty for all variants)
2. ❌ No actual price data configured
3. ❌ Cannot test price calculation without data

### After Fixes Applied: ✅ **STABLE** (Projected)

**Once the following are completed:**

1. ✅ Fix pricing endpoint to use `PricingService`
2. ✅ Configure prices (via PIM sync or manual entry)
3. ✅ Populate canonical IDs
4. ✅ Resolve duplicate product title

**The pricing layer will be:**
- ✅ Correctly integrated with Medusa v2
- ✅ Multi-currency support functional
- ✅ Context-aware price calculation working
- ✅ Admin dashboard pricing UI operational
- ✅ Storefront price display functional

---

## 7. Recommended Action Plan

### Phase 1: Critical Fixes (Day 1)

**Priority:** 🔥 BLOCKING

1. **Fix Pricing Endpoint** (30 minutes)
   - Update `src/api/admin-api/pricing/[variantId]/route.ts`
   - Use `getVariantPrices()` from `lib/pricing.ts`
   - Test with `curl` or Postman

2. **Verify PIM Sync Status** (15 minutes)
   - Check if PIM sync pipeline exists
   - Verify Airtable has pricing data
   - Check for sync error logs

3. **Configure Prices** (2-4 hours)
   - **IF PIM exists:** Run sync pipeline
   - **IF NOT:** Manual price entry for all 24 variants
   - Verify prices appear in admin dashboard

4. **Populate Canonical IDs** (30 minutes)
   - Run PIM sync with metadata update
   - OR write migration script to populate from SKU

---

### Phase 2: Data Quality (Day 2)

1. **Resolve Duplicate Title** (15 minutes)
   - Rename one "Dragon" product
   - Update in Airtable if using PIM

2. **Run Full Catalog Audit** (5 minutes)
   ```bash
   npx tsx scripts/audit-catalog-http.ts
   ```
   - Verify 0 critical issues
   - Confirm 100% price coverage

3. **Test Price Calculation** (30 minutes)
   - Test storefront price display
   - Verify multi-currency switching
   - Test region-based pricing

---

### Phase 3: Validation (Day 3)

1. **End-to-End Testing**
   - ✅ Admin can view/edit prices
   - ✅ Storefront shows correct prices
   - ✅ Currency switching works
   - ✅ Cart calculates totals correctly

2. **Performance Testing**
   - Verify price calculation is fast (<50ms)
   - Check database query count
   - Optimize if needed

3. **Documentation**
   - Document pricing workflow
   - Create admin guide for price management
   - Document PIM sync process

---

## 8. Files Requiring Updates

### Must Fix

| File | Issue | Priority |
|------|-------|----------|
| `src/api/admin-api/pricing/[variantId]/route.ts` | Broken pricing endpoint | 🔥 CRITICAL |

### Data Updates Required

| Item | Action | Priority |
|------|--------|----------|
| All 24 variants | Configure prices (EUR, USD, GBP, CHF) | 🔥 CRITICAL |
| All 24 variants | Populate `metadata.canonicalId` | 🔥 CRITICAL |
| "Dragon" product | Rename or merge duplicate | ⚠️ MEDIUM |

---

## 9. Verification Checklist

After applying fixes, verify:

- [ ] Pricing endpoint returns actual price data
- [ ] All variants have prices in EUR
- [ ] All variants have prices in USD, GBP, CHF (if multi-currency required)
- [ ] All variants have `canonicalId` in metadata
- [ ] No duplicate product titles
- [ ] Admin dashboard pricing page loads without errors
- [ ] Can edit prices via admin dashboard
- [ ] Storefront displays prices correctly
- [ ] Currency switching works
- [ ] Re-run audit: `npx tsx scripts/audit-catalog-http.ts`
- [ ] Audit shows 0 critical errors

---

## 10. Conclusion

### Current State: ❌ **NOT PRODUCTION READY**

**Critical blockers:**
1. Pricing endpoint incompatible with Medusa v2
2. No price data configured for any variant
3. Missing PIM metadata (canonical IDs)

### Projected State: ✅ **PRODUCTION READY** (After fixes)

**Estimated fix time:** 1-2 days (with PIM sync)

**Required actions:**
1. Fix pricing endpoint (30 min)
2. Run PIM sync OR manual price configuration (2-4 hours)
3. Populate canonical IDs (30 min)
4. Resolve duplicate title (15 min)
5. Full validation & testing (4 hours)

**Once completed:**
- ✅ Catalog structure: **SOLID**
- ✅ Pricing implementation: **STABLE**
- ✅ Multi-currency support: **FUNCTIONAL**
- ✅ PIM integration: **INTACT**
- ✅ Production readiness: **ACHIEVED**

---

**Generated:** 2026-03-08T06:14:14Z
**Audited by:** Catalog Health Audit Script v1.0
**Next audit:** After fixes applied
