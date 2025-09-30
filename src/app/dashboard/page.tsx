'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown,
  Target, 
  Users, 
  BarChart3, 
  Zap, 
  Globe, 
  Shield, 
  Rocket,
  CheckCircle,
  ArrowRight,
  Play,
  Plus,
  Settings,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  MousePointer,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatNumber, formatPercentage, getStatusColor, getMetricColor } from '@/lib/utils'

// Mock data for dashboard
const mockCampaigns = [
  {
    id: '1',
    name: 'Perokok & Vape Malaysia Q4',
    status: 'active',
    budget: 5000,
    spent: 3250,
    impressions: 125000,
    clicks: 2500,
    conversions: 85,
    ctr: 2.0,
    cpc: 1.30,
    cvr: 3.4,
    roas: 4.2,
    created_at: '2025-09-15'
  },
  {
    id: '2',
    name: 'Kesihatan & Wellness Campaign',
    status: 'active',
    budget: 3000,
    spent: 1800,
    impressions: 89000,
    clicks: 1780,
    conversions: 62,
    ctr: 2.0,
    cpc: 1.01,
    cvr: 3.5,
    roas: 3.8,
    created_at: '2025-09-20'
  },
  {
    id: '3',
    name: 'Pekerja Luar Targeting',
    status: 'paused',
    budget: 2500,
    spent: 1200,
    impressions: 45000,
    clicks: 900,
    conversions: 28,
    ctr: 2.0,
    cpc: 1.33,
    cvr: 3.1,
    roas: 3.2,
    created_at: '2025-09-10'
  }
]

const mockStats = {
  totalSpend: 6250,
  totalImpressions: 259000,
  totalClicks: 5180,
  totalConversions: 175,
  avgCTR: 2.0,
  avgCPC: 1.21,
  avgCVR: 3.4,
  avgROAS: 3.9
}

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState(mockCampaigns)
  const [stats, setStats] = useState(mockStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">DemandGen Pro</h1>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              
              <Button size="sm" className="btn-malaysia">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your Google Ads Demand Gen campaigns today.
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSpend)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalImpressions)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalClicks)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+15.3%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(stats.totalConversions)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+22.1%</span> from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CTR</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(stats.avgCTR)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+0.3%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CPC</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.avgCPC)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600">+5.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg CVR</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(stats.avgCVR)}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+1.1%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg ROAS</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgROAS.toFixed(1)}x</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+18.5%</span> from last month
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Campaigns Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Campaigns</CardTitle>
                  <CardDescription>
                    Manage your Google Ads Demand Gen campaigns
                  </CardDescription>
                </div>
                <Button className="btn-malaysia">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Impressions</th>
                      <th>Clicks</th>
                      <th>CTR</th>
                      <th>CPC</th>
                      <th>Conversions</th>
                      <th>ROAS</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td>
                          <div>
                            <div className="font-medium">{campaign.name}</div>
                            <div className="text-sm text-muted-foreground">
                              Created {campaign.created_at}
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </td>
                        <td>{formatCurrency(campaign.budget)}</td>
                        <td>
                          <div>
                            <div>{formatCurrency(campaign.spent)}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatPercentage((campaign.spent / campaign.budget) * 100)}
                            </div>
                          </div>
                        </td>
                        <td>{formatNumber(campaign.impressions)}</td>
                        <td>{formatNumber(campaign.clicks)}</td>
                        <td className={getMetricColor(campaign.ctr - 2)}>
                          {formatPercentage(campaign.ctr)}
                        </td>
                        <td>{formatCurrency(campaign.cpc)}</td>
                        <td>
                          <div>
                            <div>{campaign.conversions}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatPercentage(campaign.cvr)} CVR
                            </div>
                          </div>
                        </td>
                        <td className={getMetricColor(campaign.roas - 3)}>
                          {campaign.roas.toFixed(1)}x
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mt-8"
        >
          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Audience Builder</CardTitle>
                  <CardDescription>Create Malaysia-specific audiences</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Build custom audiences using our prebuilt Malaysia packs or create your own targeting.
              </p>
              <Button variant="outline" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Build Audience
              </Button>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Automation Rules</CardTitle>
                  <CardDescription>Set up smart campaign rules</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Automate bid adjustments, budget optimization, and performance monitoring.
              </p>
              <Button variant="outline" className="w-full">
                <Zap className="w-4 h-4 mr-2" />
                Create Rules
              </Button>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Performance Reports</CardTitle>
                  <CardDescription>Analyze campaign performance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Generate detailed reports with insights and recommendations for optimization.
              </p>
              <Button variant="outline" className="w-full">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
