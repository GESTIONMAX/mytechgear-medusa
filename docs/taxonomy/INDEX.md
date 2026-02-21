# Index Documentation Taxonomie

> **Navigation rapide** de tous les documents taxonomie MyTechGear
> **Dernière mise à jour** : 2026-02-21

---

## 📚 Documents Principaux (À Lire)

### 1. [README.md](./README.md) ⭐ START HERE
**Description** : Point d'entrée principal de la documentation taxonomie
**Contenu** :
- Vue d'ensemble structure actuelle
- Quick start (vérifications, commandes)
- Structure détaillée (Smart Tech vs Classic)
- Stratégie tags vs catégories
- Requêtes SQL utiles
- Workflows courants
- Scripts disponibles

**Quand lire** : Toujours en premier pour comprendre l'état actuel

---

### 2. [CURRENT_STATE.md](./CURRENT_STATE.md) ⭐ ÉTAT ACTUEL
**Description** : Documentation complète de l'état actuel (v2.0.0)
**Contenu** :
- Vue d'ensemble (3 catégories)
- Catégories détaillées (Smart Tech, Classic)
- Distribution produits par technologie
- Stratégie de tags (Technology, Features, Use-case)
- URLs et SEO (breadcrumbs, structured data)
- Collections marketing
- Workflows de gestion
- Requêtes SQL utiles
- Évolutions futures

**Quand lire** : Pour comprendre en détail la structure actuelle

---

### 3. [MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md) 📖 GUIDE MIGRATION
**Description** : Guide complet de migration vers structure par technologie
**Contenu** :
- Objectif migration
- Comparaison Avant/Après
- Mapping produits par technologie
- Procédure de migration (5 étapes)
- Plan de rollback
- Résultat attendu
- Métriques de succès
- Prochaines étapes

**Quand lire** : Si vous devez refaire la migration ou comprendre comment elle a été faite

---

### 4. [CHANGELOG.md](./CHANGELOG.md) 📜 HISTORIQUE
**Description** : Historique complet des migrations et décisions
**Contenu** :
- v2.0.0 : Structure par Technologie (actuelle)
- v1.1.0 : Migration Option C (use-case)
- v1.0.0 : Structure initiale
- Leçons apprises
- Principes de design
- Prochaines migrations prévues

**Quand lire** : Pour comprendre pourquoi certaines décisions ont été prises

---

## 📁 Documents Archivés (Référence Historique)

### 5. [ARCHIVED_MIGRATION_OPTION_C.md](./ARCHIVED_MIGRATION_OPTION_C.md) ❌ OBSOLÈTE
**Description** : Guide migration Option C (use-case) - remplacée par v2.0.0
**Contenu** :
- Migration vers structure Sport/Lifestyle/Gaming/Vue
- 16 catégories → 5 catégories
- Mapping produits Option C
- Procédure migration Option C

**Statut** : ❌ OBSOLÈTE - Remplacée même jour par structure Technologie
**Quand lire** : Pour référence historique uniquement

---

### 6. [DRYRUN_REPORT_*.md](./DRYRUN_REPORT_*.md) 🧪 TESTS
**Description** : Rapports de dry-run (tests) migrations
**Fichiers** :
- `DRYRUN_REPORT_BEFORE.md` : État avant migration Option C
- `DRYRUN_REPORT_AFTER.md` : État après migration Option C
- `DRYRUN_REPORT_FINAL.md` : Validation finale Option C

**Statut** : Archivés (tests de migration Option C obsolète)
**Quand lire** : Pour comprendre processus de tests avant migration

---

## 🗂️ Arborescence Complète

```
docs/taxonomy/
├── INDEX.md (ce fichier) ................... Navigation
├── README.md ⭐ ............................ Point d'entrée
├── CURRENT_STATE.md ⭐ ..................... État actuel détaillé
├── MIGRATION_TECH_TAXONOMY.md 📖 ........... Guide migration
├── CHANGELOG.md 📜 ......................... Historique
├── ARCHIVED_MIGRATION_OPTION_C.md ❌ ....... Migration obsolète
├── DRYRUN_REPORT_BEFORE.md 🧪 .............. Test obsolète
├── DRYRUN_REPORT_AFTER.md 🧪 ............... Test obsolète
└── DRYRUN_REPORT_FINAL.md 🧪 ............... Test obsolète
```

