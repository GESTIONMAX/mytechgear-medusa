import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  console.log('📢 Publication de Music Shield\n');

  try {
    const now = new Date().toISOString();
    await productService.updateProducts('prod_01KGBT5WYC4ZB5Y9YFERHF82XC', {
      status: 'published',
      published_at: now,
    });

    console.log('✅ Music Shield publié avec succès');

    // Vérifier
    const [product] = await productService.listProducts({
      id: ['prod_01KGBT5WYC4ZB5Y9YFERHF82XC'],
    });

    console.log('\nNouveau statut:');
    console.log('Published at:', product.published_at || 'NULL');
    console.log('Status:', product.status);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}
