import dotenv from 'dotenv';

dotenv.config();

// Use SQLite for development, PostgreSQL for production
const usePostgres = process.env.DATABASE_URL?.startsWith('postgresql://');

let query: (sql: string, params?: any[]) => Promise<any>;
let initializeDatabase: () => Promise<void>;

if (usePostgres) {
  // PostgreSQL configuration
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  query = async (sql: string, params: any[] = []) => {
    try {
      const result = await pool.query(sql, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  initializeDatabase = async () => {
    console.log('🔄 Initializing PostgreSQL database...');
    
    // Test connection
    await query('SELECT NOW()');
    
    // Create tables (PostgreSQL syntax)
    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      // Add other PostgreSQL tables here...
    ];
    
    for (const table of tables) {
      await query(table);
    }
    
    console.log('✅ PostgreSQL database initialized successfully!');
  };
} else {
  // SQLite configuration
  const sqlite = require('./sqlite');
  query = sqlite.query;
  initializeDatabase = sqlite.initializeDatabase;
}

export { query, initializeDatabase };
