# Guide de Configuration Stripe pour MyTechGear

## ✅ Configuration actuelle

Le module Stripe est maintenant configuré dans Medusa. Il vous reste à obtenir vos clés API.

## 📋 Étapes pour obtenir vos clés Stripe

### 1. Créer un compte Stripe (si vous n'en avez pas)

1. Allez sur **https://stripe.com**
2. Cliquez sur **"Commencer"** ou **"S'inscrire"**
3. Remplissez vos informations :
   - Email professionnel
   - Nom de votre entreprise : **MyTechGear**
   - Pays : **France**
   - Type d'entreprise
4. Validez votre email

### 2. Obtenir la clé secrète (Secret Key)

1. Connectez-vous à votre compte Stripe
2. Allez dans le **Dashboard Stripe**: https://dashboard.stripe.com
3. Dans le menu de gauche, cliquez sur **"Développeurs"** (ou **"Developers"**)
4. Cliquez sur **"Clés API"** (ou **"API keys"**)
5. Vous verrez deux types de clés :
   - **Clés de test** (commencent par `sk_test_...`) - Pour développement
   - **Clés de production** (commencent par `sk_live_...`) - Pour production

6. **Pour commencer, utilisez les clés de TEST**
7. Cliquez sur **"Révéler la clé de test secrète"**
8. Copiez la clé qui commence par `sk_test_...`

### 3. Configurer le Webhook

Les webhooks permettent à Stripe de notifier Medusa des événements de paiement.

1. Dans le Dashboard Stripe, allez dans **"Développeurs"** > **"Webhooks"**
2. Cliquez sur **"Ajouter un point de terminaison"** (ou **"Add endpoint"**)
3. Dans **"URL du point de terminaison"**, entrez :
   ```
   http://localhost:9000/hooks/stripe
   ```

4. Dans **"Événements à écouter"**, cliquez sur **"Sélectionner des événements"**
5. Recherchez et sélectionnez ces événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.canceled`

6. Cliquez sur **"Ajouter un point de terminaison"**
7. Une fois créé, cliquez sur le webhook pour voir ses détails
8. Copiez le **"Secret de signature"** (commence par `whsec_...`)

### 4. Ajouter les clés dans le fichier .env

1. Ouvrez le fichier `.env` dans votre éditeur
2. Remplacez les valeurs suivantes :

```env
STRIPE_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE_ICI
STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_WEBHOOK_ICI
```

**Exemple** :
```env
STRIPE_SECRET_KEY=sk_test_51OAbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

3. **Sauvegardez le fichier**

### 5. Redémarrer le serveur Medusa

Les variables d'environnement sont chargées au démarrage. Vous devez redémarrer le serveur :

```bash
# Arrêtez le serveur actuel (Ctrl+C dans le terminal)
# Puis relancez :
npm run dev
```

## 🧪 Tester Stripe

### Cartes bancaires de test

Stripe fournit des numéros de cartes de test :

**Carte qui réussit toujours** :
- Numéro : `4242 4242 4242 4242`
- Date d'expiration : N'importe quelle date future (ex: 12/30)
- CVC : N'importe quel code 3 chiffres (ex: 123)

**Carte qui échoue** :
- Numéro : `4000 0000 0000 0002`
- Date : Future
- CVC : 123

**Autres cartes de test** : https://stripe.com/docs/testing#cards

### Test dans Medusa Admin

1. Allez dans l'admin : http://localhost:9000
2. Créez une commande de test
3. Au moment du paiement, vous devriez voir **Stripe** comme option
4. Utilisez une carte de test pour valider le paiement

## 🚨 IMPORTANT : Sécurité

### ⚠️ Ne JAMAIS committer le fichier .env

Le fichier `.env` contient des secrets. Il est déjà dans `.gitignore`.

**Vérifiez** :
```bash
git status
```

Si `.env` apparaît, ajoutez-le à `.gitignore` :
```bash
echo ".env" >> .gitignore
```

### 🔐 Clés de test vs Production

- **Développement** : Utilisez `sk_test_...` (clés de test)
- **Production** : Utilisez `sk_live_...` (clés live)

**ATTENTION** : Les clés live permettent des vrais paiements. Ne les utilisez qu'en production !

## 📊 Vérifier la configuration

### Dans le Dashboard Stripe

1. Allez dans **"Développeurs"** > **"Webhooks"**
2. Vous devriez voir votre webhook avec le statut **"Actif"**
3. Testez en envoyant un événement de test

### Dans Medusa

Vérifiez que Stripe apparaît dans les logs au démarrage :
```
[INFO] Payment provider loaded: stripe
```

## 🇫🇷 Configuration France

### TVA et facturation

Stripe gère automatiquement :
- La TVA française (20%)
- Les factures conformes aux normes UE
- Les paiements SEPA (virement européen)

### Méthodes de paiement populaires en France

Par défaut, Stripe active :
- ✅ Cartes bancaires (CB, Visa, Mastercard)
- ✅ Cartes internationales

**Pour activer d'autres méthodes** (optionnel) :
1. Dashboard Stripe > **"Paramètres"** > **"Méthodes de paiement"**
2. Activez :
   - **SEPA Direct Debit** (prélèvement SEPA)
   - **Bancontact** (Belgique)
   - **iDEAL** (Pays-Bas)
   - **Apple Pay**
   - **Google Pay**

## 🔗 Liens utiles

- **Dashboard Stripe** : https://dashboard.stripe.com
- **Documentation Stripe** : https://stripe.com/docs
- **Cartes de test** : https://stripe.com/docs/testing#cards
- **Webhooks** : https://dashboard.stripe.com/webhooks
- **Événements** : https://dashboard.stripe.com/events

## ❓ Résolution de problèmes

### Erreur "Invalid API Key"

- Vérifiez que la clé commence bien par `sk_test_` ou `sk_live_`
- Pas d'espaces avant/après la clé dans le `.env`
- Redémarrez le serveur après modification du `.env`

### Webhook non reçu

- Vérifiez l'URL : `http://localhost:9000/hooks/stripe`
- Le serveur Medusa doit être en cours d'exécution
- En production, utilisez une URL publique (https://)

### Paiement refusé en test

- Utilisez les cartes de test Stripe
- Les vraies cartes ne fonctionnent pas en mode test

## 📝 Prochaines étapes

Une fois Stripe configuré :
1. ✅ Testez un paiement complet dans le frontend
2. 📸 Uploadez les images produits
3. 📦 Configurez les niveaux d'inventaire
4. 🚀 Préparez le passage en production

---

**Besoin d'aide ?** Consultez la documentation Medusa : https://docs.medusajs.com/resources/commerce-modules/payment
