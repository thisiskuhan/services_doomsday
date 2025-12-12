import { Pool, PoolConfig } from "pg";
import fs from "fs";
import path from "path";

const getSslConfig = (): PoolConfig["ssl"] => {
  const caPath = process.env.PGSQL_CA_PATH;
  
  if (caPath) {
    // Try multiple possible locations for the CA file
    const cwd = process.cwd();
    const possiblePaths = [
      path.isAbsolute(caPath) ? caPath : path.resolve(cwd, caPath),
      path.resolve(cwd, "pgsql_ca.pem"),
      path.resolve(cwd, "..", "pgsql_ca.pem"),
    ];
    
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          console.log(`[db] Using CA certificate from: ${testPath}`);
          return {
            rejectUnauthorized: true,
            ca: fs.readFileSync(testPath).toString(),
          };
        }
      } catch {
        // Continue to next path
      }
    }
    console.warn(`[db] CA certificate not found, tried: ${possiblePaths.join(", ")}`);
  }
  
  // Allow self-signed certificates when no CA is provided or not found
  console.log(`[db] Using SSL with rejectUnauthorized: false`);
  return { rejectUnauthorized: false };
};

const requiresSsl = (): boolean => {
  const dbUrl = process.env.DATABASE_URL || "";
  return (
    dbUrl.includes("sslmode=require") ||
    dbUrl.includes("sslmode=verify") ||
    dbUrl.includes("aivencloud.com") ||
    dbUrl.includes("neon.tech") ||
    dbUrl.includes("supabase.") ||
    dbUrl.includes("render.com") ||
    dbUrl.includes("railway.app")
  );
};

// Remove sslmode from connection string to avoid conflicts with our SSL config
const getConnectionString = (): string => {
  const dbUrl = process.env.DATABASE_URL || "";
  // Remove sslmode parameter from URL as we handle SSL separately
  return dbUrl.replace(/[?&]sslmode=[^&]*/g, "").replace(/\?$/, "");
};

// Get SSL configuration at initialization time
const sslConfig = requiresSsl() ? getSslConfig() : false;

const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: sslConfig,
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
    
    if (tablesExist.rows[0]?.exists === true) {
      console.log("[db] Tables already exist, skipping initialization");
      return;
    }

    // Create tables from schema
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
