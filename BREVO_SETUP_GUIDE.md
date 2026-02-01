# Guide de Configuration Brevo (Emails) pour MyTechGear

## ✅ Configuration actuelle

Le module Brevo custom est **installé et configuré**. Il vous reste à obtenir votre clé API gratuite.

## 🇫🇷 Pourquoi Brevo pour MyTechGear ?

✅ **Français/Européen** - Entreprise française (ex-Sendinblue), serveurs en EU
✅ **RGPD-compliant** - 100% conforme aux réglementations européennes
✅ **Gratuit jusqu'à 300 emails/jour** - Pas de carte bancaire requise
✅ **Support en français** - Documentation et support dans votre langue
✅ **Templates drag & drop** - Créez des emails visuels sans coder
✅ **SMS inclus** - Bonus : envoi de SMS (optionnel)
✅ **Statistiques détaillées** - Taux d'ouverture, clics, bounces

## 📋 Étapes pour obtenir votre clé API Brevo

### 1. Créer un compte Brevo (GRATUIT)

1. Allez sur **https://www.brevo.com**
2. Cliquez sur **"Commencer gratuitement"** ou **"S'inscrire"**
3. Remplissez vos informations :
   - Email professionnel
   - Mot de passe sécurisé
   - Nom de votre entreprise : **MyTechGear**
   - Pays : **France**
4. **Confirmez votre email** (vérifiez votre boîte de réception)

**Offre gratuite :**
- 300 emails/jour (9000/mois)
- Contacts illimités
- Templates inclus
- Support par email
- **Pas de carte bancaire requise**

### 2. Configurer votre expéditeur

Avant de pouvoir envoyer des emails, vous devez configurer un expéditeur vérifié.

1. Connectez-vous à Brevo
2. Allez dans **"Paramètres"** (icône engrenage en haut à droite)
3. Cliquez sur **"Expéditeurs, domaines & adresses IP dédiées"**
4. Section **"Expéditeurs"** → Cliquez **"Ajouter un expéditeur"**

**Deux options** :

#### Option A : Utiliser votre email personnel (RAPIDE - pour tester)
- Nom : `MyTechGear`
- Email : Votre email personnel (Gmail, Outlook, etc.)
- Brevo enverra un email de vérification
- Cliquez sur le lien dans l'email
- ✅ Prêt à envoyer !

**Limitation** : Les emails proviendront de votre adresse perso (ex: `contact@gmail.com`)

#### Option B : Utiliser votre domaine (RECOMMANDÉ - pour production)
- Nom : `MyTechGear`
- Email : `contact@mytechgear.fr` (ou votre domaine)
- Suivez les instructions pour configurer les **enregistrements DNS** :
  - **SPF** : Empêche le spam
  - **DKIM** : Authentifie vos emails
  - **DMARC** : Protège votre réputation

**Configuration DNS** (chez votre hébergeur) :
```
TXT  @  "v=spf1 include:spf.brevo.com ~all"
TXT  mail._domainkey  "v=DKIM1; k=rsa; p=VOTRE_CLE_PUBLIQUE_BREVO"
```

Brevo vous donne les valeurs exactes à copier.

### 3. Obtenir votre clé API

1. Dans Brevo, allez dans **"Paramètres"** > **"Clés API et SMTP"**
2. Onglet **"Clés API"**
3. Cliquez sur **"Créer une nouvelle clé API"**
4. Donnez-lui un nom : **"MyTechGear Medusa Backend"**
5. Cliquez **"Générer"**
6. **Copiez immédiatement la clé** (vous ne pourrez plus la revoir !)
   - Format : `xkeysib-1234567890abcdef-XXXXXXXXX`

### 4. Ajouter la clé API dans Medusa

1. Ouvrez le fichier `.env` dans votre éditeur
2. Remplacez les valeurs suivantes :

```env
BREVO_API_KEY=xkeysib-VOTRE_CLE_API_ICI
BREVO_SENDER_EMAIL=contact@mytechgear.fr
BREVO_SENDER_NAME=MyTechGear
```

**Exemple complet** :
```env
BREVO_API_KEY=xkeysib-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef-XXXXXXXXX
BREVO_SENDER_EMAIL=contact@gmail.com
BREVO_SENDER_NAME=MyTechGear
```

3. **Sauvegardez le fichier**
4. **Redémarrez le serveur Medusa**

```bash
# Le serveur redémarre automatiquement avec npm run dev
# Vérifiez les logs pour voir :
# ✉️  Brevo notification service initialized
```

## 📧 Emails configurés automatiquement

Le module envoie automatiquement ces emails :

### 1. Confirmation de commande
**Événement** : Commande validée
**Contenu** :
- Numéro de commande
- Liste des produits
- Total
- Message de remerciement

### 2. Confirmation d'expédition
**Événement** : Commande expédiée
**Contenu** :
- Numéro de commande
- Numéro de suivi (si disponible)
- Transporteur
- Délai de livraison estimé

### 3. Réinitialisation de mot de passe
**Événement** : Client demande reset password
**Contenu** :
- Lien sécurisé
- Validité 1 heure
- Instructions

### 4. Email de bienvenue
**Événement** : Nouveau compte créé
**Contenu** :
- Message de bienvenue
- Présentation de la boutique
- Liens utiles

## 🎨 Personnaliser les emails (Optionnel)

### Utiliser les templates Brevo

Au lieu d'emails HTML codés en dur, vous pouvez créer des templates visuels dans Brevo :

