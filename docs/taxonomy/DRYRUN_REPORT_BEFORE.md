# Dry-Run Validation Report - BEFORE Corrections

**Date**: 2026-02-21 06:35 UTC
**Database**: medusa_test (clone of production)
**Status**: MIGRATION SQL APPLIED, BUT PRODUCTS INCORRECTLY ASSIGNED

---

## Executive Summary

La migration SQL **a déjà été appliquée** à la production, contrairement à ce qui était indiqué dans le plan d'audit. Cependant, les produits sont assignés aux **mauvaises catégories**.

### Situation Actuelle

✅ **Migration SQL**: Appliquée avec succès
- 16 catégories hiérarchiques créées
- 6 collections (3 thématiques + 3 marketing)
- Structure hiérarchique valide (parent_category_id)

❌ **Assignation Produits**: Incorrecte
- Tous les produits ont une catégorie (0 orphelins)
- MAIS les catégories ne correspondent PAS à la logique métier prévue

---

## 1. Catégories (16/16 présentes) ✅

| ID | Nom | Handle | Parent |
|----|-----|--------|--------|
| pcat_lunettes | Lunettes | lunettes | - |
| pcat_solaire | Lunettes de soleil | solaire | pcat_lunettes |
| pcat_solaire_homme | Homme | solaire-homme | pcat_solaire |
| pcat_sh_classique | Classique | solaire-homme-classique | pcat_solaire_homme |
| pcat_sh_aviateur | Aviateur | solaire-homme-aviateur | pcat_solaire_homme |
| pcat_sh_sport | Sport | solaire-homme-sport | pcat_solaire_homme |
| pcat_solaire_femme | Femme | solaire-femme | pcat_solaire |
| pcat_sf_fashion | Fashion & Tendance | solaire-femme-fashion | pcat_solaire_femme |
| pcat_sf_classique | Classique | solaire-femme-classique | pcat_solaire_femme |
| pcat_sf_sport | Sport | solaire-femme-sport | pcat_solaire_femme |
| pcat_solaire_enfant | Enfant | solaire-enfant | pcat_solaire |
| pcat_solaire_sport | Sport & Performance | solaire-sport | pcat_solaire |
| pcat_vue | Lunettes de vue | vue | pcat_lunettes |
| pcat_vue_homme | Homme | vue-homme | pcat_vue |
| pcat_vue_femme | Femme | vue-femme | pcat_vue |
| pcat_vue_gaming | Gaming & Écrans | vue-gaming | pcat_vue |

**Status**: ✅ PASS (16/16 expected categories present)

---

## 2. Collections (6/6 présentes) ✅

| ID | Title | Handle |
|----|-------|--------|
| pcol_01KGBSKFHDDDKWYFQTJQ0HNK34 | Collection Prismatic | collection-prismatic |
| pcol_01KGBSKFHEVTNXE9ZG2HBC4QZ8 | Collection Lifestyle | collection-lifestyle |
| pcol_01KGBSKFHEFEZEE61CW8SESSSE | Collection Sport & Performance | collection-sport |
| pcol_nouveautes | Nouveautés 2024 | nouveautes-2024 |
| pcol_bestsellers | Best-sellers | best-sellers |
| pcol_soldes | Soldes & Promotions | soldes-promotions |

**Status**: ✅ PASS (6/6 expected collections present)

---

## 3. Assignation Produits → Catégories ❌

### Mapping ACTUEL (INCORRECT)

| Produit | Catégorie Actuelle | ❌ Problème |
|---------|-------------------|-------------|
| Aura | solaire-homme-aviateur | ❌ Devrait être **solaire** (unisex lifestyle) |
| Aura Audio | solaire-homme-aviateur | ❌ Devrait être **solaire** (unisex lifestyle) |
| Shield | solaire-sport | ✅ Correct |
| Music Shield | solaire-sport | ✅ Correct |
| Aroza | solaire-sport | ✅ Correct |
| Zurix | solaire-femme-fashion | ❌ Devrait être **solaire-homme-classique** (homme lifestyle) |
| Veil | solaire-femme-fashion | ✅ Correct |
| Dusk Classic | solaire-femme-fashion | ❌ Devrait être **solaire** (unisex wayfarer) |
| Infinity | solaire-femme-fashion | ❌ Devrait être **solaire-homme-classique** (homme rectangulaire) |
| MR1 x Infinity | solaire-femme-fashion | ❌ Devrait être **solaire-homme-classique** (édition limitée homme) |
| Dragon | solaire-femme-fashion | ❌ Devrait être **solaire-homme-classique** (premium urbain) |
| Euphoria | solaire-homme-aviateur | ❓ Produit inconnu dans le plan |
| Falcon | solaire-sport | ❓ Produit inconnu dans le plan |
| Prime | solaire-femme-fashion | ❓ Produit inconnu dans le plan |
| Duck Classic | solaire-femme-fashion | ❓ Produit inconnu dans le plan |

