import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import dotenv from 'dotenv';

dotenv.config();

/**
 * This script introspects your existing Supabase database
 * and generates the initial migration to match current state
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function introspectDatabase() {
  try {
    console.log('🔍 Introspecting existing database...');
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tables = await client.unsafe(tablesQuery);
    console.log('📋 Found tables:', tables.map(t => t.table_name));
    
    // Check if our expected tables exist
    const expectedTables = ['volunteers', 'events', 'event_roles', 'admins'];
    const existingTables = tables.map(t => t.table_name);
    
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));
    const extraTables = existingTables.filter(t => !expectedTables.includes(t));
    
    if (missingTables.length > 0) {
      console.log('⚠️  Missing expected tables:', missingTables);
    }
    
    if (extraTables.length > 0) {
      console.log('ℹ️  Additional tables found:', extraTables);
    }
    
    // Check data counts
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        const countResult = await client.unsafe(`SELECT COUNT(*) FROM ${table}`);
        console.log(`📊 ${table}: ${countResult[0].count} records`);
      }
    }
    
    console.log('✅ Database introspection complete!');
    
  } catch (error) {
    console.error('❌ Error introspecting database:', error);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  introspectDatabase();
}

export { introspectDatabase };
