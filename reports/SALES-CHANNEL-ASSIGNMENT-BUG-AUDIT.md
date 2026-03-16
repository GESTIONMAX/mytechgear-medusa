# Audit : Bug d'assignation Sales Channel – MyTechGear Admin

**Date** : 2026-03-16
**Statut** : 🔴 Bug identifié – 2 problèmes critiques

---

## 🎯 Résumé Exécutif

L'utilisateur ne peut pas assigner de sales channels aux produits via l'interface admin. Le bug provient de **deux problèmes distincts** :

1. **Problème GET** : Les sales channels ne sont PAS chargés lors de la récupération du produit (mismatch de format `+` vs `*`)
2. **Problème PUT** : Le format d'envoi des sales channels ne correspond pas au format attendu par Medusa v2

---

## 🔍 Investigation Détaillée

### 1. Composants impliqués

#### Frontend React Component
**Fichier** : `mytechgear-frontend/src/components/admin/ProductSalesChannelSelector.tsx`

**État** : ✅ Implémentation correcte

```typescript
// Lignes 58-64 : Toggle handler correct
const handleToggleChannel = (channelId: string) => {
  setSelectedChannelIds((prev) =>
    prev.includes(channelId)
      ? prev.filter((id) => id !== channelId)
      : [...prev, channelId]
  );
};

// Lignes 72-81 : Requête POST avec payload correct
const response = await fetch(`/api/admin/products/${productId}/sales-channels`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sales_channel_ids: selectedChannelIds,  // ["sc_xxx", "sc_yyy"]
  }),
});
```

**Analyse** : Le composant React fonctionne correctement. Il envoie un tableau d'IDs.

---

#### Frontend API Route (Next.js)
**Fichier** : `mytechgear-frontend/src/app/api/admin/products/[id]/sales-channels/route.ts`

**État** : ⚠️ Transformation incorrecte

```typescript
// Ligne 56 : Transformation du payload
body: JSON.stringify({
  sales_channels: sales_channel_ids.map((id: string) => ({ id }))
  // Entrée: ["sc_01XXX", "sc_02YYY"]
  // Sortie: [{ id: "sc_01XXX" }, { id: "sc_02YYY" }]
}),
```

**Problème potentiel** : Le format `[{ id: "xxx" }]` peut ne pas être accepté par Medusa v2. Medusa attend probablement soit :
- Un tableau d'IDs : `["sc_xxx", "sc_yyy"]`
- Ou une clé différente (ex: `sales_channel_ids`)

---

#### Backend Medusa Route (GET)
**Fichier** : `mytechgear-medusa/src/api/admin-api/products/[id]/route.ts`

**État** : 🔴 **BUG CRITIQUE #1** - Parsing incorrect du paramètre `fields`

```typescript
// Ligne 33 : Relations par défaut (sales_channels ABSENT !)
let relations: string[] = ['variants', 'options', 'options.values', 'images', 'categories', 'collection'];

// Lignes 41-45 : Parser qui cherche le préfixe '*' uniquement
for (const field of fields) {
  if (field.startsWith('*')) {  // ⚠️ Cherche '*' mais reçoit '+'
    const relationPath = field.substring(1);
    customRelations.push(relationPath);
  }
}
```

**Cause** :
- Frontend envoie : `fields=+sales_channels.*,+collection.*,+categories.*`
- Backend cherche : `fields=*sales_channels,*collection,*categories`
- **Mismatch de préfixe** : `+` vs `*`

**Conséquence** : Les sales channels ne sont JAMAIS chargés, donc l'interface ne peut pas afficher les canaux actuellement assignés.

---

#### Backend Medusa Route (PUT)
**Fichier** : `mytechgear-medusa/src/api/admin-api/products/[id]/route.ts`

**État** : 🔴 **BUG CRITIQUE #2** - Pas de handling spécifique pour sales_channels

```typescript
// Ligne 89 : Passe directement le body à Medusa sans validation
const product = await productService.updateProducts(id, req.body as any);
```

**Problème** :
- Aucune validation du format
- Aucune transformation
- Aucun logging de debug
- Le body contient `sales_channels: [{ id: "xxx" }]` mais Medusa v2 attend probablement un format différent

**Documentation Medusa v2** : Les relations ManyToMany (comme sales_channels) nécessitent souvent un endpoint dédié ou un format spécifique.

---

## 🐛 Causes Racines

### Bug #1 : GET - Sales Channels Non Chargés

**Fichier** : `mytechgear-medusa/src/api/admin-api/products/[id]/route.ts` (ligne 41)

