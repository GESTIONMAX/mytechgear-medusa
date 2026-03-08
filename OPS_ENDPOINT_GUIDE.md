# OPS Endpoint - Guide Complet

## 📋 Vue d'ensemble

**Endpoints créés** :
- ✅ `GET /` - API Home (JSON, public)
- ✅ `POST /ops/catalog/metadata` - Update metadata (privé, OPS_KEY)

**Architecture** :
```
Frontend Next.js → lit product.metadata (fallback si vide)
         ↓
   Medusa API (read)
         ↑
OPS Script → écrit metadata via /ops/catalog/metadata
```

---

## 🔐 Sécurité

### 1. Configuration Environnement

**Fichier** : `backend/.env`

```bash
# OPS Endpoints Security
OPS_ENDPOINTS_ENABLED=true                    # false en prod publique
OPS_SECRET_KEY=votre-cle-secrete-tres-longue-min-32-chars

# Recommandation: générer avec:
# openssl rand -hex 32
```

**⚠️ IMPORTANT** :
- ✅ `OPS_SECRET_KEY` doit faire **minimum 32 caractères**
- ✅ Ne JAMAIS committer la clé dans Git
- ✅ Désactiver en prod publique (`OPS_ENDPOINTS_ENABLED=false`)
- ✅ Limiter par IP si possible (firewall/reverse proxy)

### 2. Générer une Clé Sécurisée

```bash
# Option 1: OpenSSL
openssl rand -hex 32
# Output: a1b2c3d4e5f6...

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Copier le résultat dans OPS_SECRET_KEY
```

### 3. Protection Supplémentaire (Optionnel)

**Limiteur de débit** (rate limiting) :

```typescript
// backend/src/api/ops/catalog/metadata/route.ts
import rateLimit from "express-rate-limit"

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: "Too many requests from this IP",
})

router.use("/ops/*", limiter)
```

**Allowlist IP** (si accès restreint) :

```typescript
const ALLOWED_IPS = process.env.OPS_ALLOWED_IPS?.split(",") || []

function checkIP(req: MedusaRequest, res: MedusaResponse, next: () => void) {
  const clientIP = req.ip
  if (ALLOWED_IPS.length > 0 && !ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: "IP not allowed" })
  }
  next()
}
```

---

## 🚀 Usage

### 1. Mettre à Jour Metadata Music Shield

**Endpoint** : `POST /ops/catalog/metadata`

**Headers** :
```
Content-Type: application/json
X-OPS-KEY: votre-cle-secrete-tres-longue-min-32-chars
```

**Body** :
```json
{
  "productId": "prod_01KGBSKFM71QR13VMQ89FT2TK9",
  "merge": true,
  "metadata": {
    "features": [
      {
        "key": "audio_bluetooth",
        "title": "Audio Bluetooth Intégré",
        "description": "Son cristallin sans fil",
        "icon": "music",
        "priority": 10,
        "enabled": true
      },
      {
        "key": "lenses_eclipse",
        "title": "Verres Eclipse™ Ajustables",
        "description": "Teinte réglable en temps réel",
        "icon": "sun",
        "priority": 20,
        "enabled": true
      },
      {
        "key": "waterproof_ipx7",
        "title": "Étanche IPX7",
        "description": "Résistant à l'eau et à la transpiration",
        "icon": "droplets",
        "priority": 30,
        "enabled": true
      },
      {
        "key": "battery_8h",
        "title": "8h d'Autonomie",
        "description": "Batterie longue durée",
        "icon": "battery",
        "priority": 40,
        "enabled": true
      }
    ],
    "rating": {
      "value": 4.9,
      "count": 134,
      "isMock": true
    },
    "badges": ["Livraison gratuite", "Garantie 2 ans"]
  }
}
```

**Paramètres** :
- `productId` (string, required) - ID Medusa du produit
- `metadata` (object, required) - Metadata à ajouter/modifier
- `merge` (boolean, optional, default: true) - Fusionner avec metadata existante ou remplacer

**Réponse Success** :
```json
{
  "success": true,
  "product": {
    "id": "prod_01KGBSKFM71QR13VMQ89FT2TK9",
    "title": "Music Shield",
    "handle": "music-shield",
    "metadata": {
      "features": [...],
      "rating": {...},
      "badges": [...]
    }
  },
  "message": "Metadata updated successfully"
}
```

**Réponse Error** :
```json
{
  "error": "Unauthorized",
  "message": "Invalid X-OPS-KEY header"
}
```

### 2. Exemples avec cURL

