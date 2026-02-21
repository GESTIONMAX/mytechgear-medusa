# Migration Taxonomie par Technologie - Guide Complet

> **Date**: 2026-02-21
> **Statut**: Prêt pour exécution
> **Approche**: Classification par technologie de verre (Option B)

---

## 🎯 Objectif

Passer d'une structure use-case (Sport/Lifestyle) à une structure **par technologie de verre**, qui reflète mieux la vraie différenciation technique des produits.

## 📊 Comparaison Avant/Après

### AVANT (Use-case)

```
Lunettes Connectées
├── Sport & Performance (5 produits)
├── Lifestyle & Quotidien (8 produits)
├── Gaming & Écrans (0 produits) ← Vide, pas sur chamelo.com
└── Vue Correctrice (0 produits) ← Vide, pas sur chamelo.com
```

**Problèmes**:
- ❌ Catégories Gaming/Vue inexistantes sur source (chamelo.com)
- ❌ Classification use-case ne reflète pas la vraie différenciation technique
- ❌ Confusion: Shield (Eclipse™) et Aroza (Electrochromic) dans même catégorie "Sport"
- ❌ Aura (Prismatic™) et Zurix (LC) dans même catégorie "Lifestyle"

### APRÈS (Technologie) ✅

```
Lunettes Connectées
├── Smart Tech (Électroniques)
│   ├── Prismatic™ Color-changing (2 produits)
│   ├── Eclipse™ Tint-Adjustable (2 produits)
│   ├── HVL™ Tint-Adjustable (2 produits)
│   ├── Electrochromic (3 produits)
│   └── Liquid Crystal (1 produit)
└── Classic Eyewear (Verres standards) (6 produits)
```

