import { query } from '../lib/db';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await query(`
      INSERT INTO users (email, password_hash, name, role, status)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, [
      'admin@demandgenpro.com',
      hashedPassword,
      'Admin User',
      'owner',
      'active'
    ]);
    
    console.log('✅ Admin user created: admin@demandgenpro.com / admin123');
    
    // Create sample Malaysia audience packs
    const malaysiaPacks = [
      {
        name: 'Perokok & Vape Malaysia',
        description: 'Targeting smokers and vape users in Malaysia',
        targeting_json: {
          demographics: { age_ranges: ['25-34', '35-44', '45-54'] },
          interests: ['smoking', 'vaping', 'tobacco alternatives'],
          keywords: ['rokok', 'vape', 'e-cigarette', 'quit smoking'],
          locations: ['Malaysia']
        }
      },
      {
        name: 'Imun & Gaya Hidup Sihat',
        description: 'Health-conscious Malaysians focused on immunity',
        targeting_json: {
          demographics: { age_ranges: ['25-34', '35-44', '45-54'] },
          interests: ['health', 'wellness', 'immunity', 'supplements'],
          keywords: ['vitamin', 'supplement', 'sihat', 'imun', 'kesihatan'],
          locations: ['Malaysia']
        }
      },
      {
        name: 'Pekerja Luar & Pemandu',
        description: 'Outdoor workers and drivers in Malaysia',
        targeting_json: {
          demographics: { age_ranges: ['25-34', '35-44', '45-54'] },
          interests: ['construction', 'delivery', 'transportation'],
          keywords: ['pekerja', 'pemandu', 'delivery', 'grab', 'construction'],
          locations: ['Malaysia']
        }
      },
      {
        name: 'Pasca-Sakit Recovery',
        description: 'Post-illness recovery and health maintenance',
        targeting_json: {
          demographics: { age_ranges: ['35-44', '45-54', '55-64'] },
          interests: ['health recovery', 'medical care', 'wellness'],
          keywords: ['recovery', 'pemulihan', 'sihat semula', 'hospital'],
          locations: ['Malaysia']
        }
      }
    ];
    
    for (const pack of malaysiaPacks) {
      await query(`
        INSERT INTO audience_packs (name, description, targeting_json, is_template, created_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
      `, [
        pack.name,
        pack.description,
        JSON.stringify(pack.targeting_json),
        true,
        'system'
      ]);
    }
    
    console.log('✅ Malaysia audience packs created');
    
    // Create sample alert rules templates
    const alertRuleTemplates = [
      {
        name: 'Spend Spike Detection',
        alert_type: 'spend_spike',
        entity_type: 'campaign',
        condition_json: {
          metric: 'daily_spend',
          threshold: 150,
          comparison: 'percent_increase',
          period: '24_hours'
        },
        severity: 'high'
      },
      {
        name: 'Zero Conversions Alert',
        alert_type: 'zero_conversions',
        entity_type: 'campaign',
        condition_json: {
          metric: 'conversions',
          threshold: 0,
          comparison: 'equals',
          period: '48_hours'
        },
        severity: 'medium'
      },
      {
        name: 'CPA Drift Warning',
        alert_type: 'cpa_drift',
        entity_type: 'campaign',
        condition_json: {
          metric: 'cpa',
          threshold: 50,
          comparison: 'percent_increase',
          period: '7_days'
        },
        severity: 'medium'
      }
    ];
    
    for (const template of alertRuleTemplates) {
      await query(`
        INSERT INTO alert_rules (name, alert_type, entity_type, condition_json, severity, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO NOTHING
      `, [
        template.name,
        template.alert_type,
        template.entity_type,
        JSON.stringify(template.condition_json),
        template.severity,
        'template'
      ]);
    }
    
    console.log('✅ Alert rule templates created');
    
    // Create sample automation rule templates
    const automationRuleTemplates = [
      {
        name: 'Auto-pause High CPA Campaigns',
        scope: 'campaign',
        json_condition: {
          metric: 'cpa',
          operator: 'greater_than',
          value: 200,
          period: '7_days'
        },
        json_actions: [
          {
            type: 'pause_entity',
            reason: 'High CPA detected'
          }
        ]
      },
      {
        name: 'Increase Budget for High ROAS',
        scope: 'campaign',
        json_condition: {
          metric: 'roas',
          operator: 'greater_than',
          value: 4.0,
          period: '3_days'
        },
        json_actions: [
          {
            type: 'increase_budget',
            percentage: 20,
            max_budget: 1000
          }
        ]
      }
    ];
    
    for (const template of automationRuleTemplates) {
      await query(`
        INSERT INTO rules (name, scope, json_condition, json_actions, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
      `, [
        template.name,
        template.scope,
        JSON.stringify(template.json_condition),
        JSON.stringify(template.json_actions),
        'template'
      ]);
    }
    
    console.log('✅ Automation rule templates created');
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('Email: admin@demandgenpro.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedDatabase();