**Music Shield - Features complètes** :
```bash
curl -X POST https://api.mytechgear.eu/ops/catalog/metadata \
  -H "Content-Type: application/json" \
  -H "X-OPS-KEY: votre-cle-secrete-tres-longue-min-32-chars" \
  -d '{
    "productId": "prod_01KGBSKFM71QR13VMQ89FT2TK9",
    "merge": true,
    "metadata": {
      "features": [
        {
          "key": "audio_bluetooth",
          "title": "Audio Bluetooth Intégré",
          "description": "Son cristallin sans fil",
          "icon": "music",
          "priority": 10,
          "enabled": true
        },
        {
          "key": "lenses_eclipse",
          "title": "Verres Eclipse™ Ajustables",
          "description": "Teinte réglable en temps réel",
          "icon": "sun",
          "priority": 20,
          "enabled": true
        },
        {
          "key": "waterproof_ipx7",
          "title": "Étanche IPX7",
          "description": "Résistant à l eau et à la transpiration",
          "icon": "droplets",
          "priority": 30,
          "enabled": true
        },
        {
          "key": "battery_8h",
          "title": "8h d Autonomie",
          "description": "Batterie longue durée",
          "icon": "battery",
          "priority": 40,
          "enabled": true
        }
      ],
      "rating": {
        "value": 4.9,
        "count": 134,
        "isMock": true
      },
      "badges": ["Livraison gratuite"]
    }
  }'
```

**Ajouter une feature (merge)** :
```bash
curl -X POST https://api.mytechgear.eu/ops/catalog/metadata \
  -H "Content-Type: application/json" \
  -H "X-OPS-KEY: votre-cle-secrete" \
  -d '{
    "productId": "prod_01XXXXX",
    "merge": true,
    "metadata": {
      "seo_description": "Lunettes connectées avec audio Bluetooth intégré"
    }
  }'
```

**Remplacer toutes les metadata (pas de merge)** :
```bash
curl -X POST https://api.mytechgear.eu/ops/catalog/metadata \
  -H "Content-Type: application/json" \
  -H "X-OPS-KEY: votre-cle-secrete" \
  -d '{
    "productId": "prod_01XXXXX",
    "merge": false,
    "metadata": {
      "features": [...]
    }
  }'
```

### 3. Exemples avec Scripts Node.js

**Script de seed** : `backend/scripts/seed-music-shield-metadata.ts`

```typescript
import fetch from "node-fetch"

const OPS_KEY = process.env.OPS_SECRET_KEY
const API_URL = "https://api.mytechgear.eu"

async function seedMusicShield() {
  const response = await fetch(`${API_URL}/ops/catalog/metadata`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-OPS-KEY": OPS_KEY,
    },
    body: JSON.stringify({
      productId: "prod_01KGBSKFM71QR13VMQ89FT2TK9",
      merge: true,
      metadata: {
        features: [
          {
            key: "audio_bluetooth",
            title: "Audio Bluetooth Intégré",
            description: "Son cristallin sans fil",
            icon: "music",
            priority: 10,
            enabled: true,
          },
          // ... autres features
        ],
        rating: {
          value: 4.9,
          count: 134,
          isMock: true,
        },
        badges: ["Livraison gratuite"],
      },
    }),
  })

  const data = await response.json()
  console.log("✅ Music Shield metadata updated:", data)
}

seedMusicShield()
```

**Exécuter** :
```bash
npx tsx backend/scripts/seed-music-shield-metadata.ts
```

### 4. Exemples avec Postman/Insomnia

**1. Créer une requête POST** :
- URL : `https://api.mytechgear.eu/ops/catalog/metadata`
- Method : POST

**2. Headers** :
```
Content-Type: application/json
X-OPS-KEY: {{ops_key}}
```

**3. Body (JSON)** :
Copier le JSON Music Shield ci-dessus

**4. Variables Postman** :
```
ops_key: votre-cle-secrete-tres-longue-min-32-chars
```

---

## 📊 Cas d'Usage

### Use Case 1 : Seed Initial

**Situation** : Nouveau produit créé, besoin de features.

**Action** :
```bash
curl -X POST https://api.mytechgear.eu/ops/catalog/metadata \
  -H "X-OPS-KEY: $OPS_KEY" \
  -H "Content-Type: application/json" \
  -d @music-shield-metadata.json
```

**Fichier** : `music-shield-metadata.json`

### Use Case 2 : Update Incrémental

**Situation** : Ajouter un badge sans toucher aux features.

**Action** :
```bash
curl -X POST https://api.mytechgear.eu/ops/catalog/metadata \
  -H "X-OPS-KEY: $OPS_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_01XXXXX",
    "merge": true,
    "metadata": {
      "badges": ["Nouveau", "Livraison gratuite"]
    }
  }'
```

### Use Case 3 : Désactiver une Feature

**Situation** : Feature temporairement indisponible.

**Action** :
```bash
curl -X POST https://api.mytechgear.eu/ops/catalog/metadata \
  -H "X-OPS-KEY: $OPS_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_01XXXXX",
    "merge": true,
    "metadata": {
      "features": [
        {
          "key": "audio_bluetooth",
          "title": "Audio Bluetooth Intégré",
          "description": "Son cristallin sans fil",
          "icon": "music",
          "priority": 10,
          "enabled": false
        }
      ]
    }
  }'
```