---

## 🎯 Navigation par Cas d'Usage

### Je veux comprendre la structure actuelle
→ Lire : [README.md](./README.md) puis [CURRENT_STATE.md](./CURRENT_STATE.md)

### Je veux ajouter un nouveau produit
→ Lire : [CURRENT_STATE.md](./CURRENT_STATE.md) section "Workflows"

### Je veux comprendre pourquoi cette structure
→ Lire : [CHANGELOG.md](./CHANGELOG.md) section "Leçons apprises"

### Je veux refaire la migration
→ Lire : [MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md)

### Je veux voir l'historique des changements
→ Lire : [CHANGELOG.md](./CHANGELOG.md)

### Je veux des exemples de requêtes SQL
→ Lire : [README.md](./README.md) ou [CURRENT_STATE.md](./CURRENT_STATE.md) section "Requêtes SQL"

---

## 📊 Vue d'Ensemble Rapide

### Structure Actuelle (v2.0.0)

```
Lunettes Connectées
├── Smart Tech (10 produits)
│   ├── Prismatic™ (2)
│   ├── Eclipse™ (2)
│   ├── HVL™ (2)
│   ├── Electrochromic (3)
│   └── Liquid Crystal (1)
└── Classic Eyewear (6 produits)
```

### Fichiers Scripts Associés

```
src/scripts/
├── migrate-to-tech-taxonomy.ts .......... Migration v2.0.0 ✅
├── cleanup-and-migrate-taxonomy.ts ...... Migration v1.1.0 (obsolète)
├── validate-taxonomy-after-migration.ts . Validation
└── assign-product-tags.ts ............... Tags auto
```

### Commandes Rapides

```bash
# Lire documentation
cat docs/taxonomy/README.md
cat docs/taxonomy/CURRENT_STATE.md

# Vérifier structure DB
psql $DATABASE_URL -c "SELECT id, name FROM product_category ORDER BY rank;"

# Dashboard admin
open http://localhost:3200/admin/categories
```

---

## 🔄 Flux de Lecture Recommandé

### Pour un nouveau développeur

1. **[README.md](./README.md)** - Comprendre vue d'ensemble
2. **[CURRENT_STATE.md](./CURRENT_STATE.md)** - Détails structure
3. **[CHANGELOG.md](./CHANGELOG.md)** - Contexte historique
4. Test pratique : Vérifier DB via commandes SQL

### Pour modifier la taxonomie

1. **[CURRENT_STATE.md](./CURRENT_STATE.md)** - État actuel
2. **[MIGRATION_TECH_TAXONOMY.md](./MIGRATION_TECH_TAXONOMY.md)** - Procédure migration
3. **[CHANGELOG.md](./CHANGELOG.md)** - Leçons apprises
4. Créer backup + faire dry-run

### Pour débugger un problème

1. **[README.md](./README.md)** section "Requêtes SQL utiles"
2. **[CURRENT_STATE.md](./CURRENT_STATE.md)** section "Workflows"
3. Logs backend : `gmdev logs mytechgear-medusa -f`

---

## 📝 Maintenance de cette Documentation

### Quand mettre à jour

- **README.md** : Toujours à jour avec état actuel
- **CURRENT_STATE.md** : Après chaque migration majeure
- **CHANGELOG.md** : Après chaque migration (ajouter nouvelle version)
- **INDEX.md** : Quand nouveaux fichiers créés

### Comment mettre à jour

1. Éditer fichier concerné
2. Mettre à jour date "Dernière mise à jour"
3. Commit avec message clair : `docs: update taxonomy CHANGELOG with v2.1.0`

---

## 🔗 Liens Externes

- **Documentation générale** : [../README.md](../README.md)
- **Scripts migration** : [../../src/scripts/](../../src/scripts/)
- **Frontend admin** : [../../mytechgear-frontend/src/app/admin/](../../mytechgear-frontend/src/app/admin/)

---

**Mainteneur** : Claude Code
**Dernière révision** : 2026-02-21
**Version taxonomie** : 2.0.0 (Technologie)
