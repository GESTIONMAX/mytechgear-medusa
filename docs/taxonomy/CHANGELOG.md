# Changelog - Taxonomie MyTechGear

Historique complet des migrations de taxonomie et décisions architecturales.

---

## [2.0.0] - 2026-02-21 - Structure par Technologie ✅ ACTUELLE

### 🎯 Objectif

Passer d'une classification use-case (Sport/Lifestyle) à une classification **par technologie de verre**, reflétant la vraie différenciation technique des produits.

### 📊 Changements

**AVANT** (Option C - Use-case) :
```
Lunettes Connectées
├── Sport & Performance (5 produits)
├── Lifestyle & Quotidien (8 produits)
├── Gaming & Écrans (0 produits) ← Vide
└── Vue Correctrice (0 produits) ← Vide
```

**APRÈS** (Technologie) :
```
Lunettes Connectées
├── Smart Tech (10 produits électroniques)
│   ├── Prismatic™ (2)
│   ├── Eclipse™ (2)
│   ├── HVL™ (2)
│   ├── Electrochromic (3)
│   └── Liquid Crystal (1)
└── Classic Eyewear (6 produits standards)
```

### ✅ Résultats

- **Catégories** : 5 → 3 (simplification)
- **Produits Smart Tech** : 10 (tous produits électroniques)
- **Produits Classic** : 6 (verres teintés standards)
- **Orphelins** : 0
- **Migration** : Succès 100%

### 🔑 Décisions Clés

1. **Classification technique prioritaire**
   - Raison : Reflète vraie différenciation produit
   - Avantage : SEO aligné sur features techniques
   - Impact : URLs `/categories/smart-tech` plus claires que `/categories/sport`

2. **Suppression Gaming & Vue Correctrice**
   - Raison : Catégories vides, pas de produits prévus
   - Raison : Absentes sur chamelo.com (source de référence)
   - Décision : Recréer plus tard si besoin réel

3. **Tags pour filtrage granulaire**
   - Raison : Ne pas sur-complexifier hiérarchie
   - Solution : Tags Prismatic, Eclipse, HVL, Electrochromic, LC
   - Avantage : Filtres PLP flexibles sans catégories multiples

### 📁 Fichiers Impactés

- **Migration** : `src/scripts/migrate-to-tech-taxonomy.ts`
- **Documentation** : `docs/taxonomy/CURRENT_STATE.md`
- **Backup** : `backups/taxonomy_before_tech_20260221_*.sql`

### 🔄 Rollback

```bash
psql $DATABASE_URL < backups/taxonomy_before_tech_20260221_*.sql
```

### 👤 Décideur

- **Approuvé par** : Utilisateur
- **Exécuté par** : Claude Code
- **Date exécution** : 2026-02-21 ~06:45 UTC

---

## [1.1.0] - 2026-02-21 - Migration Option C (Use-case) ❌ REMPLACÉE

### 🎯 Objectif

Passer d'une structure 16 catégories (4 niveaux, genre-based) à 5 catégories (2 niveaux, use-case).

### 📊 Changements

**AVANT** (Structure initiale) :
```
Lunettes (16 catégories, 4 niveaux)
├── Lunettes de soleil
│   ├── Homme
│   │   ├── Classique
│   │   ├── Aviateur
│   │   └── Sport
│   ├── Femme
│   │   ├── Fashion & Tendance
│   │   ├── Classique
│   │   └── Sport
│   ├── Enfant
│   └── Sport & Performance
└── Lunettes de vue
    ├── Homme
    ├── Femme
    └── Gaming & Écrans
```

**APRÈS** (Option C) :
```
Lunettes Connectées
├── Sport & Performance
├── Lifestyle & Quotidien
├── Gaming & Écrans
└── Vue Correctrice
```

### ✅ Résultats

- **Catégories** : 16 → 5 (simplification majeure)
- **Niveaux** : 4 → 2 (hiérarchie plate)
- **Produits assignés** : 13/13 (100%)

### ❌ Problèmes Identifiés

1. **Gaming & Vue Correctrice vides**
   - 0 produits dans ces catégories
   - Inexistantes sur chamelo.com (source)
   - Ajoutées par extrapolation (erreur)

2. **Classification use-case insuffisante**
   - Shield (Eclipse™) et Aroza (Electrochromic) groupés en "Sport"
   - Aura (Prismatic™) et Zurix (LC) groupés en "Lifestyle"
   - Ne reflète pas vraie différenciation technique

3. **SEO sous-optimal**
   - URLs `/categories/sport` trop génériques
   - Keywords techniques (electrochromic, prismatic) pas valorisés

### 🔄 Décision

**Migration vers structure par Technologie** (v2.0.0) pour résoudre ces problèmes.

### 📁 Fichiers Impactés

