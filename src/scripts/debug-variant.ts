import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  // Récupérer sans relations problématiques
  const variants = await productService.listProductVariants({
    id: ['variant_01KJJ5EEGXCQ5MXQ9RPZMBP50X'],
  });

  console.log('\n📦 Variante récupérée:\n');
  if (variants.length === 0) {
    console.log('❌ Aucune variante trouvée');
    return;
  }

  const variant = variants[0];
  console.log('ID:', variant.id);
  console.log('Title:', variant.title);
  console.log('SKU:', variant.sku);
  console.log('Product ID:', variant.product_id);
  console.log('\nStructure complète:');
  console.log(JSON.stringify(variant, null, 2));
}
