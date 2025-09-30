import { initializeDatabase } from '../lib/db';
import dotenv from 'dotenv';

dotenv.config();

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...');
    
    await initializeDatabase();
    
    console.log('✅ Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
