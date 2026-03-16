/**
 * Script: Ajouter FAQ au produit Music Shield
 *
 * Ajoute une FAQ complète pour améliorer l'UX du PDP
 *
 * Usage: npx tsx scripts/add-music-shield-faq.ts
 */

const MUSIC_SHIELD_ID = 'prod_01KKPJH44CFACDRKYYE3YK2JAV';
const API_URL = 'http://localhost:9000/admin-api';

async function addMusicShieldFAQ() {
  console.log('🔍 Récupération du produit Music Shield...');

  // 1. Récupérer le produit actuel
  const getResponse = await fetch(`${API_URL}/products/${MUSIC_SHIELD_ID}?fields=*metadata`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!getResponse.ok) {
    throw new Error(`Failed to fetch product: ${getResponse.statusText}`);
  }

  const { product } = await getResponse.json();
  console.log('✅ Produit récupéré:', product.title);

  // 2. Préparer les données FAQ
  const faqData = [
    {
      question: 'Comment fonctionnent les verres électrochromiques Eclipse™ ?',
      answer: 'Les verres Eclipse™ utilisent une technologie électrochromique qui ajuste automatiquement leur teinte en **0.1 seconde** selon la luminosité ambiante. Un capteur intégré détecte l\'intensité lumineuse et envoie un signal électrique pour modifier la transmission de lumière visible (VLT) de 63% à 17%, offrant ainsi une protection optimale en toutes conditions.',
      order: 1
    },
    {
      question: 'Quelle est l\'autonomie de la batterie ?',
      answer: 'La batterie offre jusqu\'à **6.5 heures d\'autonomie audio** en utilisation continue. L\'ajustement automatique des verres consomme très peu d\'énergie. Le rechargement complet via USB-C prend environ 1.5 heures.',
      order: 2
    },
    {
      question: 'Les Music Shield sont-elles résistantes à l\'eau et à la sueur ?',
      answer: 'Oui, les Music Shield disposent d\'une **certification IPX4**, ce qui les rend résistantes aux éclaboussures et à la sueur. Vous pouvez les utiliser sous la pluie légère et pendant vos séances de sport intensives sans problème.',
      order: 3
    },
    {
      question: 'Comment fonctionne l\'audio open-ear ?',
      answer: 'Le système audio open-ear diffuse le son directement vers vos oreilles via des transducteurs intégrés dans les branches, **sans bloquer vos conduits auditifs**. Vous pouvez ainsi écouter votre musique tout en restant conscient de votre environnement (circulation, conversations), idéal pour le vélo et le running en sécurité.',
      order: 4
    },
    {
      question: 'Quelle protection UV offrent-elles ?',
      answer: 'Les verres offrent une **protection UV 400**, bloquant 100% des rayons UVA et UVB nocifs. Cette protection est maintenue quelle que soit la teinte des verres (claire ou foncée).',
      order: 5
    },
    {
      question: 'Puis-je répondre aux appels téléphoniques avec les Music Shield ?',
      answer: 'Oui, les Music Shield sont équipées d\'un **microphone intégré** et se connectent via Bluetooth 5.0 à votre smartphone. Vous pouvez passer et recevoir des appels mains-libres. Des boutons tactiles sur les branches permettent de contrôler la lecture audio et les appels.',
      order: 6
    },
    {
      question: 'Sont-elles compatibles avec des verres correcteurs ?',
      answer: 'Non, les Music Shield ne sont actuellement **pas disponibles avec des verres correcteurs**. Nous recommandons de porter des lentilles de contact si vous avez besoin de correction visuelle.',
      order: 7
    },
    {
      question: 'Quelle est la portée Bluetooth ?',
      answer: 'La connexion Bluetooth 5.0 offre une portée allant jusqu\'à **10 mètres** en champ libre. Vous pouvez laisser votre téléphone dans votre sac ou poche sans perdre la connexion.',
      order: 8
    },
    {
      question: 'Comment entretenir les verres électrochromiques ?',
      answer: 'Nettoyez les verres avec un **chiffon microfibre doux** et de l\'eau tiède. Évitez les produits chimiques agressifs. N\'immergez jamais les lunettes dans l\'eau. Un étui de protection est inclus pour le transport.',
      order: 9
    },
    {
      question: 'Puis-je utiliser les Music Shield sans activer le Bluetooth ?',
      answer: 'Oui, les verres électrochromiques fonctionnent de manière **totalement indépendante du Bluetooth**. Vous pouvez les utiliser comme de simples lunettes de soleil adaptatives sans jamais activer la fonction audio.',
      order: 10
    }
  ];

  console.log('💾 Ajout de la FAQ au produit...');

  // 3. Mettre à jour le produit avec la FAQ
  const updatedMetadata = {
    ...product.metadata,
    faq: faqData
  };

  const updateResponse = await fetch(`${API_URL}/products/${MUSIC_SHIELD_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metadata: updatedMetadata,
    }),
  });

  if (!updateResponse.ok) {
    throw new Error(`Failed to update product: ${updateResponse.statusText}`);
  }

  const { product: updatedProduct } = await updateResponse.json();
  console.log('✅ FAQ ajoutée avec succès!');
  console.log('🔍 Nombre de questions:', updatedProduct.metadata?.faq?.length || 0);

  // Afficher les questions
  if (updatedProduct.metadata?.faq) {
    console.log('\n📋 Questions ajoutées:');
    updatedProduct.metadata.faq.forEach((item: any, i: number) => {
      console.log(`   ${i + 1}. ${item.question}`);
    });
  }
}

// Run the script
addMusicShieldFAQ().catch((error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
