# Business Engine - MyTechGear

**Version** : 1.0
**Dernière mise à jour** : 2026-02-01

---

## Objet Métier Central

**PRODUIT** (Smart Glasses)

Caractéristiques :
- Produit physique unique avec variantes (couleur, verres, finition)
- Technologies embarquées : audio, electrochromic, prismatic
- Prix unitaire par variante
- Inventaire géré par variante
- Images partagées au niveau produit (toutes variantes)
- Metadata techniques riches (fonctionnalités, specs, certifications)

---

## Objets Secondaires

### Variante (Product Variant)
- SKU unique
- Combinaison d'options (Couleur × Verres × Finition)
- Prix spécifique (TTC France)
- Stock propre (manage_inventory: true)
- Statut : disponible / rupture / précommande

### Collection
- Regroupement marketing (Bestsellers, Sport, Lifestyle, Prismatic)
- Utilisé pour filtrage frontend
- Un produit peut appartenir à 1 collection

### Catégorie
- Hiérarchie métier (SPORT / LIFESTYLE / PRISMATIC)
- Navigation principale
- Un produit peut appartenir à plusieurs catégories

### Tag
- Multi-valeurs (Bluetooth, Audio, UV Protection, Bestseller)
- Filtres facettes (37 tags disponibles)
- Auto-assignés via metadata

### Commande (Order)
- État transactionnel standard Medusa
- Lifecycle : draft → pending → completed → shipped
- Paiement capturé automatiquement (Stripe)
- Rattachement client obligatoire

