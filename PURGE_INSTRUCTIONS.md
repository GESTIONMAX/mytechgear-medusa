# Instructions de Purge des Images - MyTechGear

## ⚠️ ATTENTION - Action Destructive

Cette procédure va supprimer TOUTES les références d'images dans Medusa.
Les fichiers physiques sur MinIO ne seront PAS supprimés (seulement les références DB).

## Étape 1 : Créer un Snapshot (OBLIGATOIRE)

```bash
# Exporter un backup JSON complet
npm exec medusa exec ./src/scripts/medusa-export-product-media.ts

# Vérifier que le snapshot a été créé
ls -lh exports/
```

## Étape 2 : Vérifier le Snapshot

```bash
# Afficher le résumé du snapshot
cat exports/medusa-media-snapshot-*.json | head -20

# Compter les produits et images
cat exports/medusa-media-snapshot-*.json | grep -E '"totalProducts"|"totalImages"'
```

## Étape 3 : Tester la Purge (DRY RUN)

```bash
# Test sans modification
npm exec medusa exec ./src/scripts/medusa-purge-product-media.ts
```

## Étape 4 : Exécuter la Purge LIVE

```bash
# ⚠️ ATTENTION : Ceci va SUPPRIMER toutes les images
# Countdown de 5 secondes pour annuler (Ctrl+C)
DRY_RUN=false npm exec medusa exec ./src/scripts/medusa-purge-product-media.ts
```

## Étape 5 : Vérifier la Purge

Après la purge, vérifier que les images ont bien été supprimées :

```bash
# Méthode 1 : Via l'interface admin
# Ouvrir https://api.mytechgear.eu/app/products
# Les images doivent avoir disparu

# Méthode 2 : Via les scripts de snapshot
# Exporter un nouveau snapshot pour comparer
npm exec medusa exec ./src/scripts/medusa-export-product-media.ts

# Le nouveau snapshot doit montrer 0 images
```

## Rollback (Si Nécessaire)

Si vous devez annuler la purge :

1. Le snapshot contient toutes les URLs d'origine
2. Vous pouvez créer un script de restauration qui réinjecte les URLs
3. Les fichiers MinIO n'ont pas été touchés

## Alternative : Purge SQL Directe

Si le script TypeScript échoue, utilisez la purge SQL :

```bash
# Dry run (ROLLBACK par défaut)
psql "$DATABASE_URL" -f scripts/sql/purge-product-media.sql

# Pour exécuter réellement :
# 1. Éditer le fichier et remplacer ROLLBACK par COMMIT à la fin
# 2. Exécuter à nouveau
vim scripts/sql/purge-product-media.sql
psql "$DATABASE_URL" -f scripts/sql/purge-product-media.sql
```

## État Actuel

- ✅ Snapshot script créé et testé
- ✅ Purge script créé et testé (dry run)
- ✅ SQL fallback créé
- ⏳ **PURGE NON EXÉCUTÉE** - Les images sont toujours présentes

## Prochaines Étapes (Après Purge)

1. Implémenter l'upload MinIO avec ImageRef structure
2. Mettre à jour le dashboard pour utiliser metadata.media.refs[]
3. Utiliser les clés MinIO avec timestamp+UUID au lieu d'index
