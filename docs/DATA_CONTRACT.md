# Data Contract - Frontend API

**Version** : 1.0
**Dernière mise à jour** : 2026-02-01

---

## Principe Fondamental

**Le frontend est MUET. Toute logique métier vit dans le backend.**

Le frontend consomme uniquement des données pré-calculées, pré-filtrées, pré-formatées.

**Interdit côté frontend** :
- ❌ Calcul TVA
- ❌ Filtrage produits selon business rules
- ❌ Détermination "bestseller" / "new arrival"
- ❌ Calcul prix promotionnel
- ❌ Décision variante disponible ou non
- ❌ Formatage features techniques

**Autorisé côté frontend** :
- ✅ Affichage données reçues
- ✅ Tri UI (ordre alphabétique, prix croissant)
- ✅ Filtres UI (checkboxes tags)
- ✅ Navigation (routing)

---

## Convention de Nommage

### Champs
- `snake_case` (cohérence Medusa)
- Pas de camelCase
- Pas d'abréviations obscures

### Valeurs booléennes
- `true` / `false` (jamais `"true"` string)
- Pas de `1/0`

### Prix
- **Toujours en centimes** (ex: `34900` = 349.00€)
- **Toujours TTC** (TVA incluse)
- Type : `number` (integer)

### Dates
- Format ISO 8601 : `"2026-02-01T14:30:00Z"`
- Timezone UTC

### Images
- URLs absolutes complètes
- Format : `http://localhost:9000/static/private-{timestamp}-{filename}.{ext}`
- Futur : `https://cdn.mytechgear.com/images/{hash}.{ext}`

---

## DTO ProductCard (Listing)

**Usage** : Page collection, résultats recherche, homepage

**Endpoint** : `GET /store/products`

```json
{
  "id": "prod_01KGCT98RVFEZ8E61CW8SES123",
  "title": "Aura Audio",
  "subtitle": "Lunettes audio à changement de couleur instantané",
  "handle": "aura-audio",
  "thumbnail": "http://localhost:9000/static/private-1769931110724-aura-audio-energy-white-0.webp",

  "price": {
    "calculated_price": 34900,
    "currency_code": "eur"
  },

  "tags": [
    { "id": "ptag_01XXX", "value": "Bestseller" },
    { "id": "ptag_02XXX", "value": "Bluetooth" },
    { "id": "ptag_03XXX", "value": "Prismatic" },
    { "id": "ptag_04XXX", "value": "Audio" }
  ],

  "collection": {
    "id": "pcol_01XXX",
    "handle": "bestsellers",
    "title": "Bestsellers"
  },

  "metadata": {
    "brand": "Chamelo",
    "has_audio": true,
    "bestseller": true,
    "bestseller_rank": 8
  }
}
```

### Champs

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `id` | string | ✅ | ID Medusa unique |
| `title` | string | ✅ | Nom produit affiché |
| `subtitle` | string | ⚠️ | Pitch court (facultatif mais recommandé) |
| `handle` | string | ✅ | URL slug (immuable) |
| `thumbnail` | string (URL) | ✅ | Image principale 1:1 |
| `price.calculated_price` | number | ✅ | Prix TTC en centimes (variante la moins chère) |
| `price.currency_code` | string | ✅ | Toujours `"eur"` |
| `tags` | array | ✅ | Liste tags (peut être vide) |
| `tags[].value` | string | ✅ | Nom tag (ex: "Bestseller") |
| `collection` | object | ❌ | Null si pas de collection |
| `collection.handle` | string | ✅ | Slug collection |
| `metadata.brand` | string | ✅ | "Chamelo" ou "Generic" |
| `metadata.has_audio` | boolean | ✅ | Présence audio |
| `metadata.bestseller` | boolean | ✅ | Est bestseller |
| `metadata.bestseller_rank` | number | ❌ | Position bestseller (1-10) |

### Règles Métier Appliquées (Backend)

- Prix affiché = **variante la moins chère** (si plusieurs variantes)
- Tags = **auto-assignés** via metadata (pas de tags manuels)
- Thumbnail = **première image** du produit
- Produits `draft` ou `archived` = **exclus automatiquement**

---

## DTO ProductDetail (Fiche Produit)

**Usage** : Page produit détaillée

**Endpoint** : `GET /store/products/:handle`

