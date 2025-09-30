class RealTimeMonitoringService {
    constructor() {
        this.alertThresholds = {
            critical: {
                roas_below: 0.5,
                cpa_above_target: 2.0, // 2x target CPA
                budget_overspend: 1.5, // 150% of daily budget
                quality_score_below: 4,
                conversion_rate_drop: 0.5 // 50% drop from baseline
            },
            warning: {
                roas_below: 1.5,
                cpa_above_target: 1.3, // 1.3x target CPA
                budget_overspend: 1.2, // 120% of daily budget
                quality_score_below: 6,
                conversion_rate_drop: 0.7 // 30% drop from baseline
            },
            opportunity: {
                roas_above: 4.0,
                ctr_above_average: 1.5, // 50% above average
                low_impression_share: 0.6, // Below 60% impression share
                underutilized_budget: 0.8 // Using less than 80% of budget
            }
        };

        this.malaysiaSpecificAlerts = {
            festival_opportunities: {
                deepavali: { boost_threshold: 1.3, alert_days_before: 7 },
                chinese_new_year: { boost_threshold: 1.4, alert_days_before: 14 },
                hari_raya: { boost_threshold: 1.2, alert_days_before: 10 }
            },
            peak_hour_performance: {
                malaysia_peak_hours: [19, 20, 21],
                performance_threshold: 1.2 // 20% above average
            },
            language_performance: {
                bahasa_malaysia_boost: 1.15,
                chinese_boost: 1.08,
                tamil_boost: 1.12
            }
        };

        this.monitoringIntervals = {
            real_time: 60000, // 1 minute
            performance_check: 300000, // 5 minutes
            budget_check: 900000, // 15 minutes
            optimization_check: 3600000 // 1 hour
        };
    }

    // Start real-time monitoring for campaigns
    async startRealTimeMonitoring(campaignIds, userId) {
        try {
            const monitoringSession = {
                session_id: this.generateSessionId(),
                user_id: userId,
                campaign_ids: campaignIds,
                started_at: new Date().toISOString(),
                status: 'active',
                alerts_generated: 0,
                last_check: null
            };

            // Initialize monitoring intervals
            this.initializeMonitoringIntervals(monitoringSession);

            // Set up WebSocket connection for real-time updates
            await this.setupWebSocketConnection(monitoringSession);

            return {
                success: true,
                session_id: monitoringSession.session_id,
                monitoring_active: true,
                next_check: new Date(Date.now() + this.monitoringIntervals.real_time).toISOString()
            };

        } catch (error) {
            console.error('Error starting real-time monitoring:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Real-time performance monitoring
    async monitorCampaignPerformance(campaignId) {
        try {
            // Fetch current performance data
            const currentMetrics = await this.fetchCurrentMetrics(campaignId);
            const historicalBaseline = await this.getHistoricalBaseline(campaignId);
            
            // Analyze performance against thresholds
            const alerts = this.analyzePerformanceAlerts(currentMetrics, historicalBaseline);
            
            // Check Malaysia-specific conditions
            const malaysiaAlerts = this.checkMalaysiaSpecificConditions(currentMetrics, campaignId);
            
            // Combine all alerts
            const allAlerts = [...alerts, ...malaysiaAlerts];
            
            // Generate recommendations
            const recommendations = this.generateRealTimeRecommendations(currentMetrics, allAlerts);
            
            // Send notifications if critical alerts
            const criticalAlerts = allAlerts.filter(alert => alert.severity === 'critical');
            if (criticalAlerts.length > 0) {
                await this.sendCriticalAlertNotifications(campaignId, criticalAlerts);
            }

            return {
                campaign_id: campaignId,
                timestamp: new Date().toISOString(),
                current_metrics: currentMetrics,
                alerts: allAlerts,
                recommendations: recommendations,
                auto_actions_taken: await this.executeAutoActions(campaignId, criticalAlerts),
                next_check: new Date(Date.now() + this.monitoringIntervals.performance_check).toISOString()
            };

        } catch (error) {
            console.error('Error monitoring campaign performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Budget monitoring and alerts
    async monitorBudgetUtilization(campaignId) {
        try {
            const budgetData = await this.fetchBudgetData(campaignId);
            const currentHour = new Date().getHours();
            const hoursRemaining = 24 - currentHour;
            
            const analysis = {
                daily_budget: budgetData.daily_budget,
                spent_so_far: budgetData.spent_today,
                remaining_budget: budgetData.daily_budget - budgetData.spent_today,
                pace_ratio: (budgetData.spent_today / budgetData.daily_budget) / (currentHour / 24),
                projected_spend: budgetData.spent_today / (currentHour / 24)
            };

            const budgetAlerts = [];

            // Over-pacing alerts
            if (analysis.pace_ratio > this.alertThresholds.critical.budget_overspend) {
                budgetAlerts.push({
                    type: 'budget_overspend',
                    severity: 'critical',
                    message: `Campaign spending ${(analysis.pace_ratio * 100).toFixed(0)}% above target pace`,
                    projected_overspend: analysis.projected_spend - analysis.daily_budget,
                    action_required: 'immediate_bid_reduction'
                });
            } else if (analysis.pace_ratio > this.alertThresholds.warning.budget_overspend) {
                budgetAlerts.push({
                    type: 'budget_warning',
                    severity: 'warning',
                    message: `Campaign spending ${(analysis.pace_ratio * 100).toFixed(0)}% above target pace`,
                    recommendation: 'monitor_closely'
                });
            }

            // Under-pacing opportunities
            if (analysis.pace_ratio < this.alertThresholds.opportunity.underutilized_budget) {
                budgetAlerts.push({
                    type: 'budget_opportunity',
                    severity: 'opportunity',
                    message: `Budget underutilized - only ${(analysis.pace_ratio * 100).toFixed(0)}% of target pace`,
                    opportunity: 'increase_bids_or_expand_targeting'
                });
            }

            // Malaysia peak hours budget optimization
            const malaysiaPeakHours = this.malaysiaSpecificAlerts.peak_hour_performance.malaysia_peak_hours;
            if (malaysiaPeakHours.includes(currentHour) && analysis.remaining_budget > 0) {
                budgetAlerts.push({
                    type: 'peak_hour_opportunity',
                    severity: 'opportunity',
                    message: 'Malaysia peak hour - consider increasing bids',
                    remaining_budget: analysis.remaining_budget,
                    recommendation: 'increase_peak_hour_bids'
                });
            }

            return {
                campaign_id: campaignId,
                budget_analysis: analysis,
                alerts: budgetAlerts,
                auto_adjustments: await this.calculateBudgetAutoAdjustments(analysis, budgetAlerts)
            };

        } catch (error) {
            console.error('Error monitoring budget:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Quality score monitoring
    async monitorQualityScores(campaignId) {
        try {
            const qualityData = await this.fetchQualityScoreData(campaignId);
            const qualityAlerts = [];

            qualityData.keywords.forEach(keyword => {
                if (keyword.quality_score < this.alertThresholds.critical.quality_score_below) {
                    qualityAlerts.push({
                        type: 'quality_score_critical',
                        severity: 'critical',
                        keyword: keyword.text,
                        current_score: keyword.quality_score,
                        message: `Keyword "${keyword.text}" has critically low quality score`,
                        impact: 'high_cpc_and_low_ad_rank',
                        recommendations: [
                            'Improve ad relevance',
                            'Optimize landing page',
                            'Consider pausing keyword'
                        ]
                    });
                } else if (keyword.quality_score < this.alertThresholds.warning.quality_score_below) {
                    qualityAlerts.push({
                        type: 'quality_score_warning',
                        severity: 'warning',
                        keyword: keyword.text,
                        current_score: keyword.quality_score,
                        message: `Keyword "${keyword.text}" has low quality score`,
                        recommendations: [
                            'Review ad copy relevance',
                            'Check landing page experience'
                        ]
                    });
                }
            });

            // Malaysia-specific quality score insights
            const malaysiaKeywords = qualityData.keywords.filter(kw => 
                kw.text.includes('malaysia') || kw.text.includes('malaysian') ||
                this.containsMalaysianTerms(kw.text)
            );

            if (malaysiaKeywords.length > 0) {
                const avgMalaysiaQS = malaysiaKeywords.reduce((sum, kw) => sum + kw.quality_score, 0) / malaysiaKeywords.length;
                const avgOverallQS = qualityData.keywords.reduce((sum, kw) => sum + kw.quality_score, 0) / qualityData.keywords.length;

                if (avgMalaysiaQS > avgOverallQS * 1.1) {
                    qualityAlerts.push({
                        type: 'malaysia_keyword_opportunity',
                        severity: 'opportunity',
                        message: 'Malaysia-specific keywords showing higher quality scores',
                        avg_malaysia_qs: avgMalaysiaQS.toFixed(1),
                        avg_overall_qs: avgOverallQS.toFixed(1),
                        recommendation: 'expand_malaysia_specific_keywords'
                    });
                }
            }

            return {
                campaign_id: campaignId,
                overall_quality_score: qualityData.overall_score,
                keyword_count: qualityData.keywords.length,
                alerts: qualityAlerts,
                improvement_opportunities: this.identifyQualityImprovementOpportunities(qualityData)
            };

        } catch (error) {
            console.error('Error monitoring quality scores:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Competitor monitoring
    async monitorCompetitorActivity(campaignId, industry) {
        try {
            const competitorData = await this.fetchCompetitorInsights(campaignId, industry);
            const competitorAlerts = [];

            // Auction insights analysis
            if (competitorData.auction_insights) {
                const topCompetitors = competitorData.auction_insights
                    .sort((a, b) => b.impression_share - a.impression_share)
                    .slice(0, 5);

                topCompetitors.forEach(competitor => {
                    if (competitor.impression_share > 0.3) { // 30% impression share
                        competitorAlerts.push({
                            type: 'high_competitor_activity',
                            severity: 'warning',
                            competitor: competitor.domain,
                            impression_share: competitor.impression_share,
                            message: `${competitor.domain} has ${(competitor.impression_share * 100).toFixed(1)}% impression share`,
                            recommendation: 'consider_bid_adjustments'
                        });
                    }
                });
            }

            // Malaysia-specific competitor analysis
            const malaysiaCompetitors = competitorData.auction_insights?.filter(comp => 
                comp.domain.includes('.my') || this.isMalaysianCompetitor(comp.domain)
            ) || [];

            if (malaysiaCompetitors.length > 0) {
                const totalMalaysiaShare = malaysiaCompetitors.reduce((sum, comp) => sum + comp.impression_share, 0);
                competitorAlerts.push({
                    type: 'malaysia_competitor_landscape',
                    severity: 'info',
                    message: `${malaysiaCompetitors.length} Malaysian competitors identified`,
                    total_malaysia_share: totalMalaysiaShare,
                    top_malaysia_competitor: malaysiaCompetitors[0]?.domain,
                    recommendation: 'focus_on_local_differentiation'
                });
            }

            return {
                campaign_id: campaignId,
                competitor_count: competitorData.auction_insights?.length || 0,
                alerts: competitorAlerts,
                market_insights: this.generateMarketInsights(competitorData),
                recommended_actions: this.generateCompetitorResponseActions(competitorAlerts)
            };

        } catch (error) {
            console.error('Error monitoring competitors:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Festival and seasonal monitoring
    async monitorSeasonalOpportunities(campaignIds) {
        try {
            const currentDate = new Date();
            const seasonalAlerts = [];

            // Check upcoming Malaysian festivals
            const upcomingFestivals = this.getUpcomingMalaysianFestivals(currentDate);
            
            upcomingFestivals.forEach(festival => {
                const daysUntil = Math.ceil((festival.date - currentDate) / (1000 * 60 * 60 * 24));
                const alertThreshold = this.malaysiaSpecificAlerts.festival_opportunities[festival.type]?.alert_days_before || 7;

                if (daysUntil <= alertThreshold && daysUntil > 0) {
                    seasonalAlerts.push({
                        type: 'festival_opportunity',
                        severity: 'opportunity',
                        festival: festival.name,
                        days_until: daysUntil,
                        message: `${festival.name} in ${daysUntil} days - prepare campaigns`,
                        recommended_actions: [
                            'Increase budget allocation',
                            'Create festival-specific creatives',
                            'Target relevant cultural audiences',
                            'Adjust bid strategies'
                        ],
                        expected_boost: this.malaysiaSpecificAlerts.festival_opportunities[festival.type]?.boost_threshold || 1.2
                    });
                }
            });

            // Check for seasonal trends
            const seasonalTrends = await this.analyzeSeasonalTrends(campaignIds, currentDate);
            seasonalAlerts.push(...seasonalTrends);

            return {
                seasonal_alerts: seasonalAlerts,
                upcoming_festivals: upcomingFestivals,
                seasonal_recommendations: this.generateSeasonalRecommendations(seasonalAlerts)
            };

        } catch (error) {
            console.error('Error monitoring seasonal opportunities:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Auto-action execution
    async executeAutoActions(campaignId, criticalAlerts) {
        const autoActions = [];

        for (const alert of criticalAlerts) {
            switch (alert.type) {
                case 'budget_overspend':
                    if (alert.action_required === 'immediate_bid_reduction') {
                        const result = await this.reduceBidsAutomatically(campaignId, 0.8); // 20% reduction
                        autoActions.push({
                            action: 'bid_reduction',
                            result: result,
                            reason: 'Budget overspend protection'
                        });
                    }
                    break;

                case 'quality_score_critical':
                    const pauseResult = await this.pauseLowQualityKeywords(campaignId, alert.keyword);
                    autoActions.push({
                        action: 'pause_keyword',
                        keyword: alert.keyword,
                        result: pauseResult,
                        reason: 'Critical quality score protection'
                    });
                    break;

                case 'roas_critical':
                    const roasResult = await this.adjustBidsForROAS(campaignId, alert.target_roas);
                    autoActions.push({
                        action: 'roas_optimization',
                        result: roasResult,
                        reason: 'ROAS protection'
                    });
                    break;
            }
        }

        return autoActions;
    }

    // Helper methods
    analyzePerformanceAlerts(currentMetrics, baseline) {
        const alerts = [];

        // ROAS alerts
        if (currentMetrics.roas < this.alertThresholds.critical.roas_below) {
            alerts.push({
                type: 'roas_critical',
                severity: 'critical',
                current_value: currentMetrics.roas,
                threshold: this.alertThresholds.critical.roas_below,
                message: `ROAS critically low: ${currentMetrics.roas.toFixed(2)}`,
                target_roas: baseline.target_roas || 3.0
            });
        }

        // Conversion rate alerts
        const conversionDrop = (baseline.conversion_rate - currentMetrics.conversion_rate) / baseline.conversion_rate;
        if (conversionDrop > this.alertThresholds.critical.conversion_rate_drop) {
            alerts.push({
                type: 'conversion_rate_drop',
                severity: 'critical',
                current_value: currentMetrics.conversion_rate,
                baseline_value: baseline.conversion_rate,
                drop_percentage: conversionDrop,
                message: `Conversion rate dropped ${(conversionDrop * 100).toFixed(1)}% from baseline`
            });
        }

        // Opportunity alerts
        if (currentMetrics.roas > this.alertThresholds.opportunity.roas_above) {
            alerts.push({
                type: 'high_roas_opportunity',
                severity: 'opportunity',
                current_value: currentMetrics.roas,
                message: `Excellent ROAS: ${currentMetrics.roas.toFixed(2)} - consider scaling`,
                recommendation: 'increase_budget_and_bids'
            });
        }

        return alerts;
    }

    checkMalaysiaSpecificConditions(metrics, campaignId) {
        const alerts = [];
        const currentHour = new Date().getHours();

        // Peak hour performance check
        const peakHours = this.malaysiaSpecificAlerts.peak_hour_performance.malaysia_peak_hours;
        if (peakHours.includes(currentHour)) {
            const peakPerformance = metrics.hourly_performance?.[currentHour];
            if (peakPerformance && peakPerformance.conversion_rate > metrics.conversion_rate * 1.2) {
                alerts.push({
                    type: 'malaysia_peak_hour_performance',
                    severity: 'opportunity',
                    message: 'Strong performance during Malaysia peak hours',
                    current_hour: currentHour,
                    performance_boost: ((peakPerformance.conversion_rate / metrics.conversion_rate) - 1) * 100,
                    recommendation: 'increase_peak_hour_bids'
                });
            }
        }

        // Language performance check
        if (metrics.language_performance) {
            Object.entries(metrics.language_performance).forEach(([language, performance]) => {
                const expectedBoost = this.malaysiaSpecificAlerts.language_performance[`${language}_boost`];
                if (expectedBoost && performance.ctr > metrics.ctr * expectedBoost) {
                    alerts.push({
                        type: 'language_performance_opportunity',
                        severity: 'opportunity',
                        language: language,
                        performance_boost: ((performance.ctr / metrics.ctr) - 1) * 100,
                        message: `Strong performance in ${language}`,
                        recommendation: 'increase_language_budget'
                    });
                }
            });
        }

        return alerts;
    }

    generateRealTimeRecommendations(metrics, alerts) {
        const recommendations = [];

        // Critical action recommendations
        const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
            recommendations.push({
                priority: 'immediate',
                action: 'Review critical alerts and take immediate action',
                details: criticalAlerts.map(alert => alert.message)
            });
        }

        // Opportunity recommendations
        const opportunities = alerts.filter(alert => alert.severity === 'opportunity');
        if (opportunities.length > 0) {
            recommendations.push({
                priority: 'high',
                action: 'Capitalize on identified opportunities',
                details: opportunities.map(alert => alert.recommendation).filter(Boolean)
            });
        }

        // Malaysia-specific recommendations
        const malaysiaAlerts = alerts.filter(alert => alert.type.includes('malaysia'));
        if (malaysiaAlerts.length > 0) {
            recommendations.push({
                priority: 'medium',
                action: 'Optimize for Malaysia market conditions',
                details: malaysiaAlerts.map(alert => alert.recommendation).filter(Boolean)
            });
        }

        return recommendations;
    }

    // Placeholder methods for external integrations
    async fetchCurrentMetrics(campaignId) {
        // In production, this would fetch from Google Ads API
        return {
            roas: 2.5,
            ctr: 0.035,
            conversion_rate: 0.028,
            cpc: 0.12,
            cpa: 4.2,
            quality_score: 7.2,
            impression_share: 0.65
        };
    }

    async getHistoricalBaseline(campaignId) {
        // In production, this would fetch historical data
        return {
            roas: 2.8,
            conversion_rate: 0.032,
            target_roas: 3.0
        };
    }

    generateSessionId() {
        return 'monitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    containsMalaysianTerms(text) {
        const malaysianTerms = ['malaysia', 'malaysian', 'kuala lumpur', 'kl', 'selangor', 'penang', 'johor'];
        return malaysianTerms.some(term => text.toLowerCase().includes(term));
    }

    isMalaysianCompetitor(domain) {
        return domain.endsWith('.my') || domain.includes('malaysia') || domain.includes('kuala');
    }

    getUpcomingMalaysianFestivals(currentDate) {
        // Simplified festival calendar - in production, this would be more comprehensive
        const festivals = [
            { name: 'Deepavali', type: 'deepavali', date: new Date('2025-10-20') },
            { name: 'Chinese New Year', type: 'chinese_new_year', date: new Date('2026-01-29') },
            { name: 'Hari Raya Puasa', type: 'hari_raya', date: new Date('2025-03-30') }
        ];

        return festivals.filter(festival => festival.date > currentDate);
    }

    async initializeMonitoringIntervals(session) {
        // Set up monitoring intervals - in production, this would use proper job scheduling
        console.log(`Monitoring initialized for session ${session.session_id}`);
    }

    async setupWebSocketConnection(session) {
        // Set up WebSocket for real-time updates - in production, this would use Socket.IO or similar
        console.log(`WebSocket connection established for session ${session.session_id}`);
    }

    async sendCriticalAlertNotifications(campaignId, alerts) {
        // Send notifications via email, SMS, or push notifications
        console.log(`Critical alerts sent for campaign ${campaignId}:`, alerts.length);
    }
}

module.exports = RealTimeMonitoringService;
