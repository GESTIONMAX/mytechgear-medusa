# Stratégie Récupération Images Produits Shopify

## 1. Options Réalistes

| Option | Rapidité | Effort Tech | Fiabilité | Automatisation | Dette Tech |
|--------|----------|-------------|-----------|----------------|------------|
| **Shopify .json API** | ⚡⚡⚡ 5 min | 🔧 Minimal (cURL/script) | ✅✅✅ Très haute | ✅ Oui (scriptable) | ❌ Zéro |
| **Scraping HTML** | ⚡⚡ 15-30 min | 🔧🔧 Moyen (BeautifulSoup/Puppeteer) | ⚠️ Fragile (DOM change) | ✅ Oui | ⚠️ Moyenne |
| **Extension navigateur** | ⚡ Variable | 🔧 Très faible | ⚠️⚠️ Aléatoire | ❌ Non | ⚠️ Haute (manuel) |
| **Apify/ScrapeStorm** | ⚡⚡ 10-20 min | 🔧 Faible | ✅✅ Bonne | ✅ Oui | 💰 Coût service |
| **Media Kit fournisseur** | ⚡⚡⚡ 0 min (si existe) | 🔧 Zéro | ✅✅✅ Parfaite | ❌ Non | ❌ Zéro |
| **URLs directes CDN** | ⚡⚡⚡ 2 min | 🔧 Minimal | ✅✅ Haute | ✅ Oui | ⚠️ Dépendance externe |

## 2. Analyse Détaillée

### 🏆 Option 1 : Shopify .json API (GAGNANTE)

**Principe** : Tous les sites Shopify exposent `/products.json` et `/products/{handle}.json`

**Avantages** :
- ✅ **ZERO configuration** (aucune auth nécessaire)
- ✅ **Données structurées** (JSON propre avec URLs images)
- ✅ **Toutes tailles d'images** (thumbnail, small, medium, large, original)
- ✅ **Metadata incluses** (variantes, prix, descriptions)
- ✅ **Reproductible** (endpoint stable)
- ✅ **Scriptable en 10 lignes**

**Inconvénients** :
- ⚠️ Pagination (250 produits max par page)
- ⚠️ Rate limiting (respecter 2 req/sec)

**Temps réel** : 5-10 minutes pour scripter + exécuter

**Exemple** :
```bash
# Récupérer TOUS les produits
curl https://chamelo.com/products.json

# Récupérer UN produit
curl https://chamelo.com/products/aura.json
```

**URLs images incluses** :
```json
{
  "images": [
    {
      "src": "https://cdn.shopify.com/s/files/1/0XXX/aura-black.jpg?v=123",
      "width": 2048,
      "height": 2048
    }
  ]
}
```

---

### Option 2 : URLs CDN directes (RAPIDE mais fragile)

**Principe** : Shopify CDN suit un pattern prévisible

**Pattern** :
```
https://cdn.shopify.com/s/files/1/{shop_id}/{image_id}_{size}.jpg

Sizes: _pico (16x16), _icon (32x32), _thumb (50x50),
       _small (100x100), _compact (160x160), _medium (240x240),
       _large (480x480), _grande (600x600), _original
```

**Avantages** :
- ✅ Pas de scraping
- ✅ URLs stables (cache CDN)

**Inconvénients** :
- ❌ Nécessite shop_id et image_id (obtention = scraping anyway)
- ❌ Pas de metadata (quel produit = quelle image?)

**Verdict** : Utile APRÈS avoir les IDs via .json API

---

### Option 3 : Scraping HTML (NE PAS FAIRE)

**Pourquoi éviter** :
- 🔴 Plus lent que .json API
- 🔴 Fragile (CSS/DOM change)
- 🔴 Nécessite parser (BeautifulSoup/Cheerio)
- 🔴 Rate limiting agressif

**Seul cas valide** : Si .json désactivé (rare)

---

### Option 4 : Extension Navigateur (NON RECOMMANDÉ)

**Exemples** : Download All Images, Image Downloader

**Pourquoi non** :
- 🔴 Manuel (clic page par page)
- 🔴 Non reproductible
- 🔴 Pas de mapping produit → image
- 🔴 Perte de temps

---

### Option 5 : Media Kit Fournisseur (IDÉAL si disponible)

**Principe** : Demander au fournisseur un ZIP d'assets

**Avantages** :
- ✅ Qualité maximale
- ✅ Images officielles
- ✅ Naming cohérent
- ✅ Pas de scraping

**Inconvénients** :
- ⚠️ Disponibilité incertaine
- ⚠️ Délai réponse fournisseur
- ⚠️ Souvent outdated