Frontend affichera automatiquement uniquement les features `enabled: true`.

---

## 🛡️ Bonnes Pratiques Sécurité

### ✅ À FAIRE

1. **Générer clé longue** : Minimum 32 caractères aléatoires
2. **Jamais committer** : Ajouter `.env` au `.gitignore`
3. **Rotation régulière** : Changer la clé tous les 6 mois
4. **Logs** : Monitorer les tentatives d'accès non autorisées
5. **HTTPS only** : Jamais en HTTP (clé en clair)
6. **Désactiver en prod** : Si pas nécessaire (`OPS_ENDPOINTS_ENABLED=false`)

### ❌ À NE PAS FAIRE

1. ❌ Clé courte ou prévisible ("admin123", "secret", etc.)
2. ❌ Même clé que JWT_SECRET ou autre
3. ❌ Exposer publiquement sans rate limiting
4. ❌ Utiliser en HTTP (man-in-the-middle)
5. ❌ Partager la clé par email/Slack

---

## 🔍 Monitoring & Logs

### Logs OPS

**Success** :
```
✅ [OPS Catalog] Metadata updated: {
  productId: 'prod_01XXXXX',
  productTitle: 'Music Shield',
  productHandle: 'music-shield',
  metadataKeys: ['features', 'rating', 'badges'],
  merge: true,
  timestamp: '2026-02-28T08:00:00.000Z'
}
```

**Unauthorized** :
```
⚠️ [OPS Security] Unauthorized access attempt {
  ip: '203.0.113.42',
  userAgent: 'curl/7.64.1',
  timestamp: '2026-02-28T08:00:00.000Z'
}
```

### Monitoring Recommandé

**Alertes à configurer** :
- ✅ Tentatives d'accès non autorisées (> 5/heure)
- ✅ Pic de requêtes OPS (> 100/minute)
- ✅ Erreurs 500 sur endpoint OPS

**Outils** :
- Datadog, Sentry, CloudWatch, etc.
- Medusa logs (console.log déjà en place)

---

## 🧪 Testing

### 1. Tester localement

```bash
# Terminal 1: Lancer Medusa
cd backend
npm run dev

# Terminal 2: Tester endpoint
curl http://localhost:9000/ops/catalog/metadata \
  -H "X-OPS-KEY: dev-key-for-testing-only" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_01XXXXX",
    "merge": true,
    "metadata": {
      "test": "value"
    }
  }'
```

### 2. Tester auth

**Sans clé** :
```bash
curl http://localhost:9000/ops/catalog/metadata \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_01XXXXX","metadata":{}}'

# Réponse attendue: 401 Unauthorized
```

**Mauvaise clé** :
```bash
curl http://localhost:9000/ops/catalog/metadata \
  -H "X-OPS-KEY: wrong-key" \
  -H "Content-Type: application/json" \
  -d '{"productId":"prod_01XXXXX","metadata":{}}'

# Réponse attendue: 401 Unauthorized
```

---

## 📝 Checklist de Déploiement

Avant de déployer en production :

- [ ] OPS_SECRET_KEY générée (min 32 chars)
- [ ] OPS_ENDPOINTS_ENABLED configuré selon besoin
- [ ] `.env` ajouté au `.gitignore`
- [ ] HTTPS activé (pas de HTTP)
- [ ] Rate limiting configuré (optionnel)
- [ ] IP allowlist configuré (optionnel)
- [ ] Logs monitoring configurés
- [ ] Documentation partagée en interne seulement
- [ ] Clé stockée en lieu sûr (password manager)

---

## 🆘 Troubleshooting

### Problème : 403 "OPS endpoints are disabled"

**Solution** : Activer dans `.env`
```bash
OPS_ENDPOINTS_ENABLED=true
```

### Problème : 500 "OPS authentication not configured"

**Solution** : Définir clé dans `.env`
```bash
OPS_SECRET_KEY=$(openssl rand -hex 32)
```

### Problème : 401 "Invalid X-OPS-KEY header"

**Solution** : Vérifier header et clé
```bash
# Header correct :
-H "X-OPS-KEY: votre-cle-exacte"

# Pas :
-H "x-ops-key: ..." # minuscules
-H "Authorization: Bearer ..." # mauvais header
```

### Problème : 404 "Product not found"

**Solution** : Vérifier productId
```bash
# Récupérer ID produit :
curl https://api.mytechgear.eu/store/products?handle=music-shield | jq '.products[0].id'
```

---

## 📚 Ressources

- **Medusa Docs** : https://docs.medusajs.com
- **API Reference** : `GET /` sur ton API
- **Frontend Guide** : `FEATURES_MIGRATION_GUIDE.md`
