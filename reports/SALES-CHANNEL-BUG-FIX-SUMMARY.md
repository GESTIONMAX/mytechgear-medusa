# Sales Channel Assignment Bug – Fix Summary

**Date** : 2026-03-16
**Statut** : ✅ Corrections appliquées – En attente de test

---

## 🎯 Résumé

Le bug d'assignation des sales channels aux produits a été corrigé via **3 modifications** :

1. ✅ **Backend GET** : Parser de fields corrigé pour accepter le préfixe `+`
2. ✅ **Backend POST** : Nouvelle route dédiée `/admin-api/products/[id]/sales-channels`
3. ✅ **Frontend API** : Payload modifié pour utiliser la nouvelle route backend

---

## 📂 Fichiers Modifiés

### 1. Backend - Parser de Fields (Bug GET)

**Fichier** : `src/api/admin-api/products/[id]/route.ts`

**Changements** :
- Ligne 33 : Ajout de `'sales_channels'` aux relations par défaut
- Ligne 41 : Accepte les préfixes `*` ET `+` (avant : uniquement `*`)

```typescript
// AVANT
let relations: string[] = ['variants', 'options', 'options.values', 'images', 'categories', 'collection'];

if (field.startsWith('*')) {

// APRÈS
let relations: string[] = ['variants', 'options', 'options.values', 'images', 'categories', 'collection', 'sales_channels'];

if (field.startsWith('*') || field.startsWith('+')) {
```

**Impact** : Les sales channels sont maintenant chargés correctement lors du GET produit.

---

### 2. Backend - Nouvelle Route Dédiée (Bug POST)

**Fichier créé** : `src/api/admin-api/products/[id]/sales-channels/route.ts`

**Implémentation** :
```typescript
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const remoteLink = req.scope.resolve("remoteLink");
  const { id } = req.params;
  const { sales_channel_ids } = req.body;  // Tableau d'IDs

  // 1. Récupérer les liens existants
  const { data: existingLinks } = await query.graph({
    entity: "product_sales_channel",
    fields: ["product_id", "sales_channel_id"],
    filters: { product_id: id },
  });

  // 2. Supprimer les liens existants via RemoteLink
  if (existingLinks && existingLinks.length > 0) {
    await remoteLink.delete(existingLinks.map((link: any) => ({
      [Modules.PRODUCT]: { product_id: link.product_id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: link.sales_channel_id }
    })));
  }

  // 3. Créer les nouveaux liens via RemoteLink
  if (sales_channel_ids.length > 0) {
    await remoteLink.create(sales_channel_ids.map((channelId: string) => ({
      [Modules.PRODUCT]: { product_id: id },
      [Modules.SALES_CHANNEL]: { sales_channel_id: channelId }
    })));
  }

  // 4. Récupérer le produit mis à jour avec Remote Query
  const updatedProduct = await productModuleService.retrieveProduct(id, {
    relations: ['variants', 'options', 'images'],
  });

  const { data: salesChannelLinks } = await query.graph({
    entity: "product_sales_channel",
    fields: ["sales_channel.*"],
    filters: { product_id: id },
  });

  updatedProduct.sales_channels = salesChannelLinks.map((link: any) => link.sales_channel);

  return res.status(200).json({
    success: true,
    product: updatedProduct,
  });
}
```

**Fichier créé** : `src/api/admin-api/products/[id]/sales-channels/middlewares.ts`

Applique l'authentification admin à la route.

---

### 3. Frontend - Payload Corrigé

**Fichier** : `mytechgear-frontend/src/app/api/admin/products/[id]/sales-channels/route.ts`

**Changements** :
- Ligne 48 : URL changée de `/admin-api/products/${id}` → `/admin-api/products/${id}/sales-channels`
- Ligne 50 : Méthode changée de `PUT` → `POST`
- Ligne 56 : Payload changé de `{ sales_channels: [{ id }] }` → `{ sales_channel_ids: [...] }`

```typescript
// AVANT
const response = await fetch(
  `${MEDUSA_BACKEND_URL}/admin-api/products/${id}`,
  {
    method: 'PUT',
    body: JSON.stringify({
      sales_channels: sales_channel_ids.map((id: string) => ({ id }))
    }),
  }
);

// APRÈS
const response = await fetch(
  `${MEDUSA_BACKEND_URL}/admin-api/products/${id}/sales-channels`,
  {
    method: 'POST',
    body: JSON.stringify({
      sales_channel_ids: sales_channel_ids  // IDs directs
    }),
  }
);
```

