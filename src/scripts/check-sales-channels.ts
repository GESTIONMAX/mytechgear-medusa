import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const productService = container.resolve(Modules.PRODUCT);

  console.log('\n🛒 Sales Channels:\n');

  const channels = await salesChannelService.listSalesChannels();

  if (channels.length === 0) {
    console.log('❌ Aucun sales channel!');
    return;
  }

  for (const channel of channels) {
    console.log(`📌 ${channel.name} (${channel.id})`);
    console.log(`   Created: ${channel.created_at}`);
    console.log();
  }

  // Vérifier Music Shield
  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['sales_channels'],
  });

  if (product) {
    console.log(`\n📦 Music Shield - Sales Channels:\n`);
    if (product.sales_channels && product.sales_channels.length > 0) {
      product.sales_channels.forEach(sc => {
        console.log(`   ✓ ${sc.name} (${sc.id})`);
      });
    } else {
      console.log(`   ❌ Aucun sales channel assigné!`);
      console.log(`\n💡 Music Shield doit être associé à un sales channel pour apparaître dans l'API Store.`);
    }
  }
}