**Problème** :
```typescript
if (field.startsWith('*')) {  // ❌ Ne reconnaît pas le préfixe '+'
```

**Impact** :
- Quand le frontend demande `+sales_channels.*`, le backend ignore cette demande
- Les sales channels ne sont jamais inclus dans la réponse
- Le composant ProductSalesChannelSelector reçoit `product.sales_channels = undefined`
- L'utilisateur ne voit jamais les canaux déjà assignés

---

### Bug #2 : PUT - Format de Payload Incorrect

**Fichier** : `mytechgear-frontend/src/app/api/admin/products/[id]/sales-channels/route.ts` (ligne 56)

**Problème** :
```typescript
body: JSON.stringify({
  sales_channels: sales_channel_ids.map((id: string) => ({ id }))
  // Envoie: { sales_channels: [{ id: "sc_xxx" }] }
  // Medusa attend probablement: { sales_channel_ids: ["sc_xxx"] }
})
```

**Impact** :
- La requête arrive au backend Medusa
- `productService.updateProducts()` reçoit le body mais ne sait pas comment traiter `sales_channels`
- Aucune erreur n'est retournée (silent failure)
- Les sales channels ne sont pas sauvegardés

---

## ✅ Solutions Recommandées

### Solution #1 : Corriger le Parser de Fields (Backend)

**Fichier** : `mytechgear-medusa/src/api/admin-api/products/[id]/route.ts`

**Changement** : Accepter à la fois `*` et `+` comme préfixes valides

```typescript
// Ligne 41 : AVANT
if (field.startsWith('*')) {

// Ligne 41 : APRÈS
if (field.startsWith('*') || field.startsWith('+')) {
  const relationPath = field.substring(1); // Enlève le premier caractère (* ou +)
  customRelations.push(relationPath);
}
```

**Pourquoi** : Le frontend Next.js utilise le préfixe `+` pour les champs à inclure. Il faut que le backend supporte les deux formats.

**Alternative** : Ajouter `'sales_channels'` aux relations par défaut (ligne 33) :

```typescript
let relations: string[] = [
  'variants',
  'options',
  'options.values',
  'images',
  'categories',
  'collection',
  'sales_channels'  // ✅ Ajout
];
```

---

### Solution #2 : Utiliser l'API Medusa Dédiée pour Sales Channels

**Contexte** : Medusa v2 a probablement une API dédiée pour gérer les relations ManyToMany comme les sales channels.

**Approche Recommandée** : Créer une route dédiée backend

**Nouveau fichier** : `mytechgear-medusa/src/api/admin-api/products/[id]/sales-channels/route.ts`

```typescript
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { authenticateAdmin } from "../../../../middlewares";

export const middlewares = [authenticateAdmin];

/**
 * POST /admin-api/products/[id]/sales-channels
 * Assigne des sales channels à un produit
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const productModuleService = req.scope.resolve(Modules.PRODUCT);
    const { id } = req.params;
    const { sales_channel_ids } = req.body;

    if (!Array.isArray(sales_channel_ids)) {
      return res.status(400).json({
        error: 'sales_channel_ids must be an array',
      });
    }

    console.log('📤 [Sales Channels] Assigning channels to product:', id);
    console.log('   Channels:', sales_channel_ids);

    // Option A: Utiliser updateProducts avec le bon format
    await productModuleService.updateProducts(id, {
      sales_channel_ids: sales_channel_ids,  // Pas d'objets, juste les IDs
    });

    // Option B: Si Option A ne fonctionne pas, utiliser une méthode dédiée
    // await productModuleService.addSalesChannelsToProduct(id, sales_channel_ids);

    // Récupérer le produit mis à jour avec les relations
    const updatedProduct = await productModuleService.retrieveProduct(id, {
      relations: ['sales_channels'],
    });

    console.log('✅ [Sales Channels] Channels assigned successfully');

    return res.status(200).json({
      success: true,
      product: updatedProduct,
    });

  } catch (error: any) {
    console.error('❌ [Sales Channels] Error:', error);
    return res.status(500).json({
      error: 'Failed to assign sales channels',
      details: error.message,
    });
  }
}
```

**Modification frontend** : Aucune ! La route frontend `/api/admin/products/[id]/sales-channels` reste inchangée et redirigera vers la nouvelle route backend.

---

## 🧪 Plan de Test

### Test 1 : Vérifier le chargement des sales channels