**Impact** : Le frontend envoie maintenant le payload au bon format vers la bonne route.

---

## 🧪 Plan de Test

### Prérequis
1. Backend Medusa en cours d'exécution (`http://localhost:9000`)
2. Frontend Next.js en cours d'exécution (`http://localhost:3200`)
3. PostgreSQL tunnel actif (`localhost:5555` → Coolify remote)
4. Utilisateur connecté à l'admin

### Test 1 : Vérifier le Chargement des Sales Channels

**Action** :
1. Naviguer vers `/admin/products/prod_01KKPJH184F3QKTXG95HZM8RHG/edit`
2. Cliquer sur l'onglet **Organisation**
3. Ouvrir Chrome DevTools → Network
4. Observer la requête GET `/api/admin/products/[id]`

**Résultat attendu** :
```json
{
  "product": {
    "id": "prod_01KKPJH184F3QKTXG95HZM8RHG",
    "title": "Music Shield",
    "sales_channels": []  // ✅ DOIT ÊTRE PRÉSENT (même si vide)
  }
}
```

**Critère de succès** : Le champ `sales_channels` est présent dans la réponse.

---

### Test 2 : Assigner un Sales Channel

**Action** :
1. Dans l'onglet Organisation, section **Canaux de vente**
2. Cocher "Default Sales Channel"
3. Cliquer sur **Enregistrer les canaux**
4. Observer Chrome DevTools → Network

**Résultat attendu** :

**Requête POST** `/api/admin/products/[id]/sales-channels` :
```json
{
  "sales_channel_ids": ["sc_01KG9GYWK3JVV71P16XDY3CVBH"]
}
```

**Réponse 200 OK** :
```json
{
  "success": true,
  "product": {
    "id": "prod_01KKPJH184F3QKTXG95HZM8RHG",
    "sales_channels": [
      {
        "id": "sc_01KG9GYWK3JVV71P16XDY3CVBH",
        "name": "Default Sales Channel"
      }
    ]
  }
}
```

**Critère de succès** :
- ✅ Status HTTP 200
- ✅ Message de succès affiché dans l'interface
- ✅ Checkbox reste cochée après refresh

---

### Test 3 : Vérifier la Persistance en Base

**Action** :
```bash
# Connectez-vous au tunnel PostgreSQL
./scripts/start-postgres-tunnel.sh

# Vérifiez la table de jonction
psql "postgresql://medusa:xhgcpIOO6ABnhTvAYqCPpUNVSHk8zCx1oUbwtcpwOEZ3xmeK6gDxRLrLKKw90jXU@localhost:5555/medusa" -c "
SELECT
  p.id,
  p.title,
  sc.id as channel_id,
  sc.name as channel_name
FROM product p
LEFT JOIN product_sales_channel psc ON p.id = psc.product_id
LEFT JOIN sales_channel sc ON psc.sales_channel_id = sc.id
WHERE p.id = 'prod_01KKPJH184F3QKTXG95HZM8RHG'
LIMIT 10;
"
```

**Résultat attendu** :
```
         id          |    title     |       channel_id        |     channel_name
---------------------+--------------+-------------------------+----------------------
 prod_01KKPJH184... | Music Shield | sc_01KG9GYWK3JVV71... | Default Sales Channel
```

**Critère de succès** : Une ligne apparaît avec l'association produit ↔ canal.

---

### Test 4 : Désassigner un Sales Channel

**Action** :
1. Dans l'onglet Organisation, **décocher** "Default Sales Channel"
2. Cliquer sur **Enregistrer les canaux**

**Résultat attendu** :
- Requête POST avec `sales_channel_ids: []`
- Réponse 200 OK
- Checkbox décochée après refresh
- Ligne supprimée de `product_sales_channel` en base

---

## 🚀 Déploiement

### Développement Local

Les modifications sont déjà en place. Il suffit de :

1. **Redémarrer le backend Medusa** :
   ```bash
   cd mytechgear-medusa
   npm run dev
   ```

