class BudgetOptimizationService {
    constructor() {
        this.malaysiaMarketData = {
            average_cpc_by_industry: {
                'smoking_cessation': 0.15,
                'health_supplements': 0.12,
                'medical_services': 0.18,
                'wellness_products': 0.10
            },
            seasonal_multipliers: {
                'deepavali': 1.4,
                'chinese_new_year': 1.5,
                'hari_raya': 1.3,
                'christmas': 1.2,
                'school_holidays': 1.1
            },
            state_cost_multipliers: {
                'kuala_lumpur': 1.3,
                'selangor': 1.2,
                'penang': 1.1,
                'johor': 1.05,
                'perak': 1.0,
                'sabah': 0.9,
                'sarawak': 0.9
            },
            optimal_budget_distribution: {
                'learning_phase': 0.3, // 30% for learning
                'optimization_phase': 0.4, // 40% for optimization
                'scaling_phase': 0.3 // 30% for scaling
            }
        };

        this.budgetRules = {
            min_daily_budget: 10, // RM 10 minimum
            max_daily_increase: 0.5, // 50% max daily increase
            min_performance_days: 3, // Minimum days before budget changes
            emergency_pause_threshold: 0.1, // Pause if ROAS < 0.1
            scale_up_threshold: 3.0, // Scale up if ROAS > 3.0
            cost_efficiency_threshold: 0.8 // Efficiency score threshold
        };
    }

