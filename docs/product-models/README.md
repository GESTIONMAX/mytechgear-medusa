# Product Metadata Model - Reference Documentation

## 📋 Vue d'Ensemble

Ce dossier contient le **modèle de référence contractuel** pour les produits enrichis dans le catalogue MyTechGear.

**Objectif**: Standardiser la structure de données pour garantir:
- ✅ Cohérence entre produits
- ✅ Réutilisabilité des composants UI
- ✅ Logique métier prédictable
- ✅ Migration facile entre environnements
- ✅ Gestion correcte produits liés (pas de fausses variantes)

---

## 📁 Fichiers

### `shield-platform-common.json`
**Features et specs communes** à tous les produits de la plateforme Shield.

**Usage**:
- Référence pour features partagées
- Source de vérité pour specs communes
- Évite duplication entre Music Shield et Shield

### `music-shield-reference.json`
**Produit Music Shield** (avec audio intégré) - 4 variantes.

**Usage**:
- Template pour migrations Music Shield
- Référence pour validation API
- Dataset de test avec audio

### `shield-reference.json`
**Produit Shield** (sans audio) - 4 variantes.

**Usage**:
- Template pour migrations Shield
- Référence pour produit léger
- Dataset de test sans audio

### `product-metadata.types.ts`
**Définitions TypeScript** pour typage du modèle.

**Usage**:
```typescript
import { ProductMetadata, ProductFeature } from './product-metadata.types'

const metadata: ProductMetadata = {
  features: [...],
  specs: {...}
}
```

---

## 🏗️ Architecture du Modèle

### Produits Liés vs Variantes

**IMPORTANT**: Music Shield et Shield sont **2 produits distincts**, pas des variantes d'un même produit.

```
❌ INCORRECT (avant):
Product: Music Shield
├─ Option: Audio (With / Without)  ← FAUX
└─ 8 variantes

✅ CORRECT (maintenant):
Product 1: Music Shield (family: shield-platform, hasAudio: true)
├─ 4 variantes (Monture × Verres)
└─ Related: shield (withoutAudio)

Product 2: Shield (family: shield-platform, hasAudio: false)
├─ 4 variantes (Monture × Verres)
└─ Related: music-shield (withAudio)
```

