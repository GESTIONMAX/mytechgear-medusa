# Réorganisation Collections vs Catégories - MyTechGear

## ✅ Mise à jour effectuée

Les collections et catégories ont été réorganisées selon les bonnes pratiques Medusa pour séparer clairement :
- **Collections** = Marketing (promotions, mises en avant)
- **Catégories** = Taxonomie hiérarchique (navigation permanente)

---

## 📚 Collections créées (6 total)

### Collections thématiques (renommées)
1. **Collection Prismatic** (`collection-prismatic`)
2. **Collection Lifestyle** (`collection-lifestyle`)
3. **Collection Sport & Performance** (`collection-sport`)

### Collections marketing (nouvelles)
4. **Nouveautés 2024** (`nouveautes-2024`)
5. **Best-sellers** (`best-sellers`)
6. **Soldes & Promotions** (`soldes-promotions`)

**Usage:** `/collections/nouveautes-2024`, `/collections/best-sellers`, etc.

---

## 🗂️ Catégories créées (16 total)

### Structure hiérarchique complète

```
Lunettes (lunettes)
├── Lunettes de soleil (solaire)
│   ├── Homme (solaire-homme)
│   │   ├── Classique (solaire-homme-classique)
│   │   ├── Aviateur (solaire-homme-aviateur)
│   │   └── Sport (solaire-homme-sport)
│   ├── Femme (solaire-femme)
│   │   ├── Fashion & Tendance (solaire-femme-fashion)
│   │   ├── Classique (solaire-femme-classique)
│   │   └── Sport (solaire-femme-sport)
│   ├── Enfant (solaire-enfant)
│   └── Sport & Performance (solaire-sport)
└── Lunettes de vue (vue)
    ├── Homme (vue-homme)
    ├── Femme (vue-femme)
    └── Gaming & Écrans (vue-gaming)
```

**Usage:** `/categories/solaire/homme/aviateur`, `/categories/vue/gaming`, etc.

---

## 🎯 Prochaines étapes

### 1. Assigner les produits aux catégories

Chaque produit doit être assigné à **UNE catégorie principale** :

**Via Admin Medusa natif:**
```
https://api.mytechgear.eu/app → Products → [Produit] → Categories
```

**Via Admin MyTechGear:**
```
http://localhost:3000/admin/products → [Produit] → Modifier
```

**Exemples d'assignation:**
- Ray-Ban Aviator → `solaire-homme-aviateur`
- Oakley Sport → `solaire-sport`
- Lunettes Gaming RGB → `vue-gaming`

### 2. Assigner les produits aux collections

Un produit peut être dans **PLUSIEURS collections** :

**Exemples:**
- Un nouveau produit peut être dans :
  - ✅ Collection Prismatic (thématique)
  - ✅ Nouveautés 2024 (marketing)

- Un produit populaire en promo :
  - ✅ Best-sellers
  - ✅ Soldes & Promotions

### 3. Ajouter des métadonnées

**Pour les collections (marketing):**
```json
{
  "video_url": "https://storage.googleapis.com/mytechgear-assets/videos/collection-nouveautes.mp4",
  "hero_title": "Nouveautés 2024",
  "hero_subtitle": "Découvrez nos dernières arrivées",
  "badge": "NEW",
  "badge_color": "blue"
}
```

**Pour les catégories (SEO):**
```json
{
  "seo_title": "Lunettes de Soleil Homme Aviateur | MyTechGear",
  "seo_description": "Découvrez notre collection de lunettes aviateur pour homme. Style iconique et protection UV garantie.",
  "icon": "🕶️"
}
```

---

## 📊 Vérification des données

### Voir toutes les collections
```sql
SELECT id, title, handle FROM product_collection ORDER BY created_at;
```

### Voir la hiérarchie des catégories
```sql
SELECT
    REPEAT('  ', (LENGTH(mpath) - LENGTH(REPLACE(mpath, '.', '')) - 1)) || name as hierarchy,
    handle,
    rank
FROM product_category
WHERE deleted_at IS NULL
ORDER BY mpath;
```

### Voir les produits assignés aux catégories
```sql
SELECT
    p.title as product,
    c.name as category,
    c.handle as category_handle
FROM product p
JOIN product_category_product pcp ON p.id = pcp.product_id
JOIN product_category c ON pcp.product_category_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY c.mpath, p.title;
```

### Voir les produits assignés aux collections
```sql
SELECT
    p.title as product,
    c.title as collection,
    c.handle as collection_handle
FROM product p
JOIN product_collection_product pcp ON p.id = pcp.product_id
JOIN product_collection c ON pcp.product_collection_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY c.title, p.title;
```

---

## 🔄 Rollback (en cas de besoin)

Si vous souhaitez revenir à l'ancienne structure :

```sql
BEGIN;

-- Supprimer les nouvelles catégories
DELETE FROM product_category WHERE id LIKE 'pcat_%';

-- Recréer les anciennes catégories
INSERT INTO product_category (id, name, description, handle, mpath, rank, is_active, is_internal, created_at, updated_at)
VALUES
    ('pcat_01KGBS24KFT0VW7DFZZT7R3K2Q', 'PRISMATIC', '', 'prismatic', 'pcat_01KGBS24KFT0VW7DFZZT7R3K2Q.', 0, true, false, NOW(), NOW()),
    ('pcat_01KGBS24KF2J4JKHEF7MZ2EGVN', 'LIFESTYLE', '', 'lifestyle', 'pcat_01KGBS24KF2J4JKHEF7MZ2EGVN.', 1, true, false, NOW(), NOW()),
    ('pcat_01KGBS24KG6YME924C8WKMV3X0', 'SPORT', '', 'sport', 'pcat_01KGBS24KG6YME924C8WKMV3X0.', 2, true, false, NOW(), NOW());

-- Restaurer les anciennes collections
UPDATE product_collection SET title = 'PRISMATIC', handle = 'prismatic' WHERE handle = 'collection-prismatic';
UPDATE product_collection SET title = 'LIFESTYLE', handle = 'lifestyle' WHERE handle = 'collection-lifestyle';
UPDATE product_collection SET title = 'SPORT', handle = 'sport' WHERE handle = 'collection-sport';

-- Supprimer les nouvelles collections marketing
DELETE FROM product_collection WHERE id IN ('pcol_nouveautes', 'pcol_bestsellers', 'pcol_soldes');

COMMIT;
```

---

## 📖 Documentation

Pour plus d'informations sur l'utilisation des Collections et Catégories :

📄 **Voir:** `/docs/COLLECTIONS_VS_CATEGORIES.md`

---

## ✅ Résumé

- ✅ **6 Collections** créées (3 thématiques + 3 marketing)
- ✅ **16 Catégories** créées (structure hiérarchique complète)
- ✅ Anciennes catégories dupliquées supprimées
- ✅ Collections renommées pour éviter confusion
- ✅ Structure SEO-friendly et conforme aux bonnes pratiques Medusa

**Prochaine action:** Assigner vos 16 produits aux bonnes catégories et collections via l'admin.
