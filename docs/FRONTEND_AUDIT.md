# Audit Technique Frontend - Migration Medusa

**Version** : 1.0
**Date** : 2026-02-01
**Frontend analysé** : `/home/gestionmax-aur-lien/CascadeProjects/mytechgear-workspace/mytechgear-frontend`

---

## Vue d'Ensemble

**Stack Frontend Actuel** :
- Next.js 15.5.4 (App Router)
- React 19.2.0
- TypeScript 5.9.3 (strict mode)
- TanStack React Query 5.17.0
- Zustand 4.4.7

**Backends Supportés** :
- ✅ **Payload CMS v3** (principal, legacy)
- ⚠️ **Medusa** (partiel, incomplet)

**Déploiement** : Netlify (mytechgear.eu)

---

## 🔴 Dette Technique Critique

### 1. Double Backend (Payload + Medusa)

**Problème** :
Le frontend supporte **2 backends simultanément** via des services adaptateurs.

**Fichiers concernés** :
```
src/services/
├── ecommerce-service.ts       # Abstraction générique
├── auth-service.ts            # Auth Payload CMS
├── medusa/
│   ├── product-service.ts     # Adapter Medusa
│   ├── cart-service.ts        # Adapter Medusa
│   └── checkout-service.ts    # Adapter Medusa
└── variant-service.ts         # Service Payload CMS
```

**Conséquences** :
- ❌ Code dupliqué (2 implémentations pour chaque feature)
- ❌ Logique conditionnelle partout (`if (useMedusa) { ... } else { ... }`)
- ❌ Surface de bugs × 2
- ❌ Maintenance complexe
- ❌ Tests complexes (2 chemins à tester)

**Exemple de duplication** :
```typescript
// useProduct.ts - Supporte 2 backends
export const useProduct = (identifier: string | undefined) => {
  // Payload CMS path
  const payloadProduct = await ecommerceService.getProduct(identifier)

  // Medusa path (incomplete)
  const medusaProduct = await medusaProductService.getProduct(identifier)
}
```

**Impact migration** : 🔴 **ÉLEVÉ**
- Nécessite suppression complète branche Payload
- Risque régression si mauvaise identification dépendances

---

### 2. Logique Métier Embarquée Côté Frontend

**Problème** :
Le frontend contient de la **logique métier** qui devrait vivre dans le backend.

**Exemples identifiés** :

#### A. Calcul Prix & Totaux (`CartContext`)

```typescript
// src/contexts/cart-context.tsx
const calculateTotals = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => {
    const price = item.priceCents ?? (item.price * 100)
    return sum + (price * item.quantity)
  }, 0)

  // ⚠️ Logique métier côté front
  const shipping = subtotal > 5000 ? 0 : 590  // Livraison gratuite > 50€
  const tax = Math.round(subtotal * 0.20)     // TVA 20% calculée côté front
  const total = subtotal + shipping + tax

  return { subtotal, shipping, tax, total }
}
```

**Problème** :
- ❌ Règles métier dupliquées (frontend + backend)
- ❌ Risque désynchronisation
- ❌ Impossible de changer rules sans redéployer frontend
- ❌ Contrat de données violé (frontend devrait recevoir prix calculés)

**Ce qui devrait se passer** :
```typescript
// Backend Medusa retourne déjà prix calculés
GET /store/carts/:id
{
  "subtotal": 5000,
  "shipping_total": 0,
  "tax_total": 1000,
  "total": 6000
}
```

---

#### B. Filtrage Produits Contaminés (`variant-service.ts`)

```typescript
// src/services/variant-service.ts
export async function getAllVariants(categorySlug?: string) {
  // ⚠️ Filtrage côté client pour éviter contamination
  const allVariants = await api.get('/variants')

  // Client-side filtering par product ID
  if (productId) {
    return allVariants.filter(v => v.product.id === productId)
  }
}
```

**Problème** :
- ❌ Fetch ALL variants puis filtrage client (inefficace)
- ❌ Gaspillage bande passante
- ❌ Logique sécurité côté client (non fiable)
- ❌ Performance dégradée (100+ variants)

**Solution Medusa** :
```typescript
// Backend Medusa filtre déjà
GET /store/products/:id/variants  // Filtre automatique par produit
```

