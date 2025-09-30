class AIIntegrationService {
    constructor() {
        this.providers = {
            openai: {
                name: 'OpenAI GPT',
                baseUrl: 'https://api.openai.com/v1',
                models: {
                    'gpt-4': { cost: 0.03, context: 8192, quality: 'highest' },
                    'gpt-4-turbo': { cost: 0.01, context: 128000, quality: 'high' },
                    'gpt-3.5-turbo': { cost: 0.002, context: 4096, quality: 'good' }
                },
                features: ['campaign_optimization', 'ad_copy_generation', 'audience_insights']
            },
            claude: {
                name: 'Claude AI',
                baseUrl: 'https://api.anthropic.com/v1',
                models: {
                    'claude-3-opus': { cost: 0.015, context: 200000, quality: 'highest' },
                    'claude-3-sonnet': { cost: 0.003, context: 200000, quality: 'high' },
                    'claude-3-haiku': { cost: 0.00025, context: 200000, quality: 'good' }
                },
                features: ['content_analysis', 'strategy_planning', 'performance_review']
            },
            gemini: {
                name: 'Google Gemini',
                baseUrl: 'https://generativelanguage.googleapis.com/v1',
                models: {
                    'gemini-pro': { cost: 0.0005, context: 32768, quality: 'high' },
                    'gemini-ultra': { cost: 0.002, context: 32768, quality: 'highest' },
                    'gemini-pro-vision': { cost: 0.0025, context: 16384, quality: 'high' }
                },
                features: ['google_ads_integration', 'market_analysis', 'trend_prediction']
            },
            custom: {
                name: 'Custom AI',
                baseUrl: null, // User-defined
                models: {
                    'custom-model': { cost: 0.001, context: 4096, quality: 'variable' }
                },
                features: ['custom_logic', 'private_data', 'full_control']
            }
        };

        this.malaysiaPrompts = {
            campaign_optimization: `
                You are an expert Google Ads specialist focusing on the Malaysia market. 
                Consider these Malaysia-specific factors:
                - Cultural festivals: Deepavali, Chinese New Year, Hari Raya, Christmas
                - Languages: Bahasa Malaysia, English, Chinese, Tamil
                - Peak hours: 7-9 PM Malaysia time (UTC+8)
                - Mobile-first audience (75% mobile traffic)
                - State preferences: KL, Selangor, Penang as top performers
                - Local competition and pricing dynamics
            `,
            audience_insights: `
                Analyze audience performance for Malaysia market with focus on:
                - Cultural and religious considerations
                - Language preferences and performance
                - Geographic distribution across Malaysian states
                - Festival season behavior patterns
                - Mobile vs desktop usage patterns
                - Local competitor landscape
            `,
            ad_copy_generation: `
                Create ad copy optimized for Malaysia audience considering:
                - Cultural sensitivity and appropriateness
                - Local language preferences (Bahasa Malaysia priority)
                - Festival and seasonal relevance
                - Mobile-friendly formatting
                - Local pricing expectations (RM currency)
                - Trust signals relevant to Malaysian consumers
            `
        };
    }

    // Initialize AI provider
    async initializeProvider(providerId, config) {
        try {
            const provider = this.providers[providerId];
            if (!provider) {
                throw new Error(`Unknown provider: ${providerId}`);
            }

            // Validate configuration
            const validation = await this.validateProviderConfig(providerId, config);
            if (!validation.valid) {
                throw new Error(`Configuration invalid: ${validation.error}`);
            }

            // Test connection
            const connectionTest = await this.testProviderConnection(providerId, config);
            if (!connectionTest.success) {
                throw new Error(`Connection failed: ${connectionTest.error}`);
            }

            // Store configuration securely
            await this.storeProviderConfig(providerId, config);

            return {
                success: true,
                provider: providerId,
                model: config.model,
                features: provider.features,
                cost_estimate: provider.models[config.model]?.cost || 0.001
            };

        } catch (error) {
            console.error(`Error initializing ${providerId}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate AI-powered campaign optimization
    async generateCampaignOptimization(campaignData, options = {}) {
        try {
            const provider = options.provider || await this.getPrimaryProvider();
            const prompt = this.buildOptimizationPrompt(campaignData);
            
            const response = await this.callAI(provider, {
                prompt: prompt,
                context: 'campaign_optimization',
                malaysia_focus: true,
                max_tokens: 2000
            });

            return {
                success: true,
                provider: provider,
                recommendations: this.parseOptimizationResponse(response),
                confidence_score: this.calculateConfidenceScore(response),
                estimated_impact: this.estimateOptimizationImpact(response),
                malaysia_insights: this.extractMalaysiaInsights(response)
            };

        } catch (error) {
            console.error('Error generating campaign optimization:', error);
            
            // Try fallback provider
            const fallbackProvider = await this.getFallbackProvider();
            if (fallbackProvider && fallbackProvider !== provider) {
                return await this.generateCampaignOptimization(campaignData, { 
                    ...options, 
                    provider: fallbackProvider 
                });
            }

            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate audience insights
    async generateAudienceInsights(audienceData, performanceMetrics) {
        try {
            const provider = await this.getPrimaryProvider();
            const prompt = this.buildAudienceInsightsPrompt(audienceData, performanceMetrics);
            
            const response = await this.callAI(provider, {
                prompt: prompt,
                context: 'audience_insights',
                malaysia_focus: true,
                max_tokens: 1500
            });

            return {
                success: true,
                provider: provider,
                insights: this.parseAudienceInsights(response),
                segment_recommendations: this.extractSegmentRecommendations(response),
                expansion_opportunities: this.identifyExpansionOpportunities(response),
                malaysia_cultural_insights: this.extractCulturalInsights(response)
            };

        } catch (error) {
            console.error('Error generating audience insights:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate ad copy variations
    async generateAdCopyVariations(productInfo, targetAudience, campaignGoals) {
        try {
            const provider = await this.getPrimaryProvider();
            const prompt = this.buildAdCopyPrompt(productInfo, targetAudience, campaignGoals);
            
            const response = await this.callAI(provider, {
                prompt: prompt,
                context: 'ad_copy_generation',
                malaysia_focus: true,
                max_tokens: 1000
            });

            const variations = this.parseAdCopyVariations(response);
            
            return {
                success: true,
                provider: provider,
                variations: variations,
                malaysia_optimized: variations.filter(v => v.malaysia_optimized),
                language_versions: this.generateLanguageVersions(variations),
                festival_versions: this.generateFestivalVersions(variations)
            };

        } catch (error) {
            console.error('Error generating ad copy:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Analyze performance with AI insights
    async analyzePerformanceWithAI(performanceData, timeRange = '30d') {
        try {
            const provider = await this.getPrimaryProvider();
            const prompt = this.buildPerformanceAnalysisPrompt(performanceData, timeRange);
            
            const response = await this.callAI(provider, {
                prompt: prompt,
                context: 'performance_analysis',
                malaysia_focus: true,
                max_tokens: 2500
            });

            return {
                success: true,
                provider: provider,
                analysis: this.parsePerformanceAnalysis(response),
                key_insights: this.extractKeyInsights(response),
                action_items: this.extractActionItems(response),
                malaysia_specific_findings: this.extractMalaysiaFindings(response),
                predicted_trends: this.extractTrendPredictions(response)
            };

        } catch (error) {
            console.error('Error analyzing performance:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Core AI calling function
    async callAI(providerId, options) {
        const config = await this.getProviderConfig(providerId);
        const provider = this.providers[providerId];
        
        if (!config || !config.apiKey) {
            throw new Error(`${providerId} not configured`);
        }

        const prompt = this.buildContextualPrompt(options);
        
        switch (providerId) {
            case 'openai':
                return await this.callOpenAI(config, prompt, options);
            case 'claude':
                return await this.callClaude(config, prompt, options);
            case 'gemini':
                return await this.callGemini(config, prompt, options);
            case 'custom':
                return await this.callCustomAI(config, prompt, options);
            default:
                throw new Error(`Unsupported provider: ${providerId}`);
        }
    }

    // OpenAI API integration
    async callOpenAI(config, prompt, options) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model || 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: this.malaysiaPrompts[options.context] || 'You are a helpful AI assistant.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: options.max_tokens || 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Claude API integration
    async callClaude(config, prompt, options) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': config.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model || 'claude-3-sonnet-20240229',
                max_tokens: options.max_tokens || 1000,
                messages: [
                    {
                        role: 'user',
                        content: `${this.malaysiaPrompts[options.context] || ''}\n\n${prompt}`
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    }

    // Gemini API integration
    async callGemini(config, prompt, options) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-pro'}:generateContent?key=${config.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: `${this.malaysiaPrompts[options.context] || ''}\n\n${prompt}`
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: options.max_tokens || 1000,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    // Custom AI integration
    async callCustomAI(config, prompt, options) {
        if (!config.endpoint) {
            throw new Error('Custom AI endpoint not configured');
        }

        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: `${this.malaysiaPrompts[options.context] || ''}\n\n${prompt}`,
                max_tokens: options.max_tokens || 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Custom AI error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response || data.text || data.content;
    }

    // Build contextual prompts
    buildContextualPrompt(options) {
        let prompt = options.prompt;
        
        if (options.malaysia_focus) {
            prompt += `\n\nIMPORTANT: Focus specifically on Malaysia market conditions, cultural considerations, and local business practices.`;
        }
        
        return prompt;
    }

    // Build optimization prompt
    buildOptimizationPrompt(campaignData) {
        return `
            Analyze this Google Ads campaign performance and provide optimization recommendations:
            
            Campaign Data:
            - Campaign Type: ${campaignData.type}
            - Budget: RM ${campaignData.budget}/day
            - Current ROAS: ${campaignData.roas}
            - CTR: ${campaignData.ctr}%
            - Conversion Rate: ${campaignData.conversion_rate}%
            - Target Audience: ${campaignData.target_audience}
            - Geographic Targeting: ${campaignData.locations?.join(', ') || 'Malaysia'}
            
            Performance Metrics (Last 30 days):
            - Impressions: ${campaignData.impressions}
            - Clicks: ${campaignData.clicks}
            - Conversions: ${campaignData.conversions}
            - Cost: RM ${campaignData.cost}
            
            Please provide:
            1. Top 3 optimization opportunities
            2. Budget reallocation recommendations
            3. Audience targeting improvements
            4. Malaysia-specific cultural considerations
            5. Estimated impact of each recommendation
            
            Format as JSON with clear action items.
        `;
    }

    // Build audience insights prompt
    buildAudienceInsightsPrompt(audienceData, performanceMetrics) {
        return `
            Analyze this audience performance data and provide insights:
            
            Audience Segments:
            ${audienceData.segments.map(segment => `
            - ${segment.name}: ${segment.size} people
              Performance: ${segment.ctr}% CTR, ${segment.conversion_rate}% CR
              Demographics: ${segment.demographics}
            `).join('')}
            
            Overall Performance:
            - Best performing segment: ${performanceMetrics.top_segment}
            - Worst performing segment: ${performanceMetrics.bottom_segment}
            - Average engagement: ${performanceMetrics.avg_engagement}
            
            Please provide:
            1. Audience segment analysis
            2. Expansion opportunities
            3. Malaysia cultural insights
            4. Language preferences
            5. Seasonal behavior patterns
            
            Focus on actionable insights for Malaysia market.
        `;
    }

    // Build ad copy prompt
    buildAdCopyPrompt(productInfo, targetAudience, campaignGoals) {
        return `
            Create compelling ad copy variations for this product/service:
            
            Product Information:
            - Name: ${productInfo.name}
            - Category: ${productInfo.category}
            - Key Benefits: ${productInfo.benefits?.join(', ')}
            - Price Range: RM ${productInfo.price_range}
            - USP: ${productInfo.usp}
            
            Target Audience:
            - Demographics: ${targetAudience.demographics}
            - Interests: ${targetAudience.interests?.join(', ')}
            - Pain Points: ${targetAudience.pain_points?.join(', ')}
            
            Campaign Goals: ${campaignGoals}
            
            Create 5 ad copy variations with:
            1. Headlines (30 characters max)
            2. Descriptions (90 characters max)
            3. Call-to-action suggestions
            4. Malaysia cultural adaptations
            5. Multi-language versions (Bahasa Malaysia priority)
            
            Ensure cultural sensitivity and local relevance.
        `;
    }

    // Parse AI responses
    parseOptimizationResponse(response) {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(response);
            return parsed;
        } catch {
            // If not JSON, extract structured information
            return this.extractStructuredData(response, 'optimization');
        }
    }

    parseAudienceInsights(response) {
        return this.extractStructuredData(response, 'audience_insights');
    }

    parseAdCopyVariations(response) {
        const variations = [];
        const lines = response.split('\n');
        let currentVariation = {};
        
        lines.forEach(line => {
            if (line.includes('Headline:')) {
                if (currentVariation.headline) {
                    variations.push(currentVariation);
                    currentVariation = {};
                }
                currentVariation.headline = line.replace('Headline:', '').trim();
            } else if (line.includes('Description:')) {
                currentVariation.description = line.replace('Description:', '').trim();
            } else if (line.includes('CTA:')) {
                currentVariation.cta = line.replace('CTA:', '').trim();
            }
        });
        
        if (currentVariation.headline) {
            variations.push(currentVariation);
        }
        
        return variations;
    }

    // Helper methods
    async getPrimaryProvider() {
        const settings = await this.getAISettings();
        return settings.primary_provider || 'openai';
    }

    async getFallbackProvider() {
        const settings = await this.getAISettings();
        return settings.fallback_provider;
    }

    async getProviderConfig(providerId) {
        // In production, this would fetch from secure storage
        const stored = localStorage.getItem(`ai_config_${providerId}`);
        return stored ? JSON.parse(stored) : null;
    }

    async storeProviderConfig(providerId, config) {
        // In production, this would store securely on backend
        localStorage.setItem(`ai_config_${providerId}`, JSON.stringify(config));
    }

    async getAISettings() {
        // In production, this would fetch from user settings
        return {
            primary_provider: 'openai',
            fallback_provider: 'gemini',
            enabled_features: ['campaign_optimization', 'ad_copy_generation', 'audience_insights']
        };
    }

    calculateConfidenceScore(response) {
        // Simple confidence scoring based on response characteristics
        let score = 0.5;
        
        if (response.includes('recommend') || response.includes('suggest')) score += 0.2;
        if (response.includes('data') || response.includes('analysis')) score += 0.1;
        if (response.includes('Malaysia') || response.includes('Malaysian')) score += 0.1;
        if (response.length > 500) score += 0.1;
        
        return Math.min(score, 1.0);
    }

    extractStructuredData(response, type) {
        // Extract structured information from unstructured AI response
        const data = {
            raw_response: response,
            extracted_points: [],
            recommendations: [],
            insights: []
        };
        
        const lines = response.split('\n');
        lines.forEach(line => {
            if (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.')) {
                data.extracted_points.push(line.trim());
            }
            if (line.toLowerCase().includes('recommend')) {
                data.recommendations.push(line.trim());
            }
            if (line.toLowerCase().includes('insight') || line.toLowerCase().includes('finding')) {
                data.insights.push(line.trim());
            }
        });
        
        return data;
    }

    async validateProviderConfig(providerId, config) {
        if (!config.apiKey) {
            return { valid: false, error: 'API key is required' };
        }
        
        if (providerId === 'custom' && !config.endpoint) {
            return { valid: false, error: 'Custom endpoint is required' };
        }
        
        return { valid: true };
    }

    async testProviderConnection(providerId, config) {
        try {
            // Simple test call to verify API key works
            const testResponse = await this.callAI(providerId, {
                prompt: 'Hello, please respond with "Connection successful"',
                context: 'test',
                max_tokens: 50
            });
            
            return {
                success: true,
                response: testResponse
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = AIIntegrationService;
