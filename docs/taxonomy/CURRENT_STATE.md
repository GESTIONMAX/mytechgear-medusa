# Taxonomie MyTechGear - État Actuel

> **Dernière mise à jour** : 2026-02-21
> **Structure** : Par Technologie de Verre
> **Statut** : ✅ En Production

---

## 📊 Vue d'Ensemble

MyTechGear utilise une taxonomie **par technologie de verre**, qui reflète la vraie différenciation technique des produits de lunettes connectées.

### Structure Actuelle (3 catégories)

```
Lunettes Connectées (root)
├── Smart Tech (10 produits)
│   ├── Prismatic™ Color-changing
│   ├── Eclipse™ Tint-Adjustable
│   ├── HVL™ Tint-Adjustable
│   ├── Electrochromic
│   └── Liquid Crystal (LC)
└── Classic Eyewear (6 produits)
```

---

## 🔗 Liens Rapides

### Dashboard Admin

| Page | URL | Description |
|------|-----|-------------|
| **Catégories** | http://localhost:3200/admin/categories | Gestion hiérarchie catégories |
| **Collections** | http://localhost:3200/admin/collections | Gestion collections marketing |
| **Produits** | http://localhost:3200/admin/products | Liste tous les produits |

### Pages Catégories (Frontend)

| Catégorie | URL | Produits |
|-----------|-----|----------|
| **Smart Tech** | http://localhost:3000/categories/smart-tech | 10 produits électroniques |
| **Classic Eyewear** | http://localhost:3000/categories/classic-eyewear | 6 produits standards |

### Pages Collections Sport (Frontend) ⭐ NOUVEAU

| Collection | URL | Sports Ciblés |
|------------|-----|---------------|
| **Running** | http://localhost:3000/collections/running | Running, Jogging, Marathon, Trail running |
| **Cyclisme** | http://localhost:3000/collections/cycling | Road cycling, VTT, Gravel, Cyclotourisme |
| **Trail & Outdoor** | http://localhost:3000/collections/trail-outdoor | Trail, Hiking, Trekking, Alpinisme, Randonnée |
| **Sports Nautiques** | http://localhost:3000/collections/water-sports | Voile, Kitesurf, SUP, Kayak, Triathlon |
| **Ski & Neige** | http://localhost:3000/collections/ski-snow | Ski alpin, Snowboard, Ski de fond, Freeride |
| **Urbain & Quotidien** | http://localhost:3000/collections/urban-lifestyle | Casual, Ville, Marche, Quotidien |
| **Lunettes Audio** | http://localhost:3000/collections/audio-sunglasses | Tous sports avec audio Bluetooth |

### Pages Collections Thématiques (Frontend)

| Collection | URL | Produits |
|------------|-----|----------|
| **Collection Prismatic** | http://localhost:3000/collections/collection-prismatic | Aura, Aura Audio |
| **Collection Lifestyle** | http://localhost:3000/collections/collection-lifestyle | Zurix, Veil, Dusk Classic, etc. |
| **Collection Sport** | http://localhost:3000/collections/collection-sport | Shield, Music Shield, Aroza, Falcon |

### Pages Collections Marketing (Frontend)

| Collection | URL | Critères |
|------------|-----|----------|
| **Best-sellers** | http://localhost:3000/collections/best-sellers | `bestseller_rank ≤ 10` |
| **Nouveautés 2026** | http://localhost:3000/collections/nouveautes-2026 | `created_at >= 2026-01-01` |
| **Soldes** | http://localhost:3000/collections/soldes-promotions | Produits avec discount actif |

### API Endpoints

| Endpoint | URL | Description |
|----------|-----|-------------|
| **API Landing** | http://localhost:9000/ | Liste tous les endpoints disponibles |
| **Health Check** | http://localhost:9000/health | Vérification liveness |
| **Store Products** | http://localhost:9000/store/products | Liste produits publique |
| **Admin Categories** | http://localhost:9000/admin/product-categories | API catégories (auth requise) |

---

## 🗂️ Catégories Détaillées

### 1. Lunettes Connectées (pcat_root)
- **Handle** : `lunettes-connectees`
- **Type** : Catégorie racine
- **Produits directs** : 0 (racine uniquement)
- **Description** : Toutes nos lunettes intelligentes et électroniques

### 2. Smart Tech (pcat_smart_tech)
- **Handle** : `smart-tech`
- **Parent** : Lunettes Connectées
- **Produits** : 10
- **Description** : Lunettes électroniques à verres auto-ajustables
- **Technologies** :
  - **Prismatic™ Color-changing** (2 produits)
    - Aura
    - Aura Audio
  - **Eclipse™ Tint-Adjustable** (2 produits)
    - Shield
    - Music Shield
  - **HVL™ Tint-Adjustable** (2 produits)
    - Infinity
    - MR1 x Chamelo Infinity
  - **Electrochromic** (3 produits)
    - Aroza (Tint-Adjustable)
    - Dragon (Chamelo) (Tint-Adjustable)
    - Veil
  - **Liquid Crystal (LC)** (1 produit)
    - Zurix