---

#### C. Conversion Prix (cents ↔ euros)

```typescript
// Multiples endroits
const price = item.priceCents ?? (item.price * 100)  // Conversion frontend
const priceEuros = priceCents / 100                   // Conversion frontend
```

**Problème** :
- ❌ Convention incohérente (parfois cents, parfois euros)
- ❌ Risque erreur arrondi
- ❌ Frontend doit connaître convention backend

**Solution Medusa** :
- Backend expose **toujours cents**
- Frontend affiche **toujours ce qui vient du backend**
- Formatage uniquement (pas de calcul)

---

### 3. Gestion État Redondante

**Problème** :
3 systèmes de state management utilisés **simultanément** :

```
React Context (AuthContext, CartContext, WishlistContext)
     +
React Query (Products cache, Orders cache)
     +
Zustand (Client state)
     +
localStorage (Persistence)
```

**Conséquences** :
- ❌ Synchro complexe entre layers
- ❌ Source de vérité fragmentée
- ❌ Bugs de synchro (ex: cart context ≠ cart localStorage)
- ❌ Performance impact (re-renders multiples)

**Exemple problématique** :
```typescript
// Cart géré dans 3 endroits différents :
1. CartContext (React state)
2. localStorage ('cart')
3. React Query cache (si sync backend)

// Risque désynchronisation si un layer update sans les autres
```

---

### 4. Cache Maison (Non Standard)

**Problème** :
Cache produits implémenté **manuellement** au lieu d'utiliser React Query.

```typescript
// src/hooks/useProduct.ts
const productCache = new Map<string, ClientProduct>()
const inflightRequests = new Map<string, Promise<ClientProduct | null>>()
const CACHE_TTL_MS = 2 * 60 * 1000

// Logique cache custom (100+ lignes)
```

**Conséquences** :
- ❌ Réinvente la roue (React Query fait déjà ça)
- ❌ Bugs potentiels (race conditions, memory leaks)
- ❌ Pas de devtools React Query
- ❌ Code complexe à maintenir

**React Query fait déjà** :
- ✅ Caching automatique
- ✅ Request deduplication
- ✅ Background refetch
- ✅ Stale-while-revalidate
- ✅ Devtools intégrés

---

### 5. Images Multi-Sources (GCS + Drive + Static)

**Problème** :
3 sources d'images différentes avec logique de fallback complexe.

```typescript
// src/services/medusa/product-service.ts
// 1. Essayer GCS bucket
const gcsUrl = await loadProductImagesFromGCS(product)

// 2. Fallback Google Drive
const driveUrl = getGoogleDriveUrl(product.imageDrive)

// 3. Fallback URL static
const staticUrl = product.thumbnail
```

**Conséquences** :
- ❌ Logique complexe côté frontend
- ❌ Performance (tentatives multiples)
- ❌ UX dégradée (images tardent à charger)
- ❌ Dépendance GCS credentials côté client (risque sécurité)

**Solution Medusa** :
- Backend expose **uniquement URLs finales**
- Frontend affiche **sans logique fallback**
- CDN gère disponibilité

---

### 6. JWT Tokens en localStorage (Sécurité)

**Problème** :
Tokens JWT stockés en **localStorage** (vulnérable XSS).

```typescript
// src/contexts/auth-context.tsx
localStorage.setItem('payload-token', token)
localStorage.setItem('payload-user', JSON.stringify(user))
```

**Risques** :
- ❌ Vulnérable XSS (JavaScript peut lire localStorage)
- ❌ Pas de HttpOnly protection
- ❌ Token accessible depuis n'importe quel script

**Bonne pratique** :
- ✅ HttpOnly cookies (pas accessible JavaScript)
- ✅ Secure flag (HTTPS uniquement)
- ✅ SameSite=Strict (CSRF protection)

**Medusa utilise** : HttpOnly cookies par défaut

---

### 7. Proxy API Routes (Indirection Inutile)

**Problème** :
Requêtes passent par `/api/*` routes Next.js au lieu d'appeler backend direct.

```typescript
// Frontend appelle
POST /api/payload/login

// Next.js route forward vers
POST http://localhost:3001/api/users/login
```

**Conséquences** :
- ❌ Latence additionnelle (double hop)
- ❌ Complexité déploiement
- ❌ Logs fragmentés
- ❌ Debugging difficile

