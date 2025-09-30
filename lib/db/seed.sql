-- Seed data for DemandGen Pro
-- Malaysia-focused audience packs and default configurations

-- Insert prebuilt audience packs (Malaysia context)
INSERT INTO audience_packs (id, account_id, name, description, json_definition, is_prebuilt, language) VALUES
(
    uuid_generate_v4(),
    NULL, -- Global prebuilt pack
    'Perokok & Vape – Kesihatan Paru-Paru',
    'Targeting smokers and vapers concerned about lung health in Malaysia',
    '{
        "custom_segments": {
            "keywords": ["batuk berpanjangan", "sesak nafas", "paru-paru", "resdung", "jerebu", "asap kenderaan", "nafas pendek", "rokok elektronik", "berhenti merokok"],
            "urls": ["health.gov.my", "kementeriankesihatan.gov.my"]
        },
        "interests": ["smoking", "vaping", "respiratory_health", "quit_smoking"],
        "in_market": ["cough_cold_remedies", "respiratory_care", "air_purifier"],
        "demographics": {
            "age_ranges": ["25-34", "35-44", "45-54"],
            "languages": ["ms", "en"],
            "locations": ["Malaysia"]
        }
    }',
    true,
    'ms'
),
(
    uuid_generate_v4(),
    NULL,
    'Imun & Gaya Hidup Sihat',
    'Health-conscious Malaysians interested in immunity and wellness',
    '{
        "custom_segments": {
            "keywords": ["vitamin c", "antioksidan", "buah camu camu", "superfood", "sistem imun", "kesihatan", "supplement"],
            "urls": ["guardian.com.my", "watsons.com.my", "farmasi.com.my"]
        },
        "interests": ["fitness_wellness", "vitamin_supplements", "healthy_living"],
        "in_market": ["vitamins_supplements", "immune_support", "health_products"],
        "demographics": {
            "age_ranges": ["25-34", "35-44", "45-54"],
            "languages": ["ms", "en"],
            "locations": ["Malaysia"]
        }
    }',
    true,
    'ms'
),
(
    uuid_generate_v4(),
    NULL,
    'Pekerja Luar & Pemandu Harian',
    'Outdoor workers and daily drivers exposed to pollution',
    '{
        "custom_segments": {
            "keywords": ["kerja tapak", "asap lori", "jem KL", "topeng muka", "pemandu teksi", "grab driver", "construction worker"],
            "urls": ["jobstreet.com.my", "mudah.my"]
        },
        "interests": ["construction_field_work", "logistics_transportation", "ride_hailing"],
        "in_market": ["work_safety_equipment", "face_masks", "air_purifiers"],
        "demographics": {
            "age_ranges": ["25-34", "35-44", "45-54"],
            "gender": ["male"],
            "languages": ["ms", "en"],
            "locations": ["Kuala Lumpur", "Selangor", "Johor", "Penang"]
        }
    }',
    true,
    'ms'
),
(
    uuid_generate_v4(),
    NULL,
    'Pasca-Sakit/Recovery Audience',
    'People recovering from respiratory illnesses',
    '{
        "custom_segments": {
            "keywords": ["pulih batuk", "oksigen rendah", "keringkan kahak", "recovery", "post covid", "lung recovery"],
            "urls": ["kpj.com.my", "pantai.com.my", "gleneagles.com.my"]
        },
        "interests": ["health_recovery", "medical_devices", "respiratory_therapy"],
        "in_market": ["recovery_health_monitoring", "medical_equipment", "health_supplements"],
        "demographics": {
            "age_ranges": ["35-44", "45-54", "55-64"],
            "languages": ["ms", "en"],
            "locations": ["Malaysia"]
        }
    }',
    true,
    'ms'
);