### Région
- France Métropolitaine uniquement (pour l'instant)
- TVA 20% appliquée automatiquement
- Devise : EUR

### Shipping Option
- Standard (5.90€), Express (12.90€), Gratuite (> 150€)
- Service Zone : France

---

## États Métier (State Machine)

### Produit

```
draft → published → archived
```

**Règles** :
- Un produit `draft` n'est jamais visible côté client
- Un produit `published` sans variante disponible = affichage "Rupture de stock"
- Un produit `archived` = retiré du catalogue (mais historique conservé)
- Transition `published → draft` interdite si commandes en cours

### Variante

```
available → out_of_stock → discontinued
```

**Règles** :
- `available` : `inventory_quantity > 0` OU `manage_inventory = false`
- `out_of_stock` : `inventory_quantity = 0`
- `discontinued` : retrait définitif (variante marquée comme inactive)

### Commande

```
pending → requires_action → payment_authorized → fulfilled → shipped → completed
```

**Invariants** :
- **Jamais expédié avant paiement capturé**
- **Stock décrémenté uniquement après `payment_authorized`**
- **Remboursement impossible si état < `payment_authorized`**
- **Annulation impossible après `shipped`**

### Paiement

```
requires_payment_method → requires_confirmation → requires_action → succeeded → canceled
```

**Règles Stripe** :
- Capture automatique (pas de pré-autorisation)
- Webhook `payment_intent.succeeded` → commande `payment_authorized`
- Webhook `payment_intent.payment_failed` → commande bloquée

---

## Transitions Autorisées

### Création Produit

**Source** : Import fournisseur OU création manuelle admin

**Workflow** :
1. Produit créé en `draft`
2. Enrichissement metadata (auto ou manuel)
3. Upload images (script automatisé)
4. Assignation tags (auto-tagging via metadata)
5. Passage en `published`

**Validation pré-publication** :
- ✅ Au moins 1 variante définie
- ✅ Au moins 1 image (thumbnail obligatoire)
- ✅ Prix défini pour toutes variantes
- ✅ Handle unique (URL-safe)
- ⚠️ Metadata recommandées (brand, product_family, lens_technology)

### Mise à Jour Prix

**Déclencheur** : Changement fournisseur OU stratégie pricing

**Règles** :
- Prix modifiable à tout moment
- Commandes en cours conservent prix au moment du paiement
- Nouveau prix visible immédiatement côté client
- Pas de versioning automatique des prix (géré par Medusa Price Lists si nécessaire)

### Mise à Jour Stock

**Déclencheur** : Réception fournisseur OU vente

**Workflow** :
```
Paiement confirmé → Stock décrémenté automatiquement
Annulation → Stock réincrementé (si < 48h)
Retour produit → Stock réincrementé manuellement
```

**Règle d'or** :
- Stock négatif = impossible (Medusa empêche la vente)
- Overselling interdit (sauf désactivation `manage_inventory`)

### Remboursement

**Conditions** :
- État commande ≥ `payment_authorized`
- Capture Stripe effectuée
- Délai < 14 jours (loi UE)

**Workflow** :
1. Demande client → création Return
2. Validation admin
3. Remboursement Stripe (via API)
4. État commande → `refunded` (partiel ou total)
5. Stock réincrementé si produit retourné en bon état

**Interdit** :
- Remboursement > montant payé
- Remboursement sans Return validé

---

## Rôles et Responsabilités

### Admin Store (humain)
- Gestion catalogue produits
- Validation commandes
- Gestion retours/remboursements
- Configuration shipping/taxes
- Analyse performance (bestsellers, ruptures)

### Script d'Import (automatisé)
- Fetch produits depuis Shopify
- Download images
- Upload images Medusa
- Création produits (draft)
- Enrichissement metadata

### Auto-Tagging Engine (automatisé)
- Analyse metadata produit
- Assignation tags pertinents
- Re-run possible à tout moment (idempotent)

### Stripe (provider)
- Gestion paiements
- Capture automatique
- Webhooks événements paiement
- Aucune logique métier (seulement transactions)

### Brevo (provider)
- Envoi emails transactionnels
- Aucune logique métier (seulement notifications)

---

## Invariants Métier

### JAMAIS

1. **Expédition sans paiement**
   - `state = shipped` ⇒ `payment_status = captured`

2. **Stock négatif**
   - `inventory_quantity ≥ 0` (toujours)

3. **Commande sans client**
   - `order.customer_id != null` (obligatoire)

4. **Prix HT exposé au client**
   - Toujours TTC (TVA 20% incluse)

5. **Produit sans handle**
   - `product.handle` = unique, URL-safe, immuable après publication

6. **Variante sans SKU**
   - `variant.sku` = unique, alphanumeric

7. **Remboursement > montant payé**
   - `refund.amount ≤ order.total`

8. **Bestseller non défini**
   - Tag "Bestseller" assigné uniquement si :
     - Présent dans analyse chamelo.com/collections/best-sellers
     - OU ventes > seuil défini (future évolution)

### TOUJOURS

1. **TVA France appliquée**
   - Région France = TVA 20% automatique

2. **Images hosted localement (pour l'instant)**
   - URLs images : `http://localhost:9000/static/private-*`
   - Migration S3/CDN prévue (phase 2)

3. **Metadata technique complète**
   - Champs obligatoires : `brand`, `product_family`, `has_audio`, `uv_protection`

4. **Email confirmation commande**
   - Trigger automatique via Brevo après `payment_authorized`

---

## Événements Métier Déclencheurs

### `order.placed`
**Trigger** : Paiement Stripe `succeeded`

**Actions** :
- État commande → `payment_authorized`
- Décrémentation stock
- Email confirmation client (Brevo)
- Log analytics (futur)

### `order.shipment_created`
**Trigger** : Admin marque commande "expédiée"

**Actions** :
- Email tracking client (Brevo)
- État commande → `shipped`
- Création shipment avec tracking number

### `order.canceled`
**Trigger** : Admin annule commande (avant expédition)

**Actions** :
- Remboursement Stripe (si paiement capturé)
- Réincrémentation stock
- Email annulation client

### `product.created`
**Trigger** : Import script OU création admin

**Actions** :
- État `draft` par défaut
- Auto-tagging (si metadata présente)
- Aucune notification

### `product.updated`
**Trigger** : Modification admin OU script enrichissement

**Actions** :
- Re-run auto-tagging (si metadata changée)
- Invalidation cache frontend (futur CDN)

---

## Décisions Structurantes

### 1. Capture Paiement Automatique (vs Pré-autorisation)

**Décision** : Stripe en mode `automatic capture`

**Rationale** :
- Stock limité (smart glasses haute valeur)
- Pas de fabrication à la demande
- Simplification workflow (pas de double étape)
- Client débité immédiatement = engagement fort

**Conséquence** :
- Remboursement obligatoire si annulation après paiement
- Stock décrémenté instantanément

### 2. TVA Incluse (TTC) Partout

**Décision** : Prix affichés TOUJOURS TTC

**Rationale** :
- Obligation légale France (B2C)
- Évite confusion client
- Simplifie frontend (pas de calcul côté client)

**Conséquence** :
- Backend expose uniquement prix TTC via API
- Calcul HT = backend uniquement (facturation)

### 3. Images Centralisées au Niveau Produit (vs Variante)

**Décision** : `product.images` (pas `variant.images`)

**Rationale** :
- Variantes = différences mineures (couleur, verres)
- Galerie unique pour toutes variantes
- Simplification gestion images
- Chamelo utilise même stratégie

**Conséquence** :
- Impossible d'avoir images spécifiques par variante
- Si nécessaire futur : utiliser `variant.metadata.custom_images`

### 4. Auto-Tagging via Metadata (vs Tags Manuels)

**Décision** : Tags assignés automatiquement via analyse metadata

**Rationale** :
- Catalogue 16+ produits
- Metadata riches disponibles (import Shopify)
- Évite erreur humaine
- Reproductible (script re-run)

**Conséquence** :
- Metadata = source de vérité
- Tags manuels possibles mais déconseillés (écrasés au prochain run)

### 5. Handles Immuables Après Publication

**Décision** : `product.handle` ne change jamais après `published`

**Rationale** :
- URLs stables (SEO)
- Pas de redirections complexes
- Contrat stable frontend

**Conséquence** :
- Handle mal choisi = création nouveau produit
- Handle inclut préfixe explicite (ex: `dragon-chamelo` vs `dragon`)

### 6. Stock Géré par Variante (manage_inventory: true)

**Décision** : Inventaire activé pour toutes variantes

**Rationale** :
- Produits physiques haute valeur
- Stock limité fournisseur
- Besoin visibilité précise

**Conséquence** :
- Overselling impossible
- Rupture stock visible immédiatement
- Admin doit mettre à jour stock manuellement (pas de sync auto fournisseur)

---

## Limites Actuelles du Système

### Mono-Région (France uniquement)
- Pas de multi-devises
- Pas de calcul TVA variable
- Shipping France uniquement

**Évolution prévue** : Multi-région (UE, US) - Phase 3

### Images Stockées Localement
- Pas de CDN
- Bande passante serveur Medusa
- Pas de redimensionnement à la volée

**Évolution prévue** : S3 + CloudFront - Phase 2

### Pas de Sync Stock Fournisseur
- Stock mis à jour manuellement
- Risque désynchronisation

**Évolution prévue** : API fournisseur (si disponible) - Phase 3

### Pas de Product Bundling
- Pas de vente par lot
- Pas de produits composés

**Évolution prévue** : Bundles (ex: Shield + étui) - Phase 2

### Pas de Personnalisation Produit
- Pas de gravure
- Pas de configuration custom

**Évolution prévue** : Non prioritaire

---

## Glossaire Métier

**Smart Glasses** : Lunettes avec technologie embarquée (audio, electrochromic, prismatic)

**Electrochromic** : Technologie de teinte ajustable électroniquement

**Prismatic** : Technologie Chamelo de changement de couleur instantané

**Handle** : Identifiant URL-safe unique d'un produit (ex: `aura-audio`)

**SKU** : Stock Keeping Unit - identifiant unique variante

**Bestseller** : Produit identifié comme top vente (source: chamelo.com/collections/best-sellers)

**Chamelo** : Marque fournisseur principale (smart glasses electrochromic/prismatic)

**Payload** : Marque fournisseur secondaire (produits génériques)

**TTC** : Toutes Taxes Comprises (prix final client)

**HT** : Hors Taxes (prix avant TVA)

---

**Prochaine révision prévue** : Après Phase 2 (S3 + Multi-région)
