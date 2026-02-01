# Migration Base de Données vers Coolify

**Date** : 2026-02-01
**Objectif** : Migrer PostgreSQL Medusa depuis local vers Coolify
**Base** : medusa (port 5433)

---

## Étape 1 : Sauvegarde de la base locale

### 1.1 Créer un dump PostgreSQL

```bash
# Se placer dans le projet
cd "/home/gestionmax-aur-lien/CascadeProjects/medusa/mytechgear-medusa-backend /mytechgear-medusa"

# Créer le dossier backups
mkdir -p backups

# Créer le dump (avec données + schéma)
pg_dump -h localhost -p 5433 -U medusa -d medusa \
  --no-owner \
  --no-acl \
  -F c \
  -f backups/medusa-$(date +%Y%m%d-%H%M%S).dump

# Alternative: dump SQL plain text (plus lisible)
pg_dump -h localhost -p 5433 -U medusa -d medusa \
  --no-owner \
  --no-acl \
  -f backups/medusa-$(date +%Y%m%d-%H%M%S).sql
```

**Note** : Le mot de passe est `medusa` (défini dans DATABASE_URL)

### 1.2 Vérifier le dump

```bash
# Lister les fichiers de backup
ls -lh backups/

# Vérifier le contenu du dump (format custom)
pg_restore -l backups/medusa-*.dump | head -20

# Vérifier le dump SQL (format text)
head -50 backups/medusa-*.sql
```

**Contenu attendu** :
- Tables : `product`, `product_variant`, `region`, `shipping_option`, etc.
- Données : 14+ produits, 52+ variantes, tags, collections
- Indexes, contraintes, séquences

---

## Étape 2 : Créer la base PostgreSQL sur Coolify

### 2.1 Accéder à Coolify

1. Connectez-vous à votre instance Coolify : https://votre-coolify.com
2. Sélectionnez votre serveur/projet
3. Allez dans **Resources** → **+ New Resource**

### 2.2 Créer PostgreSQL

1. Choisir **Database** → **PostgreSQL**
2. Configuration :
   - **Name** : `mytechgear-medusa-db`
   - **PostgreSQL Version** : `16` (ou 15)
   - **Database Name** : `medusa`
   - **Username** : `medusa`
   - **Password** : Générer un mot de passe sécurisé (copier)
   - **Port** : `5432` (par défaut)
   - **Public Access** : ✅ Activer (pour migration, puis désactiver après)

3. Cliquer **Create**

### 2.3 Noter les credentials

Coolify va générer :
```
Host: xxx.xxx.xxx.xxx (IP publique du serveur)
Port: 5432 (ou port mappé)
Database: medusa
Username: medusa
Password: VOTRE_MOT_DE_PASSE_GENERE
```

**Format DATABASE_URL** :
```
postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa
```

---

## Étape 3 : Restaurer le dump sur Coolify

### 3.1 Tester la connexion

```bash
# Remplacer xxx.xxx.xxx.xxx par l'IP Coolify
psql postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa -c "SELECT version();"
```

**Résultat attendu** :
```
PostgreSQL 16.x on x86_64-pc-linux-gnu, compiled by gcc ...
```

### 3.2 Restaurer le dump

**Option 1 : Format custom (.dump)**

```bash
pg_restore -h xxx.xxx.xxx.xxx -p 5432 -U medusa -d medusa \
  --no-owner \
  --no-acl \
  -v \
  backups/medusa-YYYYMMDD-HHMMSS.dump
```

**Option 2 : Format SQL (.sql)**

```bash
psql postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa \
  -f backups/medusa-YYYYMMDD-HHMMSS.sql
```

### 3.3 Vérifier la restauration

```bash
# Connexion à la base Coolify
psql postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa

# Vérifier les tables
\dt

# Compter les produits
SELECT COUNT(*) FROM product;

# Compter les variantes
SELECT COUNT(*) FROM product_variant;

# Compter les tags
SELECT COUNT(*) FROM product_tag;

# Quitter
\q
```

**Résultats attendus** :
- Tables : 50+ tables Medusa
- Products : 14+ lignes
- Variants : 52+ lignes
- Tags : 37+ lignes

---

## Étape 4 : Mettre à jour Medusa local pour pointer vers Coolify

### 4.1 Backup .env actuel

```bash
cp .env .env.backup-local-$(date +%Y%m%d)
```

### 4.2 Modifier .env

```bash
# Éditer .env
nano .env
```

**Remplacer** :
```bash
DATABASE_URL=postgres://medusa:medusa@localhost:5433/medusa
```

**Par** :
```bash
DATABASE_URL=postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa
```

### 4.3 Tester Medusa avec DB Coolify

```bash
# Lancer Medusa
npm run dev

# Dans un autre terminal, tester l'API
curl http://localhost:9000/health

# Tester l'admin
curl http://localhost:9000/app
```

**Vérifications** :
- ✅ Medusa démarre sans erreur
- ✅ `/health` retourne 200
- ✅ Admin accessible
- ✅ Products visibles dans admin

---

## Étape 5 : Sécuriser la base Coolify

### 5.1 Désactiver l'accès public

Dans Coolify :
1. Aller dans la base PostgreSQL
2. **Settings** → **Public Access** : ❌ Désactiver
3. **Save**

**Note** : La base ne sera accessible que depuis les applications Coolify du même réseau.