### 3. Classic Eyewear (pcat_classic)
- **Handle** : `classic-eyewear`
- **Parent** : Lunettes Connectées
- **Produits** : 6
- **Description** : Lunettes à verres teintés classiques (non-électroniques)
- **Produits** :
  - Dragon (Standard tinted)
  - Duck Classic (Classic tinted)
  - Dusk Classic (Dusk™ Alpha)
  - Euphoria (Fashion tinted)
  - Falcon (Sport tinted)
  - Prime (Standard tinted)

---

## 🏷️ Stratégie de Tags

### Tags de Technologie (Smart Tech)

Permettent un filtrage granulaire au sein de la catégorie Smart Tech :

```typescript
const TECHNOLOGY_TAGS = [
  "Prismatic",       // Color-changing technology
  "Eclipse",         // Sport tint-adjustable
  "HVL",             // High-Voltage Liquid
  "Electrochromic",  // Electrochromic tinting
  "Liquid Crystal",  // LC technology
]
```

### Tags de Features

```typescript
const FEATURE_TAGS = [
  "Audio",           // Bluetooth audio (Aura Audio, Music Shield)
  "Bluetooth",       // Bluetooth connectivity
  "Touch Control",   // Touch-sensitive controls
  "App Control",     // Smartphone app control
  "UV Protection",   // UV protection
  "IPX4",           // Water resistance
]
```

### Tags d'Usage

```typescript
const USE_CASE_TAGS = [
  "Sport",          // Sport/performance
  "Lifestyle",      // Daily wear
  "Running",        // Running specific
  "Cycling",        // Cycling specific
  "Outdoor",        // Outdoor activities
]
```

---

## 📐 URLs et SEO

### URLs de Catégories

```
/categories/lunettes-connectees       (root - pas affichée)
/categories/smart-tech                (Smart Tech)
/categories/classic-eyewear           (Classic)
```

### URLs de Produits

```
/products/aura                        (Smart Tech > Prismatic)
/products/shield                      (Smart Tech > Eclipse)
/products/zurix                       (Smart Tech > LC)
/products/dusk-classic                (Classic Eyewear)
```

### Breadcrumbs

**Smart Tech** :
```
Accueil > Smart Tech > Aura
Accueil > Smart Tech > Shield
```

**Classic Eyewear** :
```
Accueil > Classic Eyewear > Dusk Classic
Accueil > Classic Eyewear > Falcon
```

### Structured Data (JSON-LD)

```json
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://mytechgear.eu"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Smart Tech",
      "item": "https://mytechgear.eu/categories/smart-tech"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Aura",
      "item": "https://mytechgear.eu/products/aura"
    }
  ]
}
```

---

## 🎯 Collections Marketing

Les collections sont **indépendantes** des catégories et servent au merchandising/marketing.

### Collections Actuelles (13)

Vérifier avec :
```bash
psql postgresql://medusa:medusa@localhost:5433/medusa -c "SELECT id, title, handle FROM product_collection ORDER BY title;"
```

### Collections Thématiques (3)

1. **Collection Prismatic** (`collection-prismatic`)
   - Technologie Prismatic™ Color-changing
   - Produits: Aura, Aura Audio
   - URL: `/collections/collection-prismatic`

2. **Collection Lifestyle** (`collection-lifestyle`)
   - Lunettes lifestyle et quotidien
   - Produits: Zurix, Veil, Dusk Classic, Infinity, MR1 x Infinity, Dragon
   - URL: `/collections/collection-lifestyle`

3. **Collection Sport & Performance** (`collection-sport`)
   - Lunettes optimisées sport haute performance
   - Produits: Shield, Music Shield, Aroza, Falcon
   - URL: `/collections/collection-sport`

### Collections Marketing (3)

4. **Best-sellers** (`best-sellers`)
   - Critère: `bestseller_rank ≤ 10`
   - Auto-peuplée via script `populate-bestsellers-collection.ts`
   - URL: `/collections/best-sellers`

5. **Nouveautés 2026** (`nouveautes-2026`)
   - Critère: `created_at >= 2026-01-01`
   - Auto-peuplée via script `populate-nouveautes-collection.ts`
   - URL: `/collections/nouveautes-2026`

6. **Soldes & Promotions** (`soldes-promotions`)
   - Critère: Produits avec discount actif
   - Gestion manuelle via dashboard admin
   - URL: `/collections/soldes-promotions`

