import { Modules } from "@medusajs/framework/utils";

export default async function({ container }) {
  const apiKeyService = container.resolve(Modules.API_KEY);

  const keys = await apiKeyService.listApiKeys({ type: 'publishable' });

  console.log('\n🔑 Publishable API Keys:\n');
  console.log(`Total: ${keys.length}\n`);

  if (keys.length === 0) {
    console.log('❌ Aucune clé publishable trouvée!');
    console.log('\n💡 Il faut créer une clé publishable pour que l\'API Store fonctionne.');
    return;
  }

  keys.forEach((key, idx) => {
    console.log(`${idx + 1}. ${key.token}`);
    console.log(`   Created: ${key.created_at}`);
    console.log();
  });
}