**Pourquoi c'était fait** :
- Cacher URL backend (sécurité par obscurité - faible)
- CORS workaround (mauvaise pratique)

**Solution Medusa** :
- Frontend appelle **directement** Store API
- CORS configuré proprement côté backend
- Pas de proxy

---

## 🟡 Dette Technique Modérée

### 8. Types TypeScript Dupliqués

**Problème** :
Types définis **côté frontend** au lieu d'être générés depuis backend.

```typescript
// src/types/index.ts
export interface Product {
  id: string
  title: string
  slug: string
  price: number
  priceCents?: number  // ⚠️ Incohérence
  // ... 30+ champs
}
```

**Conséquences** :
- ❌ Drift frontend ↔ backend (types désynchronisés)
- ❌ Erreurs runtime si backend change
- ❌ Maintenance double (change backend = change frontend)

**Solution moderne** :
- ✅ Types générés automatiquement depuis OpenAPI/Swagger
- ✅ Single source of truth (backend schema)
- ✅ Détection breaking changes au build

**Medusa expose** : OpenAPI spec → génération types automatique

---

### 9. Convention Prix Incohérente

**Problème** :
Mélange `price` (euros) et `priceCents` (cents).

```typescript
// Parfois euros
product.price: 99.00

// Parfois cents
product.priceCents: 9900

// Fallback partout
const price = item.priceCents ?? (item.price * 100)
```

**Conséquences** :
- ❌ Bugs (oubli conversion)
- ❌ Code verbeux (conversions partout)
- ❌ Confusion développeurs

**Solution Medusa** :
- Backend **toujours cents**
- Frontend **toujours affiche** (formatage uniquement)

---

### 10. Contexts Imbriqués (Performance)

**Problème** :
6 contexts imbriqués dans `layout.tsx`.

```typescript
<QueryProvider>
  <ToastProvider>
    <AuthProvider>
      <ConsentProvider>
        <WishlistProvider>
          <CartProvider>
            {children}
```

