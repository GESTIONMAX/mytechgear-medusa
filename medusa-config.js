/**
 * medusa-config.js — version JS (synchronisé avec medusa-config.ts)
 * Copié dans l'image Docker (COPY medusa-config.js ./). Doit rester en sync.
 */
const { loadEnv, defineConfig } = require('@medusajs/framework/utils')

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
  modules: [
    // ─── Paiement : provider Stripe (dans le module payment) ─────────────────
    {
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
    },
    // ─── Notification : provider Brevo (dans le module notification) ──────────
    {
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
    },
  ]
})
