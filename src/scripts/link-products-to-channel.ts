/**
 * Script pour lier tous les produits au sales channel par défaut
 */
import { Modules } from "@medusajs/framework/utils";
import { RemoteLink } from "@medusajs/framework/modules-sdk";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);
  const remoteLink = container.resolve("remoteLink") as RemoteLink;

  console.log('\n🔗 Liaison des produits au sales channel\n');

  const defaultChannelId = 'sc_01KG9GYWK3JVV71P16XDY3CVBH';

  // Récupérer tous les produits
  const products = await productService.listProducts({});

  console.log(`📦 ${products.length} produits trouvés\n`);

  for (const product of products) {
    try {
      await remoteLink.create({
        productService: {
          product_id: product.id,
        },
        salesChannelService: {
          sales_channel_id: defaultChannelId,
        },
      });

      console.log(`✓ ${product.title}`);
    } catch (error) {
      // Ignore si le lien existe déjà
      if (error.message?.includes('already exists')) {
        console.log(`  (déjà lié)`);
      } else {
        console.log(`  ❌ Erreur: ${error.message}`);
      }
    }
  }

  console.log('\n🎉 Terminé!');
}
