import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { resolve } from 'path'

const DB_PATH = process.env.DATABASE_PATH ?? resolve(import.meta.dirname, '../../..', 'data', 'flight_recorder.db')

// Ensure data directory exists
import { mkdirSync } from 'fs'
import { dirname } from 'path'
mkdirSync(dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })

export async function connectDb() {
  sqlite.exec('SELECT 1')
  console.log(`[db] Connected to SQLite at ${DB_PATH}`)
  return db
}