```json
{
  "id": "prod_01KGCT98RVFEZ8E61CW8SES123",
  "title": "Aura Audio",
  "subtitle": "Lunettes audio à changement de couleur instantané",
  "handle": "aura-audio",
  "description": "Lunettes à technologie Prismatic™ permettant un changement de couleur instantané...",

  "thumbnail": "http://localhost:9000/static/private-1769931110724-aura-audio-0.webp",

  "images": [
    {
      "id": "img_01XXX",
      "url": "http://localhost:9000/static/private-1769931110724-aura-audio-0.webp",
      "metadata": {
        "alt": "Aura Audio - Image 1",
        "order": 0
      }
    },
    {
      "id": "img_02XXX",
      "url": "http://localhost:9000/static/private-1769931110724-aura-audio-1.webp",
      "metadata": {
        "alt": "Aura Audio - Image 2",
        "order": 1
      }
    }
  ],

  "variants": [
    {
      "id": "variant_01XXX",
      "title": "Aura Audio - Black, Energy",
      "sku": "AUR-AUD-BLK-ENE",
      "inventory_quantity": 10,
      "manage_inventory": true,
      "allow_backorder": false,
      "prices": [
        {
          "amount": 34900,
          "currency_code": "eur"
        }
      ],
      "options": [
        {
          "option_id": "opt_color",
          "value": "Black"
        },
        {
          "option_id": "opt_lens",
          "value": "Energy"
        }
      ]
    },
    {
      "id": "variant_02XXX",
      "title": "Aura Audio - White, Energy",
      "sku": "AUR-AUD-WHT-ENE",
      "inventory_quantity": 0,
      "manage_inventory": true,
      "allow_backorder": false,
      "prices": [
        {
          "amount": 34900,
          "currency_code": "eur"
        }
      ],
      "options": [
        {
          "option_id": "opt_color",
          "value": "White"
        },
        {
          "option_id": "opt_lens",
          "value": "Energy"
        }
      ]
    }
  ],

  "options": [
    {
      "id": "opt_color",
      "title": "Couleur",
      "values": ["Black", "White"]
    },
    {
      "id": "opt_lens",
      "title": "Verres",
      "values": ["Energy", "Calm"]
    }
  ],

  "tags": [
    { "value": "Bestseller", "metadata": { "category": "Marketing", "icon": "⭐" } },
    { "value": "Bluetooth", "metadata": { "category": "Technology", "icon": "📶" } },
    { "value": "Audio", "metadata": { "category": "Features", "icon": "🎵" } },
    { "value": "Prismatic", "metadata": { "category": "Technology", "icon": "🌈" } },
    { "value": "UV Protection", "metadata": { "category": "Specs", "icon": "🛡️" } },
    { "value": "Lightweight", "metadata": { "category": "Specs", "icon": "🪶" } }
  ],

  "collection": {
    "id": "pcol_01XXX",
    "handle": "bestsellers",
    "title": "Bestsellers"
  },

  "categories": [
    {
      "id": "pcat_01XXX",
      "handle": "prismatic",
      "name": "PRISMATIC"
    }
  ],

  "type": {
    "id": "ptyp_01XXX",
    "value": "Audio Glasses",
    "metadata": {
      "value_fr": "Lunettes Audio",
      "icon": "🎵"
    }
  },

  "metadata": {
    "brand": "Chamelo",
    "product_family": "aura",
    "has_audio": true,
    "bestseller": true,
    "bestseller_rank": 8,

    "bluetooth": true,
    "control_type": "Touch control (tap)",
    "battery_life_hours": 5,
    "charging_time_hours": 2,
    "water_resistance": "IPX-4",

    "lens_technology": "Prismatic Color-changing (instant)",
    "color_options": 6,
    "uv_protection": "100%",
    "polarization": "None",

    "frame_style": "Rimless modern",
    "frame_material": "TR90",
    "weight_grams": 36,
    "unisex": true,

    "warranty_years": 2,
    "ce_certified": true,

    "seo_keywords": "lunettes audio,bluetooth,prismatic,changement couleur,Chamelo"
  }
}
```

### Champs Supplémentaires (vs ProductCard)

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `description` | string (markdown) | ⚠️ | Description longue HTML-safe |
| `images` | array | ✅ | Galerie complète (min 1) |
| `images[].url` | string | ✅ | URL image haute résolution |
| `images[].metadata.alt` | string | ⚠️ | Texte alternatif SEO |
| `images[].metadata.order` | number | ✅ | Ordre affichage (0-indexed) |
| `variants` | array | ✅ | Liste toutes variantes (min 1) |
| `variants[].inventory_quantity` | number | ✅ | Stock disponible |
| `variants[].manage_inventory` | boolean | ✅ | Gestion stock activée |
| `variants[].allow_backorder` | boolean | ✅ | Toujours `false` |
| `variants[].prices` | array | ✅ | Prix par devise |
| `variants[].options` | array | ✅ | Combinaison options |
| `options` | array | ✅ | Options produit (Couleur, Verres) |
| `options[].values` | array | ✅ | Valeurs possibles |
| `categories` | array | ❌ | Peut être vide |
| `type` | object | ⚠️ | Type produit (null si non défini) |
| `metadata.*` | mixed | ⚠️ | Metadata techniques riches |

