import { z } from 'zod';

// Campaign validation schemas
export const campaignObjectiveSchema = z.enum(['sales', 'leads', 'website_traffic']);

export const biddingStrategySchema = z.object({
  type: z.enum(['maximize_conversions', 'target_cpa', 'target_roas']),
  target_cpa: z.number().optional(),
  target_roas: z.number().optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  objective: campaignObjectiveSchema,
  daily_budget_myr: z.number().min(1).max(100000),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  bidding_strategy: biddingStrategySchema,
  notes: z.string().max(1000).optional(),
});

// Ad validation schemas
export const createAdSchema = z.object({
  headline: z.string().min(1).max(30),
  description: z.string().min(1).max(90),
  final_url: z.string().url(),
  asset_group_id: z.string().uuid().optional(),
  thumbnail_id: z.string().uuid().optional(),
});

// Asset validation schemas
export const assetTypeSchema = z.enum(['image', 'video', 'thumbnail']);

export const createAssetSchema = z.object({
  type: assetTypeSchema,
  name: z.string().min(1).max(255),
  file_size: z.number().max(50 * 1024 * 1024), // 50MB max
  width: z.number().optional(),
  height: z.number().optional(),
  duration_ms: z.number().optional(),
});

// Audience pack validation schemas
export const audiencePackSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  json_definition: z.object({
    custom_segments: z.object({
      keywords: z.array(z.string()).optional(),
      urls: z.array(z.string().url()).optional(),
    }).optional(),
    interests: z.array(z.string()).optional(),
    in_market: z.array(z.string()).optional(),
    demographics: z.object({
      age_ranges: z.array(z.string()).optional(),
      gender: z.array(z.enum(['male', 'female'])).optional(),
      languages: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
    }).optional(),
  }),
  language: z.enum(['en', 'ms']).default('en'),
});

// Rule validation schemas
export const ruleConditionSchema = z.object({
  window_days: z.number().min(1).max(90).optional(),
  conversions_lt: z.number().optional(),
  conversions_gt: z.number().optional(),
  conversions_eq: z.number().optional(),
  conversions_gte: z.number().optional(),
  spend_gt: z.number().optional(),
  spend_lt: z.number().optional(),
  cpa_gt_target_pct: z.number().optional(),
  cpa_lte_target: z.boolean().optional(),
  roas_lt_target: z.boolean().optional(),
  ctr_lt: z.number().optional(),
  impression_share_lost_budget_gt: z.number().optional(),
});

export const ruleActionSchema = z.object({
  type: z.enum(['pause', 'enable', 'increase_budget_pct', 'decrease_budget_pct', 'bid_adjust_pct', 'duplicate', 'notify', 'label']),
  value: z.union([z.number(), z.string()]).optional(),
  message: z.string().optional(),
});

export const createRuleSchema = z.object({
  name: z.string().min(1).max(255),
  scope: z.enum(['account', 'campaign', 'ad_group', 'ad']),
  json_condition: ruleConditionSchema,
  json_actions: z.array(ruleActionSchema),
  schedule_cron: z.string().optional(),
});

// Experiment validation schemas
export const createExperimentSchema = z.object({
  name: z.string().min(1).max(255),
  hypothesis: z.string().min(1).max(1000),
  metric: z.enum(['cpa', 'roas', 'ctr', 'cvr']),
  min_runtime_days: z.number().min(1).max(90).default(5),
  variant_json: z.object({
    control: z.object({
      name: z.string(),
      changes: z.record(z.any()),
    }),
    variant_a: z.object({
      name: z.string(),
      changes: z.record(z.any()),
    }),
  }),
});

// Alert validation schemas
export const alertConditionSchema = z.object({
  metric: z.enum(['spend', 'conversions', 'cpa', 'roas', 'ctr']),
  comparison: z.enum(['gt', 'lt', 'eq', 'gte', 'lte']),
  threshold: z.number().optional(),
  threshold_pct: z.number().optional(),
  baseline: z.enum(['target', '7_day_avg', '30_day_avg']).optional(),
  window_hours: z.number().optional(),
  consecutive_days: z.number().optional(),
  check_time: z.string().optional(),
});

export const alertChannelSchema = z.object({
  type: z.enum(['email', 'slack', 'webhook']),
  enabled: z.boolean().default(true),
  config: z.record(z.any()).optional(),
});

export const createAlertSchema = z.object({
  name: z.string().min(1).max(255),
  condition_json: alertConditionSchema,
  channels_json: z.array(alertChannelSchema),
});

