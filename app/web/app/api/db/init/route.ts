/**
 * Database Initialization API
 *
 * GET /api/db/init
 * Initializes database schema and returns table information.
 *
 * Response: {
 *   status: "ok",
 *   wasAlreadyInitialized: boolean,
 *   tables: string[],
 *   tableCounts: { [tableName]: number }
 * }
 */
import { NextResponse } from "next/server";
import { ensureDatabaseInitialized, isDatabaseInitialized } from "@/lib/db-init";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const alreadyInitialized = isDatabaseInitialized();
    const success = await ensureDatabaseInitialized();

    if (!success) {
      return NextResponse.json({ error: "Database initialization failed" }, { status: 500 });
    }

    const tables = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    // Get row counts for each table
    const tableCounts: Record<string, number> = {};
    for (const table of tables) {
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM ${table.table_name}`
      );
      tableCounts[table.table_name] = parseInt(countResult[0]?.count || "0");
    }

    return NextResponse.json({
      status: "ok",
      wasAlreadyInitialized: alreadyInitialized,
      tables: tables.map((t) => t.table_name),
      tableCounts,
    });
  } catch (error) {
    console.error("[api/db/init] Error:", error);
    return NextResponse.json(
      { error: "Database initialization failed", details: String(error) },
      { status: 500 }
    );
  }
}
