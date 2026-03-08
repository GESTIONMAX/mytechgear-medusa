/**
 * Script pour mettre à jour les prix via l'Admin API Medusa
 */

async function updateVariantPrices() {
  const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
  const productId = 'prod_01KGBT5WYC4ZB5Y9YFERHF82XC'; // Music Shield ID
  const targetPrice = 27500; // 275€ en centimes
  const currency = 'eur';

  try {
    // 1. Récupérer le produit
    console.log('🔍 Récupération du produit...\n');
    const productRes = await fetch(
      `${MEDUSA_BACKEND_URL}/admin/products/${productId}?fields=*variants`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const productData = await productRes.json();
    console.log('Response:', JSON.stringify(productData, null, 2));
    const product = productData.product;

    if (!product) {
      console.error('❌ Produit introuvable');
      console.error('Status:', productRes.status);
      return;
    }

    console.log(`📦 ${product.title}`);
    console.log(`   ${product.variants?.length || 0} variantes\n`);

    let updated = 0;

    // 2. Mettre à jour chaque variante
    for (const variant of product.variants || []) {
      console.log(`💸 ${variant.title}`);

      try {
        const updateRes = await fetch(
          `${MEDUSA_BACKEND_URL}/admin/products/${product.id}/variants/${variant.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prices: [{
                amount: targetPrice,
                currency_code: currency,
              }],
            }),
          }
        );

        if (updateRes.ok) {
          console.log(`   ✅ Prix mis à jour: ${targetPrice / 100}€\n`);
          updated++;
        } else {
          const error = await updateRes.text();
          console.log(`   ❌ Erreur HTTP ${updateRes.status}: ${error}\n`);
        }
      } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
      }
    }

    console.log(`\n🎉 Terminé!`);
    console.log(`   Prix mis à jour: ${updated}/${product.variants?.length || 0}`);

  } catch (error) {
    console.error('❌ Erreur globale:', error);
  }
}

updateVariantPrices();
