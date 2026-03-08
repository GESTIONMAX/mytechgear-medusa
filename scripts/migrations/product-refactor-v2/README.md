# Product Refactoring v2.0 - Migration Scripts

## 🎯 Objectif

Migration sécurisée de l'architecture produit Music Shield et Shield, passant d'une structure avec option "Audio" à deux produits distincts liés par famille.

**Architecture v2.0**:
- Music Shield (avec audio) - 4 variantes
- Shield (sans audio) - 4 variantes
- Liaison via `metadata.family` et `metadata.related`

---

## ⚠️ IMPORTANT - Production Database

Ces scripts sont conçus pour une **base de données de production** accessible via SSH tunnel.

**Contraintes**:
- ❌ Pas de base de données locale
- ✅ Connexion directe à la production via tunnel
- ✅ Scripts sécurisés avec dry-run et backup
- ✅ Validation à chaque étape
- ✅ Plan de rollback

---

## 📋 Scripts Disponibles

### 01-backup-database.sh
**Backup complet de la base de données**

```bash
./scripts/migrations/product-refactor-v2/01-backup-database.sh
```

**Ce qu'il fait**:
- ✅ Vérifie la connexion à la base de données
- ✅ Crée un dump PostgreSQL complet
- ✅ Vérifie l'intégrité du backup
- ✅ Compresse le backup (gzip)
- ✅ Sauvegarde dans `./backups/medusa-backup-{timestamp}.sql.gz`

**Pré-requis**:
- `pg_dump` installé (PostgreSQL client tools)
- `DATABASE_URL` configuré dans `.env`
- Tunnel SSH actif si nécessaire

**Sortie**:
```
./backups/
├── medusa-backup-20260228-143022.sql.gz
└── backup-20260228-143022.log
```

---

### 02-analyze-current-state.ts
**Analyse dry-run (READ-ONLY) de l'état actuel**

```bash
npx tsx scripts/migrations/product-refactor-v2/02-analyze-current-state.ts
```

**Ce qu'il fait**:
- ✅ Analyse les produits `music-shield` et `shield`
- ✅ Détecte les problèmes de structure
- ✅ Génère des recommandations
- ✅ Crée un plan de migration
- ✅ **AUCUNE modification** de la base de données

**Sortie**:
```
./backups/
├── analysis-20260228-143525.json  (rapport JSON structuré)
└── analysis-20260228-143525.md    (rapport Markdown lisible)
```

**Rapport Markdown inclut**:
- Résumé de l'analyse
- Détails par produit (options, variantes, metadata)
- Liste des problèmes détectés
- Recommandations de migration
- Plan de migration étape par étape

---

### 03-migrate-products.ts
**Migration réelle des produits** (À CRÉER)

```bash
npx tsx scripts/migrations/product-refactor-v2/03-migrate-products.ts
```

**Ce qu'il fera**:
- Update Music Shield (retirer option Audio, ajouter metadata)
- Créer Shield si manquant
- Valider à chaque étape
- Confirmation manuelle entre étapes critiques

**Status**: 🚧 EN DÉVELOPPEMENT

---

### 04-rollback.ts
**Annulation de la migration** (À CRÉER)

```bash
npx tsx scripts/migrations/product-refactor-v2/04-rollback.ts
```

**Ce qu'il fera**:
- Restaurer l'état précédent
- Utiliser le backup créé par 01-backup-database.sh

**Status**: 🚧 EN DÉVELOPPEMENT

---

## 🔄 Processus de Migration

### Phase 1: Préparation (SAFE)

```bash
# 1. Créer un backup complet
./scripts/migrations/product-refactor-v2/01-backup-database.sh

# 2. Analyser l'état actuel (dry-run, read-only)
npx tsx scripts/migrations/product-refactor-v2/02-analyze-current-state.ts

# 3. Lire le rapport généré
cat ./backups/analysis-*.md
```

**Vérifier**:
- ✅ Backup créé avec succès
- ✅ Rapport d'analyse généré
- ✅ Comprendre les changements à venir

---

### Phase 2: Migration (CRITIQUE)

```bash
# 4. Exécuter la migration
npx tsx scripts/migrations/product-refactor-v2/03-migrate-products.ts

# Le script demandera confirmation à chaque étape critique
```

**Étapes de migration**:
1. Update Music Shield
   - Retirer option "Audio"
   - Ajouter `metadata.family = "shield-platform"`
   - Ajouter `metadata.hasAudio = true`
   - Ajouter `metadata.related.withoutAudio = "shield"`
   - Réduire à 4 variantes (si 8 actuellement)

2. Créer/Update Shield
   - Créer produit si manquant
   - Ajouter options Monture et Verres
   - Créer 4 variantes
   - Ajouter `metadata.hasAudio = false`
   - Ajouter `metadata.related.withAudio = "music-shield"`

---

### Phase 3: Validation

