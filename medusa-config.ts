import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// ─── Helper: Check if API key is configured ──────────────────────────────────
function isConfigured(envVar: string | undefined): boolean {
  return !!envVar && envVar !== 'REPLACE_ME' && envVar.trim() !== '';
}

// ─── Build modules array dynamically ─────────────────────────────────────────
const modules: any[] = [];

// Stripe Payment (only if configured)
if (isConfigured(process.env.STRIPE_SECRET_KEY)) {
  modules.push({
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@medusajs/payment-stripe",
          id: "stripe",
          options: {
            apiKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            captureMethod: "automatic",
          },
        },
      ],
    },
  });
  console.log('✅ Stripe payment module enabled');
} else {
  console.warn('⚠️  Stripe payment module disabled (STRIPE_SECRET_KEY not configured)');
}

// Brevo Notification (only if configured)
if (isConfigured(process.env.BREVO_API_KEY)) {
  modules.push({
    resolve: "@medusajs/medusa/notification",
    options: {
      providers: [
        {
          resolve: "./src/modules/brevo-notification",
          id: "brevo",
          options: {
            apiKey: process.env.BREVO_API_KEY,
            senderEmail: process.env.BREVO_SENDER_EMAIL || "contact@mytechgear.fr",
            senderName: process.env.BREVO_SENDER_NAME || "MyTechGear",
          },
        },
      ],
    },
  });
  console.log('✅ Brevo notification module enabled');
} else {
  console.warn('⚠️  Brevo notification module disabled (BREVO_API_KEY not configured)');
}

module.exports = defineConfig({
  admin: {
    disable: process.env.DISABLE_MEDUSA_ADMIN === 'true',
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || "http://localhost:8000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules
})
