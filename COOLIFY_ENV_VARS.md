# Variables d'environnement pour Coolify - MyTechGear Medusa

**Date** : 2026-02-01
**Application** : mytechgear-medusa-backend
**Version Medusa** : 2.13.1

---

## Variables obligatoires

### 1. Base de données PostgreSQL

```bash
# Connexion PostgreSQL (fournie par Coolify)
DATABASE_URL=postgres://medusa:PASSWORD@mytechgear-medusa-db:5432/medusa
```

**Notes** :
- Utiliser le **nom de service interne** Coolify : `mytechgear-medusa-db`
- Ne PAS utiliser l'IP publique (78.47.79.58) en production
- Le mot de passe est généré automatiquement par Coolify

**Valeur actuelle (migration)** :
```
postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@78.47.79.58:5432/medusa
```

**Valeur production Coolify** :
```
postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@mytechgear-medusa-db:5432/medusa
```

---

### 2. Sécurité et Sessions

```bash
# Secrets JWT et cookies (à générer)
JWT_SECRET=<secret-aléatoire-64-caractères>
COOKIE_SECRET=<secret-aléatoire-64-caractères>
```

**Génération des secrets** :
```bash
# Générer JWT_SECRET
openssl rand -base64 64 | tr -d '\n'

# Générer COOKIE_SECRET
openssl rand -base64 64 | tr -d '\n'
```

**Exemple de valeurs** :
```
JWT_SECRET=7xK9mP2wQ5vR8nL3jF6yT1hB4gD0sA9cE7iO5uY3pN8qW2rM6kV1zX4nJ0bH8tG5
COOKIE_SECRET=3jN7hM9kL2pQ5wR8xY1vT4cF6gB0nE9sD7iA3oU5yP8qK2lZ6mX1hJ4rW9tV0gN
```

---

### 3. CORS (Cross-Origin Resource Sharing)

```bash
# URLs autorisées pour les requêtes
STORE_CORS=https://mytechgear.fr,https://www.mytechgear.fr
ADMIN_CORS=https://admin.mytechgear.fr
AUTH_CORS=https://admin.mytechgear.fr
```

**Notes** :
- Remplacer les URLs par vos domaines de production
- STORE_CORS : Frontend client (Next.js)
- ADMIN_CORS : Interface admin Medusa
- AUTH_CORS : Authentification admin

**Valeurs de développement (actuelles)** :
```
STORE_CORS=http://localhost:3200,http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:9000
```

---

## Variables optionnelles (recommandées)

### 4. Stripe Payment Provider

```bash
# Clés API Stripe
STRIPE_SECRET_KEY=sk_live_VOTRE_CLE_STRIPE_ICI
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Comment obtenir** :
1. Créer compte Stripe : https://stripe.com
2. Aller dans **Développeurs** → **Clés API**
3. Copier la clé secrète (sk_live_... pour production, sk_test_... pour test)
4. Créer webhook : **Développeurs** → **Webhooks**
   - URL : `https://votre-domaine.com/hooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copier le secret de webhook (whsec_...)

**Statut actuel** :
```
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=YOUR_STRIPE_WEBHOOK_SECRET_HERE
```

---

### 5. Brevo Email Service (ex-Sendinblue)

```bash
# Clés API Brevo
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear
```

**Comment obtenir** :
1. Créer compte Brevo : https://www.brevo.com (GRATUIT jusqu'à 300 emails/jour)
2. Confirmer votre email
3. Aller dans **Paramètres** → **Clés API et SMTP** → **Clés API**
4. Créer une nouvelle clé : "MyTechGear Medusa Production"
5. Copier la clé (xkeysib-...)
6. Vérifier l'email expéditeur : **Paramètres** → **Expéditeurs & IP**

**Statut actuel** :
```
BREVO_API_KEY=YOUR_BREVO_API_KEY_HERE
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear
```

---

### 6. Redis (Cache & Sessions)

```bash
# Connexion Redis (fournie par Coolify)
REDIS_URL=redis://mytechgear-medusa-redis:6379
```

**Notes** :
- Créer une ressource Redis dans Coolify
- Nom : `mytechgear-medusa-redis`
- Version : Redis 7
- Pas de mot de passe nécessaire pour connexion interne

**Statut actuel** :
- Utilise un fake Redis en mémoire (développement)
- Warning : `redisUrl not found. A fake redis instance will be used.`

---

### 7. Medusa Admin

```bash
# Configuration admin
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS=false
```

---

## Variables système (optionnelles)

```bash
# Environnement
NODE_ENV=production

# Port (géré automatiquement par Coolify)
PORT=9000

# Nom de la base de données (optionnel)
DB_NAME=medusa
```

---

## Résumé : Configuration complète pour Coolify

### Variables OBLIGATOIRES à configurer

```bash
# 1. Base de données (fournie par Coolify)
DATABASE_URL=postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@mytechgear-medusa-db:5432/medusa

# 2. Secrets de sécurité (à générer avec openssl)
JWT_SECRET=<générer-avec-openssl-rand-base64-64>
COOKIE_SECRET=<générer-avec-openssl-rand-base64-64>

# 3. CORS - URLs production
STORE_CORS=https://mytechgear.fr,https://www.mytechgear.fr
ADMIN_CORS=https://admin.mytechgear.fr
AUTH_CORS=https://admin.mytechgear.fr
```

### Variables RECOMMANDÉES (pour production)

