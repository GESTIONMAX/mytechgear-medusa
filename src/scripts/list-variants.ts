import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['variants'],
  });

  if (!product) {
    console.error('❌ Produit introuvable');
    return;
  }

  console.log('\n📦 Music Shield - Variantes:\n');
  console.log(`Total: ${product.variants?.length || 0}\n`);

  if (product.variants && product.variants.length > 0) {
    product.variants.forEach((v, idx) => {
      console.log(`${idx + 1}. ${v.title}`);
      console.log(`   ID: ${v.id}`);
      console.log(`   SKU: ${v.sku || 'N/A'}`);
      console.log();
    });
  }
}
