# Workflow de Récupération et Upload des Images Produits

Ce guide décrit le processus complet pour récupérer les images depuis Shopify (chamelo.com) et les uploader dans Medusa.

## Vue d'ensemble

```
[Shopify chamelo.com]
         ↓
   1. fetch-shopify-images.ts
         ↓
   [./images/chamelo/ + mapping.json]
         ↓
   2. map-shopify-to-medusa.ts (vérification)
         ↓
   3. upload-product-images.ts
         ↓
   [Medusa Products avec images]
```

## Scripts disponibles

### 1. `fetch-shopify-images.ts` - Téléchargement depuis Shopify

**Rôle** : Récupère tous les produits et images depuis chamelo.com via l'API publique `.json`

**Ce qu'il fait** :
- Fetch `/products.json` avec pagination automatique
- Télécharge toutes les images (taille 1024x1024 par défaut)
- Sauvegarde dans `./images/chamelo/`
- Crée un mapping JSON : `./images/image-mapping.json`

**Exécution** :
```bash
node src/scripts/fetch-shopify-images.ts
```

**Durée** : 2-5 minutes (selon nombre de produits)

**Output** :
```
./images/chamelo/
├── aura-0.jpg
├── aura-1.jpg
├── aura-audio-0.jpg
├── shield-0.jpg
└── ...

./images/image-mapping.json
{
  "aura": ["aura-0.jpg", "aura-1.jpg"],
  "aura-audio": ["aura-audio-0.jpg", "aura-audio-1.jpg"],
  ...
}
```

---

### 2. `map-shopify-to-medusa.ts` - Vérification du mapping

**Rôle** : Vérifie la correspondance entre les produits Shopify et Medusa AVANT l'upload

**Ce qu'il fait** :
- Liste tous les produits Medusa
- Compare avec le mapping Shopify
- Affiche les correspondances trouvées
- Identifie les produits sans images
- Identifie les images sans produit

**Exécution** :
```bash
npx medusa exec ./src/scripts/map-shopify-to-medusa.ts
```

**Durée** : < 10 secondes

**Output exemple** :
```
✅ MATCHED PRODUCTS (will be updated)
   aura                      ═ aura                      (4 images)
   aura-audio                ═ aura-audio                (3 images)
   dragon                    → dragon-chamelo            (2 images)

⚠️  MEDUSA PRODUCTS WITHOUT IMAGES (will be skipped)
   ⏭️  prime
   ⏭️  falcon
   ⏭️  euphoria

📊 SUMMARY
   Medusa products: 16
   ✅ With images: 11
   ⏭️  Without images: 5
```

---

### 3. `upload-product-images.ts` - Upload vers Medusa

**Rôle** : Upload les images téléchargées dans Medusa et les associe aux produits

**Ce qu'il fait** :
- Lit le mapping `image-mapping.json`
- Upload chaque image via File Module
- Associe la première image comme `thumbnail`
- Associe toutes les images dans `product.images`

**Exécution** :
```bash
npx medusa exec ./src/scripts/upload-product-images.ts
```

