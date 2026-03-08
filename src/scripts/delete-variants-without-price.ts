/**
 * Script pour supprimer les variantes Music Shield sans prix
 */
import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  console.log('🗑️  Suppression des variantes sans prix\n');

  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['variants'],
  });

  if (!product) {
    console.error('❌ Produit introuvable');
    return;
  }

  console.log(`📦 ${product.title}`);
  console.log(`   Variantes totales: ${product.variants?.length || 0}\n`);

  // IDs des 5 variantes sans prix
  const variantsToDelete = [
    'variant_01KJJ5EEEWR9P8N0AHYG17KG9V',
    'variant_01KJJ5EEFJCXMHN4GBKSS9PMQQ',
    'variant_01KJJ5EEG11EXX848H76GGWRVX',
    'variant_01KJJ5EEGXCQ5MXQ9RPZMBP50X',
    'variant_01KJJ5EEHCA37Y9HJ342GAB89N',
  ];

  let deleted = 0;

  for (const variantId of variantsToDelete) {
    const variant = product.variants?.find(v => v.id === variantId);
    if (!variant) {
      console.log(`⚠️  ${variantId} - Introuvable\n`);
      continue;
    }

    console.log(`🗑️  ${variant.title}`);

    try {
      await productService.deleteProductVariants([variantId]);
      console.log(`   ✅ Supprimée\n`);
      deleted++;
    } catch (error) {
      console.log(`   ❌ Erreur: ${error.message}\n`);
    }
  }

  console.log(`\n🎉 Terminé!`);
  console.log(`   Variantes supprimées: ${deleted}/${variantsToDelete.length}`);
}
