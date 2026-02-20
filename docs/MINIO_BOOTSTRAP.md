# MinIO Bootstrap — Configuration 100% CLI

Guide complet pour configurer MinIO via CLI (sans console web) pour le stockage des assets MyTechGear.

**Architecture : Instance Unique**
- MinIO tourne UNIQUEMENT sur le serveur Coolify (production)
- Aucun MinIO local en développement
- Accès dev via SSH tunnel (localhost:19000 → serveur:9000)

---

## Table des matières

1. [Architecture](#architecture)
2. [Concepts](#concepts)
3. [Prérequis](#prérequis)
4. [Installation MinIO Client](#installation-minio-client)
5. [Setup SSH Tunnel (Dev)](#setup-ssh-tunnel-dev)
6. [Setup Production (Coolify)](#setup-production-coolify)
7. [Sécurité](#sécurité)
8. [Dépannage](#dépannage)

---

## Architecture

### Instance Unique MinIO

```
┌─────────────────────────────────────┐
│  Serveur Coolify (Production)       │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   MinIO Container           │   │
│  │   Ports: 127.0.0.1:9000     │   │
│  │          127.0.0.1:9001     │   │
│  └─────────────────────────────┘   │
│              │                      │
│              │ Réseau Docker       │
│              ▼                      │
│  ┌─────────────────────────────┐   │
│  │   Medusa Backend            │   │
│  │   S3_ENDPOINT=http://minio:9000│
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
           ▲
           │ SSH Tunnel (dev uniquement)
           │ localhost:19000 → 127.0.0.1:9000
           │
┌──────────┴────────────────────┐
│  Machine locale (Dev)         │
│                                │
│  S3_ENDPOINT=http://localhost:19000│
│  FILE_URL=https://s3.assets.mytechgear.eu│
└────────────────────────────────┘
```

**Flux des assets :**
1. **Upload** : Backend → S3_ENDPOINT (tunnel ou réseau Docker)
2. **Public** : Navigateur → FILE_URL (CDN public)

---

## Concepts

### Admin User vs Service Account

MinIO distingue deux types de credentials :

| Type | Usage | Permissions | Génération |
|------|-------|-------------|------------|
| **Admin User** | Administration MinIO (créer buckets, users, policies) | Illimitées (root-level) | `mc admin user add` |
| **User Applicatif** | User intermédiaire (peut avoir des Service Accounts) | Limitées par policy | `mc admin user add` |
| **Service Account** | App backend (lecture/écriture bucket) | Héritées du user parent | `mc admin user svcacct add` |

**Workflow recommandé :**

```
Root User (minioadmin)
  └─> User Applicatif (mytechgear-app) + Policy RW bucket-scoped
       └─> Service Account (AccessKey/SecretKey) → utilisé dans .env
```

**Pourquoi ?**

- Le **root user** ne doit jamais être utilisé dans une app (trop de permissions)
- Le **user applicatif** sert de scope pour les Service Accounts
- Le **Service Account** a des credentials rotables sans casser le user parent

---

## Prérequis

- MinIO serveur déployé (local Docker ou Coolify)
- Credentials root (par défaut : `minioadmin` / `minioadmin`)

---

## Installation MinIO Client

### macOS
```bash
brew install minio-mc
```

### Linux
```bash
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/
```

### Vérification
```bash
mc --version
# → mc version RELEASE.2024-XX-XX
```

---

## Setup SSH Tunnel (Dev)

### 1. Établir le tunnel SSH

**Option 1 : Commande manuelle**

```bash
ssh -L 19000:127.0.0.1:9000 -L 19001:127.0.0.1:9001 user@serveur.mytechgear.eu
```

**Option 2 : Configuration SSH persistante (recommandé)**

Ajouter dans `~/.ssh/config` :

```
Host mytechgear-tunnel
  HostName serveur.mytechgear.eu
  User deployer
  LocalForward 19000 127.0.0.1:9000
  LocalForward 19001 127.0.0.1:9001
```

Puis lancer en arrière-plan :
```bash
ssh -fN mytechgear-tunnel
```

**Vérifier le tunnel :**
```bash
curl http://localhost:19000 -I
# → HTTP/1.1 403 Forbidden (normal, MinIO répond)
```

### 2. Configurer l'alias mc

Depuis `infra/minio/` :

```bash
make minio-alias \
  ENDPOINT=http://localhost:19000 \
  MINIO_ROOT_USER=admin \
  MINIO_ROOT_PASSWORD=<votre-root-password>
```

Ou manuellement :
```bash
mc alias set local http://localhost:19000 admin <password>
```

Tester :
```bash
mc admin info local
```

**Note :** Le bootstrap n'est PAS nécessaire en dev si déjà fait en production (bucket/user/policy existent déjà sur l'instance unique).

### 3. Vérifier l'accès au bucket

```bash
# Lister le bucket
mc ls local/mytechgear-assets

# Upload test
mc cp test.jpg local/mytechgear-assets/

# Accès public via CDN
curl https://s3.assets.mytechgear.eu/test.jpg -I
# → HTTP/1.1 200 OK
```

### 4. Mettre à jour `.env`

```bash
# Endpoint S3 interne (via tunnel SSH en dev)
S3_ENDPOINT=http://localhost:19000

# Région S3 (MinIO utilise "us-east-1" par convention)
S3_REGION=us-east-1

# Credentials S3 (Service Account généré via: make minio-keys en production)
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=wJalr...

# Nom du bucket
S3_BUCKET=mytechgear-assets

# URL publique des assets (CDN ou domaine custom)
# IMPORTANT: indépendant de S3_ENDPOINT
FILE_URL=https://s3.assets.mytechgear.eu
```

---

## Setup Production (Coolify + Docker Network)

### 1. Déployer MinIO sur Coolify

**Coolify Dashboard :**
- Resources → + New Resource → **Docker Compose**
- Template : **MinIO** (ou custom)

**docker-compose.yml exemple :**
```yaml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: <générer-32-chars>
    volumes:
      - minio-data:/data
    networks:
      - coolify
    ports:
      - "9000:9000"
      - "9001:9001"

volumes:
  minio-data:

networks:
  coolify:
    external: true
```

**Notes :**
- Le réseau `coolify` permet la communication inter-services (Medusa ↔ MinIO)
- Ports 9000/9001 peuvent être exposés publiquement ou via reverse proxy

### 2. Configurer l'alias mc

**Depuis votre machine locale :**

```bash
make minio-alias \
  ALIAS=prod \
  ENDPOINT=https://minio.mytechgear.eu \
  MINIO_ROOT_USER=admin \
  MINIO_ROOT_PASSWORD=<votre-root-password>
```

**Depuis un conteneur Coolify (même réseau) :**

```bash
mc alias set prod http://minio:9000 admin <password>
```

### 3. Bootstrapper

```bash
make minio-bootstrap ALIAS=prod
```

### 4. Générer Service Account

```bash
make minio-keys ALIAS=prod
```

### 5. Env vars Coolify

Dans Coolify → Service Medusa → **Environment Variables** :

```
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<access-key-généré>
S3_SECRET_ACCESS_KEY=<secret-key-généré>
S3_BUCKET=mytechgear-assets
FILE_URL=https://s3.assets.mytechgear.eu
```

**FILE_URL :**
- Si CDN configuré : `https://s3.assets.mytechgear.eu` (recommandé)
- Si reverse proxy Coolify : `https://minio.mytechgear.eu/mytechgear-assets`
- Sinon (non recommandé prod) : `http://minio:9000`

**Important :** `S3_ENDPOINT` est l'endpoint interne Docker (`http://minio:9000`), tandis que `FILE_URL` est l'URL publique des assets.

### 6. Reverse Proxy (optionnel mais recommandé)

Coolify peut configurer un reverse proxy pour exposer MinIO :
- Domaine : `cdn.mytechgear.eu` → `minio:9000`
- SSL automatique (Let's Encrypt)

**Avantages :**
- URLs publiques propres
- HTTPS
- Cache CDN possible

---

## Sécurité

### Bucket Public vs Privé

**Configuration actuelle :**
```bash
mc anonymous set download local/mytechgear-assets
```

→ Policy : **download** (lecture publique, écriture interdite)

**Impacts :**
- ✅ Images accessibles directement via URL (CDN-friendly)
- ✅ Aucune auth requise pour GET
- ❌ Uploads publics impossibles (protection contre abus)

**Alternatives :**

| Policy | GET anonyme | PUT anonyme | Usage |
|--------|-------------|-------------|-------|
| `download` | ✅ | ❌ | Assets publics (recommandé) |
| `upload` | ❌ | ✅ | Upload anonyme (dangereux) |
| `public` | ✅ | ✅ | Bucket entièrement public (non recommandé) |
| `none` | ❌ | ❌ | Bucket privé (requiert signed URLs) |

**Si bucket privé souhaité :**
```bash
mc anonymous set none local/mytechgear-assets
```

Générer des signed URLs dans le backend :
```typescript
import { uploadObject } from "@/lib/s3";

// Upload génère une URL signée valide 7 jours
const url = await uploadObject({ key: "private/doc.pdf", body: file });
```

### Rotation des credentials

**Service Account :**
```bash
# Lister les service accounts
mc admin user svcacct list prod mytechgear-app

# Supprimer un ancien
mc admin user svcacct rm prod <OLD_ACCESS_KEY>

# Générer un nouveau
make minio-keys ALIAS=prod
```

**User Applicatif (changement password) :**
```bash
mc admin user add prod mytechgear-app <NEW_PASSWORD>
```

---

## Dépannage

### Erreur : "mc: command not found"

Installer MinIO Client (voir [Installation](#installation-minio-client))

### Erreur : "mc: Unable to initialize new alias"

Vérifier :
- Endpoint accessible : `curl http://localhost:9000` → 403 (normal)
- Credentials correctes (MINIO_ROOT_USER / PASSWORD)

Tester manuellement :
```bash
mc alias set test http://localhost:9000 minioadmin minioadmin
mc admin info test
```

### Bucket inaccessible (403)

**Cause 1 : Policy publique non configurée**
```bash
mc anonymous get local/mytechgear-assets
# → "none" (privé)

# Fix :
mc anonymous set download local/mytechgear-assets
```

**Cause 2 : Service Account sans permissions**
```bash
# Vérifier la policy du user parent
mc admin user info local mytechgear-app

# Re-attacher la policy
mc admin policy attach local mytechgear-rw --user mytechgear-app
```

### Uploads échouent (403)

**Cause : Utilisation du root user au lieu du Service Account**

Vérifier `.env` :
```bash
S3_ACCESS_KEY_ID=<doit commencer par un service account, ex: AKIA...>
S3_SECRET_ACCESS_KEY=<correspond au service account>
```

Régénérer si besoin :
```bash
cd infra/minio
make minio-keys
```

### Images 404 en production

**Cause : FILE_URL incorrect**

Tester depuis un navigateur :
```
https://s3.assets.mytechgear.eu/test.jpg
```

Si 404 :
- Vérifier le reverse proxy Coolify
- Vérifier DNS `s3.assets.mytechgear.eu` → IP Coolify
- Vérifier CORS dans MinIO (si frontend cross-origin)
- Vérifier que `FILE_URL` dans Coolify correspond au domaine public

### Tunnel SSH échoue en dev

**Symptôme :** `curl http://localhost:19000` → Connection refused

**Causes possibles :**
1. Tunnel SSH non actif :
   ```bash
   # Vérifier les tunnels actifs
   ps aux | grep "ssh.*19000"

   # Relancer le tunnel
   ssh -fN -L 19000:127.0.0.1:9000 user@serveur.mytechgear.eu
   ```

2. Port 19000 déjà utilisé :
   ```bash
   lsof -i :19000
   # Tuer le processus ou utiliser un autre port
   ```

3. MinIO non démarré sur le serveur :
   ```bash
   # Se connecter au serveur et vérifier
   ssh user@serveur.mytechgear.eu "docker ps | grep minio"
   ```

---

## Commandes utiles

```bash
# Lister buckets
mc ls local

# Lister objets dans bucket
mc ls local/mytechgear-assets

# Info bucket
mc stat local/mytechgear-assets

# Copier fichier
mc cp image.jpg local/mytechgear-assets/products/

# Supprimer fichier
mc rm local/mytechgear-assets/products/image.jpg

# Quota bucket (optionnel)
mc admin bucket quota local/mytechgear-assets --hard 10GB

# Logs en temps réel
mc admin logs local
```

---

## Résumé commandes complètes

### Setup production (une seule fois)
```bash
# 1. Déployer MinIO sur Coolify (via UI ou docker-compose)

# 2. Configurer alias depuis machine locale (via SSH tunnel)
ssh -fN -L 19000:127.0.0.1:9000 user@serveur.mytechgear.eu

cd infra/minio
make minio-alias \
  ENDPOINT=http://localhost:19000 \
  MINIO_ROOT_USER=admin \
  MINIO_ROOT_PASSWORD=<root-password>

# 3. Bootstrapper (créer bucket, user, policy)
make minio-bootstrap

# 4. Générer clés (Service Account)
make minio-keys

# 5. Ajouter dans Coolify → Medusa → Environment Variables
# S3_ENDPOINT=http://minio:9000
# S3_ACCESS_KEY_ID=...
# S3_SECRET_ACCESS_KEY=...
# FILE_URL=https://s3.assets.mytechgear.eu
```

### Setup développement (accès via tunnel)
```bash
# 1. Établir tunnel SSH (si pas déjà actif)
ssh -fN -L 19000:127.0.0.1:9000 user@serveur.mytechgear.eu

# 2. Vérifier le tunnel
curl http://localhost:19000 -I
# → 403 Forbidden (normal)

# 3. Configurer .env avec les credentials de production
# S3_ENDPOINT=http://localhost:19000
# S3_ACCESS_KEY_ID=<même que prod>
# S3_SECRET_ACCESS_KEY=<même que prod>
# FILE_URL=https://s3.assets.mytechgear.eu

# 4. Tester l'accès
cd infra/minio
make minio-alias ENDPOINT=http://localhost:19000
mc ls local/mytechgear-assets
```

---

## Références

- MinIO Client : https://min.io/docs/minio/linux/reference/minio-mc.html
- MinIO Policies : https://min.io/docs/minio/linux/administration/identity-access-management/policy-based-access-control.html
- Service Accounts : https://min.io/docs/minio/linux/administration/identity-access-management/minio-user-management.html#service-accounts
