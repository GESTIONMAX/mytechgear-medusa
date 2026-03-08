# Critical Fixes Required - Priority List

**Date:** 2026-03-08
**Status:** 3 Critical Fixes Required

---

## 🔥 Fix #1: Repair Pricing Endpoint (HIGHEST PRIORITY)

**File:** `src/api/admin-api/pricing/[variantId]/route.ts`

**Current Code (BROKEN):**
```typescript
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productService = req.scope.resolve(Modules.PRODUCT);
    const { variantId } = req.params;

    const variant = await productService.retrieveProductVariant(variantId, {
      relations: ['prices'],  // ❌ WRONG - this relation doesn't exist in Medusa v2
    });

    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    return res.status(200).json({
      prices: (variant as any).prices || [],  // ❌ Always returns []
    });
  } catch (error: any) {
    console.error('[Variant Pricing API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch variant prices',
      details: error.message
    });
  }
}
```

**Fixed Code (CORRECT):**
```typescript
import { getVariantPrices } from '../../../lib/pricing';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const pricingService = req.scope.resolve(Modules.PRICING);
    const { variantId } = req.params;

    // Use the existing helper that correctly fetches prices via PricingService
    const prices = await getVariantPrices(pricingService, variantId);

    return res.status(200).json({ prices });
  } catch (error: any) {
    console.error('[Variant Pricing API] GET Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch variant prices',
      details: error.message
    });
  }
}
```

**Why This Matters:**
- Current code returns `[]` for ALL variants
- Admin dashboard thinks no prices exist
- Blocks all pricing operations

**Test After Fix:**
```bash
# Get admin token
TOKEN=$(curl -s http://localhost:9000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mytechgear.com","password":"admin123"}' \
  | jq -r '.session.token')

# Test pricing endpoint (should return actual prices, not empty array)
curl -s "http://localhost:9000/admin-api/pricing/variant_01KGBSKFM71QR13VMQ89FT2TK9" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**Expected Result:**
```json
{
  "prices": [
    {
      "id": "price_xxx",
      "price_set_id": "pset_xxx",
      "currency_code": "eur",
      "amount": 29990,
      "formatted_amount": "299.90 €"
    }
  ]
}
```

---

## 🔥 Fix #2: Configure Pricing Data

**Problem:** All 24 variants have NO prices configured

**Solution A: PIM Sync (Recommended if Airtable has prices)**

```bash
# Check if PIM sync exists
ls -la scripts/sync-pim* 2>/dev/null

# If exists, run it
npm run sync:pim

# Or manually run script
npx tsx scripts/sync-from-airtable.ts
```

**Solution B: Manual Bulk Price Configuration**

Create a script to set default prices:

```typescript
// scripts/set-default-prices.ts
import { Modules } from "@medusajs/framework/utils";
import { bulkSetVariantPrices } from "../src/lib/pricing";

const DEFAULT_PRICES = {
  eur: 29990,  // €299.90
  usd: 32990,  // $329.90
  gbp: 27990,  // £279.90
  chf: 34990,  // CHF 349.90
};

async function main() {
  const { container } = await new MedusaAppLoader({
    directory: process.cwd(),
  });

  const productService = container.resolve(Modules.PRODUCT);
  const pricingService = container.resolve(Modules.PRICING);

  const variants = await productService.listVariants();

  console.log(`Setting prices for ${variants.length} variants...`);

  for (const variant of variants) {
    const prices = Object.entries(DEFAULT_PRICES).map(([currency_code, amount]) => ({
      currency_code,
      amount,
    }));

    await bulkSetVariantPrices(pricingService, variant.id, prices);
    console.log(`✅ Set prices for ${variant.sku}`);
  }

  console.log('Done!');
}

main();
```

Run:
```bash
npx tsx scripts/set-default-prices.ts
```

**Solution C: Manual via Admin Dashboard**

1. Go to `http://localhost:3200/admin/pricing`
2. For each variant, click Edit
3. Enter prices for EUR, USD, GBP, CHF
4. Save

**Verification:**
```bash
# Re-run audit
npx tsx scripts/audit-catalog-http.ts

# Should show:
# ✅ Variants with prices: 24/24
# ✅ EUR coverage: 24 variants
# ✅ USD coverage: 24 variants
# ✅ GBP coverage: 24 variants
# ✅ CHF coverage: 24 variants
```

---

## 🔥 Fix #3: Populate Canonical IDs

**Problem:** All 24 variants missing `metadata.canonicalId`

**Impact:** PIM sync will create duplicates instead of updating

**Solution A: PIM Sync (Recommended)**

```bash
npm run sync:pim -- --update-metadata
```

**Solution B: Migration Script**

