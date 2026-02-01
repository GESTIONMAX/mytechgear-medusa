# Import Pipeline - Catalogue Produits

**Version** : 1.0
**Dernière mise à jour** : 2026-02-01

---

## Vue d'Ensemble

```
[Shopify chamelo.com]
         ↓
   .json Public API
         ↓
[1. Fetch Products & Images]
         ↓
   ./images/chamelo/
   image-mapping.json
         ↓
[2. Upload Images → Medusa]
         ↓
   File Module (local)
         ↓
[3. Create/Update Products]
         ↓
   Medusa DB (PostgreSQL)
         ↓
[4. Enrich Metadata]
         ↓
[5. Auto-Assign Tags]
         ↓
   [PRODUIT PRÊT]
```

**Durée totale** : 10-15 minutes (workflow complet)

**Idempotence** : Tous les scripts peuvent être re-run sans duplication

---

## Source Fournisseur

### Chamelo (Shopify)

**URL** : https://chamelo.com
**Type** : Store Shopify (API publique)

**Produits** :
- Smart glasses electrochromic
- Smart glasses prismatic
- Audio glasses
- Sport performance glasses

**Catalogue** : ~69 produits Shopify (variantes incluses)

**Produits importés** : 11 produits MyTechGear
- Aura, Aura Audio
- Shield, Music Shield
- Zurix, Veil, Dusk Classic
- Infinity, MR1 x Infinity
- Aroza, Dragon Chamelo

### Payload CMS (secondaire)

**Source** : Export JSON manuel
**Produits** : 5 produits génériques
- Prime, Falcon, Euphoria, Duck Classic, Dragon (Payload)

**Note** : Import one-time, pas de refresh automatique

---

## Méthode d'Extraction

### Shopify .json API

**Endpoint** : `https://chamelo.com/products.json`

