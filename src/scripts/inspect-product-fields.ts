import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  const products = await productService.listProducts({}, { take: 1 });

  if (products.length === 0) {
    console.log('❌ Aucun produit');
    return;
  }

  console.log('\n📦 Structure d\'un produit:\n');
  console.log(JSON.stringify(products[0], null, 2));
}
