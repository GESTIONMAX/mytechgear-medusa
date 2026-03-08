import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  console.log('🗑️  Suppression du doublon sans SKU\n');

  try {
    await productService.deleteProductVariants(['variant_01KJJ241N3C2RHT4NY30XD13ND']);
    console.log('✅ Doublon supprimé');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}