### Collections Sport (7) ⭐ NOUVEAU

Créées via script `create-sport-collections.ts` pour cibler des sportifs spécifiques.

7. **Running & Course à Pied** (`running`)
   - Sports: Running, Jogging, Marathon, Trail running
   - Features: Légères, Anti-buée, Stabilité maximale, Verres auto-ajustables
   - Produits: Shield, Music Shield, Falcon
   - URL: `/collections/running`

8. **Cyclisme & Vélo** (`cycling`)
   - Sports: Road cycling, VTT, Gravel, Cyclotourisme
   - Features: Ajustement automatique luminosité, Protection UV, Aérodynamique
   - Produits: Shield, Music Shield, Aroza
   - URL: `/collections/cycling`

9. **Trail & Outdoor** (`trail-outdoor`)
   - Sports: Trail, Hiking, Trekking, Alpinisme, Randonnée
   - Features: Résistance impact, Protection intégrale, Tous terrains
   - Produits: Shield, Aroza, Falcon, Prime
   - URL: `/collections/trail-outdoor`

10. **Sports Nautiques** (`water-sports`)
    - Sports: Voile, Kitesurf, SUP, Kayak, Triathlon
    - Features: Étanche IPX4, Anti-corrosion, Résistant sueur
    - Produits: Shield, Music Shield
    - URL: `/collections/water-sports`

11. **Ski & Sports de Neige** (`ski-snow`)
    - Sports: Ski alpin, Snowboard, Ski de fond, Freeride
    - Features: Anti-buée permanent, Haute altitude, Protection neige
    - Produits: Aroza
    - URL: `/collections/ski-snow`

12. **Urbain & Quotidien** (`urban-lifestyle`)
    - Usage: Casual, Ville, Marche, Quotidien
    - Features: Design élégant, Confort longue durée, Technologie discrète
    - Produits: Aura, Aura Audio, Zurix, Veil, Dusk Classic, Infinity, MR1 x Infinity, Dragon
    - URL: `/collections/urban-lifestyle`

13. **Lunettes Audio** (`audio-sunglasses`)
    - Features: Bluetooth 5.0, Audio spatial, Microphone intégré, Autonomie longue
    - Produits: Aura Audio, Music Shield
    - URL: `/collections/audio-sunglasses`

### Architecture Multi-Collections

**IMPORTANT**: Un produit peut être dans **plusieurs collections** simultanément grâce aux tags sport.

Exemple: **Music Shield** est dans:
- Collection thématique: `Sport & Performance`
- Collection sport: `Running`, `Cycling`, `Water Sports`
- Collection marketing: `Best-sellers` (si bestseller_rank ≤ 10)
- Collection audio: `Lunettes Audio`

Cette architecture permet un **merchandising multi-dimensionnel** flexible.

---

## 🔄 Workflows de Gestion

### Ajouter un Nouveau Produit

1. **Déterminer la technologie de verre** :
   - Électronique (Prismatic, Eclipse, HVL, Electrochromic, LC) → `Smart Tech`
   - Non-électronique (verres teintés standards) → `Classic Eyewear`

2. **Créer le produit** :
```typescript
await productModuleService.createProducts({
  title: "Nouveau Produit",
  handle: "nouveau-produit",
  categories: [
    { id: "pcat_smart_tech" }  // ou "pcat_classic"
  ],
  metadata: {
    lens_technology: "Prismatic™ Color-changing",
    // ... autres métadonnées
  }
})
```

3. **Assigner tags automatiquement** :
```bash
npm exec medusa exec ./src/scripts/assign-product-tags.ts
```

### Réorganiser une Catégorie

Via le dashboard admin (`http://localhost:3200/admin/categories`) :
- Modifier `parent_category_id` pour changer le parent
- Modifier `rank` pour changer l'ordre d'affichage
- Validation anti-cycles intégrée

### Migrer un Produit de Catégorie

```typescript
await productModuleService.updateProducts(productId, {
  categories: [{ id: "pcat_classic" }]  // Changer Smart Tech → Classic
})
```

---

## 📊 Requêtes SQL Utiles

### Lister tous les produits par catégorie

```sql
SELECT
  c.name as category,
  p.title as product,
  p.metadata->>'lens_technology' as technology
FROM product_category c
JOIN product_category_product pcp ON c.id = pcp.product_category_id
JOIN product p ON pcp.product_id = p.id
WHERE c.id != 'pcat_root'
ORDER BY c.rank, p.title;
```

### Compter produits par technologie (Smart Tech)

