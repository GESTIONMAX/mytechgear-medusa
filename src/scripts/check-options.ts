import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['options', 'options.values'],
  });

  console.log('\n🔍 Music Shield Options:\n');
  for (const option of product.options) {
    console.log(`📌 ${option.title} (ID: ${option.id})`);
    console.log(`   Values: ${option.values?.length || 0}`);
    if (option.values?.length > 0) {
      option.values.forEach(v => console.log(`   - ${v.value}`));
    }
    console.log();
  }
}
