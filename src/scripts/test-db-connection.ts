/**
 * Test Database Connection
 *
 * Simple script to verify database connectivity via SSH tunnel or direct connection
 *
 * Usage:
 *   npm exec medusa exec ./src/scripts/test-db-connection.ts
 */

import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function testDbConnection({ container }: ExecArgs) {
  console.log("=".repeat(60));
  console.log("🔍 Testing Database Connection");
  console.log("=".repeat(60));

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL is not defined");
    process.exit(1);
  }

  // Mask password in URL for display
  const maskedUrl = databaseUrl.replace(/:[^:@]*@/, ":***@");
  console.log(`\n📍 DATABASE_URL: ${maskedUrl}\n`);

  try {
    // Try to access Product module (requires DB connection)
    const productModuleService = container.resolve(Modules.PRODUCT);

    console.log("⏳ Fetching products (test query)...");
    const products = await productModuleService.listProducts({}, {
      take: 1
    });

    console.log(`✅ Connection successful!`);
    console.log(`   Found ${products.length > 0 ? '1+' : '0'} product(s) in database\n`);

    // Additional connection info
    console.log("📊 Connection details:");
    const urlObj = new URL(databaseUrl.replace('postgres://', 'http://'));
    console.log(`   - Host: ${urlObj.hostname}`);
    console.log(`   - Port: ${urlObj.port}`);
    console.log(`   - Database: ${urlObj.pathname.slice(1)}`);
    console.log(`   - Username: ${urlObj.username}`);

    // Detect SSH tunnel
    if (urlObj.hostname === 'localhost' && urlObj.port !== '5432') {
      console.log(`\n🔐 SSH Tunnel detected (port ${urlObj.port} ≠ 5432)`);
      console.log(`   This is likely forwarding to a remote database.`);
    }

    console.log("\n" + "=".repeat(60));

  } catch (error: any) {
    console.error("\n❌ Connection FAILED!");
    console.error(`   Error: ${error.message}\n`);

    console.log("💡 Troubleshooting:");
    console.log("   1. Check if SSH tunnel is running:");
    console.log("      ssh -L 5433:localhost:5432 your-remote-host");
    console.log("   2. Verify DATABASE_URL in .env");
    console.log("   3. Check database credentials");
    console.log("   4. Ensure database is accessible\n");

    console.log("=".repeat(60));
    process.exit(1);
  }
}
