# Refactoring v2.0: Séparation Music Shield ↔ Shield

## 🎯 Changement Majeur

**Avant (v1.0)**: 1 produit avec option "Audio"
**Maintenant (v2.0)**: 2 produits distincts liés par famille

---

## 📊 Comparaison Architecture

### v1.0 (INCORRECTE)
```
Product: Music Shield
├─ Options:
│  ├─ Monture (2 valeurs)
│  ├─ Verres (2 valeurs)
│  └─ Audio (2 valeurs) ❌ FAUX - pas une vraie option
└─ Variantes: 8 (2×2×2)
```

### v2.0 (CORRECTE)
```
Family: shield-platform
│
├─ Product 1: Music Shield
│  ├─ Options: Monture (2), Verres (2)
│  ├─ Variantes: 4 (2×2)
│  ├─ Prix: $260
│  ├─ Poids: 49g
│  └─ Related: shield (withoutAudio)
│
└─ Product 2: Shield
   ├─ Options: Monture (2), Verres (2)
   ├─ Variantes: 4 (2×2)
   ├─ Prix: $240
   ├─ Poids: 44g
   └─ Related: music-shield (withAudio)

TOTAL CATALOGUE: 2 produits × 4 variantes = 8 variantes
```

---

## 🗂️ Fichiers Créés

### 1. `shield-platform-common.json`
Features et specs partagées entre Music Shield et Shield:
- Eclipse™ Tint-Adjustable
- Impact Resistant
- IPX4 Sweatproof
- Ultra Lightweight
- 100% UV Protection
- Dimensions communes
- Matériaux communes

### 2. `music-shield-reference.json` (v2.0)
Produit Music Shield (AVEC audio):
- ✅ Supprimé option "Audio"
- ✅ Ajouté `metadata.family = "shield-platform"`
- ✅ Ajouté `metadata.hasAudio = true`
- ✅ Ajouté `metadata.related.withoutAudio = "shield"`
- ✅ Réduit de 8 à 4 variantes
- ✅ Ajouté specs audio (batterie 6.5h, Bluetooth, etc.)
- ✅ Poids: 49g
- ✅ Prix: $260

### 3. `shield-reference.json` (NOUVEAU)
Produit Shield (SANS audio):
- ✅ Même options que Music Shield (Monture, Verres)
- ✅ Ajouté `metadata.family = "shield-platform"`
- ✅ Ajouté `metadata.hasAudio = false`
- ✅ Ajouté `metadata.related.withAudio = "music-shield"`
- ✅ 4 variantes (2×2)
- ✅ Pas de specs audio
- ✅ Poids: 44g (-5g)
- ✅ Prix: $240 (-$20)

---

## 🔧 Types TypeScript Ajoutés

```typescript
interface ProductRelated {
  withAudio?: string      // handle produit avec audio
  withoutAudio?: string   // handle produit sans audio
  variant: 'audio' | 'no-audio'
}

interface ProductPlatform {
  eclipse: boolean
  category: string
  sharedFeatures: string[]  // IDs des features communes
}

interface ProductMetadata {
  // ... existing fields
  family?: string           // "shield-platform"
  hasAudio?: boolean        // true/false
  related?: ProductRelated  // liens entre produits
  platform?: ProductPlatform
}
```

### Helper Functions Ajoutées

```typescript
getRelatedProductHandle(product, 'add' | 'remove'): string | null
isInPlatformFamily(product, family): boolean
getPlatformSharedFeatures(product): ProductFeature[]
getProductSpecificFeatures(product): ProductFeature[]
```

---

## 🎨 UX Attendue

### Storefront (PDP)
```tsx
// Sur Music Shield
<ProductToggle>
  🔊 Avec audio intégré (actuel - $260)
  <Link href="/products/shield">
    🔇 Sans audio (-$20, -5g)
  </Link>
</ProductToggle>

// Sur Shield
<ProductToggle>
  🔇 Sans audio (actuel - $240)
  <Link href="/products/music-shield">
    🔊 Avec audio (+$20, +5g)
  </Link>
</ProductToggle>
```

### Dashboard Admin
```tsx
// Dans la fiche produit
<RelatedProducts>
  <Label>Produit lié dans la plateforme Shield:</Label>
  {product.metadata.hasAudio ? (
    <Link href={`/admin/products/${product.metadata.related.withoutAudio}`}>
      Shield (sans audio)
    </Link>
  ) : (
    <Link href={`/admin/products/${product.metadata.related.withAudio}`}>
      Music Shield (avec audio)
    </Link>
  )}
</RelatedProducts>
```

