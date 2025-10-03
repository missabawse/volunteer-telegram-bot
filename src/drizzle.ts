import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Get environment mode
const nodeEnv = process.env.NODE_ENV || 'development';

let db: any;
let client: any;

try {
  if (nodeEnv === 'development') {
    // Use PGlite for local development - inline setup
    const storageMode = (process.env.PGLITE_STORAGE || '').toLowerCase();
    if (storageMode === 'memory') {
      console.log('[drizzle] Using PGlite in-memory storage');
      client = new PGlite();
    } else {
      const dbDir = path.join(process.cwd(), 'local-db');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      const dbPath = path.join(dbDir, 'volunteer-bot.db');
      console.log(`[drizzle] Using PGlite at ${dbPath}`);
      // Create PGlite instance for local development (file-backed)
      client = new PGlite(dbPath);
    }

    // Create drizzle instance with PGlite
    db = drizzle(client, { schema });
  } else {
    // Use PostgreSQL for staging/production
    const { drizzle: drizzlePg } = require('drizzle-orm/postgres-js');
    const postgres = require('postgres');

    let connectionString;

    if (nodeEnv === 'staging') {
      connectionString = process.env.STAGING_DATABASE_URL;
    } else {
      connectionString = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;
    }

    if (!connectionString) {
      throw new Error(`Database URL environment variable is required for ${nodeEnv} environment`);
    }

    console.log('[drizzle] Connecting to Postgres');

    // Create postgres client
    const pgClient = postgres(connectionString);

    // Create drizzle instance
    db = drizzlePg(pgClient, { schema });
    client = pgClient;
  }
} catch (err) {
  console.error('[drizzle] Failed to initialize database client:', err);
  throw err;
}

export { db, client };

// Ensure DB is initialized and reachable. Useful during app start.
export async function ensureDbReady(): Promise<void> {
  try {
    if (nodeEnv === 'development') {
      // PGlite readiness
      const anyClient: any = client;
      if (anyClient && typeof anyClient.waitReady !== 'undefined') {
        // waitReady is a Promise in PGlite
        if (typeof anyClient.waitReady?.then === 'function') {
          await anyClient.waitReady;
        }
      }
      // Run a trivial query to force initialization
      if (typeof anyClient.query === 'function') {
        await anyClient.query('select 1');
      }
      console.log('[drizzle] PGlite ready');
    } else {
      // postgres-js client is a tagged template function
      if (typeof client === 'function') {
        await (client as any)`select 1`;
      }
      console.log('[drizzle] Postgres ready');
    }
  } catch (err) {
    console.error('[drizzle] Database readiness check failed:', err);
    throw err;
  }
}
