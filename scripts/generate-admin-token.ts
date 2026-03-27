/**
 * Generate Admin API Token
 *
 * Creates a publishable API key that can be used for admin operations
 * when the native Medusa admin is disabled.
 *
 * Usage:
 *   npx medusa exec ./scripts/generate-admin-token.ts
 */

import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function generateAdminToken({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info('🔑 Generating Admin API Token...\n');

  const apiKeyService = container.resolve(Modules.API_KEY);
  const userService = container.resolve(Modules.USER);

  try {
    // 1. Find or create admin user
    logger.info('📝 Looking for admin user...');

    const users = await userService.listUsers({
      email: process.env.ADMIN_EMAIL || 'admin@mytechgear.eu',
    });

    let adminUser;
    if (users.length === 0) {
      logger.info('   No admin user found, creating one...');
      adminUser = await userService.createUsers({
        email: process.env.ADMIN_EMAIL || 'admin@mytechgear.eu',
        first_name: 'Admin',
        last_name: 'MyTechGear',
      });
      logger.info(`   ✅ Admin user created: ${adminUser.email}`);
    } else {
      adminUser = users[0];
      logger.info(`   ✅ Found admin user: ${adminUser.email}`);
    }

    // 2. Create secret API key (for admin/server-to-server operations)
    logger.info('\n🔐 Creating secret API key for admin operations...');

    const apiKey = await apiKeyService.createApiKeys({
      title: `Netlify Admin API - ${new Date().toISOString()}`,
      type: 'secret',
      created_by: adminUser.id,
    });

    logger.info('   ✅ API Key created successfully!\n');

    // 3. Display token
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🎉 Your Admin API Token:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    logger.info(`   ${apiKey.token}\n`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 4. Instructions
    logger.info('📋 Next Steps:\n');
    logger.info('1. Copy the token above');
    logger.info('2. Add it to Netlify environment variables:');
    logger.info(`   MEDUSA_ADMIN_API_KEY="${apiKey.token}"\n`);
    logger.info('3. Or add to frontend .env.local for local testing:');
    logger.info(`   MEDUSA_ADMIN_API_KEY="${apiKey.token}"\n`);

    logger.info('⚠️  Keep this token secure! Do not commit it to git.\n');

  } catch (error: any) {
    logger.error('\n❌ Error generating token:', error.message);
    throw error;
  }
}
