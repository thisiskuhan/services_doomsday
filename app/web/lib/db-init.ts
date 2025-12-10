import { initializeDatabase, checkConnection } from "@/lib/db";

let initialized = false;
let initializing = false;

export async function ensureDatabaseInitialized(): Promise<boolean> {
  if (initialized) return true;
  if (initializing) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return initialized;
  }

  initializing = true;

  try {
    const connected = await checkConnection();
    if (!connected) {
      console.error("[db-init] Cannot connect to database");
      return false;
    }

    await initializeDatabase();
    initialized = true;
    return true;
  } catch (error) {
    console.error("[db-init] Database initialization failed:", error);
    return false;
  } finally {
    initializing = false;
  }
}

export function isDatabaseInitialized(): boolean {
  return initialized;
}
