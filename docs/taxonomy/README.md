# Documentation Taxonomie MyTechGear

> **Structure Actuelle** : Par Technologie de Verre
> **Dernière migration** : 2026-02-21
> **Statut** : ✅ Production

---

## 📖 Vue d'Ensemble

MyTechGear organise ses produits selon une **taxonomie par technologie de verre**, reflétant la vraie différenciation technique des lunettes connectées.

### Structure Simple (2 niveaux)

```
Lunettes Connectées
├── Smart Tech (10 produits électroniques)
└── Classic Eyewear (6 produits standards)
```

---

## 📚 Documentation Disponible

### Documents Principaux

1. **[CURRENT_STATE.md](./CURRENT_STATE.md)** ⭐
   - **État actuel de la taxonomie** (3 catégories)
   - Distribution des produits par catégorie
   - Stratégie de tags
   - Requêtes SQL utiles
   - Workflows de gestion
   - **À lire en premier !**

2. **[MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md)**
   - Guide complet de migration vers structure par technologie
   - Procédure étape par étape
   - Plan de rollback
   - Validation post-migration
   - Métriques de succès

3. **[CHANGELOG.md](./CHANGELOG.md)**
   - Historique complet des migrations
   - Décisions architecturales
   - Leçons apprises

### Documents Archivés

4. **[ARCHIVED_MIGRATION_OPTION_C.md](./ARCHIVED_MIGRATION_OPTION_C.md)**
   - ❌ Obsolète (migration use-case abandonné)
   - Conservé pour référence historique

---

## 🚀 Quick Start

### Vérifier la Structure Actuelle

```bash
# Lister les catégories
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT id, name, handle, parent_category_id, rank
FROM product_category
ORDER BY rank;
"

# Compter produits par catégorie
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT c.name, COUNT(pcp.product_id) as products
FROM product_category c
LEFT JOIN product_category_product pcp ON c.id = pcp.product_category_id
GROUP BY c.name
ORDER BY products DESC;
"
```

### Dashboard Admin

```bash
# Ouvrir dashboard categories
open http://localhost:3200/admin/categories
```

### Ajouter un Nouveau Produit

1. Déterminer la catégorie :
   - Verres électroniques (Prismatic, Eclipse, HVL, Electrochromic, LC) → **Smart Tech**
   - Verres teintés standards → **Classic Eyewear**

2. Créer via script ou dashboard

3. Vérifier assignation :
```bash
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT p.title, c.name as category
FROM product p
JOIN product_category_product pcp ON p.id = pcp.product_id
JOIN product_category c ON pcp.product_category_id = c.id
WHERE p.handle = 'nouveau-produit';
"
```

---

## 🎯 Structure Détaillée

### Catégorie 1 : Smart Tech (pcat_smart_tech)

**10 produits électroniques**, classés par technologie :

| Technologie | Produits | Description |
|-------------|----------|-------------|
| **Prismatic™ Color-changing** | Aura, Aura Audio | Verres changeant de couleur automatiquement |
| **Eclipse™ Tint-Adjustable** | Shield, Music Shield | Verres auto-ajustables sport |
| **HVL™ Tint-Adjustable** | Infinity, MR1 x Infinity | High-Voltage Liquid (électronique) |
| **Electrochromic** | Aroza, Dragon, Veil | Verres electrochromic tinting |
| **Liquid Crystal (LC)** | Zurix | Cristaux liquides électroniques |

### Catégorie 2 : Classic Eyewear (pcat_classic)

**6 produits standards** (verres teintés non-électroniques) :

- Dragon (Standard tinted)
- Duck Classic (Classic tinted)
- Dusk Classic (Dusk™ Alpha)
- Euphoria (Fashion tinted)
- Falcon (Sport tinted)
- Prime (Standard tinted)

---

## 🏷️ Stratégie Tags vs Catégories

### Catégories (Navigation Permanente)
- **Smart Tech** vs **Classic Eyewear**
- Classification technique stable
- SEO-friendly (URLs `/categories/smart-tech`)

### Tags (Filtrage Granulaire)
- **Technologie** : Prismatic, Eclipse, HVL, Electrochromic, LC
- **Features** : Audio, Bluetooth, Touch Control, UV Protection, IPX4
- **Use-case** : Sport, Lifestyle, Running, Cycling, Outdoor

**Exemple de filtrage PLP** :
- URL : `/categories/smart-tech?tech=prismatic`
- Affiche : Aura + Aura Audio (2 produits Prismatic™)

---

## 📊 Requêtes Utiles