### Règles Variantes

**Disponibilité variante (Frontend)** :

```javascript
// Backend fournit les champs, frontend applique logique simple :
const isAvailable = (variant) => {
  if (!variant.manage_inventory) return true
  if (variant.allow_backorder) return true
  return variant.inventory_quantity > 0
}
```

**Affichage prix** :
- Si toutes variantes même prix → afficher prix unique
- Si variantes prix différents → afficher "À partir de {min_price}"

**Sélection variante par défaut** :
- Première variante disponible
- Si aucune disponible → première variante (afficher "Rupture de stock")

---

## DTO Variant (Standalone)

**Usage** : Sélection variante, ajout panier

```json
{
  "id": "variant_01XXX",
  "product_id": "prod_01XXX",
  "title": "Aura Audio - Black, Energy",
  "sku": "AUR-AUD-BLK-ENE",

  "inventory_quantity": 10,
  "manage_inventory": true,
  "allow_backorder": false,

  "prices": [
    {
      "id": "price_01XXX",
      "amount": 34900,
      "currency_code": "eur"
    }
  ],

  "options": [
    {
      "option_id": "opt_color",
      "value": "Black"
    },
    {
      "option_id": "opt_lens",
      "value": "Energy"
    }
  ]
}
```

---

## DTO Price

**Principe** : Prix toujours TTC, toujours en centimes

```json
{
  "id": "price_01XXX",
  "amount": 34900,
  "currency_code": "eur",
  "min_quantity": 1,
  "max_quantity": null
}
```

**Formatage Frontend** :
```javascript
const formatPrice = (amount, currency_code) => {
  // amount en centimes
  const euros = amount / 100
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency_code.toUpperCase()
  }).format(euros)
}

formatPrice(34900, 'eur') // "349,00 €"
```

---

## DTO Media (Image)

```json
{
  "id": "img_01XXX",
  "url": "http://localhost:9000/static/private-1769931110724-aura-audio-0.webp",
  "mime_type": "image/webp",
  "metadata": {
    "alt": "Aura Audio - Vue de face",
    "order": 0,
    "width": 1024,
    "height": 1024
  }
}
```

**Formats acceptés** : `.webp`, `.jpg`, `.png`, `.gif`

**Tailles** :
- Thumbnail : 480x480 minimum
- Gallery : 1024x1024 minimum
- Zoom : 2048x2048 (si disponible)

**Responsive Frontend** :
```html
<img
  src="{image.url}"
  alt="{image.metadata.alt || product.title}"
  loading="lazy"
  width="1024"
  height="1024"
/>
```

---

## Features Techniques (Metadata)

### Structure Metadata

Les `metadata` du produit contiennent toutes les features techniques.

**Catégories** :

| Catégorie | Champs | Type |
|-----------|--------|------|
| **Identification** | `brand`, `product_family`, `bestseller` | string, boolean |
| **Audio** | `has_audio`, `bluetooth`, `battery_life_hours` | boolean, number |
| **Verres** | `lens_technology`, `uv_protection`, `polarization` | string |
| **Design** | `frame_style`, `frame_material`, `weight_grams` | string, number |
| **Conformité** | `warranty_years`, `ce_certified` | number, boolean |

### Exemples Valeurs

#### `lens_technology`
- `"Prismatic Color-changing (instant)"`
- `"Electrochromic Tint-Adjustable"`
- `"Eclipse Instant Tint"`
- `"Standard tinted"`

#### `control_type`
- `"Touch control (tap)"`
- `"App control (Bluetooth)"`
- `"Manual slider"`
- `"Autopilot (ambient sensor)"`

#### `frame_style`
- `"Rimless modern"`
- `"Sport wrap"`
- `"Cat-eye fashion"`
- `"Wayfarer classic"`
- `"Square rectangular"`

### Affichage Frontend

**Recommandé** : Icônes + texte