1. Dans Brevo, allez dans **"Campagnes"** > **"Templates"**
2. Cliquez **"Créer un nouveau template"**
3. Utilisez l'**éditeur drag & drop** pour créer votre design
4. Sauvegardez et notez l'**ID du template** (ex: `123`)

5. Modifiez le code dans [service.ts](src/modules/brevo-notification/service.ts:115-130) :

```typescript
// Au lieu d'envoyer du HTML :
await this.sendEmail({
  to,
  subject: "Confirmation de commande",
  html: "..."  // HTML codé en dur
})

// Utilisez un template ID :
await this.sendEmail({
  to,
  subject: "Confirmation de commande",
  template_id: 123,  // ID de votre template Brevo
  params: {
    // Variables dynamiques dans le template
    customer_name: orderData.customer_name,
    order_number: orderData.display_id,
    total: (orderData.total / 100).toFixed(2)
  }
})
```

**Variables dans le template Brevo** :
- `{{ params.customer_name }}`
- `{{ params.order_number }}`
- `{{ params.total }}`

## 🧪 Tester l'envoi d'emails

### Test manuel via Brevo

1. Dans Brevo, allez dans **"Campagnes"** > **"Email transactionnel"**
2. Cliquez **"Envoyer un test"**
3. Entrez votre email
4. Vérifiez la réception

### Test via Medusa

1. Créez une commande de test dans l'admin
2. Vérifiez les logs Medusa :
```
✉️  Email sent via Brevo to client@example.com
```
3. Vérifiez votre boîte email

### Vérifier dans le dashboard Brevo

1. Allez dans **"Statistiques"** > **"Email transactionnel"**
2. Vous verrez :
   - Emails envoyés
   - Emails délivrés
   - Emails ouverts
   - Clics
   - Bounces (rejets)

## 🚨 IMPORTANT : Sécurité

### ⚠️ Ne JAMAIS committer la clé API

Le fichier `.env` contient des secrets. Il est déjà dans `.gitignore`.

**Vérifiez** :
```bash
git status
```

Si `.env` apparaît, ajoutez-le à `.gitignore` :
```bash
echo ".env" >> .gitignore
```

### 🔒 Limites de l'offre gratuite

- **300 emails/jour** (9000/mois)
- Au-delà : 2.50€ pour 1000 emails supplémentaires
- Surveillez votre consommation dans **"Mon compte"** > **"Mon plan"**

### 📊 Monitorer vos envois

Consultez régulièrement les statistiques pour :
- Vérifier le taux de délivrabilité (devrait être > 95%)
- Identifier les bounces (emails invalides)
- Optimiser vos templates (taux d'ouverture)

## 🇫🇷 Conformité RGPD

Brevo est conforme RGPD. Assurez-vous de :

1. **Ajouter un lien de désinscription** dans vos emails marketing (pas pour transactionnels)
2. **Informer les clients** de l'utilisation de Brevo dans votre politique de confidentialité
3. **Ne pas vendre les données** collectées

**Pour les emails transactionnels** (commande, expédition) :
- ✅ Pas besoin de consentement
- ✅ Nécessaires à l'exécution du contrat

## 📈 Passer à un plan payant (si nécessaire)

Si vous dépassez 300 emails/jour :

**Plan Starter** : 25€/mois
- 20 000 emails/mois
- Support prioritaire
- Pas de logo Brevo
- Tests A/B

**Plan Business** : 65€/mois
- 100 000 emails/mois
- IP dédiée
- Support téléphone
- Marketing automation

## 🔗 Liens utiles

- **Dashboard Brevo** : https://app.brevo.com
- **Documentation Brevo** : https://developers.brevo.com
- **Templates** : https://app.brevo.com/camp/lists/template
- **Statistiques** : https://app.brevo.com/statistics/email
- **Support Brevo** : https://help.brevo.com/hc/fr

## ❓ Résolution de problèmes

### Erreur "Invalid API Key"

- Vérifiez que la clé commence bien par `xkeysib-`
- Pas d'espaces avant/après la clé dans le `.env`
- Redémarrez le serveur après modification du `.env`

### Email non reçu

1. **Vérifiez le dashboard Brevo** :
   - Statistiques > Email transactionnel
   - Statut : "Envoyé" ou "Bounce" ?

2. **Si Bounce** :
   - Email destinataire invalide
   - Boîte pleine
   - Serveur rejette les emails

3. **Si Envoyé mais pas reçu** :
   - Vérifiez le dossier SPAM
   - Ajoutez l'expéditeur aux contacts
   - Vérifiez les filtres anti-spam

### Email en SPAM

1. **Configurez SPF et DKIM** (voir étape 2 - Option B)
2. **Évitez les mots spam** : "gratuit", "gagner", "urgent", MAJUSCULES
3. **Personnalisez l'expéditeur** avec votre domaine
4. **Demandez aux clients** d'ajouter votre email aux contacts

### Limite 300 emails/jour atteinte

1. **Vérifiez votre consommation** : Dashboard > Mon plan
2. **Optimisez** :
   - Désactivez les emails non essentiels
   - Groupez les notifications
3. **Passez au plan payant** si nécessaire

## 📝 Prochaines étapes

Une fois Brevo configuré :

1. ✅ Testez chaque type d'email (commande, expédition, etc.)
2. 🎨 Personnalisez les templates (optionnel)
3. 📊 Surveillez les statistiques hebdomadairement
4. 🔐 Configurez SPF/DKIM pour production
5. 📧 Créez des templates visuels dans Brevo (optionnel)

---

**Code source du module** : [src/modules/brevo-notification/](src/modules/brevo-notification/)

**Besoin d'aide ?** Consultez la documentation Brevo : https://developers.brevo.com