### Distribution produits par technologie (Smart Tech)

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
WHERE pcp.product_id IS NULL AND p.deleted_at IS NULL;
```

### Export CSV produits par catégorie

```bash
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
\copy (
  SELECT c.name, p.title, p.handle, p.metadata->>'lens_technology'
  FROM product_category c
  JOIN product_category_product pcp ON c.id = pcp.product_category_id
  JOIN product p ON pcp.product_id = p.id
  WHERE c.id != 'pcat_root'
  ORDER BY c.rank, p.title
) TO '/tmp/products_by_category.csv' CSV HEADER
"
```

---

## 🔄 Workflows Courants

### Migrer un Produit de Catégorie

```typescript
// Smart Tech → Classic
await productModuleService.updateProducts("prod_xxx", {
  categories: [{ id: "pcat_classic" }]
})
```

### Créer une Sous-catégorie (futur)

```typescript
await productModuleService.createProductCategories({
  id: "pcat_smart_sport",
  name: "Smart Sport",
  handle: "smart-sport",
  parent_category_id: "pcat_smart_tech",
  rank: 0,
})
```

### Auto-assigner Tags par Technologie

```bash
npm exec medusa exec ./src/scripts/assign-product-tags.ts
```

---

## 📐 Architecture Frontend

### Mega Menu Recommandé

```
Navigation
├── Smart Tech
│   ├── Voir tout (10)
│   ├── Prismatic™ (2)
│   ├── Eclipse™ (2)
│   ├── HVL™ (2)
│   ├── Electrochromic (3)
│   └── Liquid Crystal (1)
├── Classic Eyewear (6)
└── Collections
    ├── Best-sellers
    ├── Nouveautés 2026
    └── Prismatic Collection
```

### Breadcrumbs

```
Accueil > Smart Tech > Aura
Accueil > Classic Eyewear > Dusk Classic
```

### Filtres PLP (Product List Page)

```
Smart Tech (10 produits)

Filtres:
☐ Prismatic (2)
☐ Eclipse (2)
☐ HVL (2)
☐ Electrochromic (3)
☐ Liquid Crystal (1)

☐ Audio (2)
☐ Bluetooth (4)
☐ UV Protection (10)
☐ IPX4 (8)

€0 ━━━━━━━━━━━ €500
```

---

## 🛠️ Scripts Disponibles

### Migration & Validation

```bash
# Migrer vers taxonomie par technologie
npm exec medusa exec ./src/scripts/migrate-to-tech-taxonomy.ts

# Valider structure après migration
npm exec medusa exec ./src/scripts/validate-taxonomy-after-migration.ts
```

### Gestion Produits

```bash
# Auto-assigner tags
npm exec medusa exec ./src/scripts/assign-product-tags.ts

# Peupler collection Best-sellers (futur)
npm exec medusa exec ./src/scripts/populate-bestsellers-collection.ts

# Peupler collection Nouveautés (futur)
npm exec medusa exec ./src/scripts/populate-nouveautes-collection.ts
```

### Nettoyage

```bash
# Supprimer catégories orphelines (futur)
npm exec medusa exec ./src/scripts/cleanup-orphan-categories.ts

# Vérifier intégrité taxonomie (futur)
npm exec medusa exec ./src/scripts/check-taxonomy-integrity.ts
```

---

## 🔐 Backup & Rollback

### Créer un Backup

```bash
# Backup complet
mkdir -p backups
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
\copy product_category TO 'backups/categories_$(date +%Y%m%d).csv' CSV HEADER
"

psql postgresql://medusa:medusa@localhost:5433/medusa -c "
\copy product_category_product TO 'backups/category_products_$(date +%Y%m%d).csv' CSV HEADER
"
```

### Restaurer depuis Backup

Voir [MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md) section "Plan de Rollback"

---

## 🚀 Évolutions Futures

### Phase 1 : Optimisation Tags (Court Terme)
- [ ] Auto-assigner tags technologie (Prismatic, Eclipse, HVL, etc.)
- [ ] Créer collection Best-sellers (auto-peuplée)
- [ ] Créer collection Nouveautés 2026 (auto-peuplée)

### Phase 2 : Frontend PLP/PDP (Moyen Terme)
- [ ] Filtres par technologie dans PLP
- [ ] Badges technologie sur PDP
- [ ] Mega menu avec sous-navigation technologies

### Phase 3 : Sous-catégories (Long Terme)
- [ ] Évaluer besoin de sous-catégories use-case :
  ```
  Smart Tech
  ├── Sport & Performance
  ├── Lifestyle & Quotidien
  └── Gaming & Écrans
  ```
- [ ] Catégorie Vue Correctrice (si produits RX)

---

## 📞 Support

### Questions / Issues

- **Documentation** : Lire [CURRENT_STATE.md](./CURRENT_STATE.md)
- **Migration** : Voir [MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md)
- **Problèmes** : Créer une issue GitHub

### Commandes de Debug

```bash
# Vérifier structure
psql $DATABASE_URL -c "SELECT * FROM product_category ORDER BY rank;"

# Vérifier produits orphelins
psql $DATABASE_URL -c "
SELECT p.title FROM product p
LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
WHERE pcp.product_id IS NULL AND p.deleted_at IS NULL;
"

# Dashboard logs
tail -f logs/medusa-backend.log
```

---

## 📜 Historique

| Date | Migration | Catégories | Produits |
|------|-----------|------------|----------|
| 2026-02-21 | **Technologie** (actuelle) | 3 (Smart/Classic) | 16 |
| 2026-02-21 | Option C (use-case) | 5 (Sport/Lifestyle/Gaming/Vue) | 13 |
| 2026-01-XX | Structure initiale | 16 (hiérarchie 4 niveaux) | 11 |

Voir [CHANGELOG.md](./CHANGELOG.md) pour détails.

---

**Maintenu par** : Claude Code
**Projet** : MyTechGear Medusa Backend
**Dernière révision** : 2026-02-21
