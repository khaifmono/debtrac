import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Closing database connection pool...');
  pool.end(() => {
    console.log('✅ Database connection pool closed');
    process.exit(0);
  });
});

export default pool;

// Helper function to execute queries safely
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`✅ Query executed in ${duration}ms: ${text}`);
    return res;
  } catch (err) {
    console.error(`❌ Query failed: ${text}`, err);
    throw err;
  }
}

// Helper function to get a client from the pool (for transactions)
export async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    console.error('⚠️ A client has been checked out for more than 5 seconds!');
    console.error(`⚠️ The last executed query on this client was: ${(client as any).lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  (client as any).query = (...args: any[]) => {
    (client as any).lastQuery = args;
    return query.apply(client, args as any);
  };

  (client as any).release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    (client as any).query = query;
    (client as any).release = release;
    return release.apply(client);
  };

  return client;
}
