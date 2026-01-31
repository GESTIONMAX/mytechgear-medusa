# 🚀 Guide de Déploiement Medusa sur Coolify

Ce guide explique comment déployer votre backend Medusa v2 sur Coolify.

## 📋 Prérequis

- ✅ PostgreSQL créé sur Coolify
- ✅ Redis créé sur Coolify
- ✅ Repository Git (GitHub) configuré avec le code
- ✅ Compte Coolify avec accès admin

## 🔧 Étape 1 : Préparer les Services de Base

### 1.1 PostgreSQL

Notez les informations de connexion :
- **Host** : Nom du service interne (ex: `postgres-mytechgear`)
- **Port** : `5432`
- **Database** : `medusa_prod`
- **User** : `medusa`
- **Password** : (généré par Coolify)

### 1.2 Redis

Notez les informations de connexion :
- **Host** : Nom du service interne (ex: `redis-mytechgear`)
- **Port** : `6379`

**📝 Note** : Coolify crée un réseau Docker interne. Les services peuvent communiquer via leurs noms de service.

## 🐳 Étape 2 : Créer l'Application Medusa dans Coolify

### 2.1 Créer une Nouvelle Application

1. Dans Coolify, cliquez sur **"New Resource"**
2. Sélectionnez **"Application"**
3. Choisissez **"Public Repository"** ou **"Private Repository"**

### 2.2 Configuration Git

- **Repository** : `https://github.com/GESTIONMAX/mytechgear-medusa.git`
- **Branch** : `main`
- **Build Pack** : Sélectionnez **"Dockerfile"**
- **Dockerfile Location** : `./Dockerfile` (à la racine)

### 2.3 Configuration de Base

- **Name** : `mytechgear-medusa-backend`
- **Domain** : `api.mytechgear.com` (ou votre domaine)
- **Port** : `9000`

## 🔐 Étape 3 : Configurer les Variables d'Environnement

Dans Coolify, allez dans **Environment Variables** et ajoutez :

### Variables Requises

```bash
# Database
DATABASE_URL=postgres://medusa:YOUR_PASSWORD@postgres-mytechgear:5432/medusa_prod
DB_NAME=medusa_prod

# Redis
REDIS_URL=redis://redis-mytechgear:6379

# Security (IMPORTANT: Générez des secrets forts!)
JWT_SECRET=<générez avec: openssl rand -base64 32>
COOKIE_SECRET=<générez avec: openssl rand -base64 32>

# CORS (Remplacez par vos vrais domaines)
STORE_CORS=https://mytechgear.com,https://www.mytechgear.com
ADMIN_CORS=https://admin.mytechgear.com
AUTH_CORS=https://admin.mytechgear.com,https://mytechgear.com

# Server
PORT=9000
NODE_ENV=production

# Admin Backend
MEDUSA_ADMIN_BACKEND_URL=https://api.mytechgear.com
```

### 💡 Générer les Secrets

Dans votre terminal local :
```bash
# JWT Secret
openssl rand -base64 32

# Cookie Secret
openssl rand -base64 32
```

Copiez ces valeurs dans Coolify.

## 📦 Étape 4 : Configuration des Volumes (Stockage Persistant)

Si vous stockez des fichiers en local (uploads), ajoutez un volume :

1. Dans Coolify, allez dans **"Storages"**
2. Ajoutez un nouveau volume :
   - **Source** : `/app/uploads`
   - **Destination** : Chemin sur le host
   - **Type** : `bind`

**⚠️ Recommandation** : Pour la production, utilisez plutôt S3 ou MinIO.

## 🏗️ Étape 5 : Première Migration de Base de Données

Avant le premier déploiement, vous devez migrer la base de données.

### Option A : Via un Job One-Time dans Coolify

1. Créez un **Job** temporaire dans Coolify
2. Utilisez la même image Docker
3. Commande : `npm run build && npx medusa db:migrate`
4. Variables d'environnement : Les mêmes que l'application
5. Exécutez le job

### Option B : Localement (Temporaire)

```bash
# Dans votre .env local, utilisez l'URL de la DB de production
DATABASE_URL=postgres://medusa:PASSWORD@your-coolify-host:5432/medusa_prod

# Exécutez les migrations
npm run build
npx @medusajs/medusa-cli db:migrate

# ⚠️ Rétablissez immédiatement votre .env local après !
```

