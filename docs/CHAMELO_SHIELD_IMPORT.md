# Import des produits Chamelo Shield

## 🎯 Contexte

Ce guide documente l'importation des produits **Shield** et **Music Shield** de Chamelo dans Medusa.

### Décision architecturale

**Shield et Music Shield sont modélisés comme DEUX PRODUITS DISTINCTS**, pas des variantes.

**Justification technique :**
- Architecture électronique différente (batterie 25 mAh vs 180 mAh)
- Châssis modifié (branches 140mm vs 166mm pour loger les haut-parleurs)
- Poids différent (37g vs 49g)
- BOM non interchangeable
- SKU racine distinct chez Chamelo

---

## 📦 Structure des produits

### Shield (sans audio) - ~210€

| Attribut | Valeur |
|----------|--------|
| Prix US | 199 USD |
| Poids | 37g |
| Batterie | 25 mAh (52h autonomie teinte) |
| Audio | ❌ Non |
| Branches | 140mm |
| **Variantes** | 6 (3 montures × 2 verres) |

**Variantes disponibles :**
- Matte Black / Fire (`SH-MB-FIR`)
- Matte Black / Smoke (`SH-MB-SMK`)
- White / Fire (`SH-WH-FIR`)
- White / Smoke (`SH-WH-SMK`)
- Neon / Fire (`SH-NE-FIR`)
- Neon / Smoke (`SH-NE-SMK`)

---

### Music Shield (avec audio) - ~275€

| Attribut | Valeur |
|----------|--------|
| Prix US | 260 USD |
| Poids | 49g |
| Batterie | 180 mAh (100h teinte + 6,5h audio) |
| Audio | ✅ Bluetooth open-ear |
| Branches | 166mm |
| **Variantes** | 5 (3 montures × 2 verres - 1 édition limitée) |

**Variantes disponibles :**
- Matte Black / Fire (`MSH-MB-FIR`)
- Matte Black / Smoke (`MSH-MB-SMK`)
- White / Fire (`MSH-WH-FIR`)
- White / Smoke (`MSH-WH-SMK`)
- La Melaza / Fire (`MSH-LM-FIR`) - Édition limitée

---

## 🔗 Cross-linking (metadata)

Chaque produit contient des métadonnées de liaison :

**Shield →**
```typescript
metadata: {
  has_audio: false,
  product_family: "shield",
  related_product_audio: "music-shield", // Handle du produit avec audio
}
```

**Music Shield →**
```typescript
metadata: {
  has_audio: true,
  product_family: "shield",
  related_product_no_audio: "shield", // Handle du produit sans audio
}
```

Ces metadata permettent au front-end d'afficher :
- Widget de comparaison
- Lien "Version avec/sans audio disponible"
- Badge visuel 🔇/🔊

---

## 💰 Conversion de prix

Le script utilise une formule de conversion :

```typescript
const USD_TO_EUR = 0.92        // Taux de change (à ajuster)
const MARGIN_MULTIPLIER = 1.15 // Marge revendeur 15%

Prix EUR = Prix USD × Taux × Marge × 100 (en centimes)
```

**Exemples :**
- Shield : 199 USD → ~210 EUR HT
- Music Shield : 260 USD → ~275 EUR HT

⚠️ **À ajuster selon :**
- Taux de change EUR/USD du jour
- Droits de douane (si hors UE)
- Marge commerciale souhaitée
- TVA applicable (non incluse dans les prix Medusa)

---

## 🚀 Lancer l'import

### Prérequis

1. **Serveur Medusa démarré**
   ```bash
   npm run dev
   ```

2. **Collection SPORT existante**
   - Vérifier l'ID de la collection dans l'admin
   - Remplacer `SPORT_COLLECTION_ID` dans le script (ligne 30)

3. **Catégorie SPORT existante**
   - ID actuel : `pcat_01KGBS24KG6YME924C8WKMV3X0`
   - Si différent, mettre à jour ligne 31

### Commande d'import

```bash
npx medusa exec ./src/scripts/import-chamelo-shield.ts
```

### Résultat attendu

```
📦 Importing Chamelo Shield products...
🚀 Importing 2 products...

✅ Chamelo Shield import completed!
   Products created: 2
   - Shield (sans audio): 6 variantes
   - Music Shield (avec audio): 5 variantes
   Total variants: 11
```

---

## 🔍 Vérification post-import

### Dans l'admin Medusa

1. **Aller sur** http://localhost:9000/app/products

2. **Vérifier** :
   - ✅ 2 produits créés : "Shield" et "Music Shield"
   - ✅ Collection "SPORT" affectée
   - ✅ Prix en EUR correctement convertis
   - ✅ Metadata `has_audio`, `product_family` présentes

3. **Tester** :
   - Ouvrir la fiche Shield
   - Vérifier les 6 variantes (3 montures × 2 verres)
   - Vérifier metadata `related_product_audio: "music-shield"`

4. **Répéter** pour Music Shield

### En base de données