```javascript
const features = [
  { icon: '🎵', label: 'Audio Bluetooth', value: metadata.has_audio },
  { icon: '🔆', label: 'Teinte ajustable', value: metadata.lens_technology },
  { icon: '🛡️', label: 'Protection UV 100%', value: metadata.uv_protection },
  { icon: '⚡', label: metadata.battery_life_hours + 'h autonomie', value: metadata.has_audio }
]
```

---

## Gestion Bestsellers

**Backend détermine** :
- `metadata.bestseller = true`
- `metadata.bestseller_rank = 1-10`
- Tag `"Bestseller"` auto-assigné

**Frontend affiche** :
- Badge "Bestseller"
- Tri par `bestseller_rank` (croissant)

**Source de vérité** : Analyse chamelo.com/collections/best-sellers + ventes internes (futur)

---

## Gestion Stock & Disponibilité

### Logique Frontend

```javascript
const getStockStatus = (variant) => {
  if (!variant.manage_inventory) {
    return { available: true, label: 'En stock' }
  }

  const qty = variant.inventory_quantity

  if (qty > 10) {
    return { available: true, label: 'En stock' }
  } else if (qty > 0) {
    return { available: true, label: `Plus que ${qty} en stock` }
  } else if (variant.allow_backorder) {
    return { available: true, label: 'Précommande' }
  } else {
    return { available: false, label: 'Rupture de stock' }
  }
}
```

**Affichage** :
- Stock > 10 → "En stock"
- Stock 1-10 → "Plus que X en stock" (urgence)
- Stock 0 + backorder → "Précommande (livraison sous X jours)"
- Stock 0 sans backorder → "Rupture de stock" (bouton désactivé)

---

## Endpoints API (Store API)

### Liste Produits

```
GET /store/products
```

**Query params** :
- `collection_id` : Filtrer par collection
- `category_id[]` : Filtrer par catégories (multi)
- `tags[]` : Filtrer par tags (multi)
- `q` : Recherche texte (titre, description)
- `limit` : Pagination (défaut 50)
- `offset` : Pagination offset

**Response** :
```json
{
  "products": [ /* ProductCard[] */ ],
  "count": 16,
  "offset": 0,
  "limit": 50
}
```

### Détail Produit

```
GET /store/products/:handle
```

**Response** : `ProductDetail`

### Variantes Produit

```
GET /store/products/:product_id/variants
```

**Response** :
```json
{
  "variants": [ /* Variant[] */ ]
}
```

---

## Filtres & Recherche

### Filtres Disponibles

**Par Tags** (facettes) :
```
GET /store/products?tags[]=Bluetooth&tags[]=Sport
```

Frontend affiche :
- Checkboxes groupées par `tag.metadata.category`
- Icône `tag.metadata.icon` (si disponible)

**Par Collection** :
```
GET /store/products?collection_id=pcol_01XXX
```

**Par Catégorie** :
```
GET /store/products?category_id[]=pcat_sport&category_id[]=pcat_lifestyle
```

**Par Prix** :
```
GET /store/products?price_min=20000&price_max=40000
```
(Prix en centimes)

### Recherche Texte

```
GET /store/products?q=audio+bluetooth
```

Recherche dans :
- `title`
- `subtitle`
- `description`
- `metadata.seo_keywords`

---

## Exemples JSON Réalistes

### ProductCard (Listing)

```json
{
  "id": "prod_01KGCT9DRV9Y8E924C8WKMV123",
  "title": "Music Shield",
  "subtitle": "Lunettes sport audio avec teinte électronique",
  "handle": "music-shield",
  "thumbnail": "http://localhost:9000/static/private-1769931110245-music-shield-fire-0.webp",
  "price": {
    "calculated_price": 39900,
    "currency_code": "eur"
  },
  "tags": [
    { "value": "Bestseller" },
    { "value": "Sport" },
    { "value": "Audio" },
    { "value": "Electrochromic" }
  ],
  "collection": {
    "handle": "bestsellers",
    "title": "Bestsellers"
  },
  "metadata": {
    "brand": "Chamelo",
    "has_audio": true,
    "bestseller": true,
    "bestseller_rank": 2
  }
}
```

### ProductDetail (Fiche Produit Complète)

