/**
 * Script pour ajouter les prix aux variantes via SQL direct
 */
import { MedusaModule } from "@medusajs/framework/modules-sdk";

export default async function() {
  const { pgConnectionString } = process.env.DATABASE_URL
    ? { pgConnectionString: process.env.DATABASE_URL }
    : { pgConnectionString: 'postgresql://postgres:postgres@localhost:5432/mytechgear' };

  const targetPrice = 27500; // 275€

  // Variantes sans prix (les 5 nouvelles)
  const variantsToPrice = [
    'variant_01KJJ5EEEWR9P8N0AHYG17KG9V', // Fire, Matte Black
    'variant_01KJJ5EEFJCXMHN4GBKSS9PMQQ', // Fire, White
    'variant_01KJJ5EEG11EXX848H76GGWRVX', // Fire, La Melaza
    'variant_01KJJ5EEGXCQ5MXQ9RPZMBP50X', // Smoke, White
    'variant_01KJJ5EEHCA37Y9HJ342GAB89N', // Smoke, La Melaza
  ];

  console.log('💰 Ajout des prix via SQL\n');
  console.log(`Prix cible: ${targetPrice / 100}€`);
  console.log(`Variantes: ${variantsToPrice.length}\n`);

  const { Client } = require('pg');
  const client = new Client({ connectionString: pgConnectionString });

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données\n');

    for (const variantId of variantsToPrice) {
      console.log(`💸 Traitement: ${variantId}`);

      // 1. Créer un price set
      const priceSetResult = await client.query(`
        INSERT INTO price_set (id, created_at, updated_at)
        VALUES (gen_random_uuid(), NOW(), NOW())
        RETURNING id
      `);

      const priceSetId = priceSetResult.rows[0].id;
      console.log(`   📦 Price set créé: ${priceSetId}`);

      // 2. Créer le prix dans price
      await client.query(`
        INSERT INTO price (id, price_set_id, currency_code, amount, min_quantity, max_quantity, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, 'eur', $2, NULL, NULL, NOW(), NOW())
      `, [priceSetId, targetPrice]);
      console.log(`   💵 Prix créé: ${targetPrice / 100}€`);

      // 3. Lier le price set à la variante
      await client.query(`
        UPDATE product_variant
        SET variant_price_set_id = $1, updated_at = NOW()
        WHERE id = $2
      `, [priceSetId, variantId]);
      console.log(`   🔗 Lié à la variante\n`);
    }

    console.log('🎉 Tous les prix ont été ajoutés avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await client.end();
  }
}