```bash
# 4. Redis (créer ressource Coolify)
REDIS_URL=redis://mytechgear-medusa-redis:6379

# 5. Stripe (obtenir sur dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# 6. Brevo (obtenir sur app.brevo.com)
BREVO_API_KEY=xkeysib-xxxxx
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear

# 7. Medusa Admin
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS=false

# 8. Environnement
NODE_ENV=production
```

---

## Checklist de configuration Coolify

### Ressources à créer dans Coolify

- [x] **PostgreSQL** : `mytechgear-medusa-db`
  - Version : 17
  - Base : `medusa`
  - User : `medusa`
  - ✅ Données migrées (16 produits, 45 variantes)

- [ ] **Redis** : `mytechgear-medusa-redis`
  - Version : 7
  - Port : 6379
  - Pas de mot de passe (connexion interne)

- [ ] **Application Medusa** : `mytechgear-medusa-backend`
  - Build : `npm install && npm run build`
  - Start : `npm run start`
  - Port : 9000

### Variables à configurer dans Coolify

#### Onglet "Environment Variables"

1. **Base de données** ✅
   - `DATABASE_URL` → Copier depuis la ressource PostgreSQL

2. **Sécurité** ⚠️
   - `JWT_SECRET` → Générer avec openssl
   - `COOKIE_SECRET` → Générer avec openssl

3. **CORS** ⚠️
   - `STORE_CORS` → URLs frontend production
   - `ADMIN_CORS` → URL admin production
   - `AUTH_CORS` → URL admin production

4. **Redis** ⏳
   - `REDIS_URL` → Après création Redis

5. **Paiements** ⏳
   - `STRIPE_SECRET_KEY` → Obtenir sur Stripe
   - `STRIPE_WEBHOOK_SECRET` → Obtenir sur Stripe

6. **Emails** ⏳
   - `BREVO_API_KEY` → Obtenir sur Brevo
   - `BREVO_SENDER_EMAIL` → Email vérifié
   - `BREVO_SENDER_NAME` → Nom expéditeur

7. **Système** ⏳
   - `NODE_ENV=production`
   - `MEDUSA_ADMIN_ONBOARDING_TYPE=default`
   - `MEDUSA_ADMIN_ONBOARDING_NEXTJS=false`

---

## Étapes de déploiement

### 1. Créer Redis sur Coolify

```
Resources → + New Resource → Database → Redis
- Name: mytechgear-medusa-redis
- Version: 7
- Password: (laisser vide pour connexion interne)
```

### 2. Configurer les variables d'environnement

Dans Coolify → Application → Settings → Environment Variables :

```bash
# Copier-coller ce bloc
DATABASE_URL=postgres://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@mytechgear-medusa-db:5432/medusa
REDIS_URL=redis://mytechgear-medusa-redis:6379
JWT_SECRET=<générer-et-coller>
COOKIE_SECRET=<générer-et-coller>
STORE_CORS=https://mytechgear.fr,https://www.mytechgear.fr
ADMIN_CORS=https://admin.mytechgear.fr
AUTH_CORS=https://admin.mytechgear.fr
STRIPE_SECRET_KEY=<obtenir-de-stripe>
STRIPE_WEBHOOK_SECRET=<obtenir-de-stripe>
BREVO_API_KEY=<obtenir-de-brevo>
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear
NODE_ENV=production
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS=false
```

### 3. Build & Deploy

```
Build Command: npm install && npm run build
Start Command: npm run start
Port: 9000
```

### 4. Configurer les domaines

```
mytechgear-api.fr → Application Medusa (port 9000)
admin.mytechgear.fr → Medusa Admin (/app)
```

### 5. Configurer Stripe Webhook

Dans Stripe Dashboard :
- URL : `https://mytechgear-api.fr/hooks/stripe`
- Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`

---

## Sécurité post-déploiement

### 1. Désactiver Public Access PostgreSQL

Dans Coolify → PostgreSQL → Settings :
- ❌ Désactiver "Make it publicly available"
- La base reste accessible depuis les apps Coolify du même réseau

### 2. Fermer port 5432 dans firewall Hetzner

Dans Hetzner Cloud Console :
- Supprimer la règle inbound TCP 5432
- Ou limiter à IP spécifique pour maintenance

### 3. Vérifier les secrets

- ✅ JWT_SECRET et COOKIE_SECRET générés aléatoirement
- ✅ Pas de secrets dans le code Git
- ✅ Stripe et Brevo keys en production (sk_live_, pas sk_test_)

---

## Données actuelles (migration réussie)

**Base de données Coolify** :
- 16 produits
- 45 variantes
- 37 tags
- 3 collections
- 1 région : France (EUR)
- Region ID : `reg_01KGBWVV7ZB2EPA479GHBBDP5K`
- Publishable API Key : `pk_651ebe89ea0748f62b3a33757a80ccdcd0c18803dcd9c845b6a10c233041ae1b`

**Tests effectués** :
- ✅ Health check : OK
- ✅ Store API : Produits accessibles
- ✅ Prix corrects (ex: 199.00€)
- ✅ Images accessibles
- ✅ Admin fonctionnel

---

## Rollback (si problème)

Si le déploiement Coolify échoue, revenir à la base locale :

```bash
# Restaurer .env local
cp .env.backup-local-20260201-191019 .env

# Redémarrer Medusa local
npm run dev
```

---

**Prochaine étape** : Créer Redis sur Coolify et obtenir les clés Stripe/Brevo pour finaliser la configuration.