```json
{
  "id": "prod_01KGCT9DRV9Y8E924C8WKMV123",
  "title": "Music Shield",
  "subtitle": "Lunettes sport audio avec teinte électronique",
  "handle": "music-shield",
  "description": "Les Music Shield combinent performance sportive et audio premium. Teinte électronique ajustable pour toutes conditions de luminosité, haut-parleurs intégrés pour musique et appels, résistance IPX-4.",

  "thumbnail": "http://localhost:9000/static/private-1769931110245-music-shield-fire-0.webp",

  "images": [
    {
      "url": "http://localhost:9000/static/private-1769931110245-music-shield-fire-0.webp",
      "metadata": { "alt": "Music Shield - Vue de face", "order": 0 }
    },
    {
      "url": "http://localhost:9000/static/private-1769931110245-music-shield-fire-1.webp",
      "metadata": { "alt": "Music Shield - Vue de profil", "order": 1 }
    }
  ],

  "variants": [
    {
      "id": "variant_fire",
      "title": "Music Shield - Fire, Black",
      "sku": "MUS-SHD-FIR-BLK",
      "inventory_quantity": 5,
      "manage_inventory": true,
      "allow_backorder": false,
      "prices": [{ "amount": 39900, "currency_code": "eur" }],
      "options": [
        { "option_id": "opt_lens", "value": "Fire" },
        { "option_id": "opt_frame", "value": "Black" }
      ]
    },
    {
      "id": "variant_smoke",
      "title": "Music Shield - Smoke, Black",
      "sku": "MUS-SHD-SMK-BLK",
      "inventory_quantity": 0,
      "manage_inventory": true,
      "allow_backorder": false,
      "prices": [{ "amount": 39900, "currency_code": "eur" }],
      "options": [
        { "option_id": "opt_lens", "value": "Smoke" },
        { "option_id": "opt_frame", "value": "Black" }
      ]
    }
  ],

  "options": [
    {
      "id": "opt_lens",
      "title": "Verres",
      "values": ["Fire", "Smoke", "White Fire"]
    },
    {
      "id": "opt_frame",
      "title": "Monture",
      "values": ["Black", "White"]
    }
  ],

  "tags": [
    { "value": "Bestseller" },
    { "value": "Sport" },
    { "value": "Audio" },
    { "value": "Bluetooth" },
    { "value": "Electrochromic" },
    { "value": "UV Protection" },
    { "value": "IPX4" }
  ],

  "type": {
    "value": "Sport Performance",
    "metadata": { "icon": "🏃" }
  },

  "metadata": {
    "brand": "Chamelo",
    "product_family": "shield",
    "has_audio": true,
    "bestseller": true,
    "bestseller_rank": 2,

    "bluetooth": true,
    "battery_life_hours": 6,
    "charging_time_hours": 1.5,
    "water_resistance": "IPX-4",
    "sweatproof": true,

    "lens_technology": "Electrochromic Tint-Adjustable",
    "tint_adjustment_speed_seconds": 0.1,
    "autopilot_mode": true,
    "ambient_light_sensor": true,
    "uv_protection": "100%",

    "frame_style": "Sport wrap",
    "frame_material": "TR90 + TPU",
    "weight_grams": 38,
    "impact_resistant": true,

    "warranty_years": 2,
    "ce_certified": true
  }
}
```

---

## Erreurs & Edge Cases

### Produit Non Trouvé

```
GET /store/products/invalid-handle
```

Response `404` :
```json
{
  "type": "not_found",
  "message": "Product not found"
}
```

### Variante Rupture Stock

Variante retournée normalement mais :
```json
{
  "inventory_quantity": 0,
  "manage_inventory": true,
  "allow_backorder": false
}
```

Frontend désactive bouton "Ajouter au panier".

### Prix Non Disponible (cas exceptionnel)

Si aucun prix défini pour région client :
```json
{
  "prices": []
}
```

Frontend affiche "Prix non disponible".

### Images Manquantes

Si produit sans images :
```json
{
  "thumbnail": null,
  "images": []
}
```

Frontend affiche placeholder image par défaut.

---

## Évolutions Prévues (Versioning)

### v1.1 (Phase 2 - S3/CDN)

**Breaking change** : URLs images

```json
{
  "thumbnail": "https://cdn.mytechgear.com/images/abc123.webp"
}
```

**Migration** : Transparent pour frontend (changement URL uniquement)

### v1.2 (Phase 2 - Promotions)

**Nouveaux champs** :

```json
{
  "price": {
    "calculated_price": 34900,
    "original_price": 39900,
    "discount_percentage": 12,
    "currency_code": "eur"
  }
}
```

### v2.0 (Phase 3 - Multi-région)

**Breaking change** : Prix multi-devises

```json
{
  "prices": [
    { "amount": 34900, "currency_code": "eur" },
    { "amount": 39900, "currency_code": "usd" }
  ]
}
```

---

**Prochaine révision** : Après Phase 2 (CDN + Promotions)