**Durée** : 2-5 minutes (selon nombre d'images)

**Output exemple** :
```
📦 Aura (aura)
   Shopify handle: aura
   Images to upload: 4
   ✓ aura-0.jpg → http://localhost:9000/uploads/aura-0.jpg
   ✓ aura-1.jpg → http://localhost:9000/uploads/aura-1.jpg
   ✅ Product updated: thumbnail + 4 images

📊 Statistics:
   Products processed: 16
   Products updated: 11
   Products skipped: 5
   Images uploaded: 47
```

---

## Workflow complet (3 étapes)

### Étape 1 : Télécharger les images depuis Shopify

```bash
# Depuis la racine du projet
node src/scripts/fetch-shopify-images.ts
```

**Vérifications** :
- ✅ Le dossier `./images/chamelo/` contient les images
- ✅ Le fichier `./images/image-mapping.json` existe
- ✅ Les logs montrent "DOWNLOAD COMPLETED!"

---

### Étape 2 : Vérifier le mapping (optionnel mais recommandé)

```bash
npx medusa exec ./src/scripts/map-shopify-to-medusa.ts
```

**Vérifications** :
- ✅ Les produits Chamelo sont bien matchés
- ✅ Le nombre de produits "With images" correspond à vos attentes
- ⚠️ Vérifier les produits "WITHOUT IMAGES" (normal pour Payload products)

---

### Étape 3 : Uploader dans Medusa

```bash
npx medusa exec ./src/scripts/upload-product-images.ts
```

**Vérifications** :
- ✅ Les logs montrent "Product updated" pour chaque produit
- ✅ Aller dans http://localhost:9000/app/products
- ✅ Vérifier que les thumbnails s'affichent
- ✅ Cliquer sur un produit → vérifier la galerie d'images

---

## Mapping des handles

### Handles identiques (Chamelo = Medusa)

| Shopify Handle | Medusa Handle | Produit |
|----------------|---------------|---------|
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

### Handles différents

| Shopify Handle | Medusa Handle | Raison |
|----------------|---------------|--------|
| `dragon` | `dragon-chamelo` | Éviter confusion avec Dragon Payload |

### Produits Medusa sans images Shopify

Ces produits ont été importés depuis Payload CMS et n'ont pas d'équivalent Chamelo :
- `prime`
- `falcon`
- `euphoria`
- `duck-classic`
- `dragon` (Payload, différent de Dragon Chamelo)

**Solution** : Images manuelles ou recherche autre source

---

## Configuration

### Modifier la taille des images

Par défaut : `1024x1024`

```typescript
// Dans fetch-shopify-images.ts, ligne 13
const IMAGE_SIZE = '1024x1024'

// Options disponibles:
// - 'large' (480x480)
// - '1024x1024' (recommandé)
// - '2048x2048' (haute qualité, plus lourd)
// - 'original' (taille originale, peut être énorme)
```

### Modifier le dossier de sortie

```typescript
// Dans fetch-shopify-images.ts, ligne 12
const OUTPUT_DIR = './images/chamelo'

// Exemple: './public/images' si vous voulez un autre dossier
```

### Ajouter un nouveau mapping de handle

```typescript
// Dans upload-product-images.ts, ligne 22
const HANDLE_MAPPING: Record<string, string> = {
  // Ajoutez ici si un handle Shopify ≠ handle Medusa
  'shopify-handle': 'medusa-handle',
}
```

---

## Troubleshooting

### ❌ Erreur : "Mapping file not found"

**Cause** : Vous n'avez pas exécuté `fetch-shopify-images.ts`

**Solution** :
```bash
node src/scripts/fetch-shopify-images.ts
```

---

### ❌ Erreur : "HTTP 429 Too Many Requests"

**Cause** : Rate limiting Shopify (> 2 req/sec)

**Solution** : Le script a déjà un `sleep(500)` entre requêtes. Si l'erreur persiste, augmentez le délai :
```typescript
// Dans fetch-shopify-images.ts, ligne 66
await sleep(1000) // Au lieu de 500
```

---

### ⚠️ Produit non trouvé dans Medusa

**Cause** : Le handle Shopify n'existe pas dans Medusa

**Solutions** :
1. Vérifier que le produit a bien été importé dans Medusa
2. Vérifier le mapping des handles dans `HANDLE_MAPPING`
3. Importer le produit manquant si nécessaire

---

### ⚠️ Images non visibles dans l'admin

**Cause** : Problème d'upload ou de configuration File Module

**Vérifications** :
1. Vérifier les logs d'upload : "✓ filename → URL"
2. Vérifier que l'URL est accessible (copier/coller dans navigateur)
3. Vérifier la configuration du File Module dans `medusa-config.ts`

---

## Ré-exécution

### Mettre à jour les images existantes

Pour **remplacer** les images déjà uploadées :

```bash
# 1. Supprimer les anciennes images (optionnel)
rm -rf ./images/chamelo/*

# 2. Re-télécharger depuis Shopify
node src/scripts/fetch-shopify-images.ts

# 3. Re-uploader dans Medusa (écrase les anciennes)
npx medusa exec ./src/scripts/upload-product-images.ts
```

### Ajouter des images pour nouveaux produits

Si vous avez importé de nouveaux produits :

```bash
# 1. Fetch (récupère TOUS les produits, pas seulement les nouveaux)
node src/scripts/fetch-shopify-images.ts

# 2. Vérifier le mapping
npx medusa exec ./src/scripts/map-shopify-to-medusa.ts

# 3. Upload (skip les produits déjà avec images)
npx medusa exec ./src/scripts/upload-product-images.ts
```

---

## Prochaines étapes (Phase 2)

### Hébergement permanent (S3 + CloudFront)

Actuellement, les images sont stockées localement (`./uploads`).

Pour la production, configurer :

1. **S3 Bucket** pour stockage images
2. **CloudFront CDN** pour distribution rapide
3. **Script sync automatique** (hebdomadaire)

Voir : [SHOPIFY_IMAGES_STRATEGY.md](./SHOPIFY_IMAGES_STRATEGY.md) - Phase 2

---

## Résumé des commandes

```bash
# 1. Télécharger depuis Shopify
node src/scripts/fetch-shopify-images.ts

# 2. Vérifier le mapping (optionnel)
npx medusa exec ./src/scripts/map-shopify-to-medusa.ts

# 3. Uploader dans Medusa
npx medusa exec ./src/scripts/upload-product-images.ts
```

**Temps total** : 5-10 minutes
**Résultat** : 11 produits avec images (~47 images au total)

---

**Dernière mise à jour** : 2026-02-01
**Auteur** : MyTechGear Backend Team
