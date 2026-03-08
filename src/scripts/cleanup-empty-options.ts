/**
 * Script pour supprimer les options vides du produit Music Shield
 */
import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const productService = container.resolve(Modules.PRODUCT);

  console.log('🧹 Nettoyage des options vides\n');

  const [product] = await productService.listProducts({
    handle: ['music-shield'],
  }, {
    relations: ['options', 'options.values'],
  });

  if (!product) {
    console.error('❌ Produit Music Shield introuvable');
    return;
  }

  console.log(`📦 Produit: ${product.title}`);
  console.log(`   Options totales: ${product.options?.length || 0}\n`);

  // Trouver les options vides
  const emptyOptions = (product.options || []).filter(
    opt => !opt.values || opt.values.length === 0
  );

  if (emptyOptions.length === 0) {
    console.log('✅ Aucune option vide à supprimer');
    return;
  }

  console.log(`🗑️  Options vides à supprimer: ${emptyOptions.length}\n`);

  for (const option of emptyOptions) {
    console.log(`   - ${option.title} (${option.id})`);
    try {
      await productService.deleteProductOptions([option.id]);
      console.log(`     ✅ Supprimée\n`);
    } catch (error) {
      console.log(`     ❌ Erreur: ${error.message}\n`);
    }
  }

  console.log('🎉 Nettoyage terminé!');
}