```sql
-- Vérifier les produits créés
SELECT p.title, p.handle, pc.title as collection
FROM product p
LEFT JOIN product_collection pc ON p.collection_id = pc.id
WHERE p.handle IN ('shield', 'music-shield');

-- Vérifier les metadata
SELECT p.title, p.metadata
FROM product p
WHERE p.handle IN ('shield', 'music-shield');

-- Vérifier les variantes
SELECT p.title, COUNT(pv.id) as variant_count
FROM product p
LEFT JOIN product_variant pv ON p.id = pv.product_id
WHERE p.handle IN ('shield', 'music-shield')
GROUP BY p.title;
```

---

## 📊 Metadata complètes (référence)

### Shield
```typescript
{
  brand: "Chamelo",
  product_family: "shield",
  has_audio: false,
  related_product_audio: "music-shield",
  weight_grams: 37,
  battery_mah: 25,
  battery_tint_hours: 52,
  water_resistance: "IPX4",
  lens_technology: "Eclipse™ Tint-Adjustable",
  light_transmission_range: "54-17%",
  uv_protection: "100%",
  warranty_years: 2,
  ce_certified: true,
  // ... etc
}
```

### Music Shield
```typescript
{
  brand: "Chamelo",
  product_family: "shield",
  has_audio: true,
  bluetooth: true,
  related_product_no_audio: "shield",
  weight_grams: 49,
  battery_mah: 180,
  battery_tint_hours: 100,
  battery_audio_hours: 6.5,
  audio_type: "Open-ear speakers",
  water_resistance: "IPX4",
  warranty_years: 2,
  ce_certified: true,
  weee_compliant: true,
  // ... etc
}
```

---

## 🎨 Utilisation front-end (exemples)

### Badge audio dans la liste produits

```tsx
{product.metadata.has_audio ? (
  <Badge variant="success">🔊 Audio Bluetooth</Badge>
) : (
  <Badge variant="neutral">🔇 Sans audio</Badge>
)}
```

### Widget de comparaison

```tsx
{product.metadata.related_product_audio && (
  <Card>
    <p>💡 Version AVEC AUDIO disponible</p>
    <Link to={`/products/${product.metadata.related_product_audio}`}>
      Voir Music Shield (+65€) →
    </Link>
  </Card>
)}
```

### Tableau comparatif

```tsx
<ComparisonTable>
  <Row>
    <Cell>Poids</Cell>
    <Cell>{product.metadata.weight_grams}g</Cell>
  </Row>
  <Row>
    <Cell>Autonomie teinte</Cell>
    <Cell>{product.metadata.battery_tint_hours}h</Cell>
  </Row>
  {product.metadata.has_audio && (
    <Row>
      <Cell>Autonomie audio</Cell>
      <Cell>{product.metadata.battery_audio_hours}h</Cell>
    </Row>
  )}
</ComparisonTable>
```

---

## 🔄 Réimporter / Mettre à jour

### Supprimer les produits existants

```bash
# Via SQL
psql postgres://medusa:medusa@localhost:5433/medusa -c "
  DELETE FROM product WHERE handle IN ('shield', 'music-shield');
"
```

### Relancer l'import

```bash
npx medusa exec ./src/scripts/import-chamelo-shield.ts
```

---

## ⚠️ Points d'attention

### Prix

- [ ] Vérifier le taux de change USD/EUR actuel
- [ ] Ajuster `USD_TO_EUR` dans le script
- [ ] Définir la marge commerciale (`MARGIN_MULTIPLIER`)
- [ ] Calculer la TVA selon le pays de livraison

### Collection/Catégorie

- [ ] Vérifier l'ID de la collection SPORT
- [ ] Remplacer `SPORT_COLLECTION_ID` si différent
- [ ] Vérifier l'ID de la catégorie SPORT

### Stock

- [ ] Initialiser `inventory_quantity` à 0 par défaut
- [ ] Mettre à jour manuellement après réception fournisseur
- [ ] Activer `manage_inventory: true` pour suivi stock

### Images

- [ ] Demander les assets officiels à Chamelo
- [ ] Uploader dans Medusa admin ou CDN
- [ ] Associer aux variantes correspondantes

### Conformité UE

- [ ] Vérifier certificat CE Chamelo
- [ ] S'assurer de la conformité RoHS
- [ ] Prévoir recyclage DEEE (batteries)
- [ ] Notice multilingue (FR/DE/etc.)

---

## 📞 Contact fournisseur

Points à clarifier avec Chamelo :

- [ ] Prix de gros revendeur
- [ ] MOQ (quantité minimum)
- [ ] Délais de livraison
- [ ] Assets photos haute résolution
- [ ] Version Bluetooth exacte (Music Shield)
- [ ] Certificats CE/RoHS
- [ ] Notice multilingue disponible ?
- [ ] Politique retours/garanties

---

## 📚 Ressources

- [Shield - Chamelo](https://chamelo.com/products/shield-fire-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-sunglasses)
- [Music Shield - Chamelo](https://chamelo.com/products/music-shield-fire-lenses-sports-smart-glasses-electrochromic-tint-adjustable-changing-audio-sunglasses)
- [Medusa Product API](https://docs.medusajs.com/resources/references/product/models/Product)
