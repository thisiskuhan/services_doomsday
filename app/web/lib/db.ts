import { Pool, PoolConfig } from "pg";
import fs from "fs";
import path from "path";

// ============================================================================
// DATABASE INITIALIZATION CONFIG
// ============================================================================
// Set to TRUE to drop all tables and recreate from schema
// Set to FALSE to skip if tables already exist (preserve data)
const REPLACE_ALL = true;
// ============================================================================

// Allow self-signed certificates for Aiven PostgreSQL
if (process.env.DATABASE_URL?.includes("aivencloud.com")) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const getSslConfig = (): PoolConfig["ssl"] => {
  // For Aiven, just use ssl: true since we've disabled TLS verification above
  return { rejectUnauthorized: false };
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? getSslConfig() : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export { pool };

export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

function parseSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;

  for (const line of sql.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    current += line + "\n";

    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) inDollarQuote = !inDollarQuote;

    if (!inDollarQuote && line.includes(";")) {
      const trimmed = current.trim().replace(/;$/, "");
      if (trimmed) statements.push(trimmed);
      current = "";
    }
  }

  const remaining = current.trim().replace(/;$/, "");
  if (remaining) statements.push(remaining);

  return statements;
}

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(process.cwd(), "..", "schema", "db_schema.sql");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    // Check if tables already exist
    const tablesExist = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'watchers'
      ) as exists
    `);
    
    const hasExistingData = tablesExist.rows[0]?.exists === true;

    if (hasExistingData && !REPLACE_ALL) {
      // Tables exist and REPLACE_ALL is false - don't disturb existing data
      console.log("[db] Tables already exist, skipping initialization (REPLACE_ALL=false)");
      return;
    }

    if (REPLACE_ALL) {
      // Clear all tables if REPLACE_ALL is true
      console.log("[db] Dropping existing tables (REPLACE_ALL=true)...");
      await client.query(`
        DROP TABLE IF EXISTS zombie_candidates CASCADE;
        DROP TABLE IF EXISTS watchers CASCADE;
      `);
      console.log("[db] Tables dropped, recreating schema...");
    }

    // Create/recreate tables from schema
    const schema = fs.readFileSync(schemaPath, "utf-8");
    for (const statement of parseSqlStatements(schema)) {
      await client.query(statement);
    }
    console.log("[db] Schema initialized successfully");
  } finally {
    client.release();
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return true;
  } catch {
    return false;
  }
}
