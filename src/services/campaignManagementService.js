class CampaignManagementService {
    constructor() {
        this.malaysiaMarketRules = {
            peak_hours: [19, 20, 21], // 7-9 PM Malaysia time
            low_performance_hours: [2, 3, 4, 5], // 2-5 AM
            weekend_multiplier: 0.85, // Weekend traffic 15% lower
            mobile_preference: 0.75, // 75% of traffic is mobile
            language_performance: {
                'bahasa_malaysia': 1.15,
                'english': 1.0,
                'chinese': 1.08,
                'tamil': 1.12
            },
            state_performance: {
                'kuala_lumpur': 1.2,
                'selangor': 1.15,
                'penang': 1.1,
                'johor': 1.05,
                'perak': 1.0,
                'sabah': 0.95,
                'sarawak': 0.95
            }
        };

        this.campaignStages = {
            'learning': { duration_days: 7, min_data_points: 100 },
            'optimization': { duration_days: 14, min_conversions: 10 },
            'scaling': { duration_days: 30, performance_threshold: 0.8 },
            'maintenance': { ongoing: true, review_frequency: 7 }
        };
    }

    // Create and launch demand generation campaign
    async createDemandGenCampaign(campaignData) {
        try {
            // Validate campaign data
            const validation = this.validateCampaignData(campaignData);
            if (!validation.isValid) {
                return { success: false, errors: validation.errors };
            }

            // Apply Malaysia-specific optimizations
            const optimizedCampaign = this.applyMalaysiaOptimizations(campaignData);

            // Create campaign structure
            const campaign = {
                id: this.generateCampaignId(),
                name: optimizedCampaign.name,
                type: 'DEMAND_GEN',
                status: 'PAUSED', // Start paused for review
                created_at: new Date().toISOString(),
                
                // Budget settings
                budget: {
                    daily_budget: optimizedCampaign.budget.daily,
                    total_budget: optimizedCampaign.budget.total,
                    bid_strategy: optimizedCampaign.budget.bid_strategy,
                    target_cpa: optimizedCampaign.budget.target_cpa
                },

                // Targeting settings
                targeting: {
                    locations: optimizedCampaign.targeting.locations,
                    languages: optimizedCampaign.targeting.languages,
                    audiences: optimizedCampaign.targeting.audiences,
                    demographics: optimizedCampaign.targeting.demographics,
                    interests: optimizedCampaign.targeting.interests
                },

                // Ad groups
                ad_groups: optimizedCampaign.ad_groups.map(ag => ({
                    id: this.generateAdGroupId(),
                    name: ag.name,
                    bid_amount: ag.bid_amount,
                    audiences: ag.audiences,
                    ads: ag.ads
                })),

                // Malaysia-specific settings
                malaysia_settings: {
                    festival_optimization: optimizedCampaign.festival_optimization,
                    local_language_priority: optimizedCampaign.local_language_priority,
                    cultural_sensitivity: optimizedCampaign.cultural_sensitivity
                },

                // Performance tracking
                performance: {
                    stage: 'learning',
                    learning_budget_spent: 0,
                    data_points_collected: 0,
                    last_optimization: null
                }
            };

            // Set up automated rules
            campaign.automation_rules = this.createAutomationRules(campaign);

            // Schedule launch
            const launchResult = await this.scheduleCampaignLaunch(campaign);

            return {
                success: true,
                campaign_id: campaign.id,
                campaign: campaign,
                launch_scheduled: launchResult.scheduled,
                estimated_performance: this.estimateCampaignPerformance(campaign)
            };

        } catch (error) {
            console.error('Error creating campaign:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Apply Malaysia-specific optimizations
    applyMalaysiaOptimizations(campaignData) {
        const optimized = { ...campaignData };

        // Adjust bids based on location performance
        if (optimized.targeting.locations) {
            optimized.targeting.locations = optimized.targeting.locations.map(location => ({
                ...location,
                bid_adjustment: this.malaysiaMarketRules.state_performance[location.state] || 1.0
            }));
        }

        // Optimize for mobile-first approach
        optimized.device_targeting = {
            mobile: { bid_adjustment: 1.1 }, // 10% higher for mobile
            desktop: { bid_adjustment: 0.95 },
            tablet: { bid_adjustment: 0.9 }
        };

        // Add time-of-day optimization
        optimized.schedule = {
            peak_hours: {
                hours: this.malaysiaMarketRules.peak_hours,
                bid_adjustment: 1.15
            },
            low_hours: {
                hours: this.malaysiaMarketRules.low_performance_hours,
                bid_adjustment: 0.8
            },
            weekend_adjustment: this.malaysiaMarketRules.weekend_multiplier
        };

        // Festival optimization
        const currentMonth = new Date().getMonth() + 1;
        const festivals = this.getActiveFestivals(currentMonth);
        if (festivals.length > 0) {
            optimized.festival_optimization = {
                active_festivals: festivals,
                bid_boost: 1.3,
                creative_themes: this.getFestivalCreativeThemes(festivals)
            };
        }

        return optimized;
    }

    // Create automation rules for campaign
    createAutomationRules(campaign) {
        return [
            // Performance-based rules
            {
                name: 'Pause Low Performing Ad Groups',
                condition: 'ctr < 0.015 AND spend > 50 AND impressions > 1000',
                action: 'pause_ad_group',
                frequency: 'daily'
            },
            {
                name: 'Increase Budget for High Performers',
                condition: 'ctr > 0.04 AND conversion_rate > 0.03',
                action: 'increase_budget_20_percent',
                frequency: 'weekly'
            },
            {
                name: 'Bid Down Expensive Keywords',
                condition: 'cpc > target_cpa * 0.5 AND conversions = 0',
                action: 'decrease_bid_15_percent',
                frequency: 'daily'
            },

            // Malaysia-specific rules
            {
                name: 'Festival Bid Boost',
                condition: 'festival_period = true',
                action: 'increase_bid_30_percent',
                frequency: 'festival_start'
            },
            {
                name: 'Local Language Performance Boost',
                condition: 'language = bahasa_malaysia AND ctr > average_ctr',
                action: 'increase_budget_25_percent',
                frequency: 'weekly'
            },
            {
                name: 'Weekend Adjustment',
                condition: 'day_of_week IN [saturday, sunday]',
                action: 'apply_weekend_multiplier',
                frequency: 'daily'
            }
        ];
    }

    // Monitor and optimize campaign performance
    async optimizeCampaignPerformance(campaignId) {
        try {
            const campaign = await this.getCampaignById(campaignId);
            const performance = await this.getCampaignPerformance(campaignId);
            
            const optimizations = [];

            // Stage-based optimization
            const currentStage = this.determineCampaignStage(campaign, performance);
            
            switch (currentStage) {
                case 'learning':
                    optimizations.push(...this.getLearningStageOptimizations(campaign, performance));
                    break;
                case 'optimization':
                    optimizations.push(...this.getOptimizationStageActions(campaign, performance));
                    break;
                case 'scaling':
                    optimizations.push(...this.getScalingStageActions(campaign, performance));
                    break;
                case 'maintenance':
                    optimizations.push(...this.getMaintenanceStageActions(campaign, performance));
                    break;
            }

            // Apply Malaysia-specific optimizations
            optimizations.push(...this.getMalaysiaSpecificOptimizations(campaign, performance));

            // Execute optimizations
            const results = await this.executeOptimizations(campaignId, optimizations);

            return {
                success: true,
                campaign_stage: currentStage,
                optimizations_applied: results.applied,
                performance_impact: results.estimated_impact,
                next_review_date: this.calculateNextReviewDate(currentStage)
            };

        } catch (error) {
            console.error('Error optimizing campaign:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Learning stage optimizations (first 7 days)
    getLearningStageOptimizations(campaign, performance) {
        const optimizations = [];

        // Ensure sufficient data collection
        if (performance.impressions < 1000) {
            optimizations.push({
                type: 'increase_bids',
                reason: 'Insufficient impressions for learning',
                adjustment: 1.2,
                priority: 'high'
            });
        }

        // Monitor audience performance
        const underperformingAudiences = performance.audiences?.filter(aud => 
            aud.ctr < 0.02 && aud.spend > 20
        ) || [];

        underperformingAudiences.forEach(audience => {
            optimizations.push({
                type: 'pause_audience',
                target: audience.id,
                reason: `Low CTR: ${(audience.ctr * 100).toFixed(2)}%`,
                priority: 'medium'
            });
        });

        return optimizations;
    }

    // Optimization stage actions (days 8-21)
    getOptimizationStageActions(campaign, performance) {
        const optimizations = [];

        // Budget reallocation based on performance
        const topPerformingAdGroups = performance.ad_groups
            ?.sort((a, b) => b.conversion_rate - a.conversion_rate)
            .slice(0, 3) || [];

        topPerformingAdGroups.forEach(adGroup => {
            optimizations.push({
                type: 'increase_ad_group_budget',
                target: adGroup.id,
                adjustment: 1.3,
                reason: `High conversion rate: ${(adGroup.conversion_rate * 100).toFixed(2)}%`,
                priority: 'high'
            });
        });

        // Creative optimization
        const lowPerformingCreatives = performance.creatives?.filter(creative => 
            creative.ctr < performance.average_ctr * 0.8
        ) || [];

        if (lowPerformingCreatives.length > 0) {
            optimizations.push({
                type: 'pause_creatives',
                targets: lowPerformingCreatives.map(c => c.id),
                reason: 'Below average CTR performance',
                priority: 'medium'
            });
        }

        return optimizations;
    }

    // Scaling stage actions (days 22-51)
    getScalingStageActions(campaign, performance) {
        const optimizations = [];

        // Increase budget for successful campaigns
        if (performance.roas > 3.0 && performance.conversion_rate > 0.03) {
            optimizations.push({
                type: 'increase_campaign_budget',
                adjustment: 1.5,
                reason: `Strong ROAS: ${performance.roas.toFixed(2)}`,
                priority: 'high'
            });
        }

        // Expand successful audiences
        const bestAudiences = performance.audiences
            ?.filter(aud => aud.conversion_rate > performance.average_conversion_rate * 1.2)
            || [];

        bestAudiences.forEach(audience => {
            optimizations.push({
                type: 'create_lookalike_audience',
                source: audience.id,
                similarity: 0.8,
                reason: `High performing audience: ${audience.name}`,
                priority: 'medium'
            });
        });

        return optimizations;
    }

    // Malaysia-specific optimizations
    getMalaysiaSpecificOptimizations(campaign, performance) {
        const optimizations = [];

        // Festival period adjustments
        const currentMonth = new Date().getMonth() + 1;
        const activeFestivals = this.getActiveFestivals(currentMonth);
        
        if (activeFestivals.length > 0 && !campaign.festival_optimization?.active) {
            optimizations.push({
                type: 'enable_festival_targeting',
                festivals: activeFestivals,
                bid_boost: 1.3,
                reason: `Active festival period: ${activeFestivals.join(', ')}`,
                priority: 'high'
            });
        }

        // Language performance optimization
        const languagePerformance = performance.languages || {};
        Object.entries(languagePerformance).forEach(([lang, perf]) => {
            const expectedMultiplier = this.malaysiaMarketRules.language_performance[lang] || 1.0;
            if (perf.ctr > performance.average_ctr * expectedMultiplier) {
                optimizations.push({
                    type: 'increase_language_budget',
                    language: lang,
                    adjustment: 1.2,
                    reason: `Strong performance in ${lang}`,
                    priority: 'medium'
                });
            }
        });

        // Time-of-day optimization
        const hourlyPerformance = performance.hourly_performance || {};
        const peakHours = this.malaysiaMarketRules.peak_hours;
        
        peakHours.forEach(hour => {
            if (hourlyPerformance[hour]?.conversion_rate > performance.average_conversion_rate * 1.1) {
                optimizations.push({
                    type: 'increase_peak_hour_bids',
                    hour: hour,
                    adjustment: 1.15,
                    reason: `High conversion rate at ${hour}:00`,
                    priority: 'low'
                });
            }
        });

        return optimizations;
    }

    // Execute optimization actions
    async executeOptimizations(campaignId, optimizations) {
        const results = {
            applied: [],
            failed: [],
            estimated_impact: {}
        };

        for (const optimization of optimizations) {
            try {
                const result = await this.applyOptimization(campaignId, optimization);
                if (result.success) {
                    results.applied.push({
                        ...optimization,
                        applied_at: new Date().toISOString(),
                        result: result
                    });
                } else {
                    results.failed.push({
                        ...optimization,
                        error: result.error
                    });
                }
            } catch (error) {
                results.failed.push({
                    ...optimization,
                    error: error.message
                });
            }
        }

        // Calculate estimated impact
        results.estimated_impact = this.calculateOptimizationImpact(results.applied);

        return results;
    }

    // Helper methods
    validateCampaignData(data) {
        const errors = [];
        
        if (!data.name || data.name.length < 3) {
            errors.push('Campaign name must be at least 3 characters');
        }
        
        if (!data.budget || data.budget.daily < 10) {
            errors.push('Daily budget must be at least RM 10');
        }
        
        if (!data.targeting || !data.targeting.audiences || data.targeting.audiences.length === 0) {
            errors.push('At least one audience must be selected');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    generateCampaignId() {
        return 'camp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateAdGroupId() {
        return 'ag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getActiveFestivals(month) {
        const festivals = {
            2: ['chinese_new_year'],
            5: ['hari_raya'],
            10: ['deepavali'],
            12: ['christmas']
        };
        return festivals[month] || [];
    }

    getFestivalCreativeThemes(festivals) {
        const themes = {
            'chinese_new_year': ['prosperity', 'red_gold', 'family_reunion'],
            'hari_raya': ['forgiveness', 'family', 'traditional'],
            'deepavali': ['lights', 'celebration', 'victory_of_good'],
            'christmas': ['giving', 'family', 'celebration']
        };
        
        return festivals.flatMap(festival => themes[festival] || []);
    }

    determineCampaignStage(campaign, performance) {
        const daysSinceLaunch = Math.floor(
            (new Date() - new Date(campaign.created_at)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLaunch <= 7) return 'learning';
        if (daysSinceLaunch <= 21) return 'optimization';
        if (daysSinceLaunch <= 51) return 'scaling';
        return 'maintenance';
    }

    calculateNextReviewDate(stage) {
        const reviewIntervals = {
            'learning': 1, // Daily review
            'optimization': 3, // Every 3 days
            'scaling': 7, // Weekly
            'maintenance': 14 // Bi-weekly
        };

        const days = reviewIntervals[stage] || 7;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + days);
        return nextReview.toISOString();
    }

    calculateOptimizationImpact(appliedOptimizations) {
        let estimatedCTRImprovement = 0;
        let estimatedCostReduction = 0;
        let estimatedConversionImprovement = 0;

        appliedOptimizations.forEach(opt => {
            switch (opt.type) {
                case 'increase_bids':
                    estimatedCTRImprovement += 0.05;
                    break;
                case 'pause_audience':
                    estimatedCostReduction += 0.10;
                    break;
                case 'increase_budget':
                    estimatedConversionImprovement += 0.15;
                    break;
                case 'enable_festival_targeting':
                    estimatedCTRImprovement += 0.20;
                    estimatedConversionImprovement += 0.25;
                    break;
            }
        });

        return {
            estimated_ctr_improvement: Math.min(estimatedCTRImprovement, 0.5), // Cap at 50%
            estimated_cost_reduction: Math.min(estimatedCostReduction, 0.3), // Cap at 30%
            estimated_conversion_improvement: Math.min(estimatedConversionImprovement, 0.4) // Cap at 40%
        };
    }

    async scheduleCampaignLaunch(campaign) {
        // In production, this would integrate with Google Ads API
        return {
            scheduled: true,
            launch_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
            pre_launch_checks: [
                'Budget allocation verified',
                'Audience targeting validated',
                'Creative assets approved',
                'Malaysia compliance checked'
            ]
        };
    }

    estimateCampaignPerformance(campaign) {
        // Simplified performance estimation
        const baseMetrics = {
            estimated_impressions: campaign.budget.daily_budget * 100,
            estimated_clicks: campaign.budget.daily_budget * 100 * 0.035, // 3.5% CTR
            estimated_conversions: campaign.budget.daily_budget * 100 * 0.035 * 0.03, // 3% conversion rate
            estimated_cpc: 0.12, // RM 0.12 average CPC for Malaysia
            estimated_cpa: 4.0 // RM 4.00 average CPA
        };

        // Apply Malaysia-specific adjustments
        if (campaign.malaysia_settings?.festival_optimization) {
            baseMetrics.estimated_impressions *= 1.3;
            baseMetrics.estimated_clicks *= 1.4;
            baseMetrics.estimated_conversions *= 1.5;
        }

        return baseMetrics;
    }

    // Placeholder methods for integration
    async getCampaignById(campaignId) {
        // In production, this would fetch from database
        return { id: campaignId, created_at: new Date().toISOString() };
    }

    async getCampaignPerformance(campaignId) {
        // In production, this would fetch from Google Ads API
        return {
            impressions: 10000,
            clicks: 350,
            conversions: 12,
            cost: 42.0,
            ctr: 0.035,
            conversion_rate: 0.034,
            cpc: 0.12,
            roas: 3.2,
            average_ctr: 0.032,
            average_conversion_rate: 0.028
        };
    }

    async applyOptimization(campaignId, optimization) {
        // In production, this would apply changes via Google Ads API
        return {
            success: true,
            message: `Applied ${optimization.type} optimization`
        };
    }
}

module.exports = CampaignManagementService;