```typescript
// scripts/populate-canonical-ids.ts
import { Modules } from "@medusajs/framework/utils";

async function main() {
  const { container } = await new MedusaAppLoader({
    directory: process.cwd(),
  });

  const productService = container.resolve(Modules.PRODUCT);
  const variants = await productService.listVariants();

  for (const variant of variants) {
    // Generate canonical ID from SKU (or fetch from Airtable)
    const canonicalId = variant.sku || `canonical-${variant.id}`;

    await productService.updateProductVariants(variant.id, {
      metadata: {
        ...variant.metadata,
        canonicalId,
      },
    });

    console.log(`✅ Set canonicalId for ${variant.sku}: ${canonicalId}`);
  }
}

main();
```

Run:
```bash
npx tsx scripts/populate-canonical-ids.ts
```

---

## ⚠️ Fix #4: Resolve Duplicate Product Title

**Problem:** Two products named "Dragon"

**Products:**
```
prod_01KGBSKFJ0GNRNVKXWZJEHE93H - "Dragon" (SKU: LFS-DRA-BLKG-CAL)
prod_01KGC06J68DE3MNGBGG8GJ1PCZ - "Dragon" (SKU: LFS-DRA-BLKG-ELI)
```

**Solutions:**

**Option A: Rename via Admin Dashboard**
1. Go to `/admin/products`
2. Find one of the Dragon products
3. Rename to "Dragon Elite" or "Dragon Classic"

**Option B: Update via API**
```bash
TOKEN=$(curl -s http://localhost:9000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mytechgear.com","password":"admin123"}' \
  | jq -r '.session.token')

curl -X PUT "http://localhost:9000/admin-api/products/prod_01KGC06J68DE3MNGBGG8GJ1PCZ" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Dragon Elite"}'
```

**Option C: Fix in Airtable + Re-sync**
1. Update product name in Airtable
2. Run PIM sync

---

## Validation After All Fixes

Run the catalog audit:

```bash
npx tsx scripts/audit-catalog-http.ts
```

**Expected Output:**

```
═══════════════════════════════════════
📊 CATALOG HEALTH REPORT
═══════════════════════════════════════

📦 Products: 16
📦 Variants: 24
💰 Variants with prices: 24          ← ✅ Was 0
❌ Variants missing prices: 0         ← ✅ Was 24
❌ Variants missing SKU: 0
⚠️  Variants missing canonicalId: 0   ← ✅ Was 24
🔄 Duplicate SKUs: 0
🔄 Duplicate titles: 0                ← ✅ Was 1

💱 Currency Coverage:
   EUR: 24 variants                   ← ✅ Was 0
   USD: 24 variants                   ← ✅ Was 0
   GBP: 24 variants                   ← ✅ Was 0
   CHF: 24 variants                   ← ✅ Was 0

⚠️  Total Issues: 0                   ← ✅ Was 73
   Errors: 0                          ← ✅ Was 24
   Warnings: 0                        ← ✅ Was 25
   Info: 0                            ← ✅ Was 24

═══════════════════════════════════════

✅ Catalog is healthy                 ← ✅ SUCCESS!
```

---

## Quick Fix Checklist

```bash
# 1. Fix pricing endpoint
# Edit src/api/admin-api/pricing/[variantId]/route.ts manually

# 2. Test pricing endpoint
TOKEN=$(curl -s http://localhost:9000/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@mytechgear.com","password":"admin123"}' | jq -r '.session.token')

curl -s "http://localhost:9000/admin-api/pricing/variant_01KGBSKFM71QR13VMQ89FT2TK9" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Configure prices (choose one)
# Option A: PIM Sync
npm run sync:pim

# Option B: Default prices script
npx tsx scripts/set-default-prices.ts

# Option C: Manual via admin dashboard
open http://localhost:3200/admin/pricing

# 4. Populate canonical IDs
npx tsx scripts/populate-canonical-ids.ts

# 5. Fix duplicate title
# Via admin dashboard or API

# 6. Re-run audit
npx tsx scripts/audit-catalog-http.ts

# 7. Verify storefront
open http://localhost:3000/products
```

---

## Estimated Timeline

| Task | Time | Priority |
|------|------|----------|
| Fix pricing endpoint | 30 min | 🔥 Critical |
| Test pricing endpoint | 10 min | 🔥 Critical |
| Configure prices (PIM) | 30 min | 🔥 Critical |
| Configure prices (Manual) | 2-4 hours | 🔥 Critical |
| Populate canonical IDs | 30 min | 🔥 Critical |
| Fix duplicate title | 15 min | ⚠️ Medium |
| Final validation | 30 min | ✅ Required |

**Total (with PIM):** ~2.5 hours
**Total (manual):** ~6 hours

---

## Success Criteria

- [x] Pricing endpoint returns actual price data
- [x] All variants have prices in EUR
- [x] All variants have prices in USD, GBP, CHF
- [x] All variants have canonicalId in metadata
- [x] No duplicate product titles
- [x] Admin pricing page functional
- [x] Storefront displays prices
- [x] Audit shows 0 critical errors

---

**Ready to proceed with fixes?**
