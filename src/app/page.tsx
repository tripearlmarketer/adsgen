'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  Target, 
  Users, 
  BarChart3, 
  Zap, 
  Globe, 
  Shield, 
  Rocket,
  CheckCircle,
  ArrowRight,
  Play
} from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Target,
    title: 'Malaysia-Focused Targeting',
    description: 'Prebuilt audience packs untuk pasaran Malaysia termasuk Perokok & Vape, Kesihatan, dan lain-lain.',
    color: 'text-red-600'
  },
  {
    icon: Zap,
    title: 'Automation Rules',
    description: 'Automate bid adjustments, budget optimization, dan campaign management dengan rules yang pintar.',
    color: 'text-yellow-600'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Real-time reporting dengan insights mendalam untuk optimize ROI dan performance.',
    color: 'text-blue-600'
  },
  {
    icon: Users,
    title: 'Audience Builder',
    description: 'Build custom audiences dengan demographic, interest, dan behavioral targeting yang tepat.',
    color: 'text-green-600'
  },
  {
    icon: Globe,
    title: 'Multi-Account Management',
    description: 'Manage multiple Google Ads accounts dari satu dashboard yang unified.',
    color: 'text-purple-600'
  },
  {
    icon: Shield,
    title: 'Performance Monitoring',
    description: 'Real-time alerts dan notifications untuk performance issues dan opportunities.',
    color: 'text-orange-600'
  }
]

const stats = [
  { label: 'Campaign Types', value: '5+', description: 'Demand Gen campaign formats' },
  { label: 'Audience Packs', value: '4', description: 'Malaysia-specific presets' },
  { label: 'Automation Rules', value: '10+', description: 'Smart optimization rules' },
  { label: 'Report Types', value: '8+', description: 'Comprehensive analytics' }
]

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'online' | 'offline'>('loading')

  useEffect(() => {
    // Check API status
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setApiStatus('online')
        } else {
          setApiStatus('offline')
        }
      })
      .catch(() => setApiStatus('offline'))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">DemandGen Pro</h1>
                <p className="text-xs text-muted-foreground">Malaysia Edition</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={apiStatus === 'online' ? 'default' : 'destructive'} className="animate-pulse">
                <div className={`w-2 h-2 rounded-full mr-2 ${apiStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                API {apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking...'}
              </Badge>
              
              <Button asChild>
                <Link href="/dashboard">
                  <Play className="w-4 h-4 mr-2" />
                  Launch Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center space-x-2 bg-muted px-4 py-2 rounded-full mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Now Live in Malaysia</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Google Ads Demand Gen
              <br />
              <span className="malaysia-gradient bg-clip-text text-transparent">
                untuk Malaysia
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Platform pengurusan kempen Google Ads yang direka khas untuk pasaran Malaysia. 
              Automate, optimize, dan scale kempen Demand Gen anda dengan mudah.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="btn-malaysia">
                <Link href="/dashboard">
                  <Rocket className="w-5 h-5 mr-2" />
                  Start Building Campaigns
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" asChild>
                <Link href="/features">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Explore Features
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="font-medium mb-1">{stat.label}</div>
                <div className="text-sm text-muted-foreground">{stat.description}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features for Malaysia Market</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create, manage, and optimize Google Ads Demand Gen campaigns 
              specifically designed for Malaysian businesses.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="card-hover h-full">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Malaysia Audience Packs Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Malaysia Audience Packs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prebuilt audience segments yang direka khas untuk pasaran Malaysia, 
              berdasarkan research dan data lokal.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Perokok & Vape',
                description: 'Target smokers dan vape users di Malaysia',
                icon: '🚬',
                size: '2.1M+'
              },
              {
                name: 'Imun & Gaya Hidup Sihat',
                description: 'Health-conscious consumers dan wellness enthusiasts',
                icon: '💪',
                size: '1.8M+'
              },
              {
                name: 'Pekerja Luar & Pemandu',
                description: 'Outdoor workers, drivers, dan blue-collar workers',
                icon: '🚛',
                size: '1.5M+'
              },
              {
                name: 'Pasca-Sakit Recovery',
                description: 'Post-illness recovery dan rehabilitation market',
                icon: '🏥',
                size: '900K+'
              }
            ].map((pack, index) => (
              <motion.div
                key={pack.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="card-hover text-center">
                  <CardHeader>
                    <div className="text-4xl mb-4">{pack.icon}</div>
                    <CardTitle className="text-lg">{pack.name}</CardTitle>
                    <Badge variant="secondary">{pack.size} reach</Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{pack.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-6">
              Ready to Scale Your Google Ads Campaigns?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join Malaysian businesses yang sudah menggunakan DemandGen Pro untuk 
              optimize their Google Ads performance dan increase ROI.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="btn-malaysia">
                <Link href="/dashboard">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Get Started Free
                </Link>
              </Button>
              
              <Button size="lg" variant="outline" asChild>
                <Link href="/api/info" target="_blank">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  View API Documentation
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-red-600 to-yellow-500 rounded flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">DemandGen Pro</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional Google Ads campaign management platform untuk Malaysia market.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Campaign Management</li>
                <li>Audience Builder</li>
                <li>Automation Rules</li>
                <li>Performance Reports</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Malaysia Focus</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Local Audience Packs</li>
                <li>MYR Currency Support</li>
                <li>Kuala Lumpur Timezone</li>
                <li>Bilingual Interface</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">API Status</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm">Backend API</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {apiStatus === 'online' ? 'All systems operational' : 'Checking connection...'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 DemandGen Pro. Built for Malaysian businesses with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