**Produits corrects**: 4/16 (25%)
**Produits incorrects**: 8/16 (50%)
**Produits non mappés dans plan**: 4/16 (25%)

**Status**: ❌ FAIL - La majorité des produits sont mal catégorisés!

---

## 4. Mapping ATTENDU (selon plan)

| Produit | Catégorie Correcte | Raison |
|---------|-------------------|--------|
| Aura | pcat_solaire | Unisex lifestyle |
| Aura Audio | pcat_solaire | Unisex lifestyle |
| Shield | pcat_solaire_sport | ✅ Performance sport |
| Music Shield | pcat_solaire_sport | ✅ Performance sport |
| Aroza | pcat_solaire_sport | ✅ Sport goggles |
| Zurix | pcat_sh_classique | Homme lifestyle classique |
| Veil | pcat_sf_fashion | ✅ Femme cat-eye fashion |
| Dusk Classic | pcat_solaire | Unisex wayfarer |
| Infinity | pcat_sh_classique | Homme rectangulaire urbain |
| MR1 x Infinity | pcat_sh_classique | Édition limitée homme |
| Dragon | pcat_sh_classique | Premium urbain homme |

**Note**: Les 4 produits inconnus (Euphoria, Falcon, Prime, Duck Classic) devront être mappés manuellement.

---

## 5. Orphaned Products ✅

**Count**: 0/16

Tous les produits ont une catégorie assignée.

**Status**: ✅ PASS

---

## 6. Handle Uniqueness

À vérifier: collision handles entre categories et collections?

**Query à exécuter**:
```sql
SELECT handle, COUNT(*) FROM (
  SELECT handle FROM product_category
  UNION ALL
  SELECT handle FROM product_collection
) AS combined
GROUP BY handle HAVING COUNT(*) > 1;
```

---

## 7. Prochaines Étapes

### Corrections Nécessaires (sur medusa_test)

1. **Ré-assigner les 8 produits mal catégorisés**:
   ```sql
   -- Aura: aviateur → solaire
   UPDATE product_category_product SET product_category_id = 'pcat_solaire'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'aura');
   
   -- Aura Audio: aviateur → solaire
   UPDATE product_category_product SET product_category_id = 'pcat_solaire'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'aura-audio');
   
   -- Zurix: femme-fashion → homme-classique
   UPDATE product_category_product SET product_category_id = 'pcat_sh_classique'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'zurix');
   
   -- Dusk Classic: femme-fashion → solaire
   UPDATE product_category_product SET product_category_id = 'pcat_solaire'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'dusk-classic');
   
   -- Infinity: femme-fashion → homme-classique
   UPDATE product_category_product SET product_category_id = 'pcat_sh_classique'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'infinity');
   
   -- MR1 x Infinity: femme-fashion → homme-classique
   UPDATE product_category_product SET product_category_id = 'pcat_sh_classique'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'mr1-infinity');
   
   -- Dragon: femme-fashion → homme-classique
   UPDATE product_category_product SET product_category_id = 'pcat_sh_classique'
   WHERE product_id = (SELECT id FROM product WHERE handle = 'dragon-chamelo');
   ```

2. **Mapper les 4 produits inconnus** (Euphoria, Falcon, Prime, Duck Classic)
   - Analyser metadata de chaque produit
   - Assigner à la catégorie appropriée

3. **Vérifier collections marketing**
   - Best-sellers: produits avec bestseller_rank ≤ 10?
   - Nouveautés 2024: produits created_at >= 2024-01-01?

4. **Valider après corrections**
   - Ré-exécuter validation script
   - Générer rapport AFTER

---

## Conclusion BEFORE

La migration SQL a été appliquée avec succès, MAIS l'assignation des produits aux catégories n'a jamais été corrigée. Cela explique pourquoi le plan d'audit identifiait des problèmes.

**Actions immédiates** (dry-run):
1. Appliquer corrections SQL ci-dessus sur medusa_test
2. Valider résultats (0 erreurs)
3. Générer rapport AFTER
4. Si OK → appliquer sur production