    // Optimize budget allocation across campaigns
    async optimizeBudgetAllocation(accountBudget, campaigns) {
        try {
            const totalBudget = accountBudget.monthly_budget;
            const dailyBudget = totalBudget / 30;

            // Analyze campaign performance
            const campaignAnalysis = await this.analyzeCampaignPerformance(campaigns);
            
            // Calculate optimal allocation
            const allocation = this.calculateOptimalAllocation(dailyBudget, campaignAnalysis);
            
            // Apply Malaysia-specific adjustments
            const malaysiaOptimized = this.applyMalaysiaOptimizations(allocation);
            
            // Generate recommendations
            const recommendations = this.generateBudgetRecommendations(malaysiaOptimized);

            return {
                success: true,
                current_allocation: this.getCurrentAllocation(campaigns),
                optimized_allocation: malaysiaOptimized,
                recommendations: recommendations,
                estimated_impact: this.calculateAllocationImpact(malaysiaOptimized, campaignAnalysis),
                implementation_priority: this.prioritizeAllocations(malaysiaOptimized)
            };

        } catch (error) {
            console.error('Error optimizing budget allocation:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Real-time budget pacing optimization
    async optimizeBudgetPacing(campaignId, currentSpend, targetSpend, daysRemaining) {
        const paceRatio = (currentSpend / targetSpend) / ((30 - daysRemaining) / 30);
        const recommendations = [];

        // Pacing analysis
        let pacingStatus = 'on_track';
        let urgency = 'low';

        if (paceRatio < 0.7) {
            pacingStatus = 'under_pacing';
            urgency = 'high';
            recommendations.push({
                type: 'increase_bids',
                adjustment: 1.3,
                reason: 'Significantly under-pacing budget',
                expected_impact: 'Increase daily spend by 30%'
            });
        } else if (paceRatio < 0.85) {
            pacingStatus = 'slightly_under_pacing';
            urgency = 'medium';
            recommendations.push({
                type: 'increase_bids',
                adjustment: 1.15,
                reason: 'Slightly under-pacing budget',
                expected_impact: 'Increase daily spend by 15%'
            });
        } else if (paceRatio > 1.3) {
            pacingStatus = 'over_pacing';
            urgency = 'high';
            recommendations.push({
                type: 'decrease_bids',
                adjustment: 0.75,
                reason: 'Significantly over-pacing budget',
                expected_impact: 'Reduce daily spend by 25%'
            });
        } else if (paceRatio > 1.15) {
            pacingStatus = 'slightly_over_pacing';
            urgency = 'medium';
            recommendations.push({
                type: 'decrease_bids',
                adjustment: 0.9,
                reason: 'Slightly over-pacing budget',
                expected_impact: 'Reduce daily spend by 10%'
            });
        }

        // Malaysia-specific pacing adjustments
        const malaysiaAdjustments = this.getMalaysiaPacingAdjustments();
        recommendations.push(...malaysiaAdjustments);

        return {
            pacing_status: pacingStatus,
            pace_ratio: paceRatio,
            urgency: urgency,
            projected_month_end_spend: currentSpend / ((30 - daysRemaining) / 30),
            recommendations: recommendations,
            auto_adjustments: this.getAutoAdjustments(paceRatio, urgency)
        };
    }

    // Smart bid optimization based on performance
    async optimizeBidStrategy(campaignData, performanceMetrics) {
        const optimizations = [];

        // Performance-based bid adjustments
        const currentROAS = performanceMetrics.roas || 0;
        const targetROAS = campaignData.target_roas || 3.0;

        if (currentROAS > targetROAS * 1.2) {
            // High ROAS - increase bids to capture more volume
            optimizations.push({
                type: 'increase_bids',
                adjustment: 1.2,
                reason: `ROAS (${currentROAS.toFixed(2)}) exceeds target by 20%`,
                confidence: 0.9
            });
        } else if (currentROAS < targetROAS * 0.8) {
            // Low ROAS - decrease bids to improve efficiency
            optimizations.push({
                type: 'decrease_bids',
                adjustment: 0.85,
                reason: `ROAS (${currentROAS.toFixed(2)}) below target by 20%`,
                confidence: 0.85
            });
        }

        // Device performance optimization
        if (performanceMetrics.devices) {
            Object.entries(performanceMetrics.devices).forEach(([device, metrics]) => {
                const deviceROAS = metrics.roas || 0;
                if (deviceROAS > targetROAS * 1.1) {
                    optimizations.push({
                        type: 'increase_device_bids',
                        device: device,
                        adjustment: 1.15,
                        reason: `${device} ROAS (${deviceROAS.toFixed(2)}) above target`,
                        confidence: 0.8
                    });
                }
            });
        }

        // Time-based optimization
        const timeOptimizations = this.getTimeBasedBidOptimizations(performanceMetrics);
        optimizations.push(...timeOptimizations);

        // Location-based optimization for Malaysia
        const locationOptimizations = this.getMalaysiaLocationBidOptimizations(performanceMetrics);
        optimizations.push(...locationOptimizations);

        return {
            optimizations: optimizations,
            estimated_impact: this.calculateBidOptimizationImpact(optimizations),
            implementation_timeline: this.getBidOptimizationTimeline(optimizations)
        };
    }

    // Dynamic budget reallocation during campaigns
    async reallocateBudgetDynamically(campaigns, performanceData) {
        const reallocationPlan = [];
        const totalBudget = campaigns.reduce((sum, camp) => sum + camp.daily_budget, 0);

        // Calculate performance scores
        const campaignScores = campaigns.map(campaign => {
            const performance = performanceData[campaign.id] || {};
            const score = this.calculateCampaignPerformanceScore(campaign, performance);
            return { ...campaign, performance_score: score, performance: performance };
        });

        // Sort by performance
        campaignScores.sort((a, b) => b.performance_score - a.performance_score);

        // Reallocate budget based on performance
        const topPerformers = campaignScores.slice(0, Math.ceil(campaignScores.length * 0.3));
        const underPerformers = campaignScores.slice(-Math.ceil(campaignScores.length * 0.3));

        // Move budget from underperformers to top performers
        let budgetToReallocate = 0;
        
        underPerformers.forEach(campaign => {
            if (campaign.performance_score < 50) {
                const reduction = campaign.daily_budget * 0.2; // Reduce by 20%
                budgetToReallocate += reduction;
                reallocationPlan.push({
                    campaign_id: campaign.id,
                    current_budget: campaign.daily_budget,
                    new_budget: campaign.daily_budget - reduction,
                    change: -reduction,
                    reason: `Low performance score: ${campaign.performance_score.toFixed(1)}`
                });
            }
        });

        // Distribute to top performers
        const budgetPerTopPerformer = budgetToReallocate / topPerformers.length;
        topPerformers.forEach(campaign => {
            if (campaign.performance_score > 75) {
                reallocationPlan.push({
                    campaign_id: campaign.id,
                    current_budget: campaign.daily_budget,
                    new_budget: campaign.daily_budget + budgetPerTopPerformer,
                    change: budgetPerTopPerformer,
                    reason: `High performance score: ${campaign.performance_score.toFixed(1)}`
                });
            }
        });

        return {
            reallocation_plan: reallocationPlan,
            total_budget_moved: budgetToReallocate,
            expected_performance_improvement: this.calculateReallocationImpact(reallocationPlan),
            implementation_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Tomorrow
        };
    }

    // Festival and seasonal budget optimization
    async optimizeForSeasonalEvents(campaigns, upcomingEvents) {
        const seasonalOptimizations = [];

        upcomingEvents.forEach(event => {
            const multiplier = this.malaysiaMarketData.seasonal_multipliers[event.type] || 1.0;
            const relevantCampaigns = campaigns.filter(campaign => 
                this.isCampaignRelevantForEvent(campaign, event)
            );

            relevantCampaigns.forEach(campaign => {
                const budgetIncrease = campaign.daily_budget * (multiplier - 1);
                seasonalOptimizations.push({
                    campaign_id: campaign.id,
                    event: event.name,
                    event_date: event.date,
                    current_budget: campaign.daily_budget,
                    recommended_budget: campaign.daily_budget * multiplier,
                    budget_increase: budgetIncrease,
                    duration_days: event.duration || 7,
                    reason: `${event.name} seasonal boost`,
                    expected_impact: {
                        impressions_increase: `+${((multiplier - 1) * 100).toFixed(0)}%`,
                        clicks_increase: `+${((multiplier * 1.2 - 1) * 100).toFixed(0)}%`,
                        conversions_increase: `+${((multiplier * 1.3 - 1) * 100).toFixed(0)}%`
                    }
                });
            });
        });

        return {
            seasonal_optimizations: seasonalOptimizations,
            total_additional_budget: seasonalOptimizations.reduce((sum, opt) => sum + opt.budget_increase, 0),
            roi_projection: this.calculateSeasonalROI(seasonalOptimizations)
        };
    }

    // Emergency budget controls
    async implementEmergencyBudgetControls(campaigns, alertTriggers) {
        const emergencyActions = [];

        campaigns.forEach(campaign => {
            const performance = campaign.performance || {};
            
            // Emergency pause conditions
            if (performance.roas < this.budgetRules.emergency_pause_threshold) {
                emergencyActions.push({
                    type: 'emergency_pause',
                    campaign_id: campaign.id,
                    reason: `ROAS (${performance.roas}) below emergency threshold`,
                    severity: 'critical',
                    immediate: true
                });
            }

            // Budget cap conditions
            if (performance.daily_spend > campaign.daily_budget * 1.5) {
                emergencyActions.push({
                    type: 'apply_budget_cap',
                    campaign_id: campaign.id,
                    current_spend: performance.daily_spend,
                    budget_cap: campaign.daily_budget,
                    reason: 'Daily spend exceeded budget by 50%',
                    severity: 'high',
                    immediate: true
                });
            }

            // Quality score alerts
            if (performance.quality_score < 5) {
                emergencyActions.push({
                    type: 'reduce_bids',
                    campaign_id: campaign.id,
                    adjustment: 0.7,
                    reason: `Low quality score: ${performance.quality_score}`,
                    severity: 'medium',
                    immediate: false
                });
            }
        });

        return {
            emergency_actions: emergencyActions,
            immediate_actions: emergencyActions.filter(action => action.immediate),
            scheduled_actions: emergencyActions.filter(action => !action.immediate),
            total_budget_protected: this.calculateBudgetProtection(emergencyActions)
        };
    }

    // Helper methods
    analyzeCampaignPerformance(campaigns) {
        return campaigns.map(campaign => {
            const performance = campaign.performance || {};
            return {
                campaign_id: campaign.id,
                performance_score: this.calculateCampaignPerformanceScore(campaign, performance),
                efficiency_score: this.calculateEfficiencyScore(performance),
                growth_potential: this.calculateGrowthPotential(campaign, performance),
                risk_level: this.calculateRiskLevel(performance)
            };
        });
    }

    calculateOptimalAllocation(totalBudget, campaignAnalysis) {
        const allocation = {};
        
        // Calculate total performance score
        const totalScore = campaignAnalysis.reduce((sum, analysis) => sum + analysis.performance_score, 0);
        
        // Allocate based on performance scores
        campaignAnalysis.forEach(analysis => {
            const baseAllocation = (analysis.performance_score / totalScore) * totalBudget;
            
            // Apply growth potential multiplier
            const growthMultiplier = 1 + (analysis.growth_potential * 0.2);
            
            // Apply risk adjustment
            const riskAdjustment = 1 - (analysis.risk_level * 0.1);
            
            allocation[analysis.campaign_id] = baseAllocation * growthMultiplier * riskAdjustment;
        });

        return allocation;
    }

    applyMalaysiaOptimizations(allocation) {
        // Apply state-based cost multipliers
        const optimized = { ...allocation };
        
        Object.keys(optimized).forEach(campaignId => {
            // This would be enhanced with actual campaign location data
            const stateMultiplier = 1.1; // Average Malaysia multiplier
            optimized[campaignId] *= stateMultiplier;
        });

        return optimized;
    }

    calculateCampaignPerformanceScore(campaign, performance) {
        let score = 0;

        // ROAS component (40% weight)
        const roas = performance.roas || 0;
        score += Math.min(roas * 10, 40);

        // CTR component (25% weight)
        const ctr = performance.ctr || 0;
        score += Math.min(ctr * 625, 25); // 4% CTR = 25 points

        // Conversion rate component (25% weight)
        const conversionRate = performance.conversion_rate || 0;
        score += Math.min(conversionRate * 833, 25); // 3% conversion rate = 25 points

        // Cost efficiency component (10% weight)
        const targetCPA = campaign.target_cpa || 5;
        const actualCPA = performance.cpa || targetCPA;
        const efficiencyScore = Math.max(0, (targetCPA - actualCPA) / targetCPA) * 10;
        score += efficiencyScore;

        return Math.min(score, 100);
    }

    calculateEfficiencyScore(performance) {
        const cpc = performance.cpc || 0.15;
        const ctr = performance.ctr || 0.03;
        const conversionRate = performance.conversion_rate || 0.025;
        
        // Lower CPC, higher CTR and conversion rate = higher efficiency
        const efficiency = (ctr * conversionRate) / cpc;
        return Math.min(efficiency * 1000, 100); // Normalize to 0-100
    }

    calculateGrowthPotential(campaign, performance) {
        let potential = 0;

        // Budget utilization
        const budgetUtilization = (performance.daily_spend || 0) / campaign.daily_budget;
        if (budgetUtilization > 0.9) potential += 0.3; // High utilization = growth potential

        // Impression share
        const impressionShare = performance.impression_share || 0.5;
        if (impressionShare < 0.8) potential += 0.4; // Room for growth

        // Quality score
        const qualityScore = performance.quality_score || 7;
        if (qualityScore > 8) potential += 0.3; // High quality = growth potential

        return Math.min(potential, 1.0);
    }

    calculateRiskLevel(performance) {
        let risk = 0;

        // Low ROAS = high risk
        const roas = performance.roas || 0;
        if (roas < 2.0) risk += 0.4;

        // High CPA = high risk
        const cpa = performance.cpa || 0;
        if (cpa > 8) risk += 0.3;

        // Low quality score = high risk
        const qualityScore = performance.quality_score || 7;
        if (qualityScore < 6) risk += 0.3;

        return Math.min(risk, 1.0);
    }

    getMalaysiaPacingAdjustments() {
        const adjustments = [];
        const currentHour = new Date().getHours();
        const currentDay = new Date().getDay();

        // Peak hours adjustment (7-9 PM Malaysia time)
        if ([19, 20, 21].includes(currentHour)) {
            adjustments.push({
                type: 'peak_hour_boost',
                adjustment: 1.15,
                reason: 'Peak engagement hours in Malaysia',
                expected_impact: 'Increase spend during high-conversion hours'
            });
        }

        // Weekend adjustment
        if ([0, 6].includes(currentDay)) {
            adjustments.push({
                type: 'weekend_adjustment',
                adjustment: 0.9,
                reason: 'Lower weekend engagement in Malaysia',
                expected_impact: 'Reduce spend during lower-activity periods'
            });
        }

        return adjustments;
    }

    getTimeBasedBidOptimizations(performanceMetrics) {
        const optimizations = [];
        const hourlyPerformance = performanceMetrics.hourly_performance || {};

        // Identify best performing hours
        const bestHours = Object.entries(hourlyPerformance)
            .sort(([,a], [,b]) => b.conversion_rate - a.conversion_rate)
            .slice(0, 3);

        bestHours.forEach(([hour, metrics]) => {
            if (metrics.conversion_rate > (performanceMetrics.conversion_rate || 0.03) * 1.2) {
                optimizations.push({
                    type: 'increase_hour_bids',
                    hour: parseInt(hour),
                    adjustment: 1.2,
                    reason: `High conversion rate at ${hour}:00 (${(metrics.conversion_rate * 100).toFixed(2)}%)`,
                    confidence: 0.8
                });
            }
        });

        return optimizations;
    }

    getMalaysiaLocationBidOptimizations(performanceMetrics) {
        const optimizations = [];
        const locationPerformance = performanceMetrics.location_performance || {};

        Object.entries(locationPerformance).forEach(([state, metrics]) => {
            const stateMultiplier = this.malaysiaMarketData.state_cost_multipliers[state] || 1.0;
            const performanceMultiplier = metrics.conversion_rate / (performanceMetrics.conversion_rate || 0.03);

            if (performanceMultiplier > 1.2) {
                optimizations.push({
                    type: 'increase_location_bids',
                    location: state,
                    adjustment: Math.min(1.3, stateMultiplier * performanceMultiplier),
                    reason: `Strong performance in ${state}`,
                    confidence: 0.75
                });
            }
        });

        return optimizations;
    }

    isCampaignRelevantForEvent(campaign, event) {
        // Check if campaign targets relevant audiences for the event
        const eventAudienceMap = {
            'deepavali': ['tamil_community', 'hindu_community'],
            'chinese_new_year': ['chinese_community'],
            'hari_raya': ['malay_community', 'muslim_community']
        };

        const relevantAudiences = eventAudienceMap[event.type] || [];
        return campaign.audiences?.some(audience => 
            relevantAudiences.some(relevant => audience.name.toLowerCase().includes(relevant))
        ) || false;
    }

    // Additional helper methods for calculations
    getCurrentAllocation(campaigns) {
        const allocation = {};
        campaigns.forEach(campaign => {
            allocation[campaign.id] = campaign.daily_budget;
        });
        return allocation;
    }

    generateBudgetRecommendations(allocation) {
        return [
            'Monitor performance daily during first week of new allocation',
            'Adjust bids gradually to avoid learning phase disruption',
            'Focus additional budget on Malaysia peak hours (7-9 PM)',
            'Consider festival-specific budget increases for relevant campaigns'
        ];
    }

    calculateAllocationImpact(allocation, analysis) {
        return {
            estimated_roas_improvement: '15-25%',
            estimated_cost_reduction: '10-20%',
            estimated_conversion_increase: '20-30%'
        };
    }

    prioritizeAllocations(allocation) {
        return Object.entries(allocation)
            .sort(([,a], [,b]) => b - a)
            .map(([campaignId, budget]) => ({
                campaign_id: campaignId,
                budget: budget,
                priority: budget > 100 ? 'high' : budget > 50 ? 'medium' : 'low'
            }));
    }

    getAutoAdjustments(paceRatio, urgency) {
        if (urgency === 'high') {
            return {
                enabled: true,
                max_adjustment: 0.3, // 30% max auto adjustment
                frequency: 'hourly'
            };
        }
        return {
            enabled: false,
            reason: 'Manual review recommended for non-urgent adjustments'
        };
    }

    calculateBudgetProtection(emergencyActions) {
        return emergencyActions
            .filter(action => action.type === 'apply_budget_cap')
            .reduce((sum, action) => sum + (action.current_spend - action.budget_cap), 0);
    }
}

module.exports = BudgetOptimizationService;
