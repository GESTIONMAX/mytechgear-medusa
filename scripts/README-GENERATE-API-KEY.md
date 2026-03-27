# 🔑 Génération de l'API Key Admin Medusa

## Prérequis

1. **Backend Medusa démarré** sur port 9000
2. **Compte admin existant** avec email/password
3. **Tunnel SSH actif** vers la base de données (si prod)

## 🚀 Méthode 1: Via Script (Recommandé)

### Étape 1: Configurer les credentials

Ajouter dans `.env`:

```bash
MEDUSA_ADMIN_EMAIL=admin@mytechgear.eu
MEDUSA_ADMIN_PASSWORD=votre_mot_de_passe_admin
```

### Étape 2: Démarrer le backend

```bash
npm run dev
```

### Étape 3: Exécuter le script

```bash
npx tsx scripts/generate-admin-api-key.ts
```

Le script va:
1. ✅ S'authentifier avec email/password
2. ✅ Obtenir un JWT token
3. ✅ Créer une API key via `/admin/api-keys`
4. ✅ Afficher la clé à copier

### Sortie attendue:

```
🔐 GÉNÉRATION API KEY ADMIN MEDUSA
======================================================================

📧 Admin Email: admin@mytechgear.eu
🔗 Backend URL: http://localhost:9000

🔑 Étape 1: Authentification JWT...
✅ JWT token obtenu

🔑 Étape 2: Création de l'API key...
✅ API key créée avec succès!

======================================================================
📋 RÉSULTAT
======================================================================

ID:       apik_01XXXXXXXXXXXXX
Title:    Netlify Frontend - Server-to-Server
Type:     secret
Created:  17/03/2026 19:30:45

🔑 API KEY (à copier dans Netlify):
──────────────────────────────────────────────────────────────────────
sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
──────────────────────────────────────────────────────────────────────

📝 CONFIGURATION NETLIFY:
======================================================================
1. Aller sur Netlify → Site configuration → Environment variables
2. Ajouter:
   MEDUSA_ADMIN_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

✅ Cette clé ne sera jamais ré-affichée. Copiez-la maintenant!
======================================================================
```

## 🔄 Méthode 2: Via Curl (Si le script échoue)

### 1. Obtenir un JWT token

```bash
JWT_TOKEN=$(curl -s 'http://localhost:9000/auth/login' \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@mytechgear.eu","password":"VOTRE_PASSWORD"}' \
  | jq -r '.session.token')

echo "JWT Token: $JWT_TOKEN"
```

### 2. Créer l'API key

```bash
curl -s 'http://localhost:9000/admin/api-keys' \
  -X POST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"title":"Netlify Frontend","type":"secret"}' \
  | jq '.'
```

### 3. Copier la clé

La réponse contient `api_key.token` - c'est votre `MEDUSA_ADMIN_API_KEY`.

## ⚠️ Si l'endpoint `/admin/api-keys` n'existe pas

Medusa v2 peut ne pas avoir cet endpoint. Dans ce cas:

### Alternative: Utiliser l'approche JWT

Modifiez le frontend pour utiliser l'authentification JWT dynamique:

```typescript
// Au lieu de MEDUSA_ADMIN_API_KEY statique
// Utiliser getAdminToken() qui génère un JWT à chaque appel

import { getAdminToken } from '@/lib/medusa/admin-token';

// Configuration
MEDUSA_ADMIN_EMAIL=admin@mytechgear.eu
MEDUSA_ADMIN_PASSWORD=votre_mot_de_passe
```

Voir [`/src/lib/medusa/admin-token.ts`](../../mytechgear-frontend/src/lib/medusa/admin-token.ts) pour l'implémentation.

## 🐛 Troubleshooting

### Erreur: "Failed to connect"

**Cause:** Backend pas démarré

**Solution:**
```bash
cd mytechgear-medusa
npm run dev
```

### Erreur: "Admin authentication failed"

**Causes possibles:**
1. Email/password incorrect
2. Compte admin n'existe pas
3. Compte désactivé

**Vérifier:**
```bash
# Lister les utilisateurs
curl 'http://localhost:9000/admin-api/users' \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Créer un admin si nécessaire:**
```bash
npx medusa exec ./scripts/create-admin-user.ts
```

### Erreur: "Endpoint /admin/api-keys not found (404)"

**Cause:** Medusa v2 peut ne pas avoir cet endpoint

**Solution:** Utiliser l'approche JWT (voir Alternative ci-dessus)

## 📚 Ressources

- [Script: generate-admin-api-key.ts](./generate-admin-api-key.ts)
- [Auth JWT: admin-token.ts](../../mytechgear-frontend/src/lib/medusa/admin-token.ts)
- [Documentation: README-ADMIN-AUTH.md](../../mytechgear-frontend/src/lib/medusa/README-ADMIN-AUTH.md)