1. Ouvrir Chrome DevTools → Network
2. Naviguer vers `/admin/products/[id]/edit`
3. Chercher la requête GET `/api/admin/products/[id]?fields=+sales_channels.*...`
4. Vérifier que la réponse contient `product.sales_channels: [...]`
5. ✅ Success si la liste des channels est présente

### Test 2 : Vérifier l'assignation

1. Dans l'onglet Organisation, cocher "Default Sales Channel"
2. Cliquer sur "Enregistrer les canaux"
3. Ouvrir Chrome DevTools → Network
4. Chercher la requête POST `/api/admin/products/[id]/sales-channels`
5. Vérifier :
   - Request payload : `{ sales_channel_ids: ["sc_xxx"] }`
   - Response status : `200 OK`
   - Response body : `{ success: true, product: {...} }`
6. Rafraîchir la page
7. ✅ Success si "Default Sales Channel" reste coché

### Test 3 : Vérifier dans la base de données

```sql
-- Lister les produits et leurs sales channels
SELECT
  p.id,
  p.title,
  sc.id as channel_id,
  sc.name as channel_name
FROM product p
LEFT JOIN product_sales_channel psc ON p.id = psc.product_id
LEFT JOIN sales_channel sc ON psc.sales_channel_id = sc.id
WHERE p.id = 'prod_01KKPJH184F3QKTXG95HZM8RHG'  -- Music Shield
LIMIT 10;
```

✅ Success si le produit apparaît dans la table de jonction `product_sales_channel`

---

## 📦 Fichiers à Modifier

### Priorité 1 : Fix GET (Bug critique)

| Fichier | Action | Lignes |
|---------|--------|--------|
| `mytechgear-medusa/src/api/admin-api/products/[id]/route.ts` | Modifier parser de fields | 41 |

### Priorité 2 : Fix PUT (Bug critique)

| Fichier | Action | Lignes |
|---------|--------|--------|
| `mytechgear-medusa/src/api/admin-api/products/[id]/sales-channels/route.ts` | Créer nouveau fichier | - |
| `mytechgear-frontend/src/app/api/admin/products/[id]/sales-channels/route.ts` | Vérifier payload | 56 |

### Optionnel : Logging amélioré

| Fichier | Action | Lignes |
|---------|--------|--------|
| `mytechgear-medusa/src/api/admin-api/products/[id]/route.ts` | Ajouter logs PUT | 89 |

---

## 🚀 Ordre d'Implémentation

1. **[Backend] Corriger le parser de fields** (Solution #1)
   - Modifier ligne 41 pour accepter `+` et `*`
   - Tester GET `/admin-api/products/[id]?fields=+sales_channels.*`
   - Vérifier que `sales_channels` est retourné

2. **[Backend] Créer la route dédiée sales-channels** (Solution #2)
   - Créer `mytechgear-medusa/src/api/admin-api/products/[id]/sales-channels/route.ts`
   - Implémenter POST avec `sales_channel_ids: string[]`
   - Tester avec Postman/curl

3. **[Frontend] Vérifier que le payload est correct**
   - S'assurer que la route frontend envoie `sales_channel_ids: ["xxx"]` (sans objets)

4. **[Tests] Valider le workflow complet**
   - Ouvrir un produit
   - Cocher un canal
   - Enregistrer
   - Rafraîchir
   - Vérifier que le canal reste coché

---

## ⚠️ Erreurs à Éviter

1. **Ne pas ajouter sales_channels aux relations par défaut sans tester les performances** - Cela peut ralentir toutes les requêtes GET products
2. **Ne pas modifier le format du payload frontend sans modifier le backend** - Les deux doivent être synchronisés
3. **Ne pas oublier de tester le cas où aucun canal n'est sélectionné** - L'API doit accepter un tableau vide `[]`

---

## 📚 Références

- Medusa v2 Admin API : `/admin/products/:id` (PUT)
- Medusa v2 Relations : ManyToMany handling
- Next.js API Routes : Dynamic route parameters

---

## ✅ Checklist de Validation

- [ ] GET `/api/admin/products/[id]` retourne `sales_channels`
- [ ] POST `/api/admin/products/[id]/sales-channels` retourne 200
- [ ] Interface admin affiche les canaux existants
- [ ] Checkbox "Default Sales Channel" fonctionne
- [ ] Bouton "Enregistrer les canaux" persiste les changements
- [ ] Rafraîchissement de la page conserve l'état
- [ ] Base de données contient les relations dans `product_sales_channel`
- [ ] Logs backend confirment la mise à jour
- [ ] Aucune erreur dans la console Chrome DevTools
