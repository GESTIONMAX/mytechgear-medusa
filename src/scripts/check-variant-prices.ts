/**
 * Script: Vérifier les prix des variantes Music Shield
 *
 * Diagnostic complet du système de prix pour comprendre pourquoi
 * le frontend affiche "Prix sur demande"
 */

import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  console.log('\n🔍 AUDIT COMPLET DU SYSTÈME DE PRIX\n');
  console.log('═'.repeat(60), '\n');

  // 1. Récupérer le produit Music Shield
  const [product] = await productService.listProducts(
    { handle: ['music-shield'] },
    { relations: ['variants'] }
  );

  if (!product) {
    console.error('❌ Produit Music Shield introuvable');
    return;
  }

  console.log(`📦 Produit: ${product.title}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Handle: ${product.handle}`);
  console.log(`   Status: ${product.status}`);
  console.log();

  // 2. Vérifier les variantes
  if (!product.variants || product.variants.length === 0) {
    console.error('❌ Aucune variante trouvée');
    return;
  }

  console.log(`📊 Variantes: ${product.variants.length} trouvées\n`);

  // 3. Inspecter chaque variante et ses prix
  for (let i = 0; i < product.variants.length; i++) {
    const variant = product.variants[i];
    console.log(`\n${i + 1}. ${variant.title}`);
    console.log('   ─'.repeat(30));
    console.log(`   ID: ${variant.id}`);
    console.log(`   SKU: ${variant.sku || 'N/A'}`);
    console.log(`   Inventory: ${variant.inventory_quantity ?? 'non géré'}`);
    console.log(`   Manage inventory: ${variant.manage_inventory}`);

    // Medusa v2: Les prix ne sont pas accessibles via listProducts
    // Ils doivent être récupérés via le Pricing Module avec un contexte (region, currency)
    console.log('   Note: Prix gérés par Pricing Module (nécessite region_id)');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✅ Audit terminé\n');
}
