/**
 * Script Medusa exec: Génération de variantes Music Shield
 *
 * Utilise les modules Medusa pour créer directement les variantes en base
 *
 * Usage:
 *   npx medusa exec ./src/scripts/generate-variants-exec.ts
 */

import { Modules } from "@medusajs/framework/utils";

export default async function generateMusicShieldVariants({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  console.log('🚀 Génération des variantes Music Shield\n');

  // 1. Récupérer le produit
  const [product] = await productService.listProducts(
    { handle: "music-shield" },
    { relations: ["options", "options.values", "variants", "variants.options"] }
  );

  if (!product) {
    console.error('❌ Produit Music Shield introuvable');
    return;
  }

  console.log(`✅ Produit: ${product.title}`);
  console.log(`   Options: ${product.options?.length || 0}`);
  console.log(`   Variantes existantes: ${product.variants?.length || 0}\n`);

  // 2. Filtrer les options valides
  const validOptions = (product.options || []).filter(
    opt => opt.values && opt.values.length > 0
  );

  if (validOptions.length === 0) {
    console.log('⚠️  Aucune option valide');
    return;
  }

  // 3. Générer toutes les combinaisons
  function generateCombinations(options, index = 0, current = {}) {
    if (index >= options.length) {
      return [{ ...current }];
    }

    const option = options[index];
    const results = [];

    for (const value of option.values) {
      const next = {
        ...current,
        [option.id]: value.id,
      };
      results.push(...generateCombinations(options, index + 1, next));
    }

    return results;
  }

  const allCombinations = generateCombinations(validOptions);
  console.log(`🔄 ${allCombinations.length} combinaisons possibles\n`);

  // 4. Identifier les combinaisons existantes
  const existingCombos = new Set();

  for (const variant of product.variants || []) {
    const comboKey = (variant.options || [])
      .map(vo => `${vo.option_id}:${vo.value}`)
      .sort()
      .join('|');

    if (comboKey) {
      existingCombos.add(comboKey);
    }
  }

  console.log(`📋 Variantes existantes: ${existingCombos.size}\n`);

  // 5. Créer les variantes manquantes
  let created = 0;

  for (const combo of allCombinations) {
    // Construire la clé de combinaison
    const comboKey = Object.entries(combo)
      .map(([optId, valId]) => `${optId}:${valId}`)
      .sort()
      .join('|');

    if (existingCombos.has(comboKey)) {
      continue; // Déjà existante
    }

    // Construire le titre et SKU
    const optionValues = Object.entries(combo).map(([optId, valId]) => {
      const option = validOptions.find(o => o.id === optId);
      const value = option?.values.find(v => v.id === valId);
      return value?.value;
    }).filter(Boolean);

    const title = `${product.title} - ${optionValues.join(', ')}`;

    // Générer SKU
    const montureVal = optionValues[0] || '';
    const verresVal = optionValues[1] || '';

    const montureCode = montureVal
      .replace('Matte Black', 'MB')
      .replace('White', 'W')
      .replace('La Melaza', 'LAM')
      .replace('Neon', 'N');

    const verresCode = verresVal
      .replace('Smoke', 'SMK')
      .replace('Fire', 'FIR')
      .replace('Clear', 'CLR');

    const sku = `MSH-${montureCode}-${verresCode}`;

    console.log(`📝 Création: ${title}`);
    console.log(`   SKU: ${sku}`);

    // Construire les options pour Medusa - format: Record<option_title, value_string>
    // Ne pas inclure les options sans valeur
    const variantOptions = {};

    for (const option of product.options) {
      const valueId = combo[option.id];

      if (valueId) {
        const value = option.values?.find(v => v.id === valueId);
        if (value?.value) {
          variantOptions[option.title] = value.value;
        }
      }
    }

    try {
      const variant = await productService.createProductVariants({
        product_id: product.id,
        title,
        sku,
        manage_inventory: false,
        options: variantOptions,
        prices: [
          {
            amount: 27500, // 275€
            currency_code: 'eur',
          },
        ],
      });

      console.log(`✅ Créée avec succès (prix: 275€)\n`);
      created++;

    } catch (error) {
      console.error(`❌ Erreur: ${error.message}\n`);
    }
  }

  console.log(`\n🎉 Terminé!`);
  console.log(`   Variantes créées: ${created}`);
  console.log(`   Total: ${allCombinations.length}`);
}