**IMPORTANT**: Ne JAMAIS afficher "Audio" comme une option de variante éditable.

---

## 📋 Migration Checklist

### Phase 1: Vérification Base Actuelle
- [ ] Lister tous les produits actuels avec option "Audio"
- [ ] Identifier quels produits doivent être scindés
- [ ] Sauvegarder backup DB avant migration

### Phase 2: Création Nouveaux Produits
- [ ] Créer produit "Music Shield" (avec audio)
  - [ ] Créer options: Monture, Verres
  - [ ] Créer 4 variantes
  - [ ] Ajouter metadata (family, hasAudio, related)
  - [ ] Ajouter features audio-spécifiques
  - [ ] Ajouter specs audio

- [ ] Créer produit "Shield" (sans audio)
  - [ ] Créer options: Monture, Verres
  - [ ] Créer 4 variantes
  - [ ] Ajouter metadata (family, hasAudio, related)
  - [ ] Exclure features audio
  - [ ] Exclure specs audio

### Phase 3: Migration Données Existantes
- [ ] Migrer images produits
- [ ] Migrer historique commandes (mappage ancien → nouveau)
- [ ] Migrer stock (splitter inventory)
- [ ] Migrer reviews/ratings

### Phase 4: Mise à Jour UI
- [ ] Retirer sélecteur "Audio" des variantes
- [ ] Ajouter toggle produits liés (storefront)
- [ ] Ajouter lien produits liés (dashboard admin)
- [ ] Mettre à jour breadcrumbs/navigation

### Phase 5: Validation
- [ ] Tester création de commande Music Shield
- [ ] Tester création de commande Shield
- [ ] Vérifier prix corrects ($260 vs $240)
- [ ] Vérifier poids corrects (49g vs 44g)
- [ ] Tester navigation entre produits liés

---

## 🚨 Points d'Attention

### 1. **Ancien handle "music-shield" existe déjà?**
Si le handle `music-shield` existe déjà avec l'ancienne structure:
- Option A: Supprimer et recréer (perte data)
- Option B: Migrer sur place (complexe mais sans perte)
- **Recommandation**: Option B si prod, Option A si dev

### 2. **Commandes historiques**
Les commandes avec ancienne variante "Audio=With Audio":
- Resteront valides (variant_id ne change pas si migration sur place)
- Ou nécessitent mapping si recréation produits

### 3. **URL Produits**
- Music Shield: `/products/music-shield`
- Shield: `/products/shield`
- Redirection 301 si changement handles

### 4. **SEO**
- Créer redirections pour URLs anciennes
- Mettre à jour sitemap XML
- Canonical tags sur produits liés

---

## 📊 Comparaison Données

| Caractéristique | Music Shield | Shield |
|-----------------|--------------|--------|
| **Handle** | `music-shield` | `shield` |
| **Audio** | ✅ Oui | ❌ Non |
| **Prix USD** | $260 | $240 |
| **Poids** | 49g | 44g |
| **Variantes** | 4 | 4 |
| **Batterie audio** | 6.5h | N/A |
| **Bluetooth** | ✅ Oui | ❌ Non |
| **Features uniques** | Hidden Audio Speakers | (aucune) |
| **Specs uniques** | Audio category | (aucune) |

---

## 🎯 Bénéfices Architecture v2.0

✅ **Séparation claire**: Audio n'est pas une "option", c'est un produit différent
✅ **Prix correct**: Chaque produit a son prix ($260 vs $240)
✅ **Poids correct**: Chaque produit a son poids (49g vs 44g)
✅ **Features cohérentes**: Audio speakers uniquement sur Music Shield
✅ **Specs cohérentes**: Batterie audio uniquement sur Music Shield
✅ **SKU cohérents**: Pas de mixte "avec/sans audio" dans même SKU
✅ **Logique métier claire**: Toggle audio = navigation entre produits, pas édition variante
✅ **Évolutivité**: Facile d'ajouter d'autres produits dans la famille (Shield Pro, etc.)
✅ **API-only friendly**: Pas de logique conditionnelle complexe dans variantes

---

## 📞 Prochaines Étapes

1. ✅ **Phase 0 complète**: JSON + Types créés
2. ⏳ **Phase 1 suivante**: Créer scripts de migration
3. ⏳ **Phase 2 suivante**: Tester migration sur DB locale
4. ⏳ **Phase 3 suivante**: Mettre à jour UI (storefront + admin)

**Voulez-vous que je passe à la Phase 1 (scripts de migration)?**

---

**Version**: 2.0.0
**Date**: 2026-02-28
**Auteur**: MyTechGear Development Team