**Action** : Demander d'abord, sinon fallback .json API

---

## 3. Meilleure Option MAINTENANT

### 🎯 Recommandation : Shopify .json API

**Workflow 5 étapes** :

```bash
# 1. RÉCUPÉRER données produits
curl "https://chamelo.com/products.json?limit=250" > products_page1.json
curl "https://chamelo.com/products.json?limit=250&page=2" > products_page2.json

# 2. EXTRAIRE URLs images (jq ou script Python)
cat products_*.json | jq -r '.products[].images[].src' > image_urls.txt

# 3. TÉLÉCHARGER images (wget/curl)
wget -i image_urls.txt -P ./images/

# 4. RENOMMER selon SKU/handle
# (script Python/Node pour mapper handle → filename)

# 5. UPLOAD vers S3/Cloudinary
# aws s3 sync ./images/ s3://mytechgear-products/
```

**Temps total** : 15-30 minutes (script one-time)

---

## 4. Solution Long Terme

### Architecture cible

```
[Shopify .json]
    ↓ (fetch metadata + URLs)
[Script Python/Node]
    ↓ (download + rename)
[Stockage temporaire local]
    ↓ (upload)
[S3/Cloudinary CDN] ← Source unique de vérité
    ↓ (URLs finales)
[Medusa product.thumbnail/images]
```

**Principes** :
1. ✅ **Indépendance** : Images hébergées chez nous
2. ✅ **Reproductibilité** : Script = re-run à tout moment
3. ✅ **Performance** : CDN propre
4. ✅ **Contrôle** : Resize/optimize/watermark si besoin

---

## 5. Workflow Complet Recommandé

### Phase 1 : MAINTENANT (Import Initial)

```typescript
// Script: fetch-shopify-images.ts

import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'

const SHOPIFY_STORE = 'chamelo.com'
const OUTPUT_DIR = './images'

async function fetchAllProducts() {
  const products = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const url = `https://${SHOPIFY_STORE}/products.json?limit=250&page=${page}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.products.length === 0) {
      hasMore = false
    } else {
      products.push(...data.products)
      page++
      await sleep(500) // Rate limiting
    }
  }

  return products
}

async function downloadImages(products) {
  for (const product of products) {
    const handle = product.handle
    const images = product.images

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i].src
      const ext = path.extname(imageUrl.split('?')[0])
      const filename = `${handle}-${i}${ext}`

      // Download
      const res = await fetch(imageUrl)
      const buffer = await res.buffer()
      fs.writeFileSync(`${OUTPUT_DIR}/${filename}`, buffer)

      console.log(`✓ ${filename}`)
      await sleep(200)
    }
  }
}

// Run
const products = await fetchAllProducts()
await downloadImages(products)
```

**Temps** : 1h script + exécution (one-time)

---

### Phase 2 : PLUS TARD (Hébergement propre)

```bash
# 1. Créer bucket S3
aws s3 mb s3://mytechgear-products

# 2. Upload images
aws s3 sync ./images/ s3://mytechgear-products/images/ \
  --acl public-read \
  --cache-control "max-age=31536000"

# 3. Activer CloudFront (CDN)
# URL finale: https://cdn.mytechgear.com/images/aura-0.jpg

