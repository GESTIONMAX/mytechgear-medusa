# Quick Start - Migration Coolify

**Objectif** : Migrer Medusa + PostgreSQL vers Coolify en 30 minutes

---

## 🚀 Étape 1 : Backup de la base locale (5 min)

```bash
cd "/home/gestionmax-aur-lien/CascadeProjects/medusa/mytechgear-medusa-backend /mytechgear-medusa"

# Lancer le script de backup
./scripts/backup-database.sh
```

**Résultat** : 2 fichiers créés dans `backups/`
- `medusa-YYYYMMDD-HHMMSS.dump` (format custom)
- `medusa-YYYYMMDD-HHMMSS.sql` (format SQL)

---

## 🐘 Étape 2 : Créer PostgreSQL sur Coolify (5 min)

### Dans Coolify Web UI

1. **Resources** → **+ New Resource** → **Database** → **PostgreSQL**

2. Configuration :
   - **Name** : `mytechgear-medusa-db`
   - **PostgreSQL Version** : `16`
   - **Database Name** : `medusa`
   - **Username** : `medusa`
   - **Password** : Générer un mot de passe sécurisé ✅
   - **Port** : `5432`
   - **Public Access** : ✅ **Activer** (temporaire pour migration)

3. **Create**

### Noter les credentials

Coolify affiche :
```
postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa
```

**⚠️ COPIER cette URL** → on en aura besoin

---

## 📤 Étape 3 : Restaurer sur Coolify (10 min)

```bash
# Remplacer:
# - backups/medusa-YYYYMMDD-HHMMSS.dump par votre fichier
# - DATABASE_URL par l'URL Coolify

./scripts/restore-to-coolify.sh \
  backups/medusa-20260201-123456.dump \
  postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa
```

**Questions du script** :
- "Voulez-vous DROP toutes les tables existantes?" → `y` (première fois)

**Résultat attendu** :
```
✓ 50+ tables restaurées
✓ 14+ produits
✓ 52+ variantes
✓ 37+ tags
```

---

## 🧪 Étape 4 : Tester Medusa local avec DB Coolify (5 min)

### Backup .env actuel

```bash
cp .env .env.backup-local-$(date +%Y%m%d)
```

### Modifier .env

```bash
nano .env
```

**Remplacer** :
```bash
DATABASE_URL=postgres://medusa:medusa@localhost:5433/medusa
```

**Par** (URL Coolify) :
```bash
DATABASE_URL=postgres://medusa:VOTRE_MOT_DE_PASSE@xxx.xxx.xxx.xxx:5432/medusa
```

### Tester

```bash
# Lancer Medusa
npm run dev

# Dans un autre terminal
curl http://localhost:9000/health
# Résultat attendu: {"status":"ok"}

# Ouvrir admin
xdg-open http://localhost:9000/app
```

**Vérifications** :
- ✅ Medusa démarre sans erreur
- ✅ Admin accessible
- ✅ 14+ produits visibles
- ✅ Images affichées

---

## 🔒 Étape 5 : Sécuriser PostgreSQL Coolify (2 min)

### Désactiver l'accès public

Dans Coolify :
1. Aller dans `mytechgear-medusa-db`
2. **Settings** → **Public Access** : ❌ **Désactiver**
3. **Save**

**Note** : La base ne sera accessible que depuis les apps Coolify du même réseau.

---

## 🔴 Étape 6 : Créer Redis sur Coolify (3 min)

### Dans Coolify Web UI

1. **Resources** → **+ New Resource** → **Database** → **Redis**

2. Configuration :
   - **Name** : `mytechgear-medusa-redis`
   - **Redis Version** : `7`
   - **Password** : (laisser vide ou générer)

3. **Create**

### Noter l'URL interne

```
redis://mytechgear-medusa-redis:6379
```

---

## 🚢 Étape 7 : Déployer Medusa sur Coolify (10 min)

### Créer l'application

1. **Resources** → **+ New Resource** → **Git Repository**