**Avantages** :
- ✅ Public (pas d'auth)
- ✅ JSON structuré
- ✅ Toutes images incluses
- ✅ Metadata produit
- ✅ Rate limiting raisonnable (2 req/sec)

**Pagination** :
```
?limit=250&page=1
?limit=250&page=2
...
```

**Rate Limiting** : 500ms entre requêtes (2 req/sec max)

**Exemple Response** :
```json
{
  "products": [
    {
      "id": 123456789,
      "title": "Aura - Black | Energy",
      "handle": "aura-energy-black-gold-instant-color-changing-glasses",
      "images": [
        {
          "src": "https://cdn.shopify.com/s/files/1/0XXX/aura-0.jpg",
          "width": 2048,
          "height": 2048
        }
      ],
      "variants": [
        {
          "id": 987654321,
          "title": "Default",
          "price": "349.00",
          "sku": "AUR-BLK-ENE"
        }
      ]
    }
  ]
}
```

---

## Mapping Fournisseur → Catalogue Interne

### Handles Shopify → Handles Medusa

**Problème** : Handles Shopify très longs et spécifiques aux variantes

**Exemples** :
- Shopify : `music-shield-fire-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-audio-sunglasses`
- Medusa : `music-shield`

**Solution** : Mapping manuel défini dans `upload-product-images.ts`

```typescript
const HANDLE_MAPPING = {
  // AURA (Prismatic)
  'aura-energy-black-gold-instant-color-changing-glasses': 'aura',
  'aura-energy-white-silver-instant-color-changing-glasses': 'aura',
  'aura-calm-black-gold-instant-color-changing-sunglasses': 'aura',
  'aura-calm-white-silver-instant-color-changing-sunglasses': 'aura',

  // MUSIC SHIELD (Sport + Audio)
  'music-shield-fire-lenses-sports-smart-glasses-...': 'music-shield',
  'music-shield-smoke-lenses-sports-smart-glasses-...': 'music-shield',

  // ... (voir fichier complet)
}
```

**Règle** :
- 1 produit Medusa = N handles Shopify (variantes)
- Images de toutes variantes Shopify → même produit Medusa

### Prix Fournisseur → Prix MyTechGear

**Conversion** :
```typescript
const USD_TO_EUR = 0.92
const MARGIN_MULTIPLIER = 1.15

const convertPrice = (usdPrice: number): number => {
  return Math.round(usdPrice * USD_TO_EUR * MARGIN_MULTIPLIER * 100)
}

// Exemple :
convertPrice(349) // 349 USD → 36954 centimes = 369.54€
```

**Règles** :
- Chamelo affiche USD
- MyTechGear vend EUR
- Marge 15% appliquée
- Prix arrondis au centime

### SKU Fournisseur → SKU Interne

**Format Chamelo** : Libre, non standardisé

**Format MyTechGear** : `{PRODUCT}-{VARIANT}-{OPTION}`

**Exemples** :
- `AUR-BLK-ENE` (Aura, Black, Energy)
- `MUS-SHD-FIR-BLK` (Music Shield, Fire, Black)
- `DRG-SMK-GBGD` (Dragon, Smoke, Glossy Black/Gold)

**Génération** : Manuelle lors création produit (pas d'import auto SKU)

---

## Règles de Normalisation

### Noms Produits

**Source Shopify** : Descriptifs longs

**Transformation MyTechGear** :
- Titre court (1-3 mots)
- Subtitle explicatif
- Description détaillée markdown

**Exemples** :

| Shopify | MyTechGear Title | Subtitle |
|---------|------------------|----------|
| "Aura - Black \| Energy - Instant Color Changing..." | `Aura` | "Lunettes à changement de couleur instantané" |
| "Music Shield Fire Lenses Sports Smart Glasses..." | `Music Shield` | "Lunettes sport audio avec teinte électronique" |

### Handles

**Règle** : Handle court, unique, URL-safe, immuable

**Format** : `{product-name}[-variant]`

**Exemples** :
- `aura`, `aura-audio`
- `shield`, `music-shield`
- `dragon-chamelo` (pour éviter confusion avec `dragon` Payload)

**Validation** :
```typescript
const isValidHandle = (handle: string): boolean => {
  return /^[a-z0-9-]+$/.test(handle) && handle.length >= 3
}
```

### SKUs

**Format** : `{PREFIX}-{VARIANT}-{OPTION}`

**Préfixes** :
- `AUR` : Aura
- `MUS-SHD` : Music Shield
- `SHD` : Shield
- `ZUR` : Zurix
- `INF` : Infinity
- `DRG` : Dragon Chamelo
- `ARZ` : Aroza

**Règles** :
- Unique global
- Alphanumeric + tirets uniquement
- Max 20 caractères

### Metadata

**Champs obligatoires** :
```typescript
{
  brand: string,              // "Chamelo" ou "Generic"
  product_family: string,     // "aura", "shield", "classic"
  has_audio: boolean,         // Présence audio
  uv_protection: string,      // "100%", "UV400"
  lens_technology: string,    // Description techno verres
  frame_style: string,        // Style monture
  warranty_years: number,     // Garantie (1 ou 2)
}
```

**Champs optionnels** (si applicable) :
```typescript
{
  bluetooth: boolean,
  battery_life_hours: number,
  water_resistance: string,   // "IPX-4"
  weight_grams: number,
  bestseller: boolean,
  bestseller_rank: number,
}
```

---

## Récupération Images

### Pipeline Images

```
[Shopify CDN]
      ↓
fetch-shopify-images.js
      ↓
./images/chamelo/*.webp
      ↓
image-mapping.json
      ↓
upload-product-images.ts
      ↓
Medusa File Module
      ↓
http://localhost:9000/static/private-*.webp
```

### Script 1 : Fetch Shopify Images

**Fichier** : `src/scripts/fetch-shopify-images.js`

**Fonction** :
1. Fetch `/products.json` avec pagination
2. Extraire URLs images
3. Modifier taille (→ `_1024x1024`)
4. Download local `./images/chamelo/`
5. Créer mapping JSON

**Exécution** :
```bash
node src/scripts/fetch-shopify-images.js
```

**Output** :
- `./images/chamelo/*.webp` (401 images)
- `./images/image-mapping.json`

**Durée** : 3-5 minutes

**Idempotence** : Re-run écrase fichiers existants

### Script 2 : Upload Images Medusa

**Fichier** : `src/scripts/upload-product-images.ts`

**Fonction** :
1. Lire `image-mapping.json`
2. Mapper handles Shopify → Medusa
3. Upload via File Module
4. Associer à `product.images`
5. Définir `product.thumbnail`

**Exécution** :
```bash
npx medusa exec ./src/scripts/upload-product-images.ts
```

**Output** :
- 244 images uploadées
- 13 produits mis à jour

**Durée** : 2-3 minutes

**Idempotence** : Re-run ne duplique pas (écrase images existantes)

### Mapping Images

**Fichier** : `./images/image-mapping.json`

**Structure** :
```json
{
  "aura-energy-black-gold-instant-color-changing-glasses": [
    "aura-energy-black-gold-instant-color-changing-glasses-0.webp",
    "aura-energy-black-gold-instant-color-changing-glasses-1.webp"
  ],
  "aura-energy-white-silver-instant-color-changing-glasses": [
    "aura-energy-white-silver-instant-color-changing-glasses-0.webp"
  ]
}
```

**Usage** : Associer images Shopify → produits Medusa

---

## Stockage Images

### Phase 1 (Actuel) : Local

**Répertoire** : `./uploads/` (généré par Medusa File Module)

**Format URLs** :
```
http://localhost:9000/static/private-{timestamp}-{filename}.{ext}
```

**Limites** :
- Pas de CDN
- Bande passante serveur
- Pas de redimensionnement à la volée

### Phase 2 (Prévu) : S3 + CloudFront

**Architecture cible** :
```
[Upload Medusa]
      ↓
   AWS S3 Bucket
   s3://mytechgear-products/
      ↓
   CloudFront CDN
      ↓
https://cdn.mytechgear.com/images/{hash}.webp
```

**Avantages** :
- CDN global
- Resize on-the-fly (ex: Cloudinary, Imgix)
- Compression automatique
- Cache agressif

**Migration** : Transparent pour backend (changer File Module provider)

---

## Scripts Utilisés

### 1. fetch-shopify-images.js

**Localisation** : `src/scripts/fetch-shopify-images.js`

**Rôle** : Download images depuis Shopify

**Inputs** :
- Store : `chamelo.com`
- Size : `1024x1024`

**Outputs** :
- `./images/chamelo/*.webp`
- `./images/image-mapping.json`

**Commande** :
```bash
node src/scripts/fetch-shopify-images.js
```

**Re-run** : Oui (écrase fichiers)

---

### 2. upload-product-images.ts

**Localisation** : `src/scripts/upload-product-images.ts`

**Rôle** : Upload images vers Medusa + association produits

**Inputs** :
- `./images/chamelo/*.webp`
- `./images/image-mapping.json`

**Outputs** :
- Images uploadées dans Medusa File Module
- Produits mis à jour (thumbnail + images)

**Commande** :
```bash
npx medusa exec ./src/scripts/upload-product-images.ts
```

**Re-run** : Oui (écrase images existantes)

---

### 3. map-shopify-to-medusa.ts

**Localisation** : `src/scripts/map-shopify-to-medusa.ts`

**Rôle** : Vérification mapping AVANT upload

**Inputs** :
- `./images/image-mapping.json`
- Produits Medusa existants

**Outputs** :
- Rapport console :
  - Produits matchés
  - Produits sans images
  - Images orphelines

**Commande** :
```bash
npx medusa exec ./src/scripts/map-shopify-to-medusa.ts
```

**Re-run** : Oui (lecture seule, pas de modification)

---

### 4. import-chamelo-bestsellers-missing.ts

**Localisation** : `src/scripts/import-chamelo-bestsellers-missing.ts`

**Rôle** : Import produits bestsellers manquants

**Produits** :
- Aroza (goggles)
- Dragon Chamelo (premium metal)

**Commande** :
```bash
npx medusa exec ./src/scripts/import-chamelo-bestsellers-missing.ts
```

**Re-run** : Non (crée produits, pas idempotent)

---

### 5. enrich-payload-products-metadata.ts

**Localisation** : `src/scripts/enrich-payload-products-metadata.ts`

**Rôle** : Enrichir metadata produits Payload

**Produits** :
- Prime, Falcon, Euphoria, Duck Classic, Dragon (Payload)

**Metadata ajoutées** :
- `brand`, `product_family`, `has_audio`
- `uv_protection`, `lens_technology`
- `frame_style`, `warranty_years`

**Commande** :
```bash
npx medusa exec ./src/scripts/enrich-payload-products-metadata.ts
```

**Re-run** : Oui (merge metadata, pas d'écrasement)

---

### 6. assign-product-tags.ts

**Localisation** : `src/scripts/assign-product-tags.ts`

**Rôle** : Auto-assignation tags via analyse metadata

**Logique** :
- Lit `product.metadata`
- Applique règles tagging
- Assigne tags pertinents (37 tags disponibles)

**Exemples règles** :
```typescript
if (metadata.has_audio === true) {
  tagsToAssign.push("Audio", "Bluetooth")
}

if (metadata.lens_technology?.includes("Prismatic")) {
  tagsToAssign.push("Prismatic", "Color Changing")
}

if (BESTSELLERS.includes(product.handle)) {
  tagsToAssign.push("Bestseller")
}
```

**Commande** :
```bash
npx medusa exec ./src/scripts/assign-product-tags.ts
```

**Re-run** : Oui (écrase tags existants, idempotent)

---

## Workflow Complet (Nouvel Import)

### Étape 1 : Télécharger Images Shopify

```bash
cd /path/to/mytechgear-medusa
node src/scripts/fetch-shopify-images.js
```

**Vérifications** :
- ✅ Dossier `./images/chamelo/` contient ~400 images
- ✅ Fichier `./images/image-mapping.json` créé
- ✅ Logs : "DOWNLOAD COMPLETED!"

---

### Étape 2 : Vérifier Mapping (optionnel)

```bash
npx medusa exec ./src/scripts/map-shopify-to-medusa.ts
```

**Analyser output** :
- Produits matchés (devrait être ~11)
- Produits sans images (Payload products)
- Images orphelines (produits Shopify non importés)

---

### Étape 3 : Upload Images Medusa

```bash
npx medusa exec ./src/scripts/upload-product-images.ts
```

**Vérifications** :
- ✅ Logs : "Products updated: 13"
- ✅ Logs : "Images uploaded: 244"
- ✅ Admin Medusa : produits ont thumbnails

---

### Étape 4 : Enrichir Metadata (si Payload)

```bash
npx medusa exec ./src/scripts/enrich-payload-products-metadata.ts
```

**Vérifications** :
- ✅ Logs : "Products updated: 5"
- ✅ Admin Medusa : produits Payload ont metadata complètes

---

### Étape 5 : Auto-Assigner Tags

```bash
npx medusa exec ./src/scripts/assign-product-tags.ts
```

**Vérifications** :
- ✅ Logs : "Products updated: 16"
- ✅ Logs : "Total tags assigned: 161"
- ✅ Admin Medusa : produits ont tags pertinents

---

### Étape 6 : Vérification Manuelle Admin

**URL** : http://localhost:9000/app/products

**Checklist** :
- ✅ Tous produits ont thumbnail
- ✅ Galerie images (3-38 par produit)
- ✅ Tags assignés (moyenne 10 par produit)
- ✅ Prix corrects (TTC EUR)
- ✅ Variantes définies
- ✅ Metadata techniques présentes

---

## Idempotence

### Scripts Idempotents (Re-run Safe)

✅ **fetch-shopify-images.js**
- Écrase fichiers existants
- Pas de duplication

✅ **upload-product-images.ts**
- Écrase images existantes
- Update `product.images` (pas append)

✅ **enrich-payload-products-metadata.ts**
- Merge metadata (pas écrasement)
- Champs existants conservés

✅ **assign-product-tags.ts**
- Remplace tags existants
- Déterministe (même input = même output)

### Scripts NON Idempotents

❌ **import-chamelo-bestsellers-missing.ts**
- Crée nouveaux produits
- Re-run = erreur "handle déjà existant"
- Usage : one-time uniquement

---

## Cas d'Usage

### Nouveau Produit Fournisseur

**Scénario** : Chamelo lance "Nova" (nouveau produit)

**Workflow** :
1. Vérifier présence dans `chamelo.com/products.json`
2. Run `fetch-shopify-images.js` (refresh images)
3. Créer produit manuellement dans Medusa admin :
   - Handle : `nova`
   - Titre, subtitle, description
   - Prix, variantes, options
   - Metadata techniques
4. Run `upload-product-images.ts` (associer images)
5. Run `assign-product-tags.ts` (auto-tagging)
6. Publier produit

**Durée** : 20-30 minutes (avec création manuelle)

---

### Mise à Jour Images Existantes

**Scénario** : Chamelo change photos "Aura"

**Workflow** :
1. Run `fetch-shopify-images.js` (re-download toutes images)
2. Run `upload-product-images.ts` (écrase images existantes)
3. Vérifier dans admin

**Durée** : 5-10 minutes

---

### Refresh Complet Catalogue

**Scénario** : Re-sync total après plusieurs mois

**Workflow** :
1. `fetch-shopify-images.js` (refresh images)
2. `upload-product-images.ts` (update images)
3. `enrich-payload-products-metadata.ts` (si nouvelles metadata)
4. `assign-product-tags.ts` (re-tag complet)

**Durée** : 10-15 minutes

---

### Ajout Metadata Technique

**Scénario** : Ajouter champ `ce_certified` à tous produits

**Workflow** :
1. Modifier script `enrich-payload-products-metadata.ts`
2. Ajouter champ dans metadata enrichments :
   ```typescript
   {
     ...existingMetadata,
     ce_certified: true
   }
   ```
3. Run script
4. Run `assign-product-tags.ts` (si nouveau tag basé sur `ce_certified`)

**Durée** : 5 minutes

---

## Points de Vigilance

### ⚠️ Handle Conflicts

**Problème** : Handle Shopify différent de handle Medusa

**Solution** : Vérifier mapping dans `upload-product-images.ts`

**Exemple** :
```typescript
// Shopify: "dragon-metal-sunglasses-electronic-tint..."
// Medusa: "dragon-chamelo"
const HANDLE_MAPPING = {
  'dragon-metal-sunglasses-electronic-tint...': 'dragon-chamelo'
}
```

---

### ⚠️ Images Manquantes

**Problème** : Produit Medusa sans équivalent Shopify

**Symptôme** : Logs "No images in mapping"

**Solution** :
- Upload images manuellement via admin
- OU désactiver produit si obsolète

**Produits concernés** : Payload imports (Prime, Falcon, etc.)

---

### ⚠️ Prix Fournisseur Changés

**Problème** : Chamelo change prix USD

**Impact** : Désynchronisation prix MyTechGear

**Solution** :
- Mettre à jour manuellement dans admin
- OU modifier `convertPrice()` si changement global

**Pas de sync auto prix** (volontaire, pour contrôle pricing)

---

### ⚠️ Rate Limiting Shopify

**Symptôme** : HTTP 429 "Too Many Requests"

**Solution** :
- Script a déjà `sleep(500)` entre requêtes
- Augmenter délai si nécessaire :
  ```javascript
  await sleep(1000) // Au lieu de 500
  ```

---

### ⚠️ Métadata Incomplètes

**Symptôme** : Tags non assignés correctement

**Diagnostic** :
1. Vérifier `product.metadata` dans admin
2. Comparer avec règles dans `assign-product-tags.ts`

**Solution** :
- Enrichir metadata (script ou manuel)
- Re-run `assign-product-tags.ts`

---

## Automatique vs Manuel

### Automatique

✅ **Fetch images Shopify**
- Script : `fetch-shopify-images.js`
- Décision : Aucune

✅ **Upload images Medusa**
- Script : `upload-product-images.ts`
- Décision : Aucune

✅ **Enrichissement metadata Payload**
- Script : `enrich-payload-products-metadata.ts`
- Décision : Aucune

✅ **Auto-tagging**
- Script : `assign-product-tags.ts`
- Décision : Aucune

### Manuel (Intervention Admin)

⚠️ **Création produit**
- Admin Medusa
- Décision : Handle, titre, prix, variantes

⚠️ **Ajustement prix**
- Admin Medusa
- Décision : Stratégie pricing

⚠️ **Modification description**
- Admin Medusa
- Décision : Contenu marketing

⚠️ **Gestion stock**
- Admin Medusa
- Décision : Quantités disponibles

⚠️ **Publication produit**
- Admin Medusa
- Décision : Timing mise en ligne

---

## Diagramme Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                   SHOPIFY CHAMELO.COM                   │
│                 (Source Fournisseur)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ .json Public API
                     ▼
        ┌────────────────────────────┐
        │ fetch-shopify-images.js    │
        │ • Pagination automatique   │
        │ • Download images 1024x1024│
        │ • Rate limiting 500ms      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Local Filesystem         │
        │ • ./images/chamelo/*.webp  │
        │ • image-mapping.json       │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ map-shopify-to-medusa.ts   │
        │ (Vérification mapping)     │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │ upload-product-images.ts   │
        │ • Upload File Module       │
        │ • Associate products       │
        │ • Set thumbnails           │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │    Medusa File Module      │
        │ http://localhost:9000/     │
        │   static/private-*.webp    │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  enrich-metadata.ts        │
        │ (Si Payload products)      │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  assign-product-tags.ts    │
        │ • Analyse metadata         │
        │ • Auto-assign 37 tags      │
        │ • Bestseller marking       │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │    PRODUIT PRÊT            │
        │ • Images ✓                 │
        │ • Metadata ✓               │
        │ • Tags ✓                   │
        │ • Published                │
        └────────────────────────────┘
```

---

## Documentation Scripts

**Stratégie complète** : [SHOPIFY_IMAGES_STRATEGY.md](./SHOPIFY_IMAGES_STRATEGY.md)

**Workflow détaillé** : [IMAGES_WORKFLOW.md](./IMAGES_WORKFLOW.md)

---

**Prochaine révision** : Après Phase 2 (S3/CDN + API sync fournisseur)