# 4. Update Medusa products
# product.thumbnail = "https://cdn.mytechgear.com/images/aura-0.jpg"
```

---

## 6. Recommandation Finale

### ✅ FAIS CECI MAINTENANT

1. **Script Shopify .json → Download local** (1h)
   - Fetch `/products.json` avec pagination
   - Parse JSON → extract image URLs
   - Download avec rate limiting
   - Naming : `{handle}-{index}.{ext}`

2. **Mapping temporaire** (15 min)
   - Créer mapping JSON : `{ "aura": ["aura-0.jpg", "aura-1.jpg"] }`
   - Utiliser handle Medusa → handle Shopify

3. **Upload Medusa admin manuel** (30 min)
   - Ou script Medusa Admin API
   - Ou stockage S3 direct si configuré

**Temps total** : 2-3 heures max

---

### 🔧 FAIS CECI PLUS TARD (si croissance)

1. **S3 + CloudFront setup** (1 jour)
   - Bucket S3 dédié
   - CloudFront CDN
   - Image optimization (resize on-the-fly)

2. **Script automatisé sync** (1/2 jour)
   - Cron job weekly : check nouveaux produits Shopify
   - Auto-download + upload S3
   - Update Medusa si nouveau

3. **Image processing pipeline** (optionnel)
   - Resize multiple formats (thumbnail, medium, large)
   - WebP conversion
   - Watermarking

---

### ❌ NE PERDS PAS TON TEMPS AVEC ÇA

- ❌ Extensions navigateur (trop manuel)
- ❌ Scraping HTML custom (trop fragile)
- ❌ Services payants (Apify, etc.) - .json API = gratuit
- ❌ Hotlinking Shopify CDN en prod (risque coupure)
- ❌ Téléchargement manuel image par image
- ❌ Sur-optimisation pré-launch (YAGNI)

---

## Scripts Prêts à l'Emploi

### Script 1 : Fetch & Download Shopify Images

Voir fichier : `src/scripts/fetch-shopify-images.ts`

### Script 2 : Upload Images vers Medusa

Voir fichier : `src/scripts/upload-product-images.ts`

### Script 3 : Mapping Automatique

Voir fichier : `src/scripts/map-shopify-to-medusa.ts`

---

## Notes Importantes

### Rate Limiting Shopify

Shopify permet généralement :
- **2 requêtes/seconde** pour endpoints publics (.json)
- **Pas d'authentification** requise
- **Pas de limite quotidienne** stricte

**Bonnes pratiques** :
```typescript
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Entre chaque requête
await sleep(500) // 500ms = 2 req/sec max
```

### Format Images Shopify

**Tailles disponibles** :
- `_pico` : 16x16px
- `_icon` : 32x32px
- `_thumb` : 50x50px
- `_small` : 100x100px
- `_compact` : 160x160px
- `_medium` : 240x240px
- `_large` : 480x480px
- `_grande` : 600x600px
- `_1024x1024` : 1024x1024px
- `_2048x2048` : 2048x2048px
- `_original` : Taille originale (peut être énorme)

**Pour MyTechGear** :
- **Thumbnail** : `_medium` (240x240) ou `_large` (480x480)
- **Galerie produit** : `_1024x1024` ou `_2048x2048`
- **Zoom** : `_original` (si < 5MB)

### Modification URL pour différentes tailles

```javascript
// URL originale
const url = "https://cdn.shopify.com/s/files/1/0XXX/product.jpg?v=123"

// Modifier la taille
function resizeShopifyImage(url, size) {
  const [base, query] = url.split('?')
  const ext = path.extname(base)
  const baseWithoutExt = base.replace(ext, '')
  return `${baseWithoutExt}_${size}${ext}?${query}`
}

// Exemples
resizeShopifyImage(url, 'large')    // 480x480
resizeShopifyImage(url, '1024x1024') // 1024x1024
```

---

## Mapping Chamelo → MyTechGear

### Handles connus

| Chamelo Handle | MyTechGear Handle | Produit |
|----------------|-------------------|---------|
| `aura` | `aura` | Aura |
| `aura-audio` | `aura-audio` | Aura Audio |
| `shield` | `shield` | Shield |
| `music-shield` | `music-shield` | Music Shield |
| `zurix` | `zurix` | Zurix |
| `veil` | `veil` | Veil |
| `dusk-classic` | `dusk-classic` | Dusk Classic |
| `infinity` | `infinity` | Infinity |
| `mr1-infinity` | `mr1-infinity` | MR1 x Infinity |
| `aroza` | `aroza` | Aroza |
| `dragon` | `dragon-chamelo` | Dragon |

**Note** : Dragon (Payload) ≠ Dragon (Chamelo)

---

## Checklist Exécution

### Phase Immédiate (Aujourd'hui)

- [ ] Créer dossier `./images/chamelo/`
- [ ] Exécuter script fetch Shopify .json
- [ ] Télécharger images (taille _1024x1024)
- [ ] Vérifier mapping handles
- [ ] Créer fichier `image-mapping.json`

### Phase Court Terme (Cette semaine)

- [ ] Upload images dans Medusa admin
- [ ] Assigner thumbnail à chaque produit
- [ ] Assigner galerie images (3-5 par produit)
- [ ] Vérifier affichage dans frontend

### Phase Moyen Terme (Ce mois)

- [ ] Setup S3 bucket
- [ ] Migration images vers S3
- [ ] Update URLs Medusa
- [ ] Setup CloudFront CDN

### Phase Long Terme (Futur)

- [ ] Script sync automatique hebdomadaire
- [ ] Image optimization pipeline
- [ ] Watermarking si nécessaire
- [ ] Analytics images (vues, clics)

---

**Dernière mise à jour** : 2026-02-01
**Auteur** : MyTechGear Backend Team
**Status** : Ready to implement
