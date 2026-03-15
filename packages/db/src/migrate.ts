import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './client'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

async function main() {
  console.log('[migrate] Running migrations...')

  // Resolve drizzle folder relative to this file
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const migrationsFolder = resolve(__dirname, '..', 'drizzle')

  migrate(db, { migrationsFolder })
  console.log('[migrate] Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[migrate] Failed:', err)
  process.exit(1)
})
