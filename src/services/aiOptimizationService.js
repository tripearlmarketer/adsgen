class AIOptimizationService {
    constructor() {
        this.malaysiaMarketData = {
            peak_hours: [19, 20, 21], // 7-9 PM Malaysia time
            festivals: {
                deepavali: { month: 10, boost: 1.4 },
                chinese_new_year: { month: 2, boost: 1.5 },
                hari_raya: { month: 5, boost: 1.3 },
                christmas: { month: 12, boost: 1.2 }
            },
            demographics: {
                smoking_cessation: {
                    primary_age: [25, 45],
                    peak_devices: ['mobile'],
                    preferred_languages: ['bahasa_malaysia', 'english']
                },
                health_supplements: {
                    primary_age: [30, 55],
                    peak_devices: ['mobile', 'desktop'],
                    preferred_languages: ['english', 'chinese']
                }
            }
        };
    }

    // AI-powered bid optimization
    async optimizeBids(campaignData, performanceMetrics) {
        const optimizations = [];

        // Time-based optimization
        const currentHour = new Date().getHours();
        if (this.malaysiaMarketData.peak_hours.includes(currentHour)) {
            optimizations.push({
                type: 'bid_adjustment',
                target: 'time_of_day',
                adjustment: 1.15,
                reason: 'Peak engagement hours in Malaysia (7-9 PM)',
                confidence: 0.85
            });
        }

        // Device performance optimization
        const mobilePerformance = performanceMetrics.devices?.mobile?.ctr || 0;
        const desktopPerformance = performanceMetrics.devices?.desktop?.ctr || 0;
        
        if (mobilePerformance > desktopPerformance * 1.2) {
            optimizations.push({
                type: 'bid_adjustment',
                target: 'mobile_devices',
                adjustment: 1.2,
                reason: 'Mobile shows 20%+ higher engagement',
                confidence: 0.9
            });
        }

        // Festival optimization
        const currentMonth = new Date().getMonth() + 1;
        const activeFestival = Object.entries(this.malaysiaMarketData.festivals)
            .find(([name, data]) => data.month === currentMonth);
        
        if (activeFestival) {
            optimizations.push({
                type: 'bid_adjustment',
                target: 'festival_period',
                adjustment: activeFestival[1].boost,
                reason: `${activeFestival[0]} festival period - increased demand`,
                confidence: 0.8
            });
        }

        // Audience performance optimization
        if (performanceMetrics.audiences) {
            const topAudience = Object.entries(performanceMetrics.audiences)
                .sort(([,a], [,b]) => b.conversion_rate - a.conversion_rate)[0];
            
            if (topAudience && topAudience[1].conversion_rate > 0.05) {
                optimizations.push({
                    type: 'budget_reallocation',
                    target: topAudience[0],
                    adjustment: 1.3,
                    reason: `High converting audience: ${(topAudience[1].conversion_rate * 100).toFixed(1)}% conversion rate`,
                    confidence: 0.95
                });
            }
        }

        return {
            optimizations: optimizations,
            estimated_impact: this.calculateEstimatedImpact(optimizations),
            implementation_priority: this.prioritizeOptimizations(optimizations)
        };
    }

    // Smart audience expansion
    async expandAudiences(baseAudience, performanceData) {
        const expansions = [];

        // Lookalike expansion based on converters
        if (performanceData.conversions > 10) {
            expansions.push({
                type: 'lookalike',
                source: 'converters',
                similarity: 0.8,
                size_multiplier: 2.5,
                reason: 'Sufficient conversion data for lookalike modeling',
                expected_performance: 0.7 // 70% of source audience performance
            });
        }

        // Interest expansion for Malaysia market
        const malaysiaInterests = this.getMalaysiaSpecificInterests(baseAudience.category);
        expansions.push({
            type: 'interest_expansion',
            interests: malaysiaInterests,
            reason: 'Malaysia-specific interest targeting',
            expected_performance: 0.6
        });

        // Demographic expansion
        if (performanceData.age_groups) {
            const bestAge = Object.entries(performanceData.age_groups)
                .sort(([,a], [,b]) => b.ctr - a.ctr)[0];
            
            if (bestAge) {
                expansions.push({
                    type: 'demographic_expansion',
                    target_age: this.expandAgeRange(bestAge[0]),
                    reason: `Expanding from high-performing age group: ${bestAge[0]}`,
                    expected_performance: 0.8
                });
            }
        }

        return expansions;
    }

    // Creative performance analysis
    async analyzeCreativePerformance(creatives) {
        const analysis = creatives.map(creative => {
            const score = this.calculateCreativeScore(creative);
            const recommendations = this.generateCreativeRecommendations(creative);
            
            return {
                creative_id: creative.id,
                performance_score: score,
                recommendations: recommendations,
                optimization_potential: this.assessOptimizationPotential(creative),
                malaysia_relevance: this.assessMalaysiaRelevance(creative)
            };
        });

        return {
            creative_analysis: analysis,
            top_performers: analysis.filter(c => c.performance_score > 80),
            optimization_candidates: analysis.filter(c => c.optimization_potential > 0.6),
            malaysia_optimized: analysis.filter(c => c.malaysia_relevance > 0.7)
        };
    }

    // Budget pacing optimization
    async optimizeBudgetPacing(campaignBudget, currentSpend, daysRemaining) {
        const dailyBudget = campaignBudget / 30; // Monthly budget
        const currentDailySpend = currentSpend / (30 - daysRemaining);
        const paceRatio = currentDailySpend / dailyBudget;

        let recommendations = [];

        if (paceRatio < 0.8) {
            recommendations.push({
                type: 'increase_bids',
                adjustment: 1.2,
                reason: 'Under-pacing budget - increase bids to capture more traffic',
                urgency: 'medium'
            });
        } else if (paceRatio > 1.2) {
            recommendations.push({
                type: 'decrease_bids',
                adjustment: 0.85,
                reason: 'Over-pacing budget - reduce bids to control spend',
                urgency: 'high'
            });
        }

        // Weekend optimization for Malaysia
        const isWeekend = [0, 6].includes(new Date().getDay());
        if (isWeekend && paceRatio > 1.0) {
            recommendations.push({
                type: 'weekend_adjustment',
                adjustment: 0.9,
                reason: 'Weekend traffic typically lower in Malaysia - reduce bids',
                urgency: 'low'
            });
        }

        return {
            current_pace: paceRatio,
            status: this.getPacingStatus(paceRatio),
            recommendations: recommendations,
            projected_month_end_spend: currentDailySpend * 30
        };
    }

    // Malaysia-specific interest mapping
    getMalaysiaSpecificInterests(category) {
        const interestMap = {
            smoking_cessation: [
                'Health & Fitness',
                'Medical Health',
                'Wellness',
                'Quit Smoking',
                'Nicotine Replacement',
                'Malaysian Health Ministry',
                'Kesihatan Malaysia'
            ],
            health_supplements: [
                'Vitamins & Supplements',
                'Nutrition',
                'Wellness Products',
                'Traditional Medicine',
                'Herbal Remedies',
                'Malaysian Traditional Medicine',
                'Jamu Malaysia'
            ],
            outdoor_workers: [
                'Construction',
                'Agriculture',
                'Transportation',
                'Security Services',
                'Delivery Services',
                'Malaysian Workers',
                'Pekerja Malaysia'
            ]
        };

        return interestMap[category] || [];
    }

    // Calculate creative performance score
    calculateCreativeScore(creative) {
        let score = 0;

        // CTR component (40% weight)
        const ctrScore = Math.min(creative.ctr * 1000, 40); // Max 40 points
        score += ctrScore;

        // Conversion rate component (35% weight)
        const conversionScore = Math.min(creative.conversion_rate * 700, 35); // Max 35 points
        score += conversionScore;

        // Engagement component (15% weight)
        const engagementScore = Math.min(creative.engagement_rate * 150, 15); // Max 15 points
        score += engagementScore;

        // Malaysia relevance component (10% weight)
        const malaysiaScore = this.assessMalaysiaRelevance(creative) * 10;
        score += malaysiaScore;

        return Math.round(score);
    }

    // Assess Malaysia market relevance
    assessMalaysiaRelevance(creative) {
        let relevanceScore = 0;

        // Language relevance
        if (creative.text?.includes('Malaysia') || creative.text?.includes('Malaysian')) {
            relevanceScore += 0.3;
        }

        // Local language usage
        const malaysianWords = ['kesihatan', 'sihat', 'berhenti', 'merokok', 'supplement', 'vitamin'];
        const hasLocalWords = malaysianWords.some(word => 
            creative.text?.toLowerCase().includes(word)
        );
        if (hasLocalWords) relevanceScore += 0.4;

        // Cultural elements
        if (creative.image_tags?.includes('festival') || 
            creative.image_tags?.includes('traditional')) {
            relevanceScore += 0.3;
        }

        return Math.min(relevanceScore, 1.0);
    }

    // Generate creative recommendations
    generateCreativeRecommendations(creative) {
        const recommendations = [];

        if (creative.ctr < 0.02) {
            recommendations.push({
                type: 'improve_headline',
                suggestion: 'Test more compelling headlines with local Malaysian context',
                priority: 'high'
            });
        }

        if (creative.conversion_rate < 0.03) {
            recommendations.push({
                type: 'improve_cta',
                suggestion: 'Use stronger call-to-action in local language',
                priority: 'medium'
            });
        }

        if (this.assessMalaysiaRelevance(creative) < 0.5) {
            recommendations.push({
                type: 'localize_content',
                suggestion: 'Add Malaysian cultural elements or local language',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    // Calculate estimated impact of optimizations
    calculateEstimatedImpact(optimizations) {
        let totalImpact = 0;
        
        optimizations.forEach(opt => {
            const impact = (opt.adjustment - 1) * opt.confidence;
            totalImpact += Math.abs(impact);
        });

        return {
            estimated_ctr_improvement: totalImpact * 0.15, // 15% of total impact
            estimated_cost_reduction: totalImpact * 0.10,  // 10% cost reduction
            estimated_conversion_improvement: totalImpact * 0.20, // 20% conversion improvement
            confidence_level: optimizations.reduce((acc, opt) => acc + opt.confidence, 0) / optimizations.length
        };
    }

    // Prioritize optimizations by impact and ease
    prioritizeOptimizations(optimizations) {
        return optimizations
            .map(opt => ({
                ...opt,
                priority_score: opt.confidence * Math.abs(opt.adjustment - 1) * 100
            }))
            .sort((a, b) => b.priority_score - a.priority_score)
            .map(opt => ({
                optimization: opt,
                priority: opt.priority_score > 15 ? 'high' : opt.priority_score > 8 ? 'medium' : 'low'
            }));
    }

    // Get pacing status
    getPacingStatus(paceRatio) {
        if (paceRatio < 0.8) return 'under_pacing';
        if (paceRatio > 1.2) return 'over_pacing';
        return 'on_pace';
    }

    // Expand age range intelligently
    expandAgeRange(bestAgeGroup) {
        const ageRanges = {
            '18-24': ['18-34'],
            '25-34': ['18-44', '25-44'],
            '35-44': ['25-54', '35-54'],
            '45-54': ['35-64', '45-64'],
            '55-64': ['45-65+', '55-65+'],
            '65+': ['55-65+']
        };

        return ageRanges[bestAgeGroup] || [bestAgeGroup];
    }

    // Assess optimization potential
    assessOptimizationPotential(creative) {
        let potential = 0;

        // Low CTR = high optimization potential
        if (creative.ctr < 0.025) potential += 0.4;
        
        // Low conversion rate = high optimization potential
        if (creative.conversion_rate < 0.03) potential += 0.3;
        
        // Low Malaysia relevance = optimization opportunity
        if (this.assessMalaysiaRelevance(creative) < 0.6) potential += 0.3;

        return Math.min(potential, 1.0);
    }
}

module.exports = AIOptimizationService;
