#!/usr/bin/env tsx
/**
 * Quick check of product metadata
 */
import { config } from "dotenv"
import pg from "pg"

const { Client } = pg

config({ path: ".env" })

const DATABASE_URL = process.env.DATABASE_URL!

async function check() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()

  const result = await client.query(
    `SELECT handle, title, metadata
     FROM product
     WHERE handle IN ('music-shield', 'shield') AND deleted_at IS NULL
     ORDER BY handle`
  )

  for (const row of result.rows) {
    console.log(`\n${row.title} (${row.handle}):`)
    console.log('  family:', row.metadata?.family || 'NOT SET')
    console.log('  hasAudio:', row.metadata?.hasAudio ?? 'NOT SET')
    console.log('  related:', row.metadata?.related ? JSON.stringify(row.metadata.related) : 'NOT SET')
    console.log('  platform:', row.metadata?.platform ? 'SET' : 'NOT SET')
    console.log('  features:', row.metadata?.features ? `${row.metadata.features.length} features` : 'NOT SET')
    console.log('  specs:', row.metadata?.specs ? Object.keys(row.metadata.specs).join(', ') : 'NOT SET')
  }

  await client.end()
}

check()