**Conséquences** :
- ⚠️ Re-renders en cascade
- ⚠️ Performance impact (re-render tout l'arbre)
- ⚠️ Debugging difficile

**Solution** :
- Réduire nombre contexts (combiner proches)
- Utiliser React Query pour state serveur
- Contexts uniquement pour UI state

---

## 🟢 Points Positifs (Réutilisables)

### 11. Architecture Next.js App Router ✅

**Bon** :
- Structure claire (app router)
- Server components support
- File-based routing
- Middleware edge

**Réutilisable à 100%** pour Medusa

---

### 12. UI Components (Radix UI) ✅

**Bon** :
- Headless components (pas de style imposé)
- Accessible (ARIA, keyboard nav)
- Composable
- Tailwind styling

**Réutilisable à 100%** (indépendant backend)

---

### 13. React Query Setup ✅

**Bon** :
- Bonne architecture (QueryProvider)
- Devtools configurés
- Stale times appropriés

**Réutilisable à 90%** (juste changer queries)

---

### 14. TypeScript Strict Mode ✅

**Bon** :
- Type safety
- Catch errors au build
- Auto-completion

**Réutilisable à 100%**

---

### 15. Tailwind + Design System ✅

**Bon** :
- Cohérence visuelle
- Composants réutilisables
- Responsive
- Dark mode ready

**Réutilisable à 100%**

---

## 🔗 Analyse Couplage Frontend ↔ Backend

### Niveau de Couplage : 🔴 **TRÈS ÉLEVÉ**

```
┌─────────────────────────────────────────────┐
│         FRONTEND (Next.js)                  │
├─────────────────────────────────────────────┤
│                                             │
│  ❌ Auth Logic (JWT, localStorage)          │
│  ❌ Cart Totals Calculation (TVA, shipping) │
│  ❌ Price Conversion (euros ↔ cents)        │
│  ❌ Variant Filtering (contamination)       │
│  ❌ Image Fallback Logic (GCS + Drive)      │
│  ❌ Business Rules (free shipping > 50€)    │
│                                             │
│         ↕️ ↕️ ↕️ (Couplage fort)              │
│                                             │
│  Payload CMS API Calls:                     │
│  • POST /users/login                        │
│  • GET /products/:id?depth=2                │
│  • GET /variants?where[product][equals]=X   │
│  • GET /media/:id                           │
│                                             │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│       BACKEND (Payload CMS v3)              │
├─────────────────────────────────────────────┤
│  • Custom auth (JWT)                        │
│  • depth query param (populate relations)   │
│  • where filters (complex syntax)           │
│  • Mixed price conventions                  │
└─────────────────────────────────────────────┘
```

**Dépendances critiques** :

| Dépendance | Type | Impact Migration |
|------------|------|------------------|
| `depth` query param | Payload-specific | 🔴 Breaking |
| `where[field][operator]` filters | Payload-specific | 🔴 Breaking |
| JWT auth flow | Payload-specific | 🔴 Breaking |
| Price mixing (cents + euros) | Data contract | 🔴 Breaking |
| Variant contamination logic | Workaround Payload bug | 🔴 Breaking |
| GCS image loading | Architecture | 🟡 Refactor |

---

## 🔄 Compatibilité Medusa

### Ce qui Fonctionne Déjà ✅

1. **Service Layer Pattern**
   - `src/services/medusa/` existe déjà
   - Adapter pattern prêt
   - Juste incomplet

2. **React Query**
   - Compatible 100%
   - Juste changer endpoints

3. **UI Components**
   - Aucun changement nécessaire
   - Indépendants backend

4. **Routing & Pages**
   - Structure compatible
   - Paths réutilisables

---

### Ce qui NE Fonctionne PAS ❌

1. **Auth Flow**
   - Medusa utilise **HttpOnly cookies**
   - Payload utilise **JWT localStorage**
   - **Incompatible** → Réécrire complet

2. **Product Data Shape**
   ```typescript
   // Payload CMS
   {
     id: "abc123",
     title: "Aura",
     price: 99.00,          // euros
     slug: "aura",
     variants: [...],       // populate depth
     media: { url: "..." }
   }

   // Medusa
   {
     id: "prod_01XXX",
     title: "Aura",
     handle: "aura",         // pas slug
     variants: [...],        // toujours populated
     thumbnail: "http://...", // pas media.url
     prices: [{ amount: 9900, currency_code: "eur" }]  // cents
   }
   ```
   **Incompatible** → Adapter nécessaire

3. **Cart Management**
   - Medusa gère cart **côté serveur**
   - Payload cart **côté client** (CartContext)
   - **Incompatible** → Migration complexe

4. **Filters & Search**
   - Payload : `?where[category][slug][equals]=sport`
   - Medusa : `?category_id=pcat_01XXX`
   - **Incompatible** → Réécrire queries

---

## 📊 Matrice Réutilisabilité

| Composant | Réutilisable | Refactorable | À Supprimer | Effort |
|-----------|--------------|--------------|-------------|--------|
| **UI Components** | ✅ 100% | - | - | 0h |
| **Pages Structure** | ✅ 90% | 10% | - | 4h |
| **Tailwind Config** | ✅ 100% | - | - | 0h |
| **Next.js Config** | ✅ 80% | 20% | - | 2h |
| **Auth Context** | ❌ 0% | ❌ | ✅ | 8h (réécriture) |
| **Cart Context** | ❌ 10% | ✅ 90% | - | 12h |
| **Product Hooks** | ❌ 20% | ✅ 80% | - | 8h |
| **API Services** | ❌ 30% | ✅ 70% | - | 16h |
| **Type Definitions** | ❌ 0% | ❌ | ✅ | 4h (autogen) |
| **Cache Logic** | ❌ 0% | ❌ | ✅ | 2h (use RQ) |
| **Image Loading** | ❌ 40% | ✅ 60% | - | 6h |
| **Contexts (Toast, Wishlist)** | ✅ 100% | - | - | 0h |
| **Middleware** | ✅ 60% | 40% | - | 4h |

**Total estimation** : **66 heures** de refactoring

---

## 🎯 Plan Migration (Phases)

### Phase 1 : Préparation (0 modification frontend)

1. ✅ **Backend Medusa opérationnel**
   - Catalogue complet (16 produits)
   - Images uploadées (244 images)
   - Tags assignés
   - Shipping configuré

2. ✅ **Documentation**
   - DATA_CONTRACT.md (ce que frontend doit consommer)
   - BUSINESS_ENGINE.md (règles métier backend)
   - Contrat clair

### Phase 2 : Isolation Services (2 jours)

1. **Créer adapters Medusa complets**
   - `MedusaProductService` (complet)
   - `MedusaCartService` (complet)
   - `MedusaAuthService` (complet)
   - `MedusaCheckoutService` (complet)

2. **Tests unitaires adapters**
   - Mock responses Medusa
   - Verify data transformation

### Phase 3 : Migration Auth (3 jours)

1. **Remplacer AuthContext**
   - Utiliser Medusa cookies
   - Supprimer localStorage tokens
   - Update middleware

2. **Migration users existants**
   - Export Payload users
   - Import Medusa customers
   - Password reset flow

### Phase 4 : Migration Cart (4 jours)

1. **Server-side cart**
   - Remplacer CartContext
   - Utiliser Medusa cart API
   - localStorage uniquement pour cart ID

2. **Sync cart items**
   - Migration panier actuel
   - Backward compat temporaire

### Phase 5 : Migration Products (5 jours)

1. **Update hooks**
   - Remplacer `useProduct` (Payload → Medusa)
   - Remplacer `useProducts` queries
   - Supprimer cache maison

2. **Update components**
   - ProductCard (handle vs slug)
   - ProductDetail (prices structure)
   - Filters (category_id vs slug)

### Phase 6 : Cleanup (2 jours)

1. **Supprimer code Payload**
   - Services Payload
   - Types Payload
   - Proxy routes `/api/payload/*`

2. **Update types**
   - Générer depuis Medusa OpenAPI
   - Supprimer types manuels

3. **Tests E2E**
   - Parcours complet
   - Checkout flow
   - Auth flow

**Total** : **16 jours** (3 semaines avec buffer)

---

## ⚠️ Risques Migration

### Risque 1 : Breaking Changes Auth

**Impact** : 🔴 **CRITIQUE**

**Problème** :
- Users loggés actuellement perdent session
- Need re-login

**Mitigation** :
- Annoncer maintenance
- Email users
- Migration users Payload → Medusa
- Password reset flow ready

---

### Risque 2 : Cart Data Loss

**Impact** : 🟡 **MODÉRÉ**

**Problème** :
- Paniers actuels (localStorage) incompatibles
- Need conversion

**Mitigation** :
- Script migration cart
- Backward compat 7 jours
- Export cart avant migration

---

### Risque 3 : SEO Impact (URLs)

**Impact** : 🟡 **MODÉRÉ**

**Problème** :
- `slug` → `handle` (si différent)
- Redirections 301 nécessaires

**Mitigation** :
- Mapping slug → handle
- Next.js redirects config
- Google Search Console update

---

### Risque 4 : Performance Dégradation

**Impact** : 🟢 **FAIBLE**

**Problème** :
- Medusa peut être plus lent que Payload (selon config)

**Mitigation** :
- Cache Redis backend
- React Query cache frontend
- CDN images
- Monitoring Vercel Analytics

---

## 🛠️ Recommandations Immédiates

### 1. NE PAS modifier frontend maintenant

**Pourquoi** :
- Backend Medusa pas encore en prod
- Risque casser site actuel
- Migration doit être atomique

**Faire** :
- ✅ Documenter dépendances
- ✅ Préparer adapters
- ✅ Tests unitaires adapters
- ✅ Plan migration détaillé

---

### 2. Prioriser suppression logique métier frontend

**Critique** :
- ❌ Calcul TVA frontend → Utiliser Medusa tax calculation
- ❌ Free shipping rules → Utiliser Medusa shipping rules
- ❌ Variant filtering → Utiliser Medusa product variants endpoint

**Bénéfice** :
- Contrat de données respecté
- Single source of truth
- Bugs réduits

---

### 3. Standardiser convention prix

**Décision** : **TOUJOURS cents**

```typescript
// ❌ Avant (mixing)
price: 99.00          // euros
priceCents: 9900      // cents

// ✅ Après (standardized)
amount: 9900          // cents (toujours)
currency_code: "eur"  // devise
```

**Migration** :
- Update tous composants
- Formatage via `Intl.NumberFormat`

---

### 4. Générer types depuis Medusa

**Tool** : `@medusajs/types` ou OpenAPI Generator

**Workflow** :
```bash
# Backend expose OpenAPI spec
GET http://localhost:9000/openapi.json

# Frontend génère types
npx openapi-typescript http://localhost:9000/openapi.json -o src/types/medusa.ts
```

**Bénéfice** :
- Types toujours sync
- Breaking changes détectés au build
- Autocomplete IDE

---

### 5. Migrer auth vers HttpOnly cookies

**Pourquoi** :
- Sécurité (XSS protection)
- Standard Medusa
- CSRF protection

**Migration** :
```typescript
// ❌ Avant
localStorage.setItem('payload-token', token)

// ✅ Après
// Cookie set par backend automatiquement
// Frontend ne touche jamais le token
```

---

## 📈 Métriques Succès Migration

### Technique

- [ ] 0 appels API Payload
- [ ] 100% appels API Medusa
- [ ] Types générés automatiquement
- [ ] 0 logique métier frontend (calculs prix, TVA)
- [ ] HttpOnly cookies auth
- [ ] Server-side cart
- [ ] Response time < 200ms (p95)
- [ ] Lighthouse score > 90

### Business

- [ ] 0 downtime migration
- [ ] 100% users migrés
- [ ] 100% carts migrés
- [ ] 0 perte commande
- [ ] Checkout flow < 3 steps
- [ ] Conversion rate maintained or improved

---

## 🔍 Fichiers Critiques à Modifier

### Haute Priorité

| Fichier | Raison | Effort |
|---------|--------|--------|
| `src/contexts/auth-context.tsx` | Auth flow complet | 8h |
| `src/contexts/cart-context.tsx` | Server-side cart | 12h |
| `src/hooks/useProduct.ts` | Medusa adapter | 4h |
| `src/services/ecommerce-service.ts` | API calls | 8h |
| `src/lib/api-auth.ts` | Cookie-based auth | 4h |
| `src/types/index.ts` | Autogen types | 2h |

### Moyenne Priorité

| Fichier | Raison | Effort |
|---------|--------|--------|
| `src/components/product/*` | Data shape changes | 6h |
| `src/app/product/[slug]/page.tsx` | Handle vs slug | 2h |
| `src/services/variant-service.ts` | Medusa variants | 4h |
| `middleware.ts` | Cookie validation | 2h |

### Basse Priorité (Cleanup)

| Fichier | Raison | Effort |
|---------|--------|--------|
| `src/app/api/payload/*` | Supprimer proxy | 1h |
| `src/services/medusa/*` (legacy) | Cleanup incomplete adapters | 2h |

---

## 📝 Checklist Migration

### Avant Migration

- [ ] Backend Medusa 100% opérationnel
- [ ] DATA_CONTRACT.md validé
- [ ] Adapters Medusa écrits et testés
- [ ] Plan rollback préparé
- [ ] Backup data Payload
- [ ] Users informés (maintenance window)

### Pendant Migration

- [ ] Mode maintenance activé
- [ ] Export cart localStorage
- [ ] Export users Payload
- [ ] Deploy nouveau frontend
- [ ] Import users Medusa
- [ ] Tests smoke (auth, cart, checkout)

### Après Migration

- [ ] Monitoring erreurs (Sentry)
- [ ] Performance monitoring (Vercel)
- [ ] Rollback si critical issues
- [ ] Communication users (migration réussie)
- [ ] Cleanup code Payload (J+7)

---

## 🎓 Lessons Learned

### Anti-Patterns Identifiés

1. ❌ **Double backend support** → Complexité exponentielle
2. ❌ **Logique métier frontend** → Bugs + désync
3. ❌ **Cache maison** → Réinventer roue
4. ❌ **Types manuels** → Drift backend/frontend
5. ❌ **localStorage tokens** → Vulnérabilité XSS

### Best Practices à Suivre

1. ✅ **Frontend muet** → Logique 100% backend
2. ✅ **Types générés** → Single source of truth
3. ✅ **React Query** → Cache standard
4. ✅ **HttpOnly cookies** → Sécurité
5. ✅ **Convention stricte** → Prix toujours cents

---

**Prochaine étape** : Migration Phase 1 (après validation backend prod)
