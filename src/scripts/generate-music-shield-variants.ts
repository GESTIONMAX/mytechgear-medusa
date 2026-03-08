/**
 * Script: Génération automatique des variantes Music Shield
 *
 * Génère toutes les combinaisons possibles de variantes pour le produit Music Shield
 * basé sur les options existantes (Monture × Verres)
 *
 * Usage:
 *   npx tsx src/scripts/generate-music-shield-variants.ts
 */

import 'dotenv/config';

const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3200';
const REGION_ID = process.env.MEDUSA_REGION_ID || 'reg_01KGBWVV7ZB2EPA479GHBBDP5K';
const PUBLISHABLE_KEY = 'pk_01JAN8S1M5RPRGT8TBWXY0M6E3';

// Prix de référence pour les nouvelles variantes (en centimes)
const DEFAULT_PRICE = 27500; // 275€

interface OptionValue {
  id: string;
  value: string;
  option_id: string;
}

interface ProductOption {
  id: string;
  title: string;
  values: OptionValue[];
}

interface Variant {
  id: string;
  title: string;
  sku?: string;
  options: Array<{
    value: string;
    option_id: string;
  }>;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  options: ProductOption[];
  variants: Variant[];
}

/**
 * Authentification Admin Medusa (Skip en mode dev local)
 */
async function authenticateAdmin(): Promise<string> {
  console.log('🔐 Mode développement local - authentification ignorée');
  return 'dev-mode';
}

/**
 * Récupère le produit Music Shield avec toutes ses options et variantes
 */
async function getMusicShieldProduct(): Promise<Product> {
  console.log('📦 Récupération du produit Music Shield via Frontend API...');

  const response = await fetch(`${FRONTEND_URL}/api/store/products/music-shield`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur récupération produit: ${response.status}`);
  }

  const data = await response.json();
  const product = data.product;

  if (!product) {
    throw new Error('Produit Music Shield introuvable');
  }

  console.log(`✅ Produit trouvé: ${product.title}`);
  console.log(`   Options: ${product.options?.length || 0}`);
  console.log(`   Variantes existantes: ${product.variants?.length || 0}`);

  return product;
}

/**
 * Génère toutes les combinaisons possibles d'options
 */
function generateAllCombinations(options: ProductOption[]): Map<string, Record<string, string>> {
  console.log('\n🔄 Génération de toutes les combinaisons possibles...');

  // Filtrer les options qui ont des valeurs
  const validOptions = options.filter(opt => opt.values && opt.values.length > 0);

  if (validOptions.length === 0) {
    console.log('⚠️  Aucune option valide trouvée');
    return new Map();
  }

  // Fonction récursive pour générer les combinaisons
  function combine(optionIndex: number, current: Record<string, string>): Array<Record<string, string>> {
    if (optionIndex >= validOptions.length) {
      return [{ ...current }];
    }

    const option = validOptions[optionIndex];
    const results: Array<Record<string, string>> = [];

    for (const value of option.values) {
      const next = {
        ...current,
        [option.title]: value.value,
      };
      results.push(...combine(optionIndex + 1, next));
    }

    return results;
  }

  const combinations = combine(0, {});

  // Créer une Map avec clé = combinaison triée pour comparaison facile
  const combinationsMap = new Map<string, Record<string, string>>();

  for (const combo of combinations) {
    const key = Object.entries(combo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, v]) => v)
      .join('|');

    combinationsMap.set(key, combo);
  }

  console.log(`✅ ${combinationsMap.size} combinaisons générées`);

  return combinationsMap;
}

/**
 * Trouve les combinaisons déjà existantes
 */
function getExistingCombinations(product: Product): Set<string> {
  const existing = new Set<string>();

  for (const variant of product.variants) {
    const combo: Record<string, string> = {};

    for (const variantOption of variant.options || []) {
      const productOption = product.options.find(opt => opt.id === variantOption.option_id);
      if (productOption) {
        combo[productOption.title] = variantOption.value;
      }
    }

    const key = Object.entries(combo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, v]) => v)
      .join('|');

    if (key) {
      existing.add(key);
    }
  }

  return existing;
}

/**
 * Génère un SKU automatique basé sur les options
 */
function generateSKU(combination: Record<string, string>): string {
  const prefix = 'MSH'; // Music Shield

  const monture = combination['Monture'] || combination['Frame Color'] || '';
  const verres = combination['Verres'] || combination['Lens Color'] || '';

  // Abréviations
  const montureCode = monture
    .replace('Matte Black', 'MB')
    .replace('White', 'W')
    .replace('La Melaza', 'LAM')
    .replace('Neon', 'N');

  const verresCode = verres
    .replace('Smoke', 'SMK')
    .replace('Fire', 'FIR')
    .replace('Clear', 'CLR');

  return `${prefix}-${montureCode}-${verresCode}`;
}

/**
 * Génère le titre de la variante
 */
function generateVariantTitle(productTitle: string, combination: Record<string, string>): string {
  const values = Object.values(combination).filter(Boolean);
  return `${productTitle} - ${values.join(', ')}`;
}

/**
 * Crée une variante via l'API Admin Medusa
 */
async function createVariant(
  productId: string,
  combination: Record<string, string>,
  productTitle: string,
  productOptions: ProductOption[]
): Promise<void> {
  const sku = generateSKU(combination);
  const title = generateVariantTitle(productTitle, combination);

  console.log(`\n📝 Création: ${title}`);
  console.log(`   SKU: ${sku}`);

  // Construire le payload options
  const options: Record<string, string> = {};

  for (const [optionTitle, value] of Object.entries(combination)) {
    options[optionTitle] = value;
  }

  const payload = {
    title,
    sku,
    manage_inventory: false,
    options,
    prices: [
      {
        amount: DEFAULT_PRICE,
        currency_code: 'eur',
        region_id: REGION_ID,
      },
    ],
  };

  console.log('   Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${FRONTEND_URL}/api/admin/products/${productId}/variants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Erreur création: ${response.status} - ${error}`);
    throw new Error(`Échec création variante: ${response.status}`);
  }

  const data = await response.json();
  console.log(`✅ Variante créée avec succès (ID: ${data.variant?.id || data.product_variant?.id || 'unknown'})`);
}

