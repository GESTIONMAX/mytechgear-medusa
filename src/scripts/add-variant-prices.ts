/**
 * Script pour ajouter les prix manquants aux variantes Music Shield
 */
import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);
  const pricingService = container.resolve(Modules.PRICING);

  console.log('💰 Ajout des prix aux variantes Music Shield\n');

  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['variants'],
  });

  if (!product) {
    console.error('❌ Produit Music Shield introuvable');
    return;
  }

  const targetPrice = 27500; // 275€
  const currency = 'eur';
  let updated = 0;

  console.log(`📦 Produit: ${product.title}`);
  console.log(`   Variantes: ${product.variants?.length || 0}\n`);

  for (const variant of product.variants || []) {
    console.log(`💸 ${variant.title}`);
    console.log(`   Définition du prix: ${targetPrice / 100}€`);

    try {
      await productService.updateProductVariants(variant.id, {
        prices: [{
          amount: targetPrice,
          currency_code: currency,
        }],
      });

      console.log(`   ✅ Prix mis à jour\n`);
      updated++;
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}\n`);
    }
  }

  console.log(`🎉 Terminé!`);
  console.log(`   Prix ajoutés: ${updated}`);
}