- **Migration** : `src/scripts/cleanup-and-migrate-taxonomy.ts`
- **Documentation** : `docs/taxonomy/MIGRATION_OPTION_C.md` (archivée)

### 👤 Décideur

- **Approuvé par** : Utilisateur
- **Exécuté par** : Claude Code
- **Date exécution** : 2026-02-21 ~04:00 UTC
- **Remplacée par** : v2.0.0 (même jour)

---

## [1.0.0] - 2026-01-XX - Structure Initiale

### 🎯 Objectif

Création structure taxonomique initiale pour MyTechGear Medusa.

### 📊 Structure

```
Lunettes (16 catégories, 4 niveaux)
└── Hiérarchie genre-based (Homme/Femme/Enfant)
    └── Sous-catégories style (Classique/Aviateur/Sport/Fashion)
```

### ❌ Problèmes Identifiés

1. **Incohérence sémantique**
   - Mélange genre (Homme/Femme) + use-case (Sport) au même niveau
   - Triple "Sport" à 3 endroits différents

2. **Over-engineering**
   - 16 catégories pour 11 produits seulement
   - Hiérarchie 4 niveaux trop complexe
   - Styles classiques (Aviateur, Classique) inadaptés produits tech

3. **Non-aligné source**
   - Structure différente de chamelo.com (source produits)
   - Chamelo utilise use-case simple : Sport / Lifestyle / Prismatic

### 🔄 Décision

**Migration vers Option C** (v1.1.0) pour simplifier et aligner sur chamelo.com.

### 📁 Fichiers Impactés

- **SQL** : `scripts/reorganize-collections-categories.sql` (jamais exécuté)
- **Documentation** : `docs/REORGANISATION_COLLECTIONS_CATEGORIES.md`

### 👤 Créateur

- **Créé par** : Équipe initiale
- **Date** : 2026-01-XX (estimée)

---

## Leçons Apprises

### ✅ Bonnes Pratiques

1. **Backup systématique avant migration**
   - Sauvegarde CSV + SQL
   - Vérification backup avant exécution
   - Plan de rollback documenté

2. **Validation post-migration**
   - Tests SQL automatisés
   - Vérification produits orphelins
   - Comptes par catégorie

3. **Documentation immédiate**
   - État actuel (CURRENT_STATE.md)
   - Guide migration (MIGRATION_*.md)
   - Changelog à jour

### ❌ Erreurs à Éviter

1. **Ne PAS extrapoler sans validation**
   - Gaming & Vue Correctrice ajoutées sans source
   - Vérifier toujours source de référence (chamelo.com)

2. **Ne PAS créer catégories vides**
   - Catégories sans produits = mauvaise UX
   - Créer seulement quand produits existent

3. **Ne PAS sur-complexifier hiérarchie**
   - 16 catégories pour 11 produits = over-engineering
   - Préférer tags pour filtrage granulaire

### 🎯 Principes de Design

1. **Use-case > Genre**
   - Lunettes tech ne se classent pas par genre
   - Sport/Lifestyle plus cohérent que Homme/Femme

2. **Technologie > Use-case**
   - Prismatic™ vs Eclipse™ = vraie différenciation
   - Use-case peut être géré par tags

3. **Simple > Complexe**
   - 2-3 catégories mieux que 16
   - Hiérarchie plate (2 niveaux) optimale

---

## Prochaines Migrations Prévues

### v2.1.0 - Tags Technologie (À venir)

**Objectif** : Auto-assigner tags Prismatic, Eclipse, HVL, Electrochromic, LC

**Impact** :
- Filtrage PLP par technologie
- SEO amélioré (meta keywords)
- Badges PDP

**Fichiers** :
- `src/scripts/assign-technology-tags.ts` (à créer)

### v2.2.0 - Collections Marketing (À venir)

**Objectif** : Peupler collections Best-sellers et Nouveautés

**Impact** :
- Landing pages marketing
- Merchandising dynamique
- Collections auto-peuplées via cron

**Fichiers** :
- `src/scripts/populate-bestsellers-collection.ts`
- `src/scripts/populate-nouveautes-collection.ts`

### v3.0.0 - Sous-catégories Use-case (Futur)

**Objectif** : Ajouter sous-catégories use-case si besoin

**Structure envisagée** :
```
Smart Tech
├── Sport & Performance
├── Lifestyle & Quotidien
└── Gaming & Écrans
```

**Condition** : Seulement si >20 produits Smart Tech

---

## Métadonnées

**Format** : [MAJOR.MINOR.PATCH]
- **MAJOR** : Changement structure catégories (breaking)
- **MINOR** : Ajout catégories (non-breaking)
- **PATCH** : Corrections, réorganisations mineures

**Mainteneur** : Claude Code
**Projet** : MyTechGear Medusa Backend
**Repository** : mytechgear-medusa

---

Dernière mise à jour : 2026-02-21
