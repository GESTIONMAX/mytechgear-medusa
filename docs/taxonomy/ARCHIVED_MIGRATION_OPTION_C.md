# Migration Taxonomie Option C - Guide Complet

## 🎯 Objectif

Passer de la structure actuelle (incohérente, 16 catégories, 4 niveaux) à une structure simple inspirée de chamelo.com (4 catégories, 2 niveaux).

## 📊 Comparaison Avant/Après

### AVANT (Incohérent)
```
Lunettes
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
│   └── Sport & Performance  ← Doublon!
└── Lunettes de vue
    ├── Homme
    ├── Femme
    └── Gaming & Écrans
```

**Problèmes**:
- ❌ Mélange genre + use-case au même niveau
- ❌ Triple "Sport" (3 endroits différents)
- ❌ Styles classiques inadaptés aux produits tech
- ❌ 16 catégories pour 11 produits (over-engineering)

### APRÈS (Option C - Cohérent)
```
Lunettes Connectées
├── Sport & Performance
├── Lifestyle & Quotidien
├── Gaming & Écrans
└── Vue Correctrice
```

**Avantages**:
- ✅ Use-case first (comment les clients achètent)
- ✅ Aligné avec chamelo.com (fournisseur principal)
- ✅ Simple (2 niveaux max)
- ✅ Scalable (facile d'ajouter nouvelles catégories)
- ✅ SEO optimal (URLs courtes: `/categories/sport`)

## 🗺️ Mapping des Produits

| Produit | Ancienne Catégorie | Nouvelle Catégorie | Raison |
|---------|-------------------|-------------------|--------|
| Shield | Solaire > Sport | **Sport** | Performance running/cycling |
| Music Shield | Solaire > Sport | **Sport** | Performance + audio |
| Aroza | Solaire > Sport | **Sport** | Goggles sport extrêmes |
| Falcon | Solaire > Sport | **Sport** | Sport performance |
| Prime | Solaire > Sport | **Sport** | Sport performance |
| Aura | Solaire > Femme > Fashion | **Lifestyle** | Quotidien color-changing |
| Aura Audio | Solaire > Femme > Fashion | **Lifestyle** | Quotidien + audio |
| Zurix | Solaire > Homme > Classique | **Lifestyle** | Urbain everyday |
| Veil | Solaire > Femme > Fashion | **Lifestyle** | Cat-eye lifestyle |
| Dusk Classic | Solaire > Homme > Classique | **Lifestyle** | Wayfarer casual |
| Infinity | Solaire > Homme > Classique | **Lifestyle** | Rectangulaire urbain |
| MR1 x Infinity | Solaire > Homme > Classique | **Lifestyle** | Édition limitée |
| Dragon | Solaire > Homme > Classique | **Lifestyle** | Premium urbain |

## 🚀 Procédure de Migration

### Étape 1: Backup de Sécurité (CRITIQUE)

```bash
# 1. Backup complet de la base de données
pg_dump postgresql://medusa:medusa@localhost:5433/medusa > backups/taxonomy_before_option_c_$(date +%Y%m%d_%H%M%S).sql

# 2. Vérifier le backup
ls -lh backups/taxonomy_before_option_c_*.sql

# 3. Tester le backup (optionnel)
createdb medusa_test
psql medusa_test < backups/taxonomy_before_option_c_*.sql
dropdb medusa_test
```

### Étape 2: Dry-Run (Recommandé)

```bash
# Créer une DB de test avec les données actuelles
createdb medusa_test
pg_dump postgresql://medusa:medusa@localhost:5433/medusa | psql medusa_test

# Modifier temporairement DATABASE_URL dans .env
# DATABASE_URL=postgres://medusa:medusa@localhost:5433/medusa_test

# Exécuter la migration sur la DB test
npm exec medusa exec ./src/scripts/reorganize-taxonomy-option-c.ts

# Vérifier le résultat
psql medusa_test -c "SELECT id, name, handle, parent_category_id FROM product_category ORDER BY rank;"

# Si OK, continuer. Sinon, corriger et recommencer.
dropdb medusa_test
```

### Étape 3: Migration en Production

```bash
# 1. S'assurer que DATABASE_URL pointe vers la vraie DB
grep DATABASE_URL .env

# 2. Exécuter la migration
npm exec medusa exec ./src/scripts/reorganize-taxonomy-option-c.ts

# 3. Vérifier immédiatement le résultat
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

# 4. Vérifier que les produits sont bien assignés
psql postgresql://medusa:medusa@localhost:5433/medusa -c "
SELECT
  p.handle as product,
  c.name as category
FROM product p
LEFT JOIN product_category_product pcp ON p.id = pcp.product_id
LEFT JOIN product_category c ON pcp.product_category_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY c.rank, p.title;
"
```

### Étape 4: Vérification Frontend

```bash
# 1. Redémarrer le backend Medusa (pour vider les caches)
gmdev restart mytechgear-medusa

# 2. Redémarrer le frontend Next.js
gmdev restart mytechgear-frontend

# 3. Tester dans le navigateur
# - http://localhost:3200/admin/categories
# - Vérifier que les 4 catégories s'affichent
# - Cliquer sur chaque catégorie pour voir les détails
```

### Étape 5: Tests Complets

**Dans le dashboard admin**:
- [ ] Les 4 catégories s'affichent (Sport, Lifestyle, Gaming, Vue)
- [ ] Chaque catégorie a les bons produits assignés
- [ ] Les URLs sont correctes (`/categories/sport`, etc.)
- [ ] L'arbre hiérarchique est correct (2 niveaux)

**Dans le frontend (si déployé)**:
- [ ] Menu de navigation affiche les 4 catégories
- [ ] Cliquer sur "Sport" affiche Shield, Music Shield, Aroza, etc.
- [ ] Cliquer sur "Lifestyle" affiche Aura, Zurix, Veil, etc.
- [ ] Breadcrumbs: `Accueil > Sport > Shield`
- [ ] URLs SEO: `/categories/sport`, `/products/shield`

**SEO**:
- [ ] Sitemap.xml mis à jour avec nouvelles URLs
- [ ] Redirects 301 configurés (anciennes URLs → nouvelles)
- [ ] Structured data (breadcrumbs) valide

## ⚠️ Plan de Rollback

### Si problème détecté IMMÉDIATEMENT

```bash
# 1. Arrêter les services
gmdev stop mytechgear-medusa
gmdev stop mytechgear-frontend

# 2. Restaurer le backup
psql postgresql://medusa:medusa@localhost:5433/medusa < backups/taxonomy_before_option_c_YYYYMMDD_HHMMSS.sql

# 3. Redémarrer les services
gmdev start mytechgear-medusa
gmdev start mytechgear-frontend

# 4. Vérifier
psql postgresql://medusa:medusa@localhost:5433/medusa -c "SELECT COUNT(*) FROM product_category;"
# Devrait retourner 16 (ancienne structure)
```

### Si problème détecté PLUS TARD

Si la migration a été faite il y a plusieurs jours et qu'on a créé de nouveaux produits/commandes:

```bash
# 1. Créer backup de l'état actuel
pg_dump postgresql://medusa:medusa@localhost:5433/medusa > backups/before_rollback_$(date +%Y%m%d_%H%M%S).sql

# 2. Restaurer uniquement les catégories depuis le backup
psql postgresql://medusa:medusa@localhost:5433/medusa <<EOF
-- Supprimer catégories actuelles
DELETE FROM product_category_product;
DELETE FROM product_category;

-- Restaurer depuis backup (extraire uniquement les INSERT de product_category)
EOF

# Puis restaurer manuellement les INSERTs depuis le fichier backup
```

## 📝 Redirects SEO (Important!)

Ajouter dans `mytechgear-frontend/next.config.js`:

```javascript
async redirects() {
  return [
    // Anciennes catégories → Nouvelles
    { source: '/categories/lunettes', destination: '/categories/lunettes-connectees', permanent: true },
    { source: '/categories/solaire', destination: '/categories/sport', permanent: true },
    { source: '/categories/solaire-homme', destination: '/categories/lifestyle', permanent: true },
    { source: '/categories/solaire-femme', destination: '/categories/lifestyle', permanent: true },
    { source: '/categories/solaire-sport', destination: '/categories/sport', permanent: true },
    { source: '/categories/solaire-homme-classique', destination: '/categories/lifestyle', permanent: true },
    { source: '/categories/solaire-homme-aviateur', destination: '/categories/lifestyle', permanent: true },
    { source: '/categories/solaire-homme-sport', destination: '/categories/sport', permanent: true },
    { source: '/categories/solaire-femme-fashion', destination: '/categories/lifestyle', permanent: true },
    { source: '/categories/solaire-femme-classique', destination: '/categories/lifestyle', permanent: true },
    { source: '/categories/solaire-femme-sport', destination: '/categories/sport', permanent: true },
    { source: '/categories/vue-homme', destination: '/categories/vue-correctrice', permanent: true },
    { source: '/categories/vue-femme', destination: '/categories/vue-correctrice', permanent: true },
    { source: '/categories/vue-gaming', destination: '/categories/gaming-ecrans', permanent: true },
  ]
}
```

## 🎯 Résultat Attendu

Après migration réussie:

```sql
-- Vérifier la structure
SELECT id, name, handle, parent_category_id, rank
FROM product_category
ORDER BY rank;

-- Résultat attendu:
-- pcat_root         | Lunettes Connectées    | lunettes-connectees | NULL       | 0
-- pcat_sport        | Sport & Performance    | sport               | pcat_root  | 0
-- pcat_lifestyle    | Lifestyle & Quotidien  | lifestyle           | pcat_root  | 1
-- pcat_gaming       | Gaming & Écrans        | gaming-ecrans       | pcat_root  | 2
-- pcat_vue          | Vue Correctrice        | vue-correctrice     | pcat_root  | 3
```

```sql
-- Vérifier l'assignation des produits
SELECT
  c.name as category,
  COUNT(pcp.product_id) as product_count
FROM product_category c
LEFT JOIN product_category_product pcp ON c.id = pcp.product_category_id
GROUP BY c.name
ORDER BY c.rank;

-- Résultat attendu:
-- Lunettes Connectées   | 0  (racine, pas de produits directs)
-- Sport & Performance   | 5  (Shield, Music Shield, Aroza, Falcon, Prime)
-- Lifestyle & Quotidien | 8  (Aura, Aura Audio, Zurix, Veil, Dusk, Infinity, MR1, Dragon)
-- Gaming & Écrans       | 0  (pas encore de produits)
-- Vue Correctrice       | 0  (pas encore de produits RX)
```

## 📞 Support

Si problème pendant la migration:
1. **NE PAS PANIQUER**
2. Prendre screenshot des erreurs
3. Noter l'étape exacte où ça a échoué
4. Restaurer le backup immédiatement
5. Analyser les logs (`npm exec medusa exec` affiche les logs détaillés)

---

**Dernière mise à jour**: 2026-02-21
**Auteur**: Claude Code
**Statut**: Prêt pour exécution
