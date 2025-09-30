class AudienceBuilderService {
    constructor() {
        this.malaysiaAudienceSegments = {
            smoking_cessation: {
                primary_interests: [
                    'Smoking Cessation',
                    'Quit Smoking',
                    'Nicotine Replacement Therapy',
                    'Health & Wellness',
                    'Medical Health'
                ],
                behavioral_signals: [
                    'Visited smoking cessation websites',
                    'Searched for quit smoking methods',
                    'Engaged with health content',
                    'Downloaded health apps'
                ],
                demographics: {
                    age_range: [25, 55],
                    income_level: 'middle_to_high',
                    education: 'secondary_plus'
                },
                malaysia_specific: {
                    languages: ['bahasa_malaysia', 'english', 'chinese'],
                    states: ['kuala_lumpur', 'selangor', 'penang', 'johor'],
                    cultural_context: ['health_conscious', 'family_oriented']
                }
            },
            health_supplements: {
                primary_interests: [
                    'Vitamins & Supplements',
                    'Nutrition',
                    'Fitness & Exercise',
                    'Healthy Living',
                    'Weight Management'
                ],
                behavioral_signals: [
                    'Purchased health products online',
                    'Visited fitness websites',
                    'Engaged with nutrition content',
                    'Searched for supplement reviews'
                ],
                demographics: {
                    age_range: [30, 60],
                    income_level: 'middle_plus',
                    education: 'secondary_plus'
                },
                malaysia_specific: {
                    languages: ['english', 'chinese', 'bahasa_malaysia'],
                    states: ['kuala_lumpur', 'selangor', 'penang', 'johor', 'perak'],
                    cultural_context: ['wellness_focused', 'preventive_health']
                }
            },
            outdoor_workers: {
                primary_interests: [
                    'Construction',
                    'Transportation',
                    'Security Services',
                    'Agriculture',
                    'Manual Labor'
                ],
                behavioral_signals: [
                    'Searches for job opportunities',
                    'Engages with worker safety content',
                    'Uses transportation apps',
                    'Interested in worker benefits'
                ],
                demographics: {
                    age_range: [20, 50],
                    income_level: 'lower_to_middle',
                    education: 'primary_to_secondary'
                },
                malaysia_specific: {
                    languages: ['bahasa_malaysia', 'english'],
                    states: ['all_states'],
                    cultural_context: ['hardworking', 'family_provider', 'health_conscious']
                }
            }
        };

        this.festivalAudiences = {
            deepavali: {
                cultural_segments: ['tamil_community', 'hindu_community'],
                interests: ['Indian Festivals', 'Traditional Celebrations', 'Family Gatherings'],
                behavioral_patterns: ['Festival shopping', 'Traditional food', 'Religious content'],
                timing: { month: 10, duration_days: 14 }
            },
            chinese_new_year: {
                cultural_segments: ['chinese_community', 'buddhist_community'],
                interests: ['Chinese New Year', 'Traditional Celebrations', 'Family Reunions'],
                behavioral_patterns: ['Red packet shopping', 'Traditional decorations', 'Family travel'],
                timing: { month: 2, duration_days: 21 }
            },
            hari_raya: {
                cultural_segments: ['malay_community', 'muslim_community'],
                interests: ['Islamic Festivals', 'Eid Celebrations', 'Traditional Food'],
                behavioral_patterns: ['Festive clothing', 'Traditional sweets', 'Family visits'],
                timing: { month: 5, duration_days: 30 }
            }
        };
    }

    // Build comprehensive audience for smoking cessation
    async buildSmokingCessationAudience(campaignGoals, targetStates = []) {
        const baseSegment = this.malaysiaAudienceSegments.smoking_cessation;
        
        const audience = {
            name: 'Malaysia Smoking Cessation - Comprehensive',
            description: 'Targeted audience for smoking cessation products in Malaysia',
            segments: []
        };

        // Primary interest-based segment
        audience.segments.push({
            type: 'interest_based',
            name: 'Health Conscious Smokers',
            targeting: {
                interests: baseSegment.primary_interests,
                age_range: baseSegment.demographics.age_range,
                languages: baseSegment.malaysia_specific.languages,
                geo_targeting: targetStates.length > 0 ? targetStates : baseSegment.malaysia_specific.states
            },
            estimated_reach: 450000,
            confidence: 0.85
        });

        // Behavioral segment
        audience.segments.push({
            type: 'behavioral',
            name: 'Quit Smoking Intent',
            targeting: {
                behaviors: baseSegment.behavioral_signals,
                custom_audiences: ['website_visitors_health_pages', 'quit_smoking_app_users'],
                lookalike_source: 'previous_converters'
            },
            estimated_reach: 280000,
            confidence: 0.90
        });

        // Life events segment
        audience.segments.push({
            type: 'life_events',
            name: 'Health Motivation Triggers',
            targeting: {
                life_events: ['New Parent', 'Health Diagnosis', 'Marriage', 'Career Change'],
                age_range: [25, 45],
                interests: ['Family Health', 'Parenting', 'Medical Health']
            },
            estimated_reach: 180000,
            confidence: 0.75
        });

        // Add festival-aware targeting if applicable
        const currentMonth = new Date().getMonth() + 1;
        const activeFestival = Object.entries(this.festivalAudiences)
            .find(([name, data]) => data.timing.month === currentMonth);

        if (activeFestival) {
            audience.segments.push({
                type: 'festival_contextual',
                name: `${activeFestival[0]} Health Focus`,
                targeting: {
                    cultural_segments: activeFestival[1].cultural_segments,
                    interests: [...baseSegment.primary_interests, ...activeFestival[1].interests],
                    behavioral_patterns: ['Festival preparation', 'Health resolutions']
                },
                estimated_reach: 120000,
                confidence: 0.70,
                seasonal_boost: 1.4
            });
        }

        return this.optimizeAudienceSegments(audience);
    }

    // Build health supplements audience
    async buildHealthSupplementsAudience(productCategory, targetDemographics) {
        const baseSegment = this.malaysiaAudienceSegments.health_supplements;
        
        const audience = {
            name: `Malaysia Health Supplements - ${productCategory}`,
            description: `Targeted audience for ${productCategory} supplements in Malaysia`,
            segments: []
        };

        // Wellness enthusiasts segment
        audience.segments.push({
            type: 'wellness_focused',
            name: 'Active Wellness Seekers',
            targeting: {
                interests: baseSegment.primary_interests,
                behaviors: ['Gym membership', 'Fitness app usage', 'Health food purchases'],
                demographics: {
                    age_range: targetDemographics.age_range || baseSegment.demographics.age_range,
                    income_level: baseSegment.demographics.income_level
                }
            },
            estimated_reach: 680000,
            confidence: 0.88
        });

        // Preventive health segment
        audience.segments.push({
            type: 'preventive_health',
            name: 'Preventive Health Conscious',
            targeting: {
                interests: ['Preventive Medicine', 'Nutrition', 'Healthy Aging'],
                behaviors: ['Regular health checkups', 'Health article reading', 'Supplement research'],
                age_range: [35, 65]
            },
            estimated_reach: 420000,
            confidence: 0.82
        });

        // Professional health seekers
        audience.segments.push({
            type: 'professional_health',
            name: 'Busy Professionals',
            targeting: {
                interests: ['Career Development', 'Work-Life Balance', 'Executive Health'],
                behaviors: ['Long work hours', 'Stress management', 'Convenience shopping'],
                demographics: {
                    income_level: 'high',
                    education: 'tertiary',
                    occupation: ['Management', 'Professional', 'Executive']
                }
            },
            estimated_reach: 320000,
            confidence: 0.79
        });

        return this.optimizeAudienceSegments(audience);
    }

    // Build outdoor workers audience
    async buildOutdoorWorkersAudience(healthFocus, workCategories = []) {
        const baseSegment = this.malaysiaAudienceSegments.outdoor_workers;
        
        const audience = {
            name: 'Malaysia Outdoor Workers - Health Focus',
            description: 'Health-focused targeting for Malaysian outdoor workers',
            segments: []
        };

        // Primary outdoor workers segment
        audience.segments.push({
            type: 'occupation_based',
            name: 'Active Outdoor Workers',
            targeting: {
                interests: workCategories.length > 0 ? workCategories : baseSegment.primary_interests,
                behaviors: baseSegment.behavioral_signals,
                demographics: baseSegment.demographics,
                work_schedule: ['Early morning', 'Physical labor', 'Outdoor environment']
            },
            estimated_reach: 150000,
            confidence: 0.85
        });

        // Health-conscious workers segment
        audience.segments.push({
            type: 'health_aware_workers',
            name: 'Health-Conscious Workers',
            targeting: {
                interests: [...baseSegment.primary_interests, 'Worker Safety', 'Occupational Health'],
                behaviors: ['Safety equipment purchases', 'Health insurance inquiries', 'Medical checkups'],
                pain_points: ['Physical strain', 'Sun exposure', 'Respiratory health']
            },
            estimated_reach: 95000,
            confidence: 0.80
        });

        // Family-focused workers
        audience.segments.push({
            type: 'family_provider',
            name: 'Family-Focused Workers',
            targeting: {
                life_stage: ['Married with children', 'Primary income earner'],
                interests: ['Family Health', 'Children Education', 'Financial Security'],
                motivations: ['Family wellbeing', 'Long-term health', 'Income protection']
            },
            estimated_reach: 110000,
            confidence: 0.75
        });

        return this.optimizeAudienceSegments(audience);
    }

    // Create lookalike audiences
    async createLookalikeAudiences(sourceAudience, similarityLevel = 0.8) {
        const lookalikes = [];

        // High-similarity lookalike (80-90% similar)
        lookalikes.push({
            type: 'lookalike_high_similarity',
            name: `${sourceAudience.name} - High Similarity`,
            source: sourceAudience.id,
            similarity: 0.85,
            size_multiplier: 2.0,
            estimated_reach: sourceAudience.reach * 2,
            expected_performance: 0.75, // 75% of source performance
            confidence: 0.88
        });

        // Medium-similarity lookalike (60-80% similar)
        lookalikes.push({
            type: 'lookalike_medium_similarity',
            name: `${sourceAudience.name} - Broader Reach`,
            source: sourceAudience.id,
            similarity: 0.65,
            size_multiplier: 4.0,
            estimated_reach: sourceAudience.reach * 4,
            expected_performance: 0.60, // 60% of source performance
            confidence: 0.75
        });

        // Malaysia-specific expansion
        lookalikes.push({
            type: 'lookalike_malaysia_expansion',
            name: `${sourceAudience.name} - Malaysia Expansion`,
            source: sourceAudience.id,
            similarity: 0.70,
            geo_expansion: 'all_malaysia_states',
            cultural_matching: true,
            estimated_reach: sourceAudience.reach * 3,
            expected_performance: 0.65,
            confidence: 0.80
        });

        return lookalikes;
    }

    // Festival-specific audience optimization
    async optimizeForFestival(baseAudience, festivalName) {
        const festival = this.festivalAudiences[festivalName];
        if (!festival) return baseAudience;

        const optimizedAudience = {
            ...baseAudience,
            name: `${baseAudience.name} - ${festivalName} Optimized`,
            festival_context: festivalName,
            segments: baseAudience.segments.map(segment => ({
                ...segment,
                targeting: {
                    ...segment.targeting,
                    cultural_segments: festival.cultural_segments,
                    festival_interests: festival.interests,
                    seasonal_behaviors: festival.behavioral_patterns
                },
                estimated_reach: Math.round(segment.estimated_reach * 1.3), // 30% boost during festival
                seasonal_multiplier: 1.3
            }))
        };

        // Add festival-specific segment
        optimizedAudience.segments.push({
            type: 'festival_specific',
            name: `${festivalName} Celebrants`,
            targeting: {
                cultural_segments: festival.cultural_segments,
                interests: festival.interests,
                behaviors: festival.behavioral_patterns,
                timing: festival.timing
            },
            estimated_reach: 200000,
            confidence: 0.70,
            seasonal_boost: 1.5
        });

        return optimizedAudience;
    }

    // Audience performance prediction
    async predictAudiencePerformance(audience, campaignType) {
        const predictions = audience.segments.map(segment => {
            let baseScore = segment.confidence * 100;
            
            // Adjust based on campaign type
            const campaignMultipliers = {
                'demand_generation': 1.0,
                'conversion_focused': 1.2,
                'awareness': 0.8,
                'retargeting': 1.5
            };
            
            baseScore *= campaignMultipliers[campaignType] || 1.0;
            
            // Malaysia market adjustments
            if (segment.targeting.languages?.includes('bahasa_malaysia')) {
                baseScore *= 1.1; // 10% boost for local language
            }
            
            if (segment.type === 'festival_specific') {
                baseScore *= 1.3; // 30% boost for festival targeting
            }
            
            return {
                segment_name: segment.name,
                predicted_ctr: this.calculatePredictedCTR(baseScore),
                predicted_cpc: this.calculatePredictedCPC(segment.estimated_reach),
                predicted_conversion_rate: this.calculatePredictedConversionRate(baseScore, campaignType),
                confidence_level: segment.confidence,
                recommendation: this.generateSegmentRecommendation(segment, baseScore)
            };
        });

        return {
            audience_name: audience.name,
            overall_score: predictions.reduce((acc, pred) => acc + pred.predicted_ctr, 0) / predictions.length,
            segment_predictions: predictions,
            optimization_suggestions: this.generateOptimizationSuggestions(predictions)
        };
    }

    // Optimize audience segments
    optimizeAudienceSegments(audience) {
        // Remove overlapping segments
        const optimizedSegments = this.removeAudienceOverlap(audience.segments);
        
        // Prioritize by estimated performance
        const prioritizedSegments = optimizedSegments.sort((a, b) => 
            (b.confidence * b.estimated_reach) - (a.confidence * a.estimated_reach)
        );

        return {
            ...audience,
            segments: prioritizedSegments,
            total_estimated_reach: prioritizedSegments.reduce((sum, seg) => sum + seg.estimated_reach, 0),
            optimization_applied: true,
            recommendations: this.generateAudienceRecommendations(prioritizedSegments)
        };
    }

    // Helper methods
    calculatePredictedCTR(score) {
        return Math.max(0.01, Math.min(0.08, score / 1000)); // CTR between 1% and 8%
    }

    calculatePredictedCPC(reach) {
        // Larger audiences typically have lower CPC
        const baseCPC = 0.15; // RM 0.15 base CPC for Malaysia
        return baseCPC * (1 - Math.log10(reach / 100000) * 0.1);
    }

    calculatePredictedConversionRate(score, campaignType) {
        const baseConversion = campaignType === 'conversion_focused' ? 0.05 : 0.03;
        return baseConversion * (score / 80); // Normalized to score of 80
    }

    generateSegmentRecommendation(segment, score) {
        if (score > 85) return 'High priority - allocate maximum budget';
        if (score > 70) return 'Good performance expected - standard budget';
        if (score > 55) return 'Test with smaller budget first';
        return 'Consider optimization before launch';
    }

    generateOptimizationSuggestions(predictions) {
        const suggestions = [];
        
        const topPerformer = predictions.sort((a, b) => b.predicted_ctr - a.predicted_ctr)[0];
        suggestions.push(`Focus budget on "${topPerformer.segment_name}" - highest predicted CTR`);
        
        const lowPerformers = predictions.filter(p => p.predicted_ctr < 0.025);
        if (lowPerformers.length > 0) {
            suggestions.push(`Consider optimizing: ${lowPerformers.map(p => p.segment_name).join(', ')}`);
        }
        
        return suggestions;
    }

    removeAudienceOverlap(segments) {
        // Simple overlap removal - in production, this would be more sophisticated
        return segments.filter((segment, index, array) => {
            return !array.slice(0, index).some(prevSegment => 
                this.calculateSegmentOverlap(segment, prevSegment) > 0.7
            );
        });
    }

    calculateSegmentOverlap(segment1, segment2) {
        // Simplified overlap calculation
        const interests1 = segment1.targeting.interests || [];
        const interests2 = segment2.targeting.interests || [];
        const commonInterests = interests1.filter(i => interests2.includes(i));
        return commonInterests.length / Math.max(interests1.length, interests2.length);
    }

    generateAudienceRecommendations(segments) {
        return [
            'Test top 3 segments with equal budget allocation initially',
            'Monitor performance for first 7 days before optimization',
            'Consider festival timing for seasonal campaigns',
            'Use local language creatives for Malaysia-specific segments'
        ];
    }
}

module.exports = AudienceBuilderService;