**Pourquoi?**
- Audio n'est pas une option configurable, c'est un modèle différent
- Prix différent ($260 vs $240)
- Poids différent (49g vs 44g)
- Features différentes (audio speakers vs pas d'audio)
- SKUs différents

**Famille "shield-platform"**:
- Partage features communes (Eclipse™, IPX4, UV protection, etc.)
- Partage specs communes (dimensions, VLT, matériaux, etc.)
- Liaison via `metadata.related` pour le toggle audio

---

### Niveau PRODUIT (partagé)

Les données suivantes sont définies **une seule fois** au niveau produit:

#### 1. Options Disponibles (`product.options`)
```json
{
  "title": "Monture",
  "values": [
    {
      "value": "Matte Black",
      "metadata": {
        "hex": "#1a1a1a",
        "code": "MB"
      }
    }
  ]
}
```

**Métadonnées supportées par valeur**:
- `hex`: Couleur hexadécimale (pour color swatch)
- `vlt`: Transmission lumière (pour verres)
- `batteryLife`: Durée batterie (pour options tech)
- `weightAdd`: Poids ajouté en grammes
- `code`: Code court pour SKU
- `priceModifier`: Modification prix en cents

#### 2. Features (`product.metadata.features`)
```json
{
  "id": "eclipse-tint",
  "title": "Eclipse™ Tint-Adjustable",
  "description": "Patented electrochromic lenses...",
  "icon": "sun-dim",
  "category": "optical",
  "priority": 1,
  "conditional": null
}
```

**Catégories disponibles**:
- `optical`: Optique et vision
- `audio`: Audio et son
- `durability`: Résistance et durabilité
- `comfort`: Confort et ergonomie
- `connectivity`: Connectivité
- `technology`: Technologies avancées

**Logique conditionnelle**:
- `null`: Feature toujours affichée
- `"audio=With Audio"`: Affichée seulement si variante a audio

#### 3. Specs (`product.metadata.specs`)
```json
{
  "battery": {
    "label": "Batterie",
    "priority": 1,
    "items": [
      {
        "name": "Tint-adjustment",
        "value": 100,
        "unit": "h",
        "type": "duration"
      }
    ]
  }
}
```

**Types de specs supportés**:
- `text`: Texte libre
- `boolean`: Oui/Non
- `duration`: Durée temporelle
- `capacity`: Capacité énergétique
- `length`: Longueur/distance
- `weight`: Poids/masse
- `percentage`: Pourcentage 0-100%
- `range`: Plage de valeurs
- `rating`: Notation standard (IPX4, etc.)

#### 4. Autres Metadata
- `sizing`: Taille, genre, forme de visage
- `includes`: Accessoires inclus
- `warranty`: Garanties
- `technology`: Technologies propriétaires

---

### Niveau VARIANTE (spécifique)

Les données suivantes varient **par variante**:

#### Options Sélectionnées
```json
{
  "options": {
    "Monture": "Matte Black",
    "Verres": "Fire",
    "Audio": "With Audio"
  }
}
```

Format: `Record<OptionTitle, SelectedValue>`

#### Metadata Variante
```json
{
  "metadata": {
    "actualWeight": 49,
    "batteryLife": "6.5h",
    "variantCode": "MB-FIR-A"
  }
}
```

---

## 🎯 Conventions

### Naming
- **Option titles**: PascalCase français (`"Monture"`, `"Verres"`)
- **Feature IDs**: kebab-case (`"eclipse-tint"`, `"hidden-audio"`)
- **Spec categories**: camelCase (`"battery"`, `"optics"`)
- **Codes SKU**: UPPERCASE avec tirets (`"MB-FIR-A"`)

### Conditional Logic
Format: `"option=value"`

**Exemples**:
- `"audio=With Audio"`: Visible si audio activé
- `null`: Toujours visible

**Parsing**:
```typescript
import { parseConditional, shouldDisplay } from './product-metadata.types'

const condition = "audio=With Audio"
const parsed = parseConditional(condition)
// => { option: "audio", value: "With Audio" }

const variantOptions = { Audio: "With Audio" }
const visible = shouldDisplay(condition, variantOptions)
// => true
```

### Pricing
- **Format**: Cents (integer)
- **Exemple**: `26000` = $260.00 USD
- **Devise**: `currency_code: "usd"` ou `"eur"`

### Weight
- **Unité**: Grammes (g)
- **Base weight**: Produit sans options modulaires
- **Actual weight**: Poids réel de la variante (base + weightAdd)

---

## 🔧 Usage dans le Code

### Frontend (React/TypeScript)

#### Toggle Audio (Produits Liés)
```typescript
import { getRelatedProductHandle } from '@/types/product-metadata'

// Sur Music Shield, afficher lien vers Shield
const shieldHandle = getRelatedProductHandle(product, 'remove') // 'shield'

// Sur Shield, afficher lien vers Music Shield
const musicShieldHandle = getRelatedProductHandle(product, 'add') // 'music-shield'

// UI Component
{product.metadata.hasAudio ? (
  <Link href={`/products/${getRelatedProductHandle(product, 'remove')}`}>
    🔇 Version sans audio (-$20, -5g)
  </Link>
) : (
  <Link href={`/products/${getRelatedProductHandle(product, 'add')}`}>
    🔊 Version avec audio (+$20, +5g)
  </Link>
)}
```

#### Vérifier Famille de Produits
```typescript
import { isInPlatformFamily } from '@/types/product-metadata'

if (isInPlatformFamily(product, 'shield-platform')) {
  // Afficher specs/features communes de la plateforme
  const sharedFeatures = getPlatformSharedFeatures(product)
}
```

#### Afficher Features Conditionnelles
```typescript
import { shouldDisplay } from '@/types/product-metadata'

const visibleFeatures = product.metadata.features.filter(feature =>
  shouldDisplay(feature.conditional, {
    Audio: variant.options.Audio,
    Verres: variant.options.Verres
  })
)
```

#### Extraire Metadata d'Option
```typescript
import { getOptionMetadata } from '@/types/product-metadata'

const lensMetadata = getOptionMetadata(
  product.options,
  "Verres",
  "Fire"
)
// => { hex: "#ff6b35", vlt: "63%-17%", code: "FIR" }
```

#### Afficher Specs Filtrées
```typescript
const batterySpecs = product.metadata.specs.battery.items.filter(item =>
  shouldDisplay(item.conditional, variantOptions)
)
```

---

### Backend (Medusa API)

#### Fetch Product avec Metadata
```typescript
const product = await medusa.admin.products.retrieve(productId, {
  fields: "*options,*options.values,metadata"
})

const features: ProductFeature[] = product.metadata.features
const specs: ProductSpecs = product.metadata.specs
```

#### Update Metadata
```typescript
await medusa.admin.products.update(productId, {
  metadata: {
    features: [...],
    specs: {...}
  }
})
```

---

## 🧪 Validation

### Checklist Produit Valide

**Options**:
- ✅ Chaque option a minimum 2 valeurs
- ✅ Chaque valeur a un `code` unique
- ✅ Options couleur ont `hex` défini
- ✅ Options verres ont `vlt` défini

**Features**:
- ✅ IDs uniques (kebab-case)
- ✅ Icônes valides (lucide-react)
- ✅ Catégories valides (voir liste)
- ✅ Priority définie (1-10)
- ✅ Conditional bien formatée si présente

**Specs**:
- ✅ Catégories ont des priorities
- ✅ Items ont un type valide
- ✅ Valeurs cohérentes avec le type
- ✅ Units définis quand applicable

**Variantes**:
- ✅ Titre auto-généré: `{ProductName} - {Option1}, {Option2}, ...`
- ✅ SKU unique et cohérent
- ✅ Options mapping complet (toutes les options du produit)
- ✅ Prix définis pour chaque variante

---

## 📊 Exemple de Migration

Voir `migrate-shield.ts` (à créer) pour script complet.

**Pseudo-code**:
```typescript
// 1. Enrichir les options
await medusa.admin.products.update(productId, {
  options: [
    {
      id: existingOptionId,
      values: [
        { value: "Matte Black", metadata: { hex: "#1a1a1a" } }
      ]
    }
  ]
})

// 2. Ajouter metadata
await medusa.admin.products.update(productId, {
  metadata: {
    features: [...],
    specs: {...}
  }
})

// 3. Vérifier variantes (déjà existantes, pas de modification)
const variants = await medusa.admin.products.listVariants(productId)
console.log(`✅ ${variants.length} variantes trouvées`)
```

---

## 🚀 Roadmap

### Phase 0: Fondation (ACTUEL)
- ✅ JSON référence Music Shield
- ✅ Types TypeScript
- ✅ Documentation

### Phase 1: Validation (NEXT)
- ⏳ Script migration Shield
- ⏳ Tests API avec données réelles
- ⏳ Validation structure

### Phase 2: UX Variantes
- ⏳ VariantOptionSelectors enrichi
- ⏳ Affichage metadata dans dropdowns
- ⏳ Badges VLT/Poids/Batterie

### Phase 3: UX Produit
- ⏳ ProductFeaturesEditor
- ⏳ ProductSpecsEditor
- ⏳ ProductOptionsManager

---

## 📞 Support

**Questions?** Voir:
- `music-shield-reference.json` pour exemples concrets
- `product-metadata.types.ts` pour signatures TypeScript
- Migration scripts (à venir) pour usage API

**Modifications au modèle?**
1. Mettre à jour `music-shield-reference.json`
2. Mettre à jour `product-metadata.types.ts`
3. Documenter le changement ici
4. Mettre à jour migrations existantes

---

**Version**: 1.0.0
**Dernière mise à jour**: 2026-02-28
**Auteur**: MyTechGear Development Team
