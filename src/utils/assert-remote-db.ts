/**
 * Guard Anti-DB Locale
 *
 * Ce module empêche l'exécution de scripts contre une base de données locale.
 * La seule source de vérité autorisée est la DB distante accessible via tunnel SSH (GMDEV).
 *
 * Exceptions:
 *   - Tunnels SSH (localhost avec port non-standard comme 5433) sont PERMIS
 *   - DB locale sur port 5432 est INTERDITE
 *
 * Usage:
 *   import { assertRemoteDatabase } from '../utils/assert-remote-db';
 *   assertRemoteDatabase(); // Au début du script
 */

/**
 * Vérifie que DATABASE_URL pointe vers une DB distante (non locale)
 * ou vers un tunnel SSH valide
 * @throws Error si la DB est une vraie DB locale
 */
export function assertRemoteDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      '❌ DATABASE_URL is not defined.\n' +
      'Please configure DATABASE_URL to point to the remote database via GMDEV tunnel.'
    );
  }

  // Parse the URL to extract host and port
  try {
    const urlObj = new URL(databaseUrl.replace('postgres://', 'http://'));
    const host = urlObj.hostname.toLowerCase();
    const port = urlObj.port || '5432'; // Default PostgreSQL port

    // Check for local hosts
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(host);

    if (isLocalHost) {
      // FORBIDDEN: Local DB on standard port (real local database)
      if (port === '5432') {
        throw new Error(
          `❌ Local database on port 5432 is FORBIDDEN!\n\n` +
          `DATABASE_URL: ${host}:${port}\n\n` +
          `This project uses a SINGLE SOURCE OF TRUTH:\n` +
          `  → Remote database via SSH tunnel\n\n` +
          `To connect via SSH tunnel:\n` +
          `  1. Open tunnel: ssh -L 5433:localhost:5432 your-remote-host\n` +
          `  2. Use DATABASE_URL: postgres://user:pass@localhost:5433/dbname\n\n` +
          `Note: Use a non-standard port (5433, 5434, etc.) to indicate SSH tunnel.`
        );
      }

      // ALLOWED: SSH tunnel (localhost with non-standard port)
      console.log(`🔐 SSH Tunnel detected: ${host}:${port}`);
      console.log(`⚠️  Assuming this forwards to remote database via SSH.`);
      console.log(`   If this is a real local DB, STOP NOW!\n`);
      return;
    }

    // Remote host - all good
    console.log(`✅ Remote database: ${host}:${port}`);

  } catch (error: any) {
    throw new Error(
      `❌ Invalid DATABASE_URL format!\n` +
      `Error: ${error.message}\n\n` +
      `Expected format: postgres://user:pass@host:port/database`
    );
  }
}
