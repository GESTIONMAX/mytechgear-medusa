/**
 * Generate Admin API Token
 *
 * Creates a publishable API key that can be used for admin operations
 * when the native Medusa admin is disabled.
 *
 * Usage:
 *   npx tsx scripts/generate-admin-token.ts
 */

import { MedusaApp, Modules } from "@medusajs/framework/utils";

async function generateAdminToken() {
  console.log('🔑 Generating Admin API Token...\n');

  const { modules } = await MedusaApp({
    modulesConfig: {
      [Modules.AUTH]: true,
      [Modules.USER]: true,
      [Modules.API_KEY]: true,
    },
  });

  const apiKeyService = modules.apiKeyModule;
  const userService = modules.userModule;

  try {
    // 1. Find or create admin user
    console.log('📝 Looking for admin user...');

    const users = await userService.listUsers({
      email: process.env.ADMIN_EMAIL || 'admin@mytechgear.com',
    });

    let adminUser;
    if (users.length === 0) {
      console.log('   No admin user found, creating one...');
      adminUser = await userService.createUsers({
        email: process.env.ADMIN_EMAIL || 'admin@mytechgear.com',
        first_name: 'Admin',
        last_name: 'MyTechGear',
      });
      console.log(`   ✅ Admin user created: ${adminUser.email}`);
    } else {
      adminUser = users[0];
      console.log(`   ✅ Found admin user: ${adminUser.email}`);
    }

    // 2. Create publishable API key
    console.log('\n🔐 Creating publishable API key...');

    const apiKey = await apiKeyService.createApiKeys({
      title: `Admin Token - ${new Date().toISOString()}`,
      type: 'publishable',
      created_by: adminUser.id,
    });

    console.log('   ✅ API Key created successfully!\n');

    // 3. Display token
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Your Admin API Token:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   ${apiKey.token}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. Instructions
    console.log('📋 Next Steps:\n');
    console.log('1. Copy the token above');
    console.log('2. Add it to your frontend .env.local file:');
    console.log(`   MEDUSA_ADMIN_TOKEN="${apiKey.token}"\n`);
    console.log('3. Or export it for running migrations:');
    console.log(`   export MEDUSA_ADMIN_TOKEN="${apiKey.token}"\n`);
    console.log('4. Run your migrations:');
    console.log('   tsx scripts/migrations/add-collection-ui-metadata.ts');
    console.log('   tsx scripts/migrations/set-default-disciplines.ts --dry-run\n');

    console.log('⚠️  Keep this token secure! Do not commit it to git.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error generating token:', error);
    process.exit(1);
  }
}

generateAdminToken();
