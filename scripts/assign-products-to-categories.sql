-- ============================================================================
-- Script: Assignation automatique des produits aux catégories
-- ============================================================================
-- Problème: Après réorganisation, 0 produits assignés → Store API retourne vide
-- Solution: Assigner chaque produit à une catégorie par défaut basée sur sa collection
-- ============================================================================

BEGIN;

-- ============================================================================
-- STRATÉGIE D'ASSIGNATION
-- ============================================================================
-- Collection PRISMATIC → Catégorie: Solaire > Homme > Aviateur
-- Collection LIFESTYLE → Catégorie: Solaire > Femme > Fashion
-- Collection SPORT → Catégorie: Solaire > Sport & Performance
-- Produits sans collection → Catégorie: Solaire > Homme > Classique (défaut)

-- ============================================================================
-- Supprimer les anciennes assignations (si restantes)
-- ============================================================================
DELETE FROM product_category_product;

-- ============================================================================
-- Assigner produits PRISMATIC → Solaire > Homme > Aviateur
-- ============================================================================
INSERT INTO product_category_product (product_id, product_category_id)
SELECT
    p.id as product_id,
    'pcat_sh_aviateur' as product_category_id
FROM product p
JOIN product_collection pc ON p.collection_id = pc.id
WHERE pc.handle = 'collection-prismatic'
  AND p.deleted_at IS NULL
ON CONFLICT (product_id, product_category_id) DO NOTHING;

-- ============================================================================
-- Assigner produits LIFESTYLE → Solaire > Femme > Fashion
-- ============================================================================
INSERT INTO product_category_product (product_id, product_category_id)
SELECT
    p.id as product_id,
    'pcat_sf_fashion' as product_category_id
FROM product p
JOIN product_collection pc ON p.collection_id = pc.id
WHERE pc.handle = 'collection-lifestyle'
  AND p.deleted_at IS NULL
ON CONFLICT (product_id, product_category_id) DO NOTHING;

-- ============================================================================
-- Assigner produits SPORT → Solaire > Sport & Performance
-- ============================================================================
INSERT INTO product_category_product (product_id, product_category_id)
SELECT
    p.id as product_id,
    'pcat_solaire_sport' as product_category_id
FROM product p
JOIN product_collection pc ON p.collection_id = pc.id
WHERE pc.handle = 'collection-sport'
  AND p.deleted_at IS NULL
ON CONFLICT (product_id, product_category_id) DO NOTHING;

-- ============================================================================
-- Assigner produits SANS collection → Solaire > Homme > Classique (défaut)
-- ============================================================================
INSERT INTO product_category_product (product_id, product_category_id)
SELECT
    p.id as product_id,
    'pcat_sh_classique' as product_category_id
FROM product p
WHERE p.deleted_at IS NULL
  AND p.id NOT IN (
    SELECT DISTINCT product_id
    FROM product_category_product
  )
ON CONFLICT (product_id, product_category_id) DO NOTHING;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Voir combien de produits ont des catégories maintenant
SELECT
    COUNT(DISTINCT p.id) as products_with_categories,
    (SELECT COUNT(*) FROM product WHERE deleted_at IS NULL) as total_products
FROM product p
JOIN product_category_product pcp ON p.id = pcp.product_id
WHERE p.deleted_at IS NULL;

-- Voir la répartition par catégorie
SELECT
    pc.name as category,
    pc.handle,
    COUNT(DISTINCT pcp.product_id) as product_count
FROM product_category pc
LEFT JOIN product_category_product pcp ON pc.id = pcp.product_category_id
LEFT JOIN product p ON pcp.product_id = p.id AND p.deleted_at IS NULL
WHERE pc.deleted_at IS NULL
GROUP BY pc.id, pc.name, pc.handle
HAVING COUNT(DISTINCT pcp.product_id) > 0
ORDER BY product_count DESC;

COMMIT;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
-- Tous les 16 produits devraient maintenant être assignés à une catégorie
-- Le Store API (/store/products) devrait retourner les 16 produits
-- Les erreurs devraient disparaître
