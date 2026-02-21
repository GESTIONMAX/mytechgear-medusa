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

### Collections Actuelles (6)

Vérifier avec :
```bash
psql postgresql://medusa:medusa@localhost:5433/medusa -c "SELECT id, title, handle FROM product_collection ORDER BY title;"
```

### Collections Recommandées

1. **Best-sellers** (`best-sellers`)
   - Produits avec `bestseller_rank ≤ 10`
   - Auto-peuplée via script

2. **Nouveautés 2026** (`nouveautes-2026`)
   - Produits avec `created_at >= 2026-01-01`
   - Auto-peuplée via script

3. **Prismatic Collection** (`collection-prismatic`)
   - Produits avec technologie Prismatic™
   - Aura, Aura Audio

4. **Sport Performance** (`collection-sport`)
   - Produits optimisés sport
   - Shield, Music Shield, Aroza, Falcon

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
| [MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md) | Guide complet de migration |
| [migrate-to-tech-taxonomy.ts](../../src/scripts/migrate-to-tech-taxonomy.ts) | Script de migration exécuté |
| [validate-taxonomy-after-migration.ts](../../src/scripts/validate-taxonomy-after-migration.ts) | Script de validation |
| [assign-product-tags.ts](../../src/scripts/assign-product-tags.ts) | Auto-assignation tags |

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
