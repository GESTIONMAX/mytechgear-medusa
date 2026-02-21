# API Landing Page

## Overview

Endpoint d'accueil API qui liste les endpoints disponibles de l'API Medusa Backend.

**Route**: `GET /info`
**Auth**: Non requise (lecture seule, safe)
**Response**: Page HTML avec liens vers endpoints utiles

---

## Contexte

MyTechGear fonctionne en **mode API-only** (pas d'admin natif Medusa/Payload activé). Le dashboard custom affiche un "API Domain" cliquable (ex: `https://api.mytechgear.eu`).

Quand on clique sur ce domaine, au lieu d'afficher une page vide ou une erreur 404, l'endpoint `/info` retourne une **page d'accueil HTML** listant les endpoints utiles.

---

## Fonctionnalités

### Endpoints Listés

- ✅ **/health** - Liveness check (toujours rapide, pas de check DB)
- ✅ **/ready** - Readiness check (vérifie DB + config)
- ✅ **/_diagnostics** - Diagnostics complets (si `DIAGNOSTICS_ENABLED=true`)
- ✅ **/store/\*** - API Store (produits, catégories, collections)
- ✅ **/admin/\*** - API Admin (gestion, nécessite auth)

### Fonctionnalités UI

- 📱 Design responsive (mobile-first)
- 🎨 Gradient moderne (purple/blue)
- 🔗 Boutons "Ouvrir" et "Copier URL" pour chaque endpoint
- 📋 Exemples d'endpoints pour `/store` et `/admin`
- ⚡ Cache HTTP (5 minutes) pour performance

### Sécurité

- ✅ Aucun secret exposé (DATABASE_URL, JWT_SECRET, etc.)
- ✅ Pas d'auth requise (lecture seule)
- ✅ Safe pour exposition publique
- ✅ Cache-Control headers appropriés

---

## Usage

### Accès Direct

```bash
# Ouvrir dans navigateur
open http://localhost:9000/info

# Ou via curl
curl http://localhost:9000/info
```

### Dans le Dashboard

Dans le dashboard custom Next.js, le lien "API Domain" ouvre automatiquement `/info`:

```tsx
// Exemple: composant Dashboard
<Link href={`${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/info`} target="_blank">
  API Domain
</Link>
```

---

## Configuration

### Variables d'Environnement (optionnelles)

| Variable | Description | Défaut |
|----------|-------------|--------|
| `API_BASE_URL` | URL de base de l'API affichée dans la page | `http://localhost:9000` |
| `MEDUSA_BACKEND_URL` | Fallback si `API_BASE_URL` non définie | `http://localhost:9000` |
| `DIAGNOSTICS_ENABLED` | Affiche l'endpoint `/_diagnostics` si `true` | `false` (production) |

### Exemples

**Développement local**:
```bash
# .env
API_BASE_URL=http://localhost:9000
DIAGNOSTICS_ENABLED=true
```

**Production**:
```bash
# .env.production
API_BASE_URL=https://api.mytechgear.eu
DIAGNOSTICS_ENABLED=false
```

---

## Tests

### Tests d'Intégration

```bash
# Exécuter les tests HTTP
npm run test:integration:http
```

**Fichier**: `integration-tests/http/api-landing.spec.ts`

**Tests inclus**:
- ✅ Retourne 200 OK avec HTML
- ✅ Content-Type `text/html`
- ✅ Contient les endpoints clés
- ✅ Inclut cache headers
- ✅ Ne contient aucun secret

### Tests Manuels

```bash
# 1. Status HTTP
curl -I http://localhost:9000/info

# 2. Contenu HTML
curl http://localhost:9000/info | head -100

# 3. Vérifier cache headers
curl -I http://localhost:9000/info | grep -i cache-control

# 4. Vérifier sécurité (ne doit pas contenir de secrets)
curl http://localhost:9000/info | grep -i "database_url" || echo "✅ Pas de secrets exposés"
```

---

## Personnalisation

### Modifier les Endpoints Listés

Éditer `src/api/info/route.ts`:

```typescript
const endpoints = [
  {
    path: "/health",
    description: "Liveness check...",
    method: "GET",
    auth: false,
  },
  // Ajouter vos endpoints custom ici
  {
    path: "/custom-endpoint",
    description: "Description de votre endpoint",
    method: "POST",
    auth: true,
  },
]
```

### Modifier le Design

Le HTML inline dans `route.ts` contient le CSS. Modifier les styles dans la balise `<style>`.

**Variables de couleur actuelles**:
```css
--primary: #667eea;
--secondary: #764ba2;
```

---

## Architecture

```
src/api/info/
├── route.ts       # Endpoint GET /info (HTML generation)
└── README.md      # Cette documentation

integration-tests/http/
└── api-landing.spec.ts  # Tests d'intégration
```

### Logique

1. Requête `GET /info` arrive
2. `generateHTML()` génère page HTML dynamiquement
3. Injecte `API_BASE_URL` depuis env
4. Liste endpoints selon config (`DIAGNOSTICS_ENABLED`)
5. Retourne HTML avec cache headers

---

## Maintenance

### Quand Ajouter un Nouveau Endpoint

Si vous créez un nouvel endpoint global (ex: `/metrics`), ajoutez-le dans `route.ts`:

1. Éditer `src/api/info/route.ts`
2. Ajouter dans `endpoints` array
3. Relancer serveur (`npm run dev`)
4. Vérifier sur `http://localhost:9000/info`

### Mise à Jour de l'Année

Le texte "Nouveautés 2024" est codé dans le HTML. Si vous créez des collections pour 2025+, mettez à jour les exemples dans `route.ts`.

---

## Troubleshooting

### La page affiche 404

**Problème**: La route n'est pas chargée par Medusa.

**Solution**:
```bash
# Redémarrer le serveur
npm run dev
```

### URL affichée est incorrecte

**Problème**: `API_BASE_URL` non configurée.

**Solution**:
```bash
# Dans .env
API_BASE_URL=https://votre-domaine.com
```

### Diagnostics n'apparaît pas

**Problème**: `DIAGNOSTICS_ENABLED` est `false` ou absent.

**Solution**:
```bash
# Dans .env
DIAGNOSTICS_ENABLED=true
```

---

## Références

- [Medusa v2 Custom Routes](https://docs.medusajs.com/development/api-routes/create)
- [HTTP Caching Best Practices](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- Issue/Feature Request: API Domain Click → Useful Landing Page

---

**Dernière mise à jour**: 2026-02-21
**Auteur**: Claude Code
**Version**: 1.0.0
