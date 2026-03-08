/**
 * Script pour publier tous les produits avec status=published
 * en définissant leur published_at
 */
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function() {
  console.log('📢 Publication de tous les produits\n');

  try {
    // Utiliser psql pour mettre à jour tous les produits avec status='published'
    const query = "UPDATE product SET published_at = NOW() WHERE status = 'published' AND published_at IS NULL";

    const { stdout, stderr } = await execAsync(
      `PGPASSWORD='\${DATABASE_PASSWORD}' psql -h localhost -p 5433 -U postgres -d mytechgear -c "${query}"`
    );

    if (stderr && !stderr.includes('UPDATE')) {
      console.error('❌ Erreur SQL:', stderr);
      return;
    }

    console.log('✅ Tous les produits publiés:', stdout.trim());

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n💡 Essai avec variables d\'environnement...\n');

    // Fallback: utiliser les variables d'environnement
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      if (!dbUrl) {
        throw new Error('DATABASE_URL non défini');
      }

      const { stdout } = await execAsync(
        `psql "${dbUrl}" -c "UPDATE product SET published_at = NOW() WHERE status = 'published' AND published_at IS NULL"`
      );

      console.log('✅ Produits publiés:', stdout.trim());
    } catch (err2) {
      console.error('❌ Erreur fallback:', err2.message);
    }
  }
}