```bash
# 5. Re-analyser après migration
npx tsx scripts/migrations/product-refactor-v2/02-analyze-current-state.ts

# 6. Comparer avec rapport pré-migration
diff ./backups/analysis-BEFORE.md ./backups/analysis-AFTER.md
```

**Vérifier**:
- ✅ Music Shield a 4 variantes (pas 8)
- ✅ Shield existe avec 4 variantes
- ✅ Metadata.family présent sur les deux
- ✅ Metadata.related correctement configuré
- ✅ Aucun problème dans le nouveau rapport

---

### Phase 4: Rollback (si problème)

```bash
# Si quelque chose ne va pas
npx tsx scripts/migrations/product-refactor-v2/04-rollback.ts

# Ou restauration manuelle
gunzip ./backups/medusa-backup-20260228-143022.sql.gz
psql ${DATABASE_URL} < ./backups/medusa-backup-20260228-143022.sql
```

---

## 📊 Exemple de Rapport d'Analyse

```markdown
# Product Refactoring v2.0 - Analysis Report

## 📊 Summary
- Products Analyzed: 2
- Existing Products: 1
- Missing Products: 1
- Needs Migration: 1
- Total Issues: 5

## 🔍 Product Analysis

### ⚠️ Music Shield
- Handle: `music-shield`
- Status: NEEDS_MIGRATION
- Options: 3 (Monture, Verres, Audio)
- Variants: 8
- Has Audio Option: ❌ YES (should be removed)

**Issues (5)**:
- 🔴 Has "Audio" option with 2 values - should be separate products
- 🔴 Missing metadata.family
- 🔴 Missing metadata.hasAudio
- 🔴 Missing metadata.related
- 🔴 Has 8 variants (expected 4 for single product)

**Recommendations**:
- ✅ Remove 'Audio' option
- ✅ Keep only 'Monture' and 'Verres' options
- ✅ Reduce to 4 variants (2×2)
- ✅ Add metadata.family = "shield-platform"
- ✅ Add metadata.hasAudio = true
- ✅ Add metadata.related.withoutAudio = "shield"

### ❌ Shield
- Handle: `shield`
- Status: MISSING
- Options: 0
- Variants: 0

**Issues (1)**:
- 🔴 Product does not exist in database

**Recommendations**:
- ✅ Create as new product
- ✅ Add 'Monture' and 'Verres' options
- ✅ Create 4 variants (2×2)
- ✅ Set price to $240
- ✅ Set weight to 44g
```

---

## 🛡️ Sécurité et Précautions

### Avant de commencer
- [ ] Tunnel SSH actif et stable
- [ ] Variable `DATABASE_URL` correcte dans `.env`
- [ ] Accès admin Medusa fonctionnel
- [ ] Espace disque suffisant pour backup
- [ ] Heures creuses de production (si possible)

### Pendant la migration
- [ ] Garder le backup accessible
- [ ] Noter les timestamps de chaque étape
- [ ] Vérifier chaque confirmation avant de continuer
- [ ] Monitorer les logs d'erreur

### Après la migration
- [ ] Conserver le backup pendant 30 jours minimum
- [ ] Tester les produits en frontend
- [ ] Vérifier les commandes existantes
- [ ] Documenter les changements appliqués

---

## 🚨 En cas de problème

### Erreur de connexion
```bash
# Vérifier le tunnel SSH
ps aux | grep ssh

# Tester la connexion PostgreSQL
psql ${DATABASE_URL} -c "SELECT 1"
```

### Migration échouée
```bash
# Arrêter immédiatement
Ctrl+C

# Analyser l'erreur
cat ./backups/migration-*.log

# Restaurer le backup
./scripts/migrations/product-refactor-v2/04-rollback.ts
```

### Produits incohérents
```bash
# Re-analyser l'état
npx tsx scripts/migrations/product-refactor-v2/02-analyze-current-state.ts

# Si incohérence majeure: rollback complet
# Puis investiguer et corriger le script de migration
```

---

## 📚 Références

- [REFACTORING-V2.md](../../../docs/product-models/REFACTORING-V2.md) - Documentation complète du refactoring
- [music-shield-reference.json](../../../docs/product-models/music-shield-reference.json) - Structure cible Music Shield
- [shield-reference.json](../../../docs/product-models/shield-reference.json) - Structure cible Shield
- [product-metadata.types.ts](../../../docs/product-models/product-metadata.types.ts) - Types TypeScript

---

## 📞 Support

**Questions?**
1. Lire [REFACTORING-V2.md](../../../docs/product-models/REFACTORING-V2.md)
2. Examiner les rapports d'analyse générés
3. Vérifier les logs dans `./backups/*.log`

**Avant de lancer en production**:
- ✅ Tester sur une copie de DB locale (si possible)
- ✅ Vérifier que tous les scripts sont compris
- ✅ Avoir un plan de rollback clair
- ✅ Prévoir une fenêtre de maintenance

---

**Version**: 2.0.0
**Date**: 2026-02-28
**Auteur**: MyTechGear Development Team