### 5.2 Créer un utilisateur read-only (optionnel)

```sql
-- Se connecter en admin
psql postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa

-- Créer utilisateur read-only
CREATE USER medusa_readonly WITH PASSWORD 'mot_de_passe_readonly';
GRANT CONNECT ON DATABASE medusa TO medusa_readonly;
GRANT USAGE ON SCHEMA public TO medusa_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO medusa_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO medusa_readonly;
```

---

## Étape 6 : Déployer Medusa sur Coolify

### 6.1 Créer l'application Medusa

Dans Coolify :
1. **Resources** → **+ New Resource**
2. Choisir **Git Repository** ou **Docker Compose**
3. Configuration :
   - **Name** : `mytechgear-medusa-backend`
   - **Git Repository** : `https://github.com/GESTIONMAX/mytechgear-medusa.git`
   - **Branch** : `main`
   - **Build Pack** : Node.js
   - **Port** : `9000`

### 6.2 Variables d'environnement

Ajouter dans Coolify (Settings → Environment Variables) :

```bash
# Database (connexion interne Coolify)
DATABASE_URL=postgres://medusa:VOTRE_MOT_DE_PASSE@mytechgear-medusa-db:5432/medusa

# Redis (à créer dans Coolify)
REDIS_URL=redis://mytechgear-medusa-redis:6379

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Brevo
BREVO_API_KEY=xkeysib-xxxxx
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear

# Medusa
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS=false

# JWT Secret (générer un secret fort)
JWT_SECRET=$(openssl rand -base64 32)
COOKIE_SECRET=$(openssl rand -base64 32)
```

### 6.3 Build Command

```bash
npm install && npm run build
```

### 6.4 Start Command

```bash
npm run start
```

---

## Étape 7 : Créer Redis sur Coolify

### 7.1 Créer Redis

1. **Resources** → **+ New Resource**
2. **Database** → **Redis**
3. Configuration :
   - **Name** : `mytechgear-medusa-redis`
   - **Redis Version** : `7`
   - **Password** : Générer (ou laisser vide pour pas de mot de passe)

### 7.2 Mettre à jour REDIS_URL

Dans les variables d'environnement Medusa :
```bash
REDIS_URL=redis://mytechgear-medusa-redis:6379
```

---

## Checklist de Migration

### Préparation
- [ ] Backup base locale créé (`backups/medusa-*.dump`)
- [ ] Backup vérifié (tables, données)
- [ ] Credentials Stripe/Brevo disponibles

### Coolify Setup
- [ ] PostgreSQL créé sur Coolify
- [ ] Redis créé sur Coolify
- [ ] Variables d'environnement configurées
- [ ] Public access PostgreSQL désactivé

### Migration Base
- [ ] Dump restauré sur Coolify
- [ ] Nombre de produits correct (14+)
- [ ] Nombre de variantes correct (52+)
- [ ] Tags restaurés (37+)

### Tests Local → Coolify DB
- [ ] Medusa local se connecte à DB Coolify
- [ ] `/health` retourne 200
- [ ] Admin accessible
- [ ] Products visibles

### Déploiement Coolify
- [ ] Application Medusa déployée
- [ ] Build réussi
- [ ] Medusa démarre sans erreur
- [ ] Admin accessible en production
- [ ] Store API fonctionne

---

## Troubleshooting

### Erreur : Connection refused

**Cause** : Public access désactivé ou firewall

**Solution** :
```bash
# Vérifier que Public Access est activé dans Coolify
# OU utiliser un tunnel SSH
ssh -L 5432:localhost:5432 user@coolify-server
```

### Erreur : Password authentication failed

**Cause** : Mauvais mot de passe

**Solution** :
```bash
# Régénérer le mot de passe dans Coolify
# Mettre à jour DATABASE_URL
```

### Erreur : Database does not exist

**Cause** : Base non créée

**Solution** :
```bash
# Créer la base manuellement
psql postgres://medusa:PASSWORD@HOST:5432/postgres -c "CREATE DATABASE medusa;"
```

### Dump trop gros pour restaurer

**Cause** : Images en base (si stockées en DB)

**Solution** :
```bash
# Restaurer seulement le schéma et les données critiques
pg_restore --schema-only backups/medusa-*.dump
pg_restore --data-only -t product -t product_variant backups/medusa-*.dump
```

---

## Rollback (retour en arrière)

Si problème avec la migration :

```bash
# Restaurer .env local
cp .env.backup-local-YYYYMMDD .env

# Relancer Medusa local
npm run dev
```

---

## Post-Migration

### Optimisations PostgreSQL

```sql
-- Analyser les tables
ANALYZE;

-- Reconstruire les index
REINDEX DATABASE medusa;

-- Vacuum
VACUUM ANALYZE;
```

### Monitoring

Dans Coolify :
- Vérifier les logs PostgreSQL
- Vérifier l'utilisation disque
- Configurer des alertes (CPU, RAM, Disk)

### Backups automatiques

Coolify propose des backups automatiques :
1. **Settings** → **Backups**
2. Activer **Automatic Backups**
3. Fréquence : **Daily** (quotidien)
4. Rétention : **7 days**

---

**Prochaine étape** : Une fois la migration validée, déployer le frontend Next.js sur Coolify avec la même DATABASE_URL.
