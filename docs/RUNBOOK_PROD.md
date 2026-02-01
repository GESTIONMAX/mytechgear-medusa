# Runbook Production - MyTechGear Backend

**Version** : 1.0
**Dernière mise à jour** : 2026-02-01

---

## Architecture Globale

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                 https://mytechgear.com                   │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ HTTPS (Store API)
                        ▼
┌──────────────────────────────────────────────────────────┐
│              MEDUSA BACKEND (Node.js 20+)                │
│                    Port 9000                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Modules:                                           │  │
│  │ • Product (catalogue)                              │  │
│  │ • Cart / Order (transactions)                      │  │
│  │ • Customer (comptes clients)                       │  │
│  │ • Fulfillment (shipping)                           │  │
│  │ • File (images)                                    │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Providers:                                         │  │
│  │ • Stripe (paiement)                                │  │
│  │ • Brevo (email)                                    │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────┬──────────────────────┘
                │                   │
                │                   │
     ┌──────────▼─────────┐  ┌──────▼──────────┐
     │   PostgreSQL       │  │  Redis (cache)  │
     │   Database         │  │  (optionnel)    │
     │   Port 5432        │  │  Port 6379      │
     └────────────────────┘  └─────────────────┘
                │
                │
     ┌──────────▼─────────────────────────────────┐
     │         SERVICES EXTERNES                  │
     │                                            │
     │  • Stripe API (paiements)                  │
     │  • Brevo API (emails transactionnels)     │
     │  • GitHub (code)                           │
     └────────────────────────────────────────────┘
```

---

## Services Utilisés

### Medusa v2.13.1

**Rôle** : Backend e-commerce headless

**Port** : 9000

**Process** :
```bash
npm run dev    # Développement
npm run start  # Production
```

**Configuration** : `medusa-config.ts`

**Database** : PostgreSQL 14+

---

### PostgreSQL

**Rôle** : Base de données transactionnelle

**Version** : 14+

**Port** : 5432

**Database** : `mytechgear_medusa`

**Connexion** :
```
DATABASE_URL=postgres://user:password@localhost:5432/mytechgear_medusa
```

**Tables principales** :
- `product` (catalogue)
- `product_variant` (variantes)
- `order` (commandes)
- `cart` (paniers)
- `customer` (clients)
- `payment` (transactions)

**Backup** : Automatique (à configurer)

---

### Stripe

**Rôle** : Provider paiement

**Mode** : Capture automatique

**Configuration** :
```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Webhooks** :
- `payment_intent.succeeded` → Commande confirmée
- `payment_intent.payment_failed` → Paiement échoué

**Dashboard** : https://dashboard.stripe.com

---

### Brevo (ex-Sendinblue)

**Rôle** : Provider emails transactionnels

**Module** : Custom (`src/modules/brevo-notification`)

**Configuration** :
```env
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear
```

**Emails envoyés** :
- Confirmation commande
- Tracking expédition
- Réinitialisation mot de passe
- Bienvenue nouveau client

**Dashboard** : https://app.brevo.com

---

### File Storage (local)

**Rôle** : Stockage images produits

**Répertoire** : `./uploads/`

**URLs** :
```
http://localhost:9000/static/private-{timestamp}-{filename}.{ext}
```

**Migration prévue** : S3 + CloudFront (Phase 2)

---

### Redis (optionnel)

**Rôle** : Cache + Event Bus

**Port** : 6379

**Configuration** :
```env
REDIS_URL=redis://localhost:6379
```

**Usage actuel** : Fake in-memory (dev)

**Production** : Redis obligatoire

---

## Variables d'Environnement Critiques

### `.env` (Production)