```sql
SELECT
  p.metadata->>'lens_technology' as technology,
  COUNT(*) as count
FROM product p
JOIN product_category_product pcp ON p.id = pcp.product_id
WHERE pcp.product_category_id = 'pcat_smart_tech'
GROUP BY p.metadata->>'lens_technology'
ORDER BY count DESC;
```

### Vérifier produits orphelins

```sql
SELECT p.id, p.title, p.handle
FROM product p
LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
WHERE pcp.product_id IS NULL
  AND p.deleted_at IS NULL;
```

### Vérifier hiérarchie catégories

```sql
SELECT
  id,
  name,
  handle,
  parent_category_id,
  rank
FROM product_category
ORDER BY rank;
```

---

## 🚀 Évolutions Futures

### À Court Terme

1. **Tags de technologie** : Auto-assigner tags Prismatic, Eclipse, HVL, etc.
2. **Collections marketing** : Peupler Best-sellers et Nouveautés
3. **Frontend PLP** : Filtres par technologie
4. **PDP** : Badges technologie affichés

### À Moyen Terme

1. **Sous-catégories use-case** (optionnel) :
   ```
   Smart Tech
   ├── Sport & Performance
   ├── Lifestyle & Quotidien
   └── Gaming & Écrans
   ```

2. **Catégorie Vue Correctrice** (si produits RX) :
   ```
   Lunettes Connectées
   ├── Smart Tech
   ├── Classic Eyewear
   └── Vue Correctrice (RX)
   ```

### À Long Terme

1. **Filtres combinés** : Technologie + Use-case + Prix
2. **Recommandations** : "Produits similaires" basés sur technologie
3. **Search** : Elasticsearch avec facettes technologie

---

## 📚 Références

### Fichiers Importants

| Fichier | Description |
|---------|-------------|
| **Documentation** | |
| [MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md) | Guide complet de migration v2.0.0 |
| [CHANGELOG.md](./CHANGELOG.md) | Historique complet des migrations |
| [INDEX.md](./INDEX.md) | Index navigation de la documentation |
| **Scripts Backend** | |
| [migrate-to-tech-taxonomy.ts](../../src/scripts/migrate-to-tech-taxonomy.ts) | Migration v2.0.0 par technologie (exécuté) |
| [create-sport-collections.ts](../../src/scripts/create-sport-collections.ts) | Création 7 collections sport (exécuté) |
| [assign-sport-tags.ts](../../src/scripts/assign-sport-tags.ts) | Assignation tags multi-sport (exécuté) |
| [validate-taxonomy-after-migration.ts](../../src/scripts/validate-taxonomy-after-migration.ts) | Validation structure taxonomie |
| [assign-product-tags.ts](../../src/scripts/assign-product-tags.ts) | Auto-assignation tags technologie/features |
| **Configuration** | |
| [taxonomy.ts](../../src/config/taxonomy.ts) | IDs centralisés (categories + collections) |
| **Frontend** | |
| [collections/[handle]/page.tsx](../../../mytechgear-frontend/src/app/collections/[handle]/page.tsx) | Landing pages collections sport |
| [admin/categories/page.tsx](../../../mytechgear-frontend/src/app/admin/categories/page.tsx) | Dashboard admin catégories |
| [admin/collections/page.tsx](../../../mytechgear-frontend/src/app/admin/collections/page.tsx) | Dashboard admin collections |

### Commandes Utiles

```bash
# Vérifier structure
psql $DATABASE_URL -c "SELECT id, name, handle, parent_category_id FROM product_category ORDER BY rank;"

# Compter produits par catégorie
psql $DATABASE_URL -c "SELECT c.name, COUNT(pcp.product_id) FROM product_category c LEFT JOIN product_category_product pcp ON c.id = pcp.product_category_id GROUP BY c.name;"

# Lister produits Smart Tech
psql $DATABASE_URL -c "SELECT p.title FROM product p JOIN product_category_product pcp ON p.id = pcp.product_id WHERE pcp.product_category_id = 'pcat_smart_tech' ORDER BY p.title;"

# Dashboard admin
open http://localhost:3200/admin/categories
```

---

## 🔐 Rollback Plan

En cas de problème, restaurer le backup :

```bash
# 1. Trouver le backup
ls -lh backups/taxonomy_before_tech_*.sql

# 2. Restaurer
psql $DATABASE_URL < backups/taxonomy_before_tech_YYYYMMDD_HHMMSS.sql

# 3. Vérifier
psql $DATABASE_URL -c "SELECT COUNT(*) FROM product_category;"
```

---

**Document maintenu par** : Claude Code
**Contact** : [Créer une issue GitHub](https://github.com/yourusername/mytechgear-medusa/issues)
**Dernière migration** : 2026-02-21 (Taxonomie par Technologie)