2. Configuration :
   - **Git Repository** : `https://github.com/GESTIONMAX/mytechgear-medusa.git`
   - **Branch** : `main`
   - **Name** : `mytechgear-medusa-backend`
   - **Build Pack** : Node.js
   - **Port** : `9000`

### Variables d'environnement

**Settings** → **Environment Variables** :

```bash
# Database (connexion interne Coolify)
DATABASE_URL=postgres://medusa:VOTRE_MOT_DE_PASSE@mytechgear-medusa-db:5432/medusa

# Redis (connexion interne)
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

# Secrets (générer des valeurs sécurisées)
JWT_SECRET=GENERER_SECRET_FORT_64_CHARS
COOKIE_SECRET=GENERER_SECRET_FORT_64_CHARS
```

**Générer les secrets** :
```bash
# Générer JWT_SECRET
openssl rand -base64 48

# Générer COOKIE_SECRET
openssl rand -base64 48
```

### Build & Start Commands

**Build Command** :
```bash
npm install && npm run build
```

**Start Command** :
```bash
npm run start
```

### Déployer

1. **Deploy**
2. Attendre la fin du build (3-5 min)
3. Vérifier les logs

---

## ✅ Checklist finale

### Base de données
- [ ] Backup local créé
- [ ] PostgreSQL créé sur Coolify
- [ ] Dump restauré (14+ produits)
- [ ] Public Access désactivé

### Redis
- [ ] Redis créé sur Coolify
- [ ] URL notée

### Application Medusa
- [ ] Repository connecté
- [ ] Variables d'environnement configurées
- [ ] Secrets générés (JWT_SECRET, COOKIE_SECRET)
- [ ] Build réussi
- [ ] Application démarrée

### Tests production
- [ ] Admin accessible : `https://votre-app.coolify.app/app`
- [ ] Health check OK : `https://votre-app.coolify.app/health`
- [ ] Store API fonctionne : `https://votre-app.coolify.app/store/products`
- [ ] Produits visibles dans admin

---

## 🆘 Troubleshooting rapide

### Erreur : Connection refused

**Cause** : Public access désactivé trop tôt

**Solution** :
```bash
# Réactiver Public Access temporairement dans Coolify
# Re-run restore script
```

### Erreur : Build failed

**Cause** : Variables d'environnement manquantes

**Solution** :
```bash
# Vérifier que DATABASE_URL et REDIS_URL sont définis
# Vérifier les logs de build dans Coolify
```

### Admin Medusa ne charge pas

**Cause** : JWT_SECRET ou COOKIE_SECRET non défini

**Solution** :
```bash
# Générer et ajouter les secrets
openssl rand -base64 48
```

### Images ne s'affichent pas

**Cause** : File service Medusa non configuré

**Solution** :
```bash
# Vérifier dans medusa-config.ts que file service est configuré
# Pour l'instant images sont en local (localhost:9000/static/*)
# TODO: Migrer vers S3 (Phase 2)
```

---

## 📚 Documentation complète

Pour plus de détails : [docs/COOLIFY_DATABASE_MIGRATION.md](docs/COOLIFY_DATABASE_MIGRATION.md)

---

## 🎯 Prochaines étapes

Une fois Medusa déployé sur Coolify :

1. **Frontend Next.js** :
   - Déployer frontend sur Coolify
   - Pointer `NEXT_PUBLIC_MEDUSA_BACKEND_URL` vers l'URL Coolify

2. **Images S3/CDN** (Phase 2) :
   - Migrer images locales vers S3
   - Configurer CloudFront CDN

3. **Backups automatiques** :
   - Activer backups quotidiens dans Coolify
   - Rétention 7 jours minimum

4. **Monitoring** :
   - Configurer alertes (CPU, RAM, Disk)
   - Logs centralisés

---

**Temps total estimé** : 30-40 minutes

✅ **Résultat** : Medusa + PostgreSQL + Redis déployés sur Coolify avec toutes les données migrées