```bash
# ==================================================
# DATABASE
# ==================================================
DATABASE_URL=postgres://user:password@host:5432/mytechgear_medusa

# ==================================================
# REDIS (obligatoire en prod)
# ==================================================
REDIS_URL=redis://localhost:6379

# ==================================================
# STRIPE PAYMENT
# ==================================================
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# ==================================================
# BREVO EMAIL
# ==================================================
BREVO_API_KEY=your_brevo_api_key_here
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear

# ==================================================
# MEDUSA
# ==================================================
MEDUSA_ADMIN_ONBOARDING_TYPE=default
MEDUSA_ADMIN_ONBOARDING_NEXTJS=false

# ==================================================
# CORS (Frontend)
# ==================================================
STORE_CORS=https://mytechgear.com
ADMIN_CORS=https://admin.mytechgear.com

# ==================================================
# JWT
# ==================================================
JWT_SECRET=RANDOM_SECURE_STRING_HERE
COOKIE_SECRET=RANDOM_SECURE_STRING_HERE
```

### Variables Sensibles (NE JAMAIS COMMIT)

❌ **Interdit dans Git** :
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `BREVO_API_KEY`
- `DATABASE_URL` (avec password)
- `JWT_SECRET`
- `COOKIE_SECRET`

✅ **Stockage sécurisé** :
- Vault (HashiCorp)
- Secrets Manager (AWS, GCP)
- Variables environnement serveur

---

## Déploiement

### Prérequis

**Serveur** :
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- Nginx (reverse proxy)

**Ressources minimales** :
- CPU : 2 vCPU
- RAM : 2 GB
- Disque : 20 GB SSD

### Build

```bash
# 1. Install dependencies
npm ci --production

# 2. Build Medusa
npm run build

# 3. Run migrations
npx medusa db:migrate

# 4. Seed initial data (first deploy only)
npx medusa exec ./src/scripts/seed.ts
```

### Start Production