## 🚀 Étape 6 : Déployer

1. Dans Coolify, cliquez sur **"Deploy"**
2. Attendez que le build se termine (cela peut prendre 5-10 minutes la première fois)
3. Vérifiez les logs pour détecter d'éventuelles erreurs

## ✅ Étape 7 : Vérifier le Déploiement

### 7.1 Health Check

Visitez : `https://api.mytechgear.com/health`

Vous devriez voir : `{"status": "ok"}`

### 7.2 Admin Dashboard

Visitez : `https://api.mytechgear.com/app`

Vous devriez voir l'interface d'administration Medusa.

### 7.3 Créer un Utilisateur Admin

Si pas encore fait, créez un utilisateur admin via l'API ou la CLI.

## 🔄 Étape 8 : Configuration du Déploiement Automatique

### 8.1 Webhook GitHub

Coolify peut déployer automatiquement à chaque push :

1. Dans Coolify, allez dans **"Deployments"**
2. Activez **"Auto Deploy"**
3. Sélectionnez la branche `main`

Chaque fois que vous pushez sur `main`, Coolify déploiera automatiquement.

### 8.2 Build Cache

Pour des builds plus rapides :
- Coolify met en cache les layers Docker
- Le multi-stage Dockerfile optimise déjà le build

## 📊 Monitoring et Logs

### Logs en Temps Réel

Dans Coolify, allez dans **"Logs"** pour voir les logs en temps réel.

### Métriques

Coolify fournit :
- CPU usage
- Memory usage
- Network I/O

## 🛡️ Sécurité - Checklist

- [ ] JWT_SECRET et COOKIE_SECRET sont des valeurs aléatoires fortes
- [ ] DATABASE_URL ne contient pas de credentials en clair (utilisez les secrets Coolify)
- [ ] CORS est configuré avec vos vrais domaines uniquement
- [ ] SSL/TLS est activé (Let's Encrypt via Coolify)
- [ ] Fichier `.env` est dans `.gitignore` (jamais commité)
- [ ] Variables sensibles sont dans Coolify, pas dans le code

## 🐛 Dépannage

### Le build échoue

```bash
# Vérifiez les logs de build dans Coolify
# Problèmes courants :
# - Dépendances manquantes : vérifiez package.json
# - Erreurs TypeScript : exécutez npm run build localement
# - Problèmes de mémoire : augmentez la RAM du conteneur
```

### L'application ne démarre pas

```bash
# Vérifiez les logs de runtime
# Problèmes courants :
# - DATABASE_URL incorrect
# - PostgreSQL non accessible
# - Redis non accessible
# - Migrations non exécutées
```

### Erreur de connexion à la base de données

```bash
# Vérifiez :
# 1. Le nom du service PostgreSQL dans Coolify
# 2. Les credentials (user, password, database)
# 3. Que les services sont sur le même réseau Docker
# 4. Que PostgreSQL est démarré
```

### CORS Errors

```bash
# Vérifiez :
# 1. STORE_CORS contient l'URL de votre frontend
# 2. ADMIN_CORS contient l'URL de votre admin
# 3. Les URLs incluent le protocole (https://)
# 4. Pas d'espace dans les listes d'URLs
```

## 🔄 Mises à Jour Futures

Pour mettre à jour Medusa :

1. Mettez à jour `package.json` localement
2. Testez en local
3. Commitez et pushez sur GitHub
4. Coolify rebuildera et redéploiera automatiquement

## 📚 Ressources

- [Documentation Medusa](https://docs.medusajs.com)
- [Documentation Coolify](https://coolify.io/docs)
- [GitHub Repository](https://github.com/GESTIONMAX/mytechgear-medusa)

## 🎯 Checklist Finale

Avant de mettre en production :

- [ ] PostgreSQL et Redis opérationnels
- [ ] Variables d'environnement configurées
- [ ] Secrets générés et sécurisés
- [ ] Migrations de base de données exécutées
- [ ] Premier déploiement réussi
- [ ] Health check fonctionne
- [ ] Admin dashboard accessible
- [ ] Utilisateur admin créé
- [ ] CORS configuré correctement
- [ ] SSL/TLS activé
- [ ] Auto-deploy configuré (optionnel)

---

**Prêt à déployer !** 🚀

Si vous rencontrez des problèmes, vérifiez d'abord les logs dans Coolify, puis consultez la section Dépannage.
