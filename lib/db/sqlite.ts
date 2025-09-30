import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'demandgen_pro.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export const query = async (sql: string, params: any[] = []) => {
  try {
    if (sql.trim().toLowerCase().startsWith('select')) {
      const stmt = db.prepare(sql);
      const rows = stmt.all(params);
      return { rows };
    } else {
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      return { 
        rows: result.changes > 0 ? [{ ...result }] : [],
        rowCount: result.changes 
      };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

export const initializeDatabase = async () => {
  console.log('🔄 Initializing SQLite database...');
  
  // Create tables
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_ads_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      currency TEXT DEFAULT 'MYR',
      timezone TEXT DEFAULT 'Asia/Kuala_Lumpur',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS campaigns (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_ads_id TEXT,
      account_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'paused',
      objective TEXT,
      budget_amount DECIMAL(10,2),
      budget_type TEXT DEFAULT 'daily',
      start_date DATE,
      end_date DATE,
      targeting_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS ad_groups (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_ads_id TEXT,
      account_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'paused',
      targeting_json TEXT,
      bidding_json TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(local_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS ads (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      google_ads_id TEXT,
      account_id INTEGER NOT NULL,
      ad_group_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'responsive_display_ad',
      status TEXT DEFAULT 'paused',
      headlines_json TEXT,
      descriptions_json TEXT,
      thumbnail_id TEXT,
      final_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id),
      FOREIGN KEY (ad_group_id) REFERENCES ad_groups(local_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      account_id INTEGER,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      file_size INTEGER,
      width INTEGER,
      height INTEGER,
      format TEXT,
      storage_url TEXT NOT NULL,
      md5_hash TEXT,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS audience_packs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      targeting_json TEXT NOT NULL,
      is_template BOOLEAN DEFAULT FALSE,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scope TEXT NOT NULL,
      json_condition TEXT NOT NULL,
      json_actions TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      last_run_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS experiments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      campaign_id INTEGER NOT NULL,
      status TEXT DEFAULT 'draft',
      traffic_split INTEGER DEFAULT 50,
      start_date DATE,
      end_date DATE,
      winner_variant TEXT,
      results_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(local_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      report_type TEXT NOT NULL,
      config_json TEXT NOT NULL,
      is_public BOOLEAN DEFAULT FALSE,
      public_token TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      alert_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      condition_json TEXT NOT NULL,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER NOT NULL,
      entity_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      account_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    )`
  ];
  
  for (const table of tables) {
    db.exec(table);
  }
  
  console.log('✅ SQLite database initialized successfully!');
};

export default db;