**Avantages**:
- ✅ Classification claire par technologie de verre
- ✅ Reflète la vraie différenciation technique
- ✅ SEO aligné sur features techniques (recherches: "lunettes electrochromic", "prismatic sunglasses")
- ✅ Évolutif (facile d'ajouter nouvelles technologies)
- ✅ Permet filtrage granulaire via tags de technologie

---

## 🗺️ Mapping des Produits par Technologie

### 🔮 Smart Tech (10 produits électroniques)

| Produit | Technologie | Description |
|---------|-------------|-------------|
| **Aura** | Prismatic™ Color-changing | Verres changeant de couleur automatiquement |
| **Aura Audio** | Prismatic™ Color-changing | Idem + audio Bluetooth |
| **Shield** | Eclipse™ Tint-Adjustable | Verres auto-ajustables sport |
| **Music Shield** | Eclipse™ Tint-Adjustable | Idem + audio Bluetooth |
| **Infinity** | HVL™ Tint-Adjustable | High-Voltage Liquid (électronique) |
| **MR1 x Infinity** | HVL™ Tint-Adjustable | Édition limitée HVL |
| **Aroza** | Electrochromic Tint-Adjustable | Goggles sport electrochromic |
| **Dragon (Chamelo)** | Electrochromic Tint-Adjustable | Premium electrochromic |
| **Veil** | Electrochromic | Cat-eye electrochromic |
| **Zurix** | Liquid Crystal (LC) | Cristaux liquides électroniques |

### 👓 Classic Eyewear (6 produits standards)

| Produit | Technologie | Description |
|---------|-------------|-------------|
| **Dragon** | Standard tinted | Verres teintés classiques |
| **Duck Classic** | Classic tinted | Verres teintés classiques |
| **Dusk Classic** | Dusk™ Alpha | Verres teintés spéciaux (non-électroniques) |
| **Euphoria** | Fashion tinted | Verres teintés mode |
| **Falcon** | Sport tinted | Verres teintés sport |
| **Prime** | Standard tinted | Verres teintés standards |

---

## 🚀 Procédure de Migration

### Étape 1: Backup de Sécurité (CRITIQUE)

```bash
# 1. Backup complet de la base
pg_dump postgresql://medusa:medusa@localhost:5433/medusa > backups/taxonomy_before_tech_$(date +%Y%m%d_%H%M%S).sql

# 2. Vérifier le backup
ls -lh backups/taxonomy_before_tech_*.sql
```

### Étape 2: Exécuter la Migration

```bash
# Exécuter le script de migration
npm exec medusa exec ./src/scripts/migrate-to-tech-taxonomy.ts
```

### Étape 3: Vérifier la Structure

```bash
# Vérifier catégories créées
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT
  id,
  name,
  handle,
  parent_category_id,
  rank
FROM product_category
ORDER BY rank;
"
```

**Résultat attendu**:
```
id              | name                  | handle              | parent_category_id | rank
----------------|-----------------------|---------------------|-------------------|------
pcat_root       | Lunettes Connectées   | lunettes-connectees | NULL              | 0
pcat_smart_tech | Smart Tech            | smart-tech          | pcat_root         | 0
pcat_classic    | Classic Eyewear       | classic-eyewear     | pcat_root         | 1
```

### Étape 4: Vérifier Assignation Produits

```bash
# Compter produits par catégorie
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT
  c.name as category,
  COUNT(pcp.product_id) as product_count
FROM product_category c
LEFT JOIN product_category_product pcp ON c.id = pcp.product_category_id
GROUP BY c.name
ORDER BY c.rank;
"
```

**Résultat attendu**:
```
category             | product_count
---------------------|---------------
Lunettes Connectées  | 0  (racine)
Smart Tech           | 10 (électroniques)
Classic Eyewear      | 6  (standards)
```

### Étape 5: Vérifier dans Dashboard Admin

1. Ouvrir `http://localhost:3200/admin/categories`
2. Vérifier 3 catégories affichées:
   - Lunettes Connectées (racine)
   - Smart Tech (10 produits)
   - Classic Eyewear (6 produits)
3. Cliquer sur "Smart Tech" → voir 10 produits
4. Cliquer sur "Classic Eyewear" → voir 6 produits

---

## 🏷️ Tags de Technologie (Recommandés)

Pour permettre un filtrage granulaire au sein de "Smart Tech", créer ces tags:

```typescript
const TECHNOLOGY_TAGS = [
  "Prismatic",        // Aura, Aura Audio
  "Eclipse",          // Shield, Music Shield
  "HVL",              // Infinity, MR1 x Infinity
  "Electrochromic",   // Aroza, Dragon Chamelo, Veil
  "Liquid Crystal",   // Zurix
]
```

Ces tags permettent de filtrer:
- PLP: "Smart Tech > Electrochromic" (3 produits)
- PLP: "Smart Tech > Prismatic" (2 produits)
- Recherche: "lunettes electrochromic"

---

## 📐 Structure Frontend Recommandée

### Navigation Mega-Menu

```
Lunettes Connectées
├── Smart Tech
│   ├── Voir tout (10 produits)
│   ├── Prismatic™ (2)
│   ├── Eclipse™ (2)
│   ├── HVL™ (2)
│   ├── Electrochromic (3)
│   └── Liquid Crystal (1)
└── Classic Eyewear (6)
```

### Breadcrumbs Exemples

```
Accueil > Smart Tech > Aura
Accueil > Smart Tech > Electrochromic > Aroza
Accueil > Classic Eyewear > Dusk Classic
```

### URLs SEO

```
/categories/smart-tech
/categories/smart-tech?tech=prismatic
/categories/smart-tech?tech=electrochromic
/categories/classic-eyewear
/products/aura
```

---

## ⚠️ Plan de Rollback

### Si problème détecté IMMÉDIATEMENT

```bash
# 1. Arrêter les services
systemctl stop medusa  # ou gmdev stop mytechgear-medusa

# 2. Restaurer le backup
psql postgresql://medusa:medusa@localhost:5433/medusa < backups/taxonomy_before_tech_YYYYMMDD_HHMMSS.sql

# 3. Redémarrer
systemctl start medusa  # ou gmdev start mytechgear-medusa

# 4. Vérifier
psql postgresql://medusa:medusa@localhost:5433/medusa -c "SELECT COUNT(*) FROM product_category;"
# Devrait retourner 5 (structure précédente: root + 4 catégories)
```

---

## 🎯 Résultat Attendu

Après migration réussie:

### Structure Catégories

```sql
SELECT id, name, handle, parent_category_id, rank
FROM product_category
ORDER BY rank;

-- Résultat:
pcat_root       | Lunettes Connectées   | lunettes-connectees | NULL       | 0
pcat_smart_tech | Smart Tech            | smart-tech          | pcat_root  | 0
pcat_classic    | Classic Eyewear       | classic-eyewear     | pcat_root  | 1
```

### Distribution Produits

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

-- Smart Tech (10 produits):
-- Aroza         | Electrochromic Tint-Adjustable
-- Aura          | Prismatic™ Color-changing
-- Aura Audio    | Prismatic™ Color-changing
-- Dragon        | Electrochromic Tint-Adjustable
-- Infinity      | HVL™ Tint-Adjustable
-- MR1 x Infinity| HVL™ Tint-Adjustable
-- Music Shield  | Eclipse™ Tint-Adjustable
-- Shield        | Eclipse™ Tint-Adjustable
-- Veil          | Electrochromic
-- Zurix         | LC (Liquid Crystal)

-- Classic Eyewear (6 produits):
-- Dragon        | Standard tinted
-- Duck Classic  | Classic tinted
-- Dusk Classic  | Dusk™ Alpha
-- Euphoria      | Fashion tinted
-- Falcon        | Sport tinted
-- Prime         | Standard tinted
```

---

## 📊 Métriques de Succès

### Technique

- ✅ 3 catégories actives (root + 2 enfants)
- ✅ 10 produits dans Smart Tech
- ✅ 6 produits dans Classic Eyewear
- ✅ 0 produits orphelins

### UX

- ✅ Breadcrumbs 2 niveaux fonctionnels
- ✅ Filtres PLP par technologie (tags)
- ✅ Navigation claire Smart/Classic

### SEO

- ✅ URLs `/categories/smart-tech` indexables
- ✅ Keywords techniques ("electrochromic", "prismatic") dans URLs/meta
- ✅ BreadcrumbList JSON-LD valide

---

## 💡 Prochaines Étapes Après Migration

1. **Frontend**: Implémenter filtres par technologie dans PLP
2. **Tags**: Auto-assigner tags Prismatic, Eclipse, HVL, Electrochromic, LC
3. **SEO**: Meta descriptions mentionnant technologies
4. **Collections**: Créer collections marketing "Best-sellers", "Nouveautés"
5. **PDP**: Afficher badge technologie (ex: "Prismatic™ Technology")

---

**Dernière mise à jour**: 2026-02-21
**Auteur**: Claude Code
**Statut**: Prêt pour exécution