-- Insert default automation rules
INSERT INTO rules (id, account_id, name, scope, json_condition, json_actions, schedule_cron, status) VALUES
(
    uuid_generate_v4(),
    NULL, -- Global template
    'Protect Budget (CPA Guard)',
    'ad_group',
    '{
        "window_days": 3,
        "conversions_lt": 3,
        "spend_gt": 150,
        "cpa_gt_target_pct": 20
    }',
    '[
        {"type": "decrease_budget_pct", "value": 20},
        {"type": "notify", "message": "Budget decreased due to high CPA"}
    ]',
    '0 */2 9-22 * * *',
    'active'
),
(
    uuid_generate_v4(),
    NULL,
    'Scale Winner',
    'campaign',
    '{
        "window_days": 7,
        "conversions_gte": 15,
        "cpa_lte_target": true
    }',
    '[
        {"type": "increase_budget_pct", "value": 20},
        {"type": "label", "value": "SCALED"}
    ]',
    '0 0 10 * * *',
    'active'
),
(
    uuid_generate_v4(),
    NULL,
    'Zero Conversions Kill-Switch',
    'ad',
    '{
        "window_days": 2,
        "spend_gt": 80,
        "conversions_eq": 0
    }',
    '[
        {"type": "pause"}
    ]',
    '0 */4 * * * *',
    'active'
);

-- Insert blocklist phrases (Malaysia context)
CREATE TABLE IF NOT EXISTS blocklist_phrases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    phrase VARCHAR(255) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    category VARCHAR(50) DEFAULT 'medical',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO blocklist_phrases (account_id, phrase, language, category) VALUES
-- English medical overclaims
(NULL, 'cure cancer', 'en', 'medical'),
(NULL, 'cure diabetes', 'en', 'medical'),
(NULL, 'miracle cure', 'en', 'medical'),
(NULL, 'guaranteed results', 'en', 'medical'),
(NULL, '100% effective', 'en', 'medical'),
(NULL, 'FDA approved', 'en', 'medical'),
(NULL, 'doctor recommended', 'en', 'medical'),

-- Bahasa Malaysia medical overclaims
(NULL, 'sembuh kanser', 'ms', 'medical'),
(NULL, 'sembuh kencing manis', 'ms', 'medical'),
(NULL, 'ubat ajaib', 'ms', 'medical'),
(NULL, 'dijamin berkesan', 'ms', 'medical'),
(NULL, '100% berkesan', 'ms', 'medical'),
(NULL, 'diluluskan doktor', 'ms', 'medical'),
(NULL, 'tiada kesan sampingan', 'ms', 'medical');

-- Insert default UTM template
CREATE TABLE IF NOT EXISTS utm_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO utm_templates (account_id, name, template, is_default) VALUES
(NULL, 'Default Demand Gen UTM', 'utm_source=google&utm_medium=demandgen&utm_campaign={{campaign}}&utm_content={{ad}}&utm_term={{keyword}}', true);

-- Insert sample alert templates
INSERT INTO alerts (id, account_id, name, condition_json, channels_json, status) VALUES
(
    uuid_generate_v4(),
    NULL,
    'Spend Spike Alert',
    '{
        "metric": "spend",
        "comparison": "gt",
        "threshold_pct": 150,
        "baseline": "7_day_avg",
        "check_time": "12:00"
    }',
    '[
        {"type": "email", "enabled": true},
        {"type": "webhook", "enabled": false}
    ]',
    'active'
),
(
    uuid_generate_v4(),
    NULL,
    'Zero Conversion Alert',
    '{
        "metric": "conversions",
        "comparison": "eq",
        "threshold": 0,
        "spend_gt": 100,
        "window_hours": 24
    }',
    '[
        {"type": "email", "enabled": true},
        {"type": "slack", "enabled": false}
    ]',
    'active'
),
(
    uuid_generate_v4(),
    NULL,
    'CPA Drift Alert',
    '{
        "metric": "cpa",
        "comparison": "gt",
        "threshold_pct": 125,
        "baseline": "target",
        "consecutive_days": 2
    }',
    '[
        {"type": "email", "enabled": true}
    ]',
    'active'
);

-- Insert sample experiment templates
INSERT INTO experiments (id, account_id, name, hypothesis, metric, min_runtime_days, variant_json, status) VALUES
(
    uuid_generate_v4(),
    NULL,
    'Headline A/B Test Template',
    'Shorter headlines will improve CTR',
    'ctr',
    7,
    '{
        "control": {
            "name": "Control - Long Headline",
            "changes": {"headline": "Original long headline"}
        },
        "variant_a": {
            "name": "Variant A - Short Headline", 
            "changes": {"headline": "Short headline"}
        }
    }',
    'draft'
);
