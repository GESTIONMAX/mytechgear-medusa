-- ============================================================================
-- Script: Réorganisation Collections vs Catégories
-- ============================================================================
-- Objectif: Séparer clairement Collections (marketing) et Categories (taxonomie)
--
-- Collections → Marketing (Nouveautés, Soldes, Best-sellers, Collections thématiques)
-- Categories → Taxonomie hiérarchique (Solaire > Homme, Femme, Sport)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTIE 1: COLLECTIONS (Marketing)
-- ============================================================================

-- Mettre à jour les collections existantes avec des noms plus marketing
UPDATE product_collection
SET
    title = 'Collection Prismatic',
    handle = 'collection-prismatic'
WHERE handle = 'prismatic';

UPDATE product_collection
SET
    title = 'Collection Lifestyle',
    handle = 'collection-lifestyle'
WHERE handle = 'lifestyle';

UPDATE product_collection
SET
    title = 'Collection Sport & Performance',
    handle = 'collection-sport'
WHERE handle = 'sport';

-- Ajouter de nouvelles collections marketing
INSERT INTO product_collection (id, title, handle, created_at, updated_at)
VALUES
    ('pcol_nouveautes', 'Nouveautés 2024', 'nouveautes-2024', NOW(), NOW()),
    ('pcol_bestsellers', 'Best-sellers', 'best-sellers', NOW(), NOW()),
    ('pcol_soldes', 'Soldes & Promotions', 'soldes-promotions', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PARTIE 2: CATÉGORIES (Taxonomie hiérarchique)
-- ============================================================================

-- Supprimer les catégories actuelles qui dupliquent les collections
DELETE FROM product_category WHERE handle IN ('prismatic', 'lifestyle', 'sport');

-- Créer la vraie structure hiérarchique pour les lunettes
-- Niveau 1: Lunettes (racine)
INSERT INTO product_category (id, name, description, handle, mpath, parent_category_id, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_lunettes', 'Lunettes', 'Toutes nos lunettes', 'lunettes', 'pcat_lunettes.', NULL, 0, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Niveau 2: Solaire et Vue
INSERT INTO product_category (id, name, description, handle, mpath, parent_category_id, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_solaire', 'Lunettes de soleil', 'Protection et style', 'solaire', 'pcat_lunettes.pcat_solaire.', 'pcat_lunettes', 0, true, false, NOW(), NOW()),
    ('pcat_vue', 'Lunettes de vue', 'Correction visuelle', 'vue', 'pcat_lunettes.pcat_vue.', 'pcat_lunettes', 1, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Niveau 3: Homme, Femme, Enfant, Sport (pour Solaire)
INSERT INTO product_category (id, name, description, handle, mpath, parent_category_id, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_solaire_homme', 'Homme', 'Solaires pour homme', 'solaire-homme', 'pcat_lunettes.pcat_solaire.pcat_solaire_homme.', 'pcat_solaire', 0, true, false, NOW(), NOW()),
    ('pcat_solaire_femme', 'Femme', 'Solaires pour femme', 'solaire-femme', 'pcat_lunettes.pcat_solaire.pcat_solaire_femme.', 'pcat_solaire', 1, true, false, NOW(), NOW()),
    ('pcat_solaire_enfant', 'Enfant', 'Solaires pour enfant', 'solaire-enfant', 'pcat_lunettes.pcat_solaire.pcat_solaire_enfant.', 'pcat_solaire', 2, true, false, NOW(), NOW()),
    ('pcat_solaire_sport', 'Sport & Performance', 'Solaires sport haute performance', 'solaire-sport', 'pcat_lunettes.pcat_solaire.pcat_solaire_sport.', 'pcat_solaire', 3, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Niveau 3: Homme, Femme, Gaming (pour Vue)
INSERT INTO product_category (id, name, description, handle, mpath, parent_category_id, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_vue_homme', 'Homme', 'Vue pour homme', 'vue-homme', 'pcat_lunettes.pcat_vue.pcat_vue_homme.', 'pcat_vue', 0, true, false, NOW(), NOW()),
    ('pcat_vue_femme', 'Femme', 'Vue pour femme', 'vue-femme', 'pcat_lunettes.pcat_vue.pcat_vue_femme.', 'pcat_vue', 1, true, false, NOW(), NOW()),
    ('pcat_vue_gaming', 'Gaming & Écrans', 'Protection écrans', 'vue-gaming', 'pcat_lunettes.pcat_vue.pcat_vue_gaming.', 'pcat_vue', 2, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Niveau 4: Styles pour Solaire Homme
INSERT INTO product_category (id, name, description, handle, mpath, parent_category_id, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_sh_classique', 'Classique', 'Style intemporel', 'solaire-homme-classique', 'pcat_lunettes.pcat_solaire.pcat_solaire_homme.pcat_sh_classique.', 'pcat_solaire_homme', 0, true, false, NOW(), NOW()),
    ('pcat_sh_aviateur', 'Aviateur', 'Style aviateur', 'solaire-homme-aviateur', 'pcat_lunettes.pcat_solaire.pcat_solaire_homme.pcat_sh_aviateur.', 'pcat_solaire_homme', 1, true, false, NOW(), NOW()),
    ('pcat_sh_sport', 'Sport', 'Solaires sport homme', 'solaire-homme-sport', 'pcat_lunettes.pcat_solaire.pcat_solaire_homme.pcat_sh_sport.', 'pcat_solaire_homme', 2, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Niveau 4: Styles pour Solaire Femme
INSERT INTO product_category (id, name, description, handle, mpath, parent_category_id, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_sf_fashion', 'Fashion & Tendance', 'Solaires tendance', 'solaire-femme-fashion', 'pcat_lunettes.pcat_solaire.pcat_solaire_femme.pcat_sf_fashion.', 'pcat_solaire_femme', 0, true, false, NOW(), NOW()),
    ('pcat_sf_classique', 'Classique', 'Style classique', 'solaire-femme-classique', 'pcat_lunettes.pcat_solaire.pcat_solaire_femme.pcat_sf_classique.', 'pcat_solaire_femme', 1, true, false, NOW(), NOW()),
    ('pcat_sf_sport', 'Sport', 'Solaires sport femme', 'solaire-femme-sport', 'pcat_lunettes.pcat_solaire.pcat_solaire_femme.pcat_sf_sport.', 'pcat_solaire_femme', 2, true, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RÉSUMÉ DE LA STRUCTURE CRÉÉE
-- ============================================================================

-- COLLECTIONS (Marketing):
-- ✓ Collection Prismatic
-- ✓ Collection Lifestyle
-- ✓ Collection Sport & Performance
-- ✓ Nouveautés 2024
-- ✓ Best-sellers
-- ✓ Soldes & Promotions

-- CATEGORIES (Taxonomie):
-- Lunettes
-- ├── Solaire
-- │   ├── Homme
-- │   │   ├── Classique
-- │   │   ├── Aviateur
-- │   │   └── Sport
-- │   ├── Femme
-- │   │   ├── Fashion & Tendance
-- │   │   ├── Classique
-- │   │   └── Sport
-- │   ├── Enfant
-- │   └── Sport & Performance
-- └── Vue
--     ├── Homme
--     ├── Femme
--     └── Gaming & Écrans

COMMIT;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Voir les collections
SELECT id, title, handle FROM product_collection ORDER BY created_at;

-- Voir la hiérarchie des catégories
SELECT
    c.name,
    c.handle,
    COALESCE(p.name, 'ROOT') as parent_name,
    c.rank
FROM product_category c
LEFT JOIN product_category p ON c.parent_category_id = p.id
ORDER BY
    COALESCE(p.rank, -1),
    c.rank;
