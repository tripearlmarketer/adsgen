const { GoogleAdsApi } = require('google-ads-api');

class GoogleAdsService {
    constructor() {
        this.client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_ADS_CLIENT_ID,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
            developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        });
    }

    // Create Demand Generation Campaign
    async createDemandGenCampaign(customerId, campaignData) {
        try {
            const customer = this.client.Customer({
                customer_id: customerId,
                refresh_token: campaignData.refresh_token,
            });

            // Create campaign
            const campaign = {
                name: campaignData.name,
                advertising_channel_type: 'DEMAND_GEN',
                status: 'PAUSED', // Start paused for review
                campaign_budget: await this.createBudget(customer, campaignData.budget),
                bidding_strategy: {
                    target_cpa: {
                        target_cpa_micros: campaignData.target_cpa * 1000000,
                    }
                },
                // Malaysia-specific settings
                geo_target_constants: this.getMalaysiaGeoTargets(campaignData.states),
                language_constants: this.getLanguageTargets(campaignData.languages),
            };

            const response = await customer.campaigns.create([campaign]);
            
            // Create ad groups
            await this.createAdGroups(customer, response.results[0].resource_name, campaignData.adGroups);
            
            return {
                success: true,
                campaignId: response.results[0].resource_name,
                message: 'Demand Generation campaign created successfully'
            };

        } catch (error) {
            console.error('Error creating campaign:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Malaysia-specific geo targeting
    getMalaysiaGeoTargets(states) {
        const malaysiaGeoTargets = {
            'kuala_lumpur': '1012825',
            'selangor': '1012826',
            'penang': '1012827',
            'johor': '1012828',
            'perak': '1012829',
            'sabah': '1012830',
            'sarawak': '1012831',
            'kedah': '1012832',
            'kelantan': '1012833',
            'terengganu': '1012834',
            'pahang': '1012835',
            'negeri_sembilan': '1012836',
            'melaka': '1012837',
            'perlis': '1012838',
            'putrajaya': '1012839',
            'labuan': '1012840'
        };

        return states.map(state => ({
            geo_target_constant: `geoTargetConstants/${malaysiaGeoTargets[state]}`
        }));
    }

    // Multi-language targeting for Malaysia
    getLanguageTargets(languages) {
        const languageTargets = {
            'bahasa_malaysia': '1018', // Malay
            'english': '1000',         // English
            'chinese': '1002',         // Chinese
            'tamil': '1018'            // Tamil
        };

        return languages.map(lang => ({
            language_constant: `languageConstants/${languageTargets[lang]}`
        }));
    }

    // Festival-aware campaign optimization
    async optimizeForFestivals(campaignId, festivalData) {
        const optimizations = {
            deepavali: {
                bid_multiplier: 1.3,
                audience_expansion: ['tamil_community', 'hindu_festivals'],
                creative_themes: ['lights', 'celebration', 'family']
            },
            chinese_new_year: {
                bid_multiplier: 1.4,
                audience_expansion: ['chinese_community', 'lunar_new_year'],
                creative_themes: ['prosperity', 'red_gold', 'family_reunion']
            },
            hari_raya: {
                bid_multiplier: 1.2,
                audience_expansion: ['malay_community', 'islamic_festivals'],
                creative_themes: ['forgiveness', 'family', 'traditional']
            }
        };

        return optimizations[festivalData.festival] || {};
    }

    // AI-powered audience insights
    async getAudienceInsights(customerId, audienceData) {
        try {
            const customer = this.client.Customer({
                customer_id: customerId,
                refresh_token: audienceData.refresh_token,
            });

            // Get audience insights
            const query = `
                SELECT 
                    audience_view.resource_name,
                    audience_view.audience.name,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.ctr,
                    metrics.cost_micros,
                    metrics.conversions
                FROM audience_view 
                WHERE segments.date DURING LAST_30_DAYS
                ORDER BY metrics.impressions DESC
                LIMIT 50
            `;

            const response = await customer.query(query);
            
            // AI analysis of performance
            const insights = this.analyzeAudiencePerformance(response);
            
            return {
                success: true,
                insights: insights,
                recommendations: this.generateAudienceRecommendations(insights)
            };

        } catch (error) {
            console.error('Error getting audience insights:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // AI analysis of audience performance
    analyzeAudiencePerformance(data) {
        return data.map(row => {
            const ctr = row.metrics.ctr;
            const cost = row.metrics.cost_micros / 1000000;
            const conversions = row.metrics.conversions;
            
            let performance_score = 0;
            let recommendations = [];

            // CTR analysis
            if (ctr > 0.04) {
                performance_score += 30;
                recommendations.push('High engagement - consider increasing budget');
            } else if (ctr < 0.02) {
                performance_score -= 20;
                recommendations.push('Low engagement - review creative or targeting');
            }

            // Cost efficiency analysis
            const cpc = cost / row.metrics.clicks;
            if (cpc < 0.10) {
                performance_score += 25;
                recommendations.push('Cost efficient - good value audience');
            } else if (cpc > 0.20) {
                performance_score -= 15;
                recommendations.push('High cost - consider bid adjustments');
            }

            // Conversion analysis
            if (conversions > 0) {
                performance_score += 45;
                recommendations.push('Converting audience - prioritize this segment');
            }

            return {
                audience_name: row.audience_view.audience.name,
                performance_score: Math.max(0, Math.min(100, performance_score)),
                recommendations: recommendations,
                metrics: {
                    impressions: row.metrics.impressions,
                    clicks: row.metrics.clicks,
                    ctr: ctr,
                    cpc: cpc,
                    conversions: conversions
                }
            };
        });
    }

    // Generate AI recommendations
    generateAudienceRecommendations(insights) {
        const topPerformers = insights
            .filter(audience => audience.performance_score > 70)
            .sort((a, b) => b.performance_score - a.performance_score)
            .slice(0, 3);

        const underPerformers = insights
            .filter(audience => audience.performance_score < 40)
            .sort((a, b) => a.performance_score - b.performance_score)
            .slice(0, 3);

        return {
            scale_up: topPerformers.map(audience => ({
                audience: audience.audience_name,
                action: 'Increase budget allocation',
                reason: `High performance score: ${audience.performance_score}%`,
                potential_impact: 'High'
            })),
            optimize: underPerformers.map(audience => ({
                audience: audience.audience_name,
                action: 'Review targeting or pause',
                reason: `Low performance score: ${audience.performance_score}%`,
                potential_impact: 'Medium'
            })),
            malaysia_specific: [
                {
                    action: 'Enable festival targeting',
                    reason: 'Malaysian festivals show 40% higher engagement',
                    festivals: ['Deepavali', 'Chinese New Year', 'Hari Raya']
                },
                {
                    action: 'Add Bahasa Malaysia creatives',
                    reason: 'Local language ads perform 25% better',
                    languages: ['Bahasa Malaysia', 'Tamil', 'Chinese']
                }
            ]
        };
    }
}

module.exports = GoogleAdsService;
