/**
 * Guard Anti-DB Locale
 *
 * Ce module empêche l'exécution de scripts contre une base de données locale.
 * La seule source de vérité autorisée est la DB distante accessible via tunnel SSH (GMDEV).
 *
 * Usage:
 *   import { assertRemoteDatabase } from '../utils/assert-remote-db';
 *   assertRemoteDatabase(); // Au début du script
 */

/**
 * Vérifie que DATABASE_URL pointe vers une DB distante (non locale)
 * @throws Error si la DB est locale
 */
export function assertRemoteDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      '❌ DATABASE_URL is not defined.\n' +
      'Please configure DATABASE_URL to point to the remote database via GMDEV tunnel.'
    );
  }

  // Patterns interdits (DB locale)
  const forbiddenPatterns = [
    'localhost',
    '127.0.0.1',
    '::1',
    '@localhost:',
    '@127.0.0.1:',
    '@::1:',
  ];

  const lowercaseUrl = databaseUrl.toLowerCase();

  for (const pattern of forbiddenPatterns) {
    if (lowercaseUrl.includes(pattern)) {
      throw new Error(
        `❌ Local database is FORBIDDEN in this project!\n\n` +
        `DATABASE_URL contains: "${pattern}"\n\n` +
        `This project uses a SINGLE SOURCE OF TRUTH:\n` +
        `  → Remote database via GMDEV tunnel (SSH)\n\n` +
        `To connect:\n` +
        `  1. Open GMDEV tunnel: ssh -L 5432:localhost:5432 your-remote-host\n` +
        `  2. Use DATABASE_URL pointing to the tunnel\n\n` +
        `NEVER run scripts against a local DB.`
      );
    }
  }

  // Vérification supplémentaire : port 5432/5433 avec host local
  const localPortPattern = /@(localhost|127\.0\.0\.1|::1):543[23]/i;
  if (localPortPattern.test(databaseUrl)) {
    throw new Error(
      `❌ Local database detected (port 5432/5433 on localhost)!\n\n` +
      `Use the remote database via GMDEV tunnel instead.`
    );
  }

  console.log('✅ Remote database verified (non-local)');
}
