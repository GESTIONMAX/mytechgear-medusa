# 🗄️ Guide de Migration de la Base de Données Medusa

Ce guide explique comment exécuter les migrations de base de données pour Medusa sur Coolify.

## ⚠️ IMPORTANT : À Faire AVANT le Premier Déploiement

Les migrations doivent être exécutées **AVANT** de déployer l'application Medusa la première fois.

---

## 📋 Méthode 1 : Via Coolify (One-off Job) - RECOMMANDÉ

### Étape 1 : Créer un Job One-off

1. **Connectez-vous à Coolify**
2. Allez dans votre **Projet**
3. Cliquez sur **"+ New Resource"**
4. Sélectionnez **"Service"** → **"One-off Command"** (ou "Job")

### Étape 2 : Configuration du Job

**Informations de base** :
- **Name** : `medusa-db-migration`
- **Description** : `Migration de la base de données Medusa`

**Container Configuration** :
- **Image** : `node:20-alpine`
- **Command** :

```bash
apk add --no-cache git python3 make g++ && \
git clone https://github.com/GESTIONMAX/mytechgear-medusa.git /app && \
cd /app && \
npm ci && \
npm run build && \
npx @medusajs/medusa-cli db:migrate
```

**💡 Explication de la commande** :
- `apk add` : Installe git et les dépendances de build
- `git clone` : Clone votre repo GitHub
- `npm ci` : Installe les dépendances
- `npm run build` : Build Medusa (requis avant migration)
- `npx @medusajs/medusa-cli db:migrate` : Exécute les migrations

### Étape 3 : Variables d'Environnement

**CRITIQUE** : Ajoutez les **mêmes variables** que votre application Medusa.

**Variables requises** :

```bash
DATABASE_URL=postgres://medusa:VOTRE_PASSWORD@NOM_SERVICE_POSTGRES:5432/medusa_prod
DB_NAME=medusa_prod
NODE_ENV=production
```

**📝 Notes** :
- Remplacez `NOM_SERVICE_POSTGRES` par le vrai nom de votre service PostgreSQL dans Coolify
- Remplacez `VOTRE_PASSWORD` par le mot de passe PostgreSQL
- Les autres variables (JWT_SECRET, REDIS, etc.) ne sont PAS nécessaires pour les migrations

### Étape 4 : Réseau Docker

**IMPORTANT** : Le job doit être sur le **même réseau Docker** que PostgreSQL.

Dans Coolify :
- **Network** : Sélectionnez le même réseau que votre service PostgreSQL
- Généralement, c'est le réseau par défaut du projet

### Étape 5 : Exécuter le Job

1. Cliquez sur **"Save"** ou **"Create"**
2. Cliquez sur **"Run"** ou **"Start"**
3. Surveillez les **logs** en temps réel

### Étape 6 : Vérifier le Succès

**Logs attendus** :

```
✓ Dependencies installed
✓ Build successful
✓ Running migrations...
✓ Migrations completed successfully
```

**En cas d'erreur** :
- Vérifiez `DATABASE_URL` (nom du service, password, port)
- Vérifiez que PostgreSQL est démarré
- Vérifiez que le job est sur le bon réseau Docker
- Consultez les logs complets

### Étape 7 : Supprimer le Job (Optionnel)

Une fois les migrations réussies, vous pouvez **supprimer le job** car il n'est plus nécessaire.

---

## 📋 Méthode 2 : Via SSH sur le Serveur Coolify

Si vous avez un accès SSH au serveur Coolify :

### Étape 1 : Se Connecter au Serveur

```bash
ssh user@votre-serveur-coolify.com
```

### Étape 2 : Trouver le Réseau Docker

```bash
# Lister les réseaux
docker network ls

# Notez le nom du réseau de votre projet
# Exemple : coolify_mytechgear
```

### Étape 3 : Trouver le Nom du Service PostgreSQL

```bash
# Lister les conteneurs
docker ps | grep postgres

# Notez le nom du conteneur PostgreSQL
# Exemple : postgres-mytechgear-abc123
```

### Étape 4 : Lancer un Conteneur Temporaire

```bash
docker run --rm -it \
  --network coolify_mytechgear \
  -e DATABASE_URL="postgres://medusa:VOTRE_PASSWORD@postgres-mytechgear:5432/medusa_prod" \
  -e DB_NAME="medusa_prod" \
  node:20-alpine sh
```

### Étape 5 : Exécuter les Migrations dans le Conteneur

```bash
# Installer git et dépendances
apk add --no-cache git python3 make g++

# Cloner le repo
git clone https://github.com/GESTIONMAX/mytechgear-medusa.git /app
cd /app

# Installer les dépendances
npm ci

# Build
npm run build

# Migrations
npx @medusajs/medusa-cli db:migrate

# Sortir du conteneur
exit
```

Le conteneur sera automatiquement supprimé (`--rm`).

---

## 📋 Méthode 3 : Depuis Votre Machine Locale

### ⚠️ PRÉREQUIS CRITIQUES