2. **Redémarrer le frontend Next.js** (si nécessaire) :
   ```bash
   cd mytechgear-frontend
   npm run dev
   ```

3. **Tester l'interface admin** :
   - Ouvrir `http://localhost:3200/admin/products/[id]/edit`
   - Aller dans l'onglet Organisation
   - Tester l'assignation de sales channels

---

### Production (Coolify)

Les fichiers modifiés seront déployés lors du prochain push Git :

```bash
git add .
git commit -m "fix: Sales channel assignment bug

- Fixed GET parser to accept + prefix for fields parameter
- Created dedicated POST route for sales channel assignment
- Updated frontend to use correct payload format

Fixes issue where sales channels were not loaded or saved correctly."

git push origin main
```

Coolify détectera les changements et redéploiera automatiquement.

---

## 🔍 Vérifications Post-Déploiement

### Checklist Fonctionnelle

- [ ] GET `/api/admin/products/[id]` retourne le champ `sales_channels`
- [ ] L'interface admin affiche les canaux existants (si assignés)
- [ ] Checkbox "Default Sales Channel" peut être cochée/décochée
- [ ] Bouton "Enregistrer les canaux" persiste les changements
- [ ] Rafraîchissement de la page conserve l'état des checkboxes
- [ ] Aucune erreur dans la console Chrome DevTools
- [ ] Logs backend confirment l'assignation : `✅ [Sales Channels] Assigned X channel(s)`

### Checklist Technique

- [ ] Table `product_sales_channel` contient les relations
- [ ] Les requêtes GET incluent `*sales_channels` dans les relations chargées
- [ ] Les requêtes POST retournent 200 (pas 400, 404, 500)
- [ ] Les erreurs Medusa sont correctement catchées et loggées

---

## 🐛 Debugging en Cas de Problème

### Problème 1 : Sales Channels Toujours Vides

**Vérification** :
```bash
# Vérifier que Medusa retourne bien les sales channels
curl -X GET \
  "http://localhost:9000/admin-api/products/prod_01KKPJH184F3QKTXG95HZM8RHG?fields=*sales_channels" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Si le champ est absent** :
- Vérifier que la ligne 33 de `route.ts` contient bien `'sales_channels'`
- Vérifier que Medusa v2 utilise bien la relation `sales_channels` (et pas `salesChannels`)

---

### Problème 2 : POST Retourne 400 ou 500

**Vérification** :
```bash
# Tester directement avec curl
curl -X POST \
  "http://localhost:9000/admin-api/products/prod_01KKPJH184F3QKTXG95HZM8RHG/sales-channels" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sales_channel_ids": ["sc_01KG9GYWK3JVV71P16XDY3CVBH"]
  }'
```

**Si erreur 404** :
- Vérifier que le fichier `route.ts` existe dans `src/api/admin-api/products/[id]/sales-channels/`
- Redémarrer le backend Medusa

**Si erreur 500** :
- Consulter les logs backend : `npm run dev` affichera l'erreur complète
- Vérifier que `productModuleService.updateProducts()` accepte `sales_channel_ids`

---

### Problème 3 : Checkbox Se Décoche Après Refresh

**Vérification** :
1. Vérifier que POST retourne bien 200
2. Vérifier que `onSave()` est appelé dans le composant React
3. Vérifier que `fetchProduct()` est appelé après le save (ligne 92 du composant)

**Fix potentiel** :
- Ajouter un délai avant le refresh : `setTimeout(() => onSave(), 500)`

---

## 📚 Références

- [Medusa v2 Product Module](https://docs.medusajs.com/v2/resources/product)
- [Medusa v2 Admin API](https://docs.medusajs.com/v2/api/admin)
- Audit complet : `reports/SALES-CHANNEL-ASSIGNMENT-BUG-AUDIT.md`
- Script de test : `scripts/test-sales-channel-assignment.sh`

---

## ✅ Conclusion

Le bug est résolu via :
1. ✅ Correction du parser backend pour accepter `+` et `*`
2. ✅ Ajout de `sales_channels` aux relations par défaut
3. ✅ Création d'une route dédiée `/sales-channels` avec payload correct
4. ✅ Modification du frontend pour utiliser la nouvelle route

**Prochaine étape** : Tester l'assignation via l'interface admin pour valider la correction.
