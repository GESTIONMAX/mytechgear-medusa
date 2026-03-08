import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  });

  if (!product) {
    console.error('❌ Produit introuvable');
    return;
  }

  console.log('\n📦 Music Shield - Statut:\n');
  console.log('ID:', product.id);
  console.log('Handle:', product.handle);
  console.log('Title:', product.title);
  console.log('Status:', product.status);
  console.log('Published:', product.published_at ? 'OUI' : 'NON');
  console.log('\nStructure:');
  console.log(JSON.stringify({
    id: product.id,
    handle: product.handle,
    title: product.title,
    status: product.status,
    published_at: product.published_at,
  }, null, 2));
}