- PostgreSQL **doit être accessible** depuis l'extérieur (port 5432 ouvert)
- Vous devez connaître l'**IP publique** du serveur Coolify
- **NE FAITES CECI QU'EN DÉVELOPPEMENT**, jamais en production

### Étape 1 : Tunnel SSH (Recommandé pour sécurité)

```bash
# Créer un tunnel SSH vers PostgreSQL
ssh -L 5433:NOM_SERVICE_POSTGRES:5432 user@serveur-coolify.com

# Dans un autre terminal :
```

### Étape 2 : Configuration Temporaire

```bash
# Créer un fichier .env.migration
cat > .env.migration <<EOF
DATABASE_URL=postgres://medusa:PASSWORD@localhost:5433/medusa_prod
DB_NAME=medusa_prod
EOF
```

### Étape 3 : Exécuter les Migrations

```bash
# Build
npm run build

# Migrations avec le fichier .env.migration
DATABASE_URL="postgres://medusa:PASSWORD@localhost:5433/medusa_prod" \
  npx @medusajs/medusa-cli db:migrate
```

### Étape 4 : Nettoyer

```bash
# SUPPRIMER IMMÉDIATEMENT le fichier temporaire
rm .env.migration

# Fermer le tunnel SSH (Ctrl+C dans le terminal du tunnel)
```

---

## 🔍 Vérification Post-Migration

### Vérifier que les Tables Ont Été Créées

**Via Coolify** (si interface DB disponible) :
- Connectez-vous à PostgreSQL
- Listez les tables : `\dt`

**Via psql en ligne de commande** :

```bash
# SSH sur le serveur Coolify
ssh user@serveur-coolify.com

# Se connecter à PostgreSQL
docker exec -it NOM_CONTENEUR_POSTGRES psql -U medusa -d medusa_prod

# Lister les tables
\dt

# Vous devriez voir des tables comme :
# - user
# - customer
# - product
# - cart
# - order
# - etc.

# Quitter
\q
```

**Tables attendues** :

Medusa crée environ **100+ tables** dont :
- `user`, `invite`
- `store`, `currency`
- `product`, `product_variant`
- `cart`, `line_item`
- `order`, `fulfillment`
- `customer`, `customer_group`
- `payment`, `payment_collection`
- `shipping_method`, `shipping_option`
- Et bien d'autres...

---

## 🐛 Dépannage

### Erreur : Cannot connect to database

**Causes possibles** :
- `DATABASE_URL` incorrect
- Service PostgreSQL non démarré
- Réseau Docker incorrect
- Mauvais credentials

**Solution** :
```bash
# Vérifier que PostgreSQL est accessible
docker exec -it NOM_SERVICE_POSTGRES psql -U medusa -d medusa_prod -c "SELECT 1"
```

### Erreur : Database does not exist

**Solution** :
```bash
# Créer la base de données
docker exec -it NOM_SERVICE_POSTGRES psql -U medusa -c "CREATE DATABASE medusa_prod"
```

### Erreur : Permission denied

**Causes** :
- L'utilisateur PostgreSQL n'a pas les permissions

**Solution** :
```bash
docker exec -it NOM_SERVICE_POSTGRES psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE medusa_prod TO medusa"
```

### Erreur : Module not found

**Cause** :
- `npm ci` a échoué ou n'a pas été exécuté

**Solution** :
- Vérifier les logs du job
- Relancer le job

### Les migrations ont déjà été exécutées

**Message** :
```
No migrations to run
```

C'est **normal** si vous relancez les migrations. Medusa détecte automatiquement quelles migrations ont déjà été appliquées.

---

## 📚 Commandes Utiles

### Voir l'état des migrations

```bash
npx @medusajs/medusa-cli db:migrate --list
```

### Rollback de la dernière migration (⚠️ Dangereux)

```bash
npx @medusajs/medusa-cli db:migrate:down
```

### Créer une nouvelle migration (développement)

```bash
npx @medusajs/medusa-cli db:create-migration nom-de-la-migration
```

---

## ✅ Checklist Finale

Avant de déployer l'application :

- [ ] PostgreSQL créé et démarré dans Coolify
- [ ] Credentials PostgreSQL notés (user, password, host, database)
- [ ] Migrations exécutées avec succès
- [ ] Tables créées vérifiées (environ 100+ tables)
- [ ] Job de migration supprimé (optionnel)
- [ ] Variables d'environnement configurées dans l'application
- [ ] Prêt à déployer l'application Medusa !

---

## 🚀 Après les Migrations

Une fois les migrations réussies :

1. **Déployez votre application Medusa** dans Coolify
2. Vérifiez que l'application démarre : `https://api.mytechgear.eu/health`
3. Accédez à l'admin : `https://api.mytechgear.eu/app`
4. Créez votre premier utilisateur admin

---

**Prêt pour la migration !** 🎉

Si vous rencontrez des problèmes, consultez la section Dépannage ou vérifiez les logs du job dans Coolify.
