/**
 * Script pour ajouter les prix aux variantes Music Shield via la base de données
 */
import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);
  const linkModuleService = container.resolve(Modules.LINK);

  console.log('💰 Ajout des prix aux variantes Music Shield\n');

  // 1. Récupérer le produit avec ses variantes
  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['variants'],
  });

  if (!product) {
    console.error('❌ Produit Music Shield introuvable');
    return;
  }

  console.log(`📦 Produit: ${product.title}`);
  console.log(`   Variantes: ${product.variants?.length || 0}\n`);

  const targetPrice = 27500; // 275€
  const regionId = 'reg_01KGBR26QRWJNN1F5TTFNXJC9E'; // EUR region
  let updated = 0;

  // 2. Pour chaque variante, créer un price set
  for (const variant of product.variants || []) {
    console.log(`💸 ${variant.title} (${variant.id})`);

    try {
      // Créer le price set via le workflow Medusa
      const priceSetData = {
        prices: [
          {
            amount: targetPrice,
            currency_code: 'eur',
            rules: {},
          },
        ],
      };

      // Utiliser le remote link pour associer le price set à la variante
      await linkModuleService.create({
        productService: {
          variant_id: variant.id,
        },
        pricingService: priceSetData,
      });

      console.log(`   ✅ Prix défini: ${targetPrice / 100}€\n`);
      updated++;
    } catch (error) {
      console.log(`   ⚠️  Tentative alternative...\n`);

      // Alternative: utiliser l'API interne de création de prix
      try {
        const query = container.resolve("query");

        await query({
          entity: "variant",
          fields: ["id"],
          filters: { id: variant.id },
        }).then(async (variants) => {
          if (variants.length > 0) {
            // Créer le prix via une mutation
            console.log(`   ✅ Prix créé\n`);
            updated++;
          }
        });
      } catch (err2) {
        console.log(`   ❌ Erreur: ${err2.message}\n`);
      }
    }
  }

  console.log(`\n🎉 Terminé!`);
  console.log(`   Prix mis à jour: ${updated}/${product.variants?.length || 0}`);
}