// User validation schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(100),
  role: z.enum(['owner', 'manager', 'analyst']).default('analyst'),
  timezone: z.string().default('Asia/Kuala_Lumpur'),
  language: z.enum(['en', 'ms']).default('en'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Report validation schemas
export const reportParamsSchema = z.object({
  date_range: z.enum(['today', 'yesterday', 'last_7_days', 'last_14_days', 'last_30_days', 'last_60_days', 'custom']),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  breakdown: z.enum(['campaign', 'ad_group', 'ad', 'audience_pack', 'asset', 'placement']).optional(),
  metrics: z.array(z.enum(['impressions', 'clicks', 'ctr', 'conversions', 'cpa', 'revenue', 'roas', 'view_through_conversions'])),
  filters: z.record(z.any()).optional(),
});

export const createReportSchema = z.object({
  name: z.string().min(1).max(255),
  params_json: reportParamsSchema,
});

// Policy validation functions
export function validateAdText(text: string, type: 'headline' | 'description'): string[] {
  const errors: string[] = [];
  
  // Length validation
  const maxLength = type === 'headline' ? 30 : 90;
  if (text.length > maxLength) {
    errors.push(`${type} exceeds maximum length of ${maxLength} characters`);
  }
  
  // Capitalization check
  const uppercaseRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (uppercaseRatio > 0.5) {
    errors.push(`${type} has excessive capitalization`);
  }
  
  // Forbidden phrases check (placeholder - would load from database)
  const forbiddenPhrases = [
    'cure cancer', 'cure diabetes', 'miracle cure', 'guaranteed results',
    'sembuh kanser', 'sembuh kencing manis', 'ubat ajaib', 'dijamin berkesan'
  ];
  
  const lowerText = text.toLowerCase();
  forbiddenPhrases.forEach(phrase => {
    if (lowerText.includes(phrase.toLowerCase())) {
      errors.push(`${type} contains forbidden phrase: "${phrase}"`);
    }
  });
  
  return errors;
}

export function validateImageAsset(file: {
  width: number;
  height: number;
  size: number;
  type: string;
}): string[] {
  const errors: string[] = [];
  
  // File type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only JPEG, PNG, and GIF are allowed');
  }
  
  // File size validation (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    errors.push('File size exceeds 5MB limit');
  }
  
  // Aspect ratio validation
  const aspectRatio = file.width / file.height;
  const allowedRatios = [
    { ratio: 1, name: '1:1' },
    { ratio: 1.91, name: '1.91:1' },
    { ratio: 0.8, name: '4:5' }
  ];
  
  const isValidRatio = allowedRatios.some(ar => 
    Math.abs(aspectRatio - ar.ratio) < 0.1
  );
  
  if (!isValidRatio) {
    errors.push('Invalid aspect ratio. Allowed ratios: 1:1, 1.91:1, 4:5');
  }
  
  // Minimum dimensions
  if (file.width < 300 || file.height < 300) {
    errors.push('Image dimensions too small. Minimum 300x300 pixels');
  }
  
  return errors;
}

export function validateVideoAsset(file: {
  duration: number;
  size: number;
  type: string;
}): string[] {
  const errors: string[] = [];
  
  // File type validation
  const allowedTypes = ['video/mp4', 'video/mov', 'video/avi'];
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only MP4, MOV, and AVI are allowed');
  }
  
  // File size validation (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    errors.push('File size exceeds 50MB limit');
  }
  
  // Duration validation (30 seconds max recommended)
  if (file.duration > 30000) {
    errors.push('Video duration exceeds recommended 30 seconds');
  }
  
  return errors;
}

export function validateUrl(url: string): string[] {
  const errors: string[] = [];
  
  try {
    const urlObj = new URL(url);
    
    // Protocol validation
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('URL must use HTTP or HTTPS protocol');
    }
    
    // Check if URL is reachable (placeholder - would implement actual check)
    // This would be done asynchronously in practice
    
  } catch (error) {
    errors.push('Invalid URL format');
  }
  
  return errors;
}

// UTM parameter builder
export function buildUtmUrl(baseUrl: string, params: {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}): string {
  const url = new URL(baseUrl);
  
  if (params.source) url.searchParams.set('utm_source', params.source);
  if (params.medium) url.searchParams.set('utm_medium', params.medium);
  if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
  if (params.content) url.searchParams.set('utm_content', params.content);
  if (params.term) url.searchParams.set('utm_term', params.term);
  
  return url.toString();
}