```bash
# Option 1 : npm script
npm run start

# Option 2 : PM2 (recommandé)
pm2 start npm --name "medusa-backend" -- start
pm2 save
pm2 startup
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.mytechgear.com;

    ssl_certificate /etc/ssl/certs/mytechgear.crt;
    ssl_certificate_key /etc/ssl/private/mytechgear.key;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Procédures Courantes

### Nouveau Produit

**Scénario** : Ajouter "Nova" au catalogue

**Étapes** :

1. **Fetch images Shopify**
   ```bash
   node src/scripts/fetch-shopify-images.js
   ```

2. **Créer produit dans Admin**
   - URL : http://localhost:9000/app/products/create
   - Handle : `nova`
   - Titre : "Nova"
   - Subtitle : Description courte
   - Description : Markdown complet
   - Prix : TTC EUR (ex: 34900 = 349.00€)
   - Options : Couleur, Verres, etc.
   - Variantes : Créer combinaisons

3. **Enrichir metadata**
   ```typescript
   // Dans Admin > Product > Metadata
   {
     "brand": "Chamelo",
     "product_family": "nova",
     "has_audio": true,
     "bluetooth": true,
     "lens_technology": "Electrochromic",
     "uv_protection": "100%",
     "frame_style": "Sport wrap",
     "warranty_years": 2
   }
   ```

4. **Upload images**
   ```bash
   npx medusa exec ./src/scripts/upload-product-images.ts
   ```

5. **Auto-assign tags**
   ```bash
   npx medusa exec ./src/scripts/assign-product-tags.ts
   ```

6. **Publier**
   - Admin > Product > Status : `published`

**Durée** : 20-30 minutes

---

### Changement Prix

**Scénario** : Baisser prix "Aura" de 349€ à 299€

**Étapes** :

1. **Admin Medusa**
   - URL : http://localhost:9000/app/products
   - Rechercher "Aura"
   - Cliquer produit

2. **Modifier variantes**
   - Onglet "Variants"
   - Pour chaque variante :
     - Cliquer "Edit"
     - Prix : `29900` (299.00€ en centimes)
     - Sauvegarder

3. **Vérifier frontend**
   - Cache peut mettre ~5 min à invalider
   - Forcer refresh si besoin

**Durée** : 5 minutes

**Note** : Commandes en cours conservent ancien prix (normal)

---

### Ajout Images

**Scénario** : Ajouter photos produit existant

**Étapes** :

1. **Placer images localement**
   ```bash
   mkdir -p ./images/custom
   cp /path/to/images/*.jpg ./images/custom/
   ```

2. **Upload via Admin**
   - Admin > Product > Media
   - Drag & drop images
   - OU utiliser API :
     ```bash
     curl -X POST http://localhost:9000/admin/uploads \
       -H "Authorization: Bearer {admin_token}" \
       -F "files=@./images/custom/image-1.jpg"
     ```

3. **Associer à produit**
   - Admin > Product > Media
   - Cliquer "Add Media"
   - Sélectionner images uploadées
   - Définir thumbnail (première image)

**Durée** : 10 minutes

---

### Remboursement Client

**Scénario** : Client retourne produit, demande remboursement

**Prérequis** :
- Commande état ≥ `payment_authorized`
- Délai < 14 jours (loi UE)

**Étapes** :

1. **Créer Return**
   - Admin > Orders > Commande client
   - Onglet "Returns"
   - "Create Return"
   - Sélectionner items retournés
   - Raison : "Customer request"
   - Sauvegarder

2. **Valider réception produit**
   - Vérifier état produit physiquement
   - Si OK : marquer Return "Received"

3. **Rembourser via Stripe**
   - Admin > Orders > Commande
   - Onglet "Payment"
   - "Refund"
   - Montant : Total ou partiel
   - Confirmer

4. **Réincrémenter stock**
   - Admin > Products > Variante
   - Inventory : +1
   - Sauvegarder

5. **Email client**
   - Automatique via Brevo (si configuré)
   - OU manuel si nécessaire

**Durée** : 15 minutes

---

### Incident Paiement

**Scénario** : Client signale "paiement refusé"

**Diagnostic** :

1. **Vérifier logs Stripe**
   - Dashboard : https://dashboard.stripe.com/logs
   - Rechercher par email client
   - Identifier erreur :
     - Carte refusée → Client doit contacter banque
     - 3D Secure échoué → Réessayer
     - Insufficient funds → Client sans fonds

2. **Vérifier logs Medusa**
   ```bash
   # Si PM2
   pm2 logs medusa-backend --lines 100

   # Si direct
   tail -100 /var/log/medusa/error.log
   ```

3. **Vérifier webhooks**
   - Stripe Dashboard > Webhooks
   - Vérifier `payment_intent.payment_failed` reçu
   - Si non reçu → problème webhook

**Actions** :

- **Si carte refusée** : Client doit réessayer autre carte
- **Si webhook raté** : Re-trigger manuellement
- **Si bug Medusa** : Créer commande manuellement

**Durée** : 10-30 minutes (selon complexité)

---

### Gestion Stock

**Scénario** : Réception nouveau stock fournisseur

**Étapes** :

1. **Lister produits impactés**
   - Ex: +10 Aura Black, +5 Music Shield Fire

2. **Mettre à jour inventaire**
   - Admin > Products > Variante
   - Inventory Quantity : +10
   - Sauvegarder

3. **Vérifier disponibilité frontend**
   - Produit passe de "Rupture" à "En stock"
   - Délai cache : ~5 min

**Automatisation future** : API sync fournisseur (Phase 3)

**Durée** : 5 minutes par produit

---

## Observabilité

### Logs

**Développement** :
```bash
npm run dev
# Logs console direct
```

**Production (PM2)** :
```bash
# Logs temps réel
pm2 logs medusa-backend

# Logs erreurs uniquement
pm2 logs medusa-backend --err

# 100 dernières lignes
pm2 logs medusa-backend --lines 100
```

**Fichiers logs** :
- `~/.pm2/logs/medusa-backend-out.log` (stdout)
- `~/.pm2/logs/medusa-backend-error.log` (stderr)

### Monitoring Stripe

**Dashboard** : https://dashboard.stripe.com

**Métriques importantes** :
- Taux réussite paiement (> 95%)
- Volume transactions
- Remboursements

**Alertes** :
- Paiement échoué > 10% → Investigation
- Webhook échoué → Vérifier endpoint

### Monitoring Brevo

**Dashboard** : https://app.brevo.com/statistics

**Métriques importantes** :
- Emails envoyés
- Taux ouverture (> 20%)
- Taux bounce (< 2%)

**Alertes** :
- Quota dépassé (300/jour gratuit)
- Taux bounce élevé → Vérifier adresses

### Health Checks

**Endpoint** : `GET /health`

**Response** :
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T14:30:00Z"
}
```

**Monitoring externe** : UptimeRobot, Pingdom, etc.

**Intervalle** : 1 minute

---

## Procédures Secours

### Database Backup

**Automatique (cron)** :
```bash
# Tous les jours à 2h
0 2 * * * pg_dump mytechgear_medusa > /backups/medusa-$(date +\%Y\%m\%d).sql
```

**Manuel** :
```bash
# Backup
pg_dump mytechgear_medusa > backup-$(date +%Y%m%d).sql

# Compress
gzip backup-$(date +%Y%m%d).sql
```

**Restore** :
```bash
# Décompresser
gunzip backup-20260201.sql.gz

# Restore
psql mytechgear_medusa < backup-20260201.sql
```

### Rollback Déploiement

**Si déploiement casse prod** :

1. **Identifier commit stable**
   ```bash
   git log --oneline -10
   ```

2. **Rollback code**
   ```bash
   git checkout {commit_hash}
   npm ci
   npm run build
   ```

3. **Restart service**
   ```bash
   pm2 restart medusa-backend
   ```

4. **Vérifier health**
   ```bash
   curl http://localhost:9000/health
   ```

**Durée** : 5-10 minutes

### Stripe Incident

**Si Stripe down** :

1. **Status** : https://status.stripe.com

2. **Mode dégradé** :
   - Désactiver checkout temporairement
   - Afficher message maintenance
   - Conserver paniers clients (TTL 7 jours)

3. **Reprise** :
   - Réactiver checkout
   - Vérifier webhooks non reçus
   - Reprocess si nécessaire

### Brevo Incident

**Si Brevo down** :

1. **Status** : https://status.brevo.com

2. **Impact** :
   - Emails transactionnels non envoyés
   - Commandes fonctionnent normalement
   - Clients ne reçoivent pas confirmation

3. **Reprise** :
   - Brevo retry automatiquement (24h)
   - OU re-trigger manuellement si urgent

---

## Ce Qu'il Ne Faut JAMAIS Faire

### ❌ Modifier Database en Direct

**Interdit** :
```sql
-- NE JAMAIS FAIRE
UPDATE product SET price = 29900 WHERE handle = 'aura';
```

**Pourquoi** :
- Bypass logique métier
- Pas de logs
- Pas de webhooks
- Corruption données

**Alternative** : Utiliser Admin ou API

---

### ❌ Committer `.env` dans Git

**Interdit** :
```bash
git add .env
git commit -m "Add env"
```

**Pourquoi** :
- Secrets exposés publiquement
- Risque sécurité critique

**Alternative** : Variables environnement serveur

---

### ❌ Supprimer Produit avec Commandes

**Interdit** :
- Admin > Product > Delete (si commandes existent)

**Pourquoi** :
- Perte historique commandes
- Facturation cassée

**Alternative** : Archiver (`status = archived`)

---

### ❌ Modifier Handle Produit Publié

**Interdit** :
- Changer `handle: "aura"` → `handle: "aura-v2"`

**Pourquoi** :
- Casse URLs frontend
- SEO perdu
- Links externes cassés

**Alternative** : Créer nouveau produit

---

### ❌ Refund sans Return

**Interdit** :
- Rembourser client AVANT validation retour physique

**Pourquoi** :
- Risque fraude
- Perte stock + argent

**Alternative** : Créer Return d'abord, valider réception, puis refund

---

### ❌ Désactiver Webhooks Stripe

**Interdit** :
- Stripe Dashboard > Webhooks > Disable

**Pourquoi** :
- Commandes non confirmées
- Stock non décrémenté
- Business logique cassée

**Alternative** : Jamais désactiver en prod

---

### ❌ Run Scripts Prod depuis Local

**Interdit** :
```bash
# Depuis laptop, DATABASE_URL = prod
npx medusa exec ./src/scripts/assign-product-tags.ts
```

**Pourquoi** :
- Risque écrasement données
- Latence réseau
- Pas de logs serveur

**Alternative** : SSH serveur, run depuis serveur

---

## Checklist Avant Mise en Production

### Code & Configuration

- [ ] `.env.production` configuré (pas de valeurs dev)
- [ ] `CORS` autorise uniquement domaine prod
- [ ] `JWT_SECRET` et `COOKIE_SECRET` uniques et forts
- [ ] Stripe clés **live** (pas test)
- [ ] Brevo sender email vérifié
- [ ] Redis configuré (pas fake in-memory)

### Database

- [ ] Migrations appliquées (`npx medusa db:migrate`)
- [ ] Seed data exécuté (products, tags, shipping)
- [ ] Backup automatique configuré (cron)
- [ ] User PostgreSQL avec password fort

### Services Externes

- [ ] Stripe webhook configuré (endpoint prod)
- [ ] Stripe test payments réussis (carte test)
- [ ] Brevo emails test envoyés et reçus
- [ ] DNS configuré (api.mytechgear.com)
- [ ] SSL/TLS certificat valide

### Monitoring

- [ ] Health check endpoint accessible
- [ ] Uptime monitoring configuré
- [ ] Logs centralisés (PM2 ou ELK)
- [ ] Alertes erreurs configurées

### Performance

- [ ] Cache Redis activé
- [ ] Images optimisées (< 500KB)
- [ ] Gzip activé (Nginx)
- [ ] CDN configuré (si S3)

### Sécurité

- [ ] HTTPS forcé
- [ ] Rate limiting activé
- [ ] CORS strict (domaines autorisés uniquement)
- [ ] Headers sécurité (CSP, HSTS)
- [ ] Aucun secret dans Git

### Tests

- [ ] Commande test complète (panier → paiement → confirmation)
- [ ] Email confirmation reçu
- [ ] Admin accessible
- [ ] API Store accessible depuis frontend

---

## Contacts & Escalade

### Équipe Technique

**Backend Lead** : [À définir]
**DevOps** : [À définir]
**Product Owner** : [À définir]

### Support Services Externes

**Stripe Support** :
- Dashboard : https://dashboard.stripe.com/support
- Email : support@stripe.com

**Brevo Support** :
- Dashboard : https://app.brevo.com/support
- Email : support@brevo.com

**Medusa Support** :
- Discord : https://discord.gg/medusajs
- GitHub : https://github.com/medusajs/medusa/issues

### Escalade

**P1 (Critique - Site down)** :
- Notification : Immédiate
- Temps réponse : < 15 min
- Exemples : Database down, Stripe down, erreur 500 générale

**P2 (Majeur - Fonctionnalité cassée)** :
- Notification : < 1h
- Temps réponse : < 2h
- Exemples : Checkout cassé, emails non envoyés

**P3 (Mineur - Bug UX)** :
- Notification : < 4h
- Temps réponse : < 1 jour
- Exemples : Image manquante, texte incorrect

---

## Glossary Opérationnel

**Handle** : Identifiant URL-safe produit (ex: `aura`)

**SKU** : Stock Keeping Unit - identifiant variante

**TTC** : Toutes Taxes Comprises (prix affiché client)

**Capture** : Action Stripe de débiter réellement la carte (automatique chez nous)

**Webhook** : Notification événement (Stripe → Medusa)

**Provider** : Module externe (Stripe, Brevo)

**Idempotent** : Script re-run safe (pas de duplication)

**PM2** : Process manager Node.js production

---

**Prochaine révision** : Après déploiement production