/**
 * Script principal
 */
async function main() {
  try {
    console.log('🚀 Démarrage du script de génération de variantes Music Shield\n');
    console.log(`Backend Medusa: ${MEDUSA_BACKEND_URL}`);
    console.log(`Prix par défaut: ${DEFAULT_PRICE / 100}€\n`);

    // 1. Authentification
    await authenticateAdmin();

    // 2. Récupérer le produit
    const product = await getMusicShieldProduct();

    // 3. Générer toutes les combinaisons
    const allCombinations = generateAllCombinations(product.options);

    // 4. Identifier les combinaisons existantes
    const existingCombinations = getExistingCombinations(product);
    console.log(`\n📋 Variantes existantes: ${existingCombinations.size}`);

    for (const key of existingCombinations) {
      console.log(`   - ${key}`);
    }

    // 5. Filtrer les combinaisons manquantes
    const missingCombinations: Array<[string, Record<string, string>]> = [];

    for (const [key, combo] of allCombinations.entries()) {
      if (!existingCombinations.has(key)) {
        missingCombinations.push([key, combo]);
      }
    }

    console.log(`\n🆕 Variantes à créer: ${missingCombinations.length}`);

    if (missingCombinations.length === 0) {
      console.log('\n✅ Toutes les variantes existent déjà. Aucune création nécessaire.');
      return;
    }

    // 6. Créer les variantes manquantes
    console.log('\n🔨 Création des variantes manquantes...');

    for (const [key, combo] of missingCombinations) {
      console.log(`\n${key}`);
      await createVariant(product.id, combo, product.title, product.options);

      // Pause de 500ms entre chaque création pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n\n🎉 ✅ Script terminé avec succès!');
    console.log(`📊 Résumé:`);
    console.log(`   - Variantes existantes: ${existingCombinations.size}`);
    console.log(`   - Variantes créées: ${missingCombinations.length}`);
    console.log(`   - Total: ${existingCombinations.size + missingCombinations.length}`);

  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécution
main();
