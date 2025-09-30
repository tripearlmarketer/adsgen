class PerformanceTrackingService {
    constructor() {
        this.kpiDefinitions = {
            primary_kpis: {
                roas: { target: 3.0, weight: 0.3, format: 'ratio' },
                cpa: { target: 5.0, weight: 0.25, format: 'currency' },
                conversion_rate: { target: 0.03, weight: 0.2, format: 'percentage' },
                ctr: { target: 0.035, weight: 0.15, format: 'percentage' },
                quality_score: { target: 8.0, weight: 0.1, format: 'score' }
            },
            malaysia_kpis: {
                local_language_performance: { weight: 0.15 },
                festival_period_boost: { weight: 0.1 },
                state_performance_variance: { weight: 0.1 },
                peak_hour_optimization: { weight: 0.1 }
            }
        };

        this.benchmarks = {
            industry_benchmarks: {
                'smoking_cessation': {
                    avg_ctr: 0.032,
                    avg_conversion_rate: 0.025,
                    avg_cpc: 0.15,
                    avg_roas: 2.8
                },
                'health_supplements': {
                    avg_ctr: 0.028,
                    avg_conversion_rate: 0.022,
                    avg_cpc: 0.12,
                    avg_roas: 3.2
                },
                'medical_services': {
                    avg_ctr: 0.025,
                    avg_conversion_rate: 0.018,
                    avg_cpc: 0.18,
                    avg_roas: 2.5
                }
            },
            malaysia_benchmarks: {
                mobile_traffic_share: 0.75,
                peak_hour_performance_boost: 1.2,
                weekend_performance_drop: 0.85,
                festival_performance_boost: 1.4
            }
        };
    }

    // Track comprehensive campaign performance
    async trackCampaignPerformance(campaignId, timeRange = '30d') {
        try {
            // Fetch performance data
            const performanceData = await this.fetchPerformanceData(campaignId, timeRange);
            const historicalData = await this.fetchHistoricalComparison(campaignId, timeRange);
            
            // Calculate KPI scores
            const kpiScores = this.calculateKPIScores(performanceData);
            
            // Malaysia-specific performance analysis
            const malaysiaAnalysis = this.analyzeMalaysiaPerformance(performanceData);
            
            // Trend analysis
            const trendAnalysis = this.analyzeTrends(performanceData, historicalData);
            
            // Performance insights
            const insights = this.generatePerformanceInsights(performanceData, kpiScores, malaysiaAnalysis);
            
            // Optimization opportunities
            const opportunities = this.identifyOptimizationOpportunities(performanceData, kpiScores);

            return {
                campaign_id: campaignId,
                time_range: timeRange,
                overall_score: this.calculateOverallPerformanceScore(kpiScores),
                kpi_breakdown: kpiScores,
                malaysia_performance: malaysiaAnalysis,
                trend_analysis: trendAnalysis,
                performance_insights: insights,
                optimization_opportunities: opportunities,
                benchmark_comparison: this.compareToBenchmarks(performanceData),
                next_review_date: this.calculateNextReviewDate(kpiScores.overall_score)
            };

        } catch (error) {
            console.error('Error tracking campaign performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Advanced audience performance tracking
    async trackAudiencePerformance(campaignId, audienceSegments) {
        try {
            const audiencePerformance = [];

            for (const audience of audienceSegments) {
                const metrics = await this.fetchAudienceMetrics(campaignId, audience.id);
                const analysis = this.analyzeAudienceMetrics(metrics, audience);
                
                audiencePerformance.push({
                    audience_id: audience.id,
                    audience_name: audience.name,
                    audience_type: audience.type,
                    performance_score: this.calculateAudienceScore(analysis),
                    metrics: metrics,
                    analysis: analysis,
                    recommendations: this.generateAudienceRecommendations(analysis),
                    malaysia_relevance: this.assessMalaysiaRelevance(audience, metrics)
                });
            }

            // Rank audiences by performance
            audiencePerformance.sort((a, b) => b.performance_score - a.performance_score);

            return {
                campaign_id: campaignId,
                audience_count: audiencePerformance.length,
                top_performers: audiencePerformance.slice(0, 3),
                underperformers: audiencePerformance.filter(aud => aud.performance_score < 60),
                audience_insights: this.generateAudienceInsights(audiencePerformance),
                reallocation_recommendations: this.generateReallocationRecommendations(audiencePerformance)
            };

        } catch (error) {
            console.error('Error tracking audience performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Creative performance tracking
    async trackCreativePerformance(campaignId, creativeAssets) {
        try {
            const creativePerformance = [];

            for (const creative of creativeAssets) {
                const metrics = await this.fetchCreativeMetrics(campaignId, creative.id);
                const analysis = this.analyzeCreativePerformance(metrics, creative);
                
                creativePerformance.push({
                    creative_id: creative.id,
                    creative_name: creative.name,
                    creative_type: creative.type,
                    performance_score: this.calculateCreativeScore(analysis),
                    metrics: metrics,
                    analysis: analysis,
                    malaysia_optimization: this.assessCreativeMalaysiaOptimization(creative, metrics),
                    improvement_suggestions: this.generateCreativeImprovements(analysis)
                });
            }

            // A/B testing insights
            const abTestInsights = this.generateABTestInsights(creativePerformance);
            
            // Creative optimization recommendations
            const optimizationPlan = this.generateCreativeOptimizationPlan(creativePerformance);

            return {
                campaign_id: campaignId,
                creative_count: creativePerformance.length,
                top_performing_creatives: creativePerformance
                    .sort((a, b) => b.performance_score - a.performance_score)
                    .slice(0, 5),
                ab_test_insights: abTestInsights,
                optimization_plan: optimizationPlan,
                creative_recommendations: this.generateCreativeRecommendations(creativePerformance)
            };

        } catch (error) {
            console.error('Error tracking creative performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Geographic performance tracking (Malaysia focus)
    async trackGeographicPerformance(campaignId) {
        try {
            const geoData = await this.fetchGeographicData(campaignId);
            const malaysiaStates = [
                'kuala_lumpur', 'selangor', 'penang', 'johor', 'perak', 
                'sabah', 'sarawak', 'kedah', 'kelantan', 'terengganu',
                'pahang', 'negeri_sembilan', 'melaka', 'perlis'
            ];

            const statePerformance = malaysiaStates.map(state => {
                const stateData = geoData.states[state] || {};
                return {
                    state: state,
                    state_name: this.getStateName(state),
                    impressions: stateData.impressions || 0,
                    clicks: stateData.clicks || 0,
                    conversions: stateData.conversions || 0,
                    cost: stateData.cost || 0,
                    ctr: stateData.ctr || 0,
                    conversion_rate: stateData.conversion_rate || 0,
                    cpc: stateData.cpc || 0,
                    roas: stateData.roas || 0,
                    performance_score: this.calculateStatePerformanceScore(stateData),
                    market_potential: this.assessStateMarketPotential(state, stateData)
                };
            });

            // Sort by performance
            statePerformance.sort((a, b) => b.performance_score - a.performance_score);

            return {
                campaign_id: campaignId,
                top_performing_states: statePerformance.slice(0, 5),
                underperforming_states: statePerformance.filter(state => state.performance_score < 50),
                geographic_insights: this.generateGeographicInsights(statePerformance),
                expansion_opportunities: this.identifyExpansionOpportunities(statePerformance),
                bid_adjustment_recommendations: this.generateGeoBidRecommendations(statePerformance)
            };

        } catch (error) {
            console.error('Error tracking geographic performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Time-based performance tracking
    async trackTimeBasedPerformance(campaignId, timeGranularity = 'hourly') {
        try {
            const timeData = await this.fetchTimeBasedData(campaignId, timeGranularity);
            
            // Analyze hourly patterns
            const hourlyAnalysis = this.analyzeHourlyPatterns(timeData.hourly);
            
            // Analyze daily patterns
            const dailyAnalysis = this.analyzeDailyPatterns(timeData.daily);
            
            // Malaysia-specific time insights
            const malaysiaTimeInsights = this.analyzeMalaysiaTimePatterns(timeData);
            
            // Dayparting recommendations
            const daypartingRecommendations = this.generateDaypartingRecommendations(
                hourlyAnalysis, 
                dailyAnalysis, 
                malaysiaTimeInsights
            );

            return {
                campaign_id: campaignId,
                hourly_analysis: hourlyAnalysis,
                daily_analysis: dailyAnalysis,
                malaysia_time_insights: malaysiaTimeInsights,
                peak_performance_hours: this.identifyPeakHours(hourlyAnalysis),
                optimal_schedule: this.generateOptimalSchedule(hourlyAnalysis, dailyAnalysis),
                dayparting_recommendations: daypartingRecommendations,
                estimated_improvement: this.estimateScheduleOptimizationImpact(daypartingRecommendations)
            };

        } catch (error) {
            console.error('Error tracking time-based performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Device performance tracking
    async trackDevicePerformance(campaignId) {
        try {
            const deviceData = await this.fetchDeviceData(campaignId);
            const devices = ['mobile', 'desktop', 'tablet'];
            
            const devicePerformance = devices.map(device => {
                const data = deviceData[device] || {};
                return {
                    device: device,
                    impressions: data.impressions || 0,
                    clicks: data.clicks || 0,
                    conversions: data.conversions || 0,
                    cost: data.cost || 0,
                    ctr: data.ctr || 0,
                    conversion_rate: data.conversion_rate || 0,
                    cpc: data.cpc || 0,
                    roas: data.roas || 0,
                    performance_score: this.calculateDevicePerformanceScore(data),
                    malaysia_benchmark: this.getMalaysiaDeviceBenchmark(device)
                };
            });

            // Malaysia mobile-first insights
            const mobileInsights = this.analyzeMobilePerfomance(devicePerformance[0]); // Mobile is first
            
            return {
                campaign_id: campaignId,
                device_performance: devicePerformance,
                mobile_insights: mobileInsights,
                device_recommendations: this.generateDeviceRecommendations(devicePerformance),
                bid_adjustments: this.calculateDeviceBidAdjustments(devicePerformance),
                malaysia_mobile_optimization: this.generateMalaysiaMobileOptimization(mobileInsights)
            };

        } catch (error) {
            console.error('Error tracking device performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Calculate KPI scores
    calculateKPIScores(performanceData) {
        const scores = {};
        
        Object.entries(this.kpiDefinitions.primary_kpis).forEach(([kpi, definition]) => {
            const actualValue = performanceData[kpi] || 0;
            const targetValue = definition.target;
            
            let score = 0;
            if (kpi === 'cpa') {
                // Lower is better for CPA
                score = Math.max(0, Math.min(100, (targetValue / actualValue) * 100));
            } else {
                // Higher is better for other KPIs
                score = Math.max(0, Math.min(100, (actualValue / targetValue) * 100));
            }
            
            scores[kpi] = {
                actual: actualValue,
                target: targetValue,
                score: score,
                weight: definition.weight,
                weighted_score: score * definition.weight
            };
        });

        // Calculate overall score
        const totalWeightedScore = Object.values(scores).reduce((sum, kpi) => sum + kpi.weighted_score, 0);
        const totalWeight = Object.values(this.kpiDefinitions.primary_kpis).reduce((sum, def) => sum + def.weight, 0);
        
        scores.overall_score = totalWeightedScore / totalWeight;
        
        return scores;
    }

    // Analyze Malaysia-specific performance
    analyzeMalaysiaPerformance(performanceData) {
        const analysis = {
            language_performance: {},
            festival_impact: {},
            cultural_relevance: {},
            local_market_insights: {}
        };

        // Language performance analysis
        if (performanceData.language_breakdown) {
            Object.entries(performanceData.language_breakdown).forEach(([language, metrics]) => {
                analysis.language_performance[language] = {
                    ...metrics,
                    performance_index: this.calculateLanguagePerformanceIndex(metrics, language),
                    recommendation: this.getLanguageRecommendation(metrics, language)
                };
            });
        }

        // Festival impact analysis
        if (performanceData.festival_periods) {
            Object.entries(performanceData.festival_periods).forEach(([festival, metrics]) => {
                analysis.festival_impact[festival] = {
                    ...metrics,
                    boost_factor: metrics.conversion_rate / performanceData.baseline_conversion_rate,
                    roi_impact: this.calculateFestivalROIImpact(metrics)
                };
            });
        }

        // Cultural relevance scoring
        analysis.cultural_relevance = {
            local_content_score: this.assessLocalContentRelevance(performanceData),
            cultural_sensitivity_score: this.assessCulturalSensitivity(performanceData),
            market_fit_score: this.assessMarketFit(performanceData)
        };

        return analysis;
    }

    // Generate performance insights
    generatePerformanceInsights(performanceData, kpiScores, malaysiaAnalysis) {
        const insights = [];

        // Overall performance insights
        if (kpiScores.overall_score > 80) {
            insights.push({
                type: 'success',
                category: 'overall_performance',
                message: 'Campaign performing excellently across all KPIs',
                recommendation: 'Consider scaling budget and expanding reach',
                impact: 'high'
            });
        } else if (kpiScores.overall_score < 60) {
            insights.push({
                type: 'warning',
                category: 'overall_performance',
                message: 'Campaign underperforming on key metrics',
                recommendation: 'Review targeting, creatives, and bid strategy',
                impact: 'high'
            });
        }

        // KPI-specific insights
        Object.entries(kpiScores).forEach(([kpi, data]) => {
            if (kpi !== 'overall_score' && data.score < 70) {
                insights.push({
                    type: 'improvement',
                    category: kpi,
                    message: `${kpi.toUpperCase()} below target: ${data.actual} vs ${data.target}`,
                    recommendation: this.getKPIImprovementRecommendation(kpi, data),
                    impact: 'medium'
                });
            }
        });

        // Malaysia-specific insights
        if (malaysiaAnalysis.language_performance) {
            const topLanguage = Object.entries(malaysiaAnalysis.language_performance)
                .sort(([,a], [,b]) => b.performance_index - a.performance_index)[0];
            
            if (topLanguage) {
                insights.push({
                    type: 'opportunity',
                    category: 'malaysia_optimization',
                    message: `${topLanguage[0]} showing strong performance`,
                    recommendation: `Increase budget allocation for ${topLanguage[0]} campaigns`,
                    impact: 'medium'
                });
            }
        }

        return insights;
    }

    // Identify optimization opportunities
    identifyOptimizationOpportunities(performanceData, kpiScores) {
        const opportunities = [];

        // Budget optimization opportunities
        if (performanceData.impression_share < 0.7 && kpiScores.roas?.score > 80) {
            opportunities.push({
                type: 'budget_increase',
                priority: 'high',
                description: 'High ROAS with low impression share',
                action: 'Increase daily budget by 30-50%',
                estimated_impact: '+25% conversions',
                confidence: 0.85
            });
        }

        // Bid optimization opportunities
        if (kpiScores.cpc?.actual < kpiScores.cpc?.target * 0.8 && performanceData.impression_share < 0.6) {
            opportunities.push({
                type: 'bid_increase',
                priority: 'medium',
                description: 'Low CPC with room for impression share growth',
                action: 'Increase bids by 15-20%',
                estimated_impact: '+15% impressions',
                confidence: 0.75
            });
        }

        // Audience expansion opportunities
        if (performanceData.audience_saturation > 0.8) {
            opportunities.push({
                type: 'audience_expansion',
                priority: 'medium',
                description: 'High audience saturation detected',
                action: 'Create lookalike audiences or expand interests',
                estimated_impact: '+20% reach',
                confidence: 0.70
            });
        }

        // Malaysia-specific opportunities
        const currentMonth = new Date().getMonth() + 1;
        const upcomingFestivals = this.getUpcomingFestivals(currentMonth);
        if (upcomingFestivals.length > 0) {
            opportunities.push({
                type: 'seasonal_optimization',
                priority: 'high',
                description: `Upcoming festival: ${upcomingFestivals[0]}`,
                action: 'Prepare festival-specific campaigns and increase budget',
                estimated_impact: '+40% conversions during festival period',
                confidence: 0.80
            });
        }

        return opportunities.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    // Helper methods
    calculateOverallPerformanceScore(kpiScores) {
        return kpiScores.overall_score || 0;
    }

    compareToBenchmarks(performanceData) {
        // This would compare against industry and Malaysia benchmarks
        return {
            vs_industry: 'above_average',
            vs_malaysia_market: 'excellent',
            key_differentiators: ['Higher CTR', 'Better conversion rate', 'Lower CPC']
        };
    }

    calculateNextReviewDate(overallScore) {
        const daysUntilReview = overallScore > 80 ? 7 : overallScore > 60 ? 3 : 1;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + daysUntilReview);
        return nextReview.toISOString();
    }

    getStateName(stateCode) {
        const stateNames = {
            'kuala_lumpur': 'Kuala Lumpur',
            'selangor': 'Selangor',
            'penang': 'Penang',
            'johor': 'Johor',
            'perak': 'Perak',
            'sabah': 'Sabah',
            'sarawak': 'Sarawak',
            'kedah': 'Kedah',
            'kelantan': 'Kelantan',
            'terengganu': 'Terengganu',
            'pahang': 'Pahang',
            'negeri_sembilan': 'Negeri Sembilan',
            'melaka': 'Melaka',
            'perlis': 'Perlis'
        };
        return stateNames[stateCode] || stateCode;
    }

    calculateLanguagePerformanceIndex(metrics, language) {
        const baseScore = (metrics.ctr * 0.4) + (metrics.conversion_rate * 0.6);
        const languageMultiplier = {
            'bahasa_malaysia': 1.15,
            'english': 1.0,
            'chinese': 1.08,
            'tamil': 1.12
        };
        return baseScore * (languageMultiplier[language] || 1.0);
    }

    getKPIImprovementRecommendation(kpi, data) {
        const recommendations = {
            'roas': 'Optimize bids, improve landing pages, or refine targeting',
            'cpa': 'Increase bids for high-converting keywords, improve quality score',
            'conversion_rate': 'A/B test landing pages, improve ad relevance',
            'ctr': 'Test new ad copy, improve ad extensions, refine targeting',
            'quality_score': 'Improve ad relevance, optimize landing page experience'
        };
        return recommendations[kpi] || 'Review and optimize campaign settings';
    }

    getUpcomingFestivals(currentMonth) {
        const festivals = {
            2: ['Chinese New Year'],
            5: ['Hari Raya'],
            10: ['Deepavali'],
            12: ['Christmas']
        };
        return festivals[currentMonth] || [];
    }

    // Placeholder methods for data fetching
    async fetchPerformanceData(campaignId, timeRange) {
        // In production, this would fetch from Google Ads API
        return {
            roas: 2.8,
            cpa: 4.2,
            conversion_rate: 0.032,
            ctr: 0.038,
            quality_score: 7.5,
            impression_share: 0.68,
            audience_saturation: 0.75
        };
    }

    async fetchHistoricalComparison(campaignId, timeRange) {
        // In production, this would fetch historical data
        return {
            previous_period: {
                roas: 2.5,
                conversion_rate: 0.028
            }
        };
    }
}

module.exports = PerformanceTrackingService;
