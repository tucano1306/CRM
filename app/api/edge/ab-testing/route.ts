/**
 * Edge Function: A/B Testing & Feature Flags
 * 
 * Runs on Vercel Edge Runtime for ultra-fast feature flag evaluation
 * Handles A/B test assignment, feature toggles, and experimental features
 * 
 * Use Cases:
 * - A/B test traffic splitting
 * - Feature flag evaluation
 * - Gradual feature rollouts
 * - User experience experiments
 * - Regional feature toggles
 */

import { NextRequest, NextResponse } from 'next/server'

// Enable Edge Runtime
export const runtime = 'edge'

// Cache feature flags for 5 minutes
export const revalidate = 300

interface FeatureFlag {
  name: string
  enabled: boolean
  rolloutPercentage: number
  conditions?: {
    countries?: string[]
    roles?: string[]
    userIds?: string[]
  }
  variant?: string
  metadata?: Record<string, any>
}

interface ABTest {
  name: string
  active: boolean
  trafficAllocation: number
  variants: {
    name: string
    weight: number
    config: Record<string, any>
  }[]
  conditions?: {
    countries?: string[]
    newUsers?: boolean
    roles?: string[]
  }
}

interface UserAssignment {
  userId?: string
  country: string
  role?: string
  isNewUser: boolean
  assignments: {
    featureFlags: Record<string, boolean | string>
    abTests: Record<string, string>
  }
  timestamp: number
}

// Feature Flags Configuration
const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // UI/UX Features
  'new-dashboard': {
    name: 'New Dashboard Design',
    enabled: true,
    rolloutPercentage: 75,
    conditions: {
      roles: ['SELLER', 'ADMIN']
    },
    metadata: {
      description: 'New dashboard with improved analytics',
      version: '2.0'
    }
  },
  
  'dark-mode': {
    name: 'Dark Mode Theme',
    enabled: true,
    rolloutPercentage: 100,
    metadata: {
      description: 'Dark theme support',
      defaultEnabled: false
    }
  },

  'mobile-app-banner': {
    name: 'Mobile App Download Banner',
    enabled: true,
    rolloutPercentage: 50,
    conditions: {
      countries: ['US', 'CA', 'MX']
    }
  },

  // Business Features
  'recurring-orders': {
    name: 'Recurring Orders Feature',
    enabled: true,
    rolloutPercentage: 80,
    conditions: {
      roles: ['CLIENT', 'SELLER']
    }
  },

  'bulk-pricing': {
    name: 'Bulk Pricing Discounts',
    enabled: true,
    rolloutPercentage: 60,
    conditions: {
      roles: ['SELLER']
    }
  },

  'advanced-analytics': {
    name: 'Advanced Analytics Dashboard',
    enabled: true,
    rolloutPercentage: 90,
    conditions: {
      roles: ['SELLER', 'ADMIN']
    }
  },

  // Payment Features
  'crypto-payments': {
    name: 'Cryptocurrency Payments',
    enabled: false, // Disabled by default
    rolloutPercentage: 10,
    conditions: {
      countries: ['US', 'CA']
    }
  },

  'buy-now-pay-later': {
    name: 'Buy Now, Pay Later Options',
    enabled: true,
    rolloutPercentage: 40,
    conditions: {
      countries: ['US', 'CA', 'GB']
    }
  }
}

// A/B Tests Configuration
const AB_TESTS: Record<string, ABTest> = {
  'checkout-flow': {
    name: 'Checkout Flow Optimization',
    active: true,
    trafficAllocation: 100,
    variants: [
      {
        name: 'control',
        weight: 50,
        config: {
          steps: 3,
          layout: 'vertical',
          showProgress: true
        }
      },
      {
        name: 'streamlined',
        weight: 50,
        config: {
          steps: 2,
          layout: 'horizontal',
          showProgress: false
        }
      }
    ]
  },

  'pricing-display': {
    name: 'Pricing Display Test',
    active: true,
    trafficAllocation: 80,
    variants: [
      {
        name: 'control',
        weight: 40,
        config: {
          showComparison: false,
          highlightSavings: false
        }
      },
      {
        name: 'comparison',
        weight: 30,
        config: {
          showComparison: true,
          highlightSavings: false
        }
      },
      {
        name: 'savings',
        weight: 30,
        config: {
          showComparison: true,
          highlightSavings: true
        }
      }
    ]
  },

  'onboarding-flow': {
    name: 'User Onboarding Experience',
    active: true,
    trafficAllocation: 75,
    conditions: {
      newUsers: true
    },
    variants: [
      {
        name: 'guided-tour',
        weight: 50,
        config: {
          type: 'guided',
          steps: 5,
          interactive: true
        }
      },
      {
        name: 'video-intro',
        weight: 50,
        config: {
          type: 'video',
          duration: 90,
          skippable: true
        }
      }
    ]
  }
}

/**
 * Hash function for consistent user assignment
 */
function hashUserId(userId: string, seed: string): number {
  let hash = 0
  const str = userId + seed
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100
}

/**
 * Check if user meets feature flag conditions
 */
function meetsConditions(
  flag: FeatureFlag,
  country: string,
  role?: string,
  userId?: string
): boolean {
  if (!flag.conditions) return true

  // Check country conditions
  if (flag.conditions.countries && !flag.conditions.countries.includes(country)) {
    return false
  }

  // Check role conditions
  if (flag.conditions.roles && role && !flag.conditions.roles.includes(role)) {
    return false
  }

  // Check specific user IDs
  if (flag.conditions.userIds && userId && !flag.conditions.userIds.includes(userId)) {
    return false
  }

  return true
}

/**
 * Check if user meets A/B test conditions
 */
function meetsABTestConditions(
  test: ABTest,
  country: string,
  role?: string,
  isNewUser?: boolean
): boolean {
  if (!test.conditions) return true

  // Check country conditions
  if (test.conditions.countries && !test.conditions.countries.includes(country)) {
    return false
  }

  // Check role conditions
  if (test.conditions.roles && role && !test.conditions.roles.includes(role)) {
    return false
  }

  // Check new user condition
  if (test.conditions.newUsers !== undefined && test.conditions.newUsers !== isNewUser) {
    return false
  }

  return true
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Extract user information
    const userId = request.headers.get('x-user-id') || undefined
    const role = request.headers.get('x-user-role') || undefined
    const country = request.headers.get('x-vercel-ip-country') || 'US'
    const isNewUser = request.headers.get('x-is-new-user') === 'true'

    // Get query parameters
    const url = new URL(request.url)
    const flagName = url.searchParams.get('flag')
    const testName = url.searchParams.get('test')

    // If requesting specific flag
    if (flagName) {
      const flag = FEATURE_FLAGS[flagName]
      if (!flag) {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        )
      }

      const enabled = flag.enabled && 
                     meetsConditions(flag, country, role, userId) &&
                     (userId ? hashUserId(userId, flagName) < flag.rolloutPercentage : Math.random() * 100 < flag.rolloutPercentage)

      return NextResponse.json({
        flag: flagName,
        enabled,
        variant: flag.variant,
        metadata: flag.metadata
      })
    }

    // If requesting specific A/B test
    if (testName) {
      const test = AB_TESTS[testName]
      if (!test) {
        return NextResponse.json(
          { error: 'A/B test not found' },
          { status: 404 }
        )
      }

      if (!test.active || !meetsABTestConditions(test, country, role, isNewUser)) {
        return NextResponse.json({
          test: testName,
          variant: 'control',
          config: test.variants[0]?.config || {}
        })
      }

      // Assign variant based on user hash and traffic allocation
      const hash = userId ? hashUserId(userId, testName) : Math.floor(Math.random() * 100)
      
      if (hash >= test.trafficAllocation) {
        return NextResponse.json({
          test: testName,
          variant: 'control',
          config: test.variants[0]?.config || {}
        })
      }

      // Select variant based on weights
      let cumulativeWeight = 0
      for (const variant of test.variants) {
        cumulativeWeight += variant.weight
        if (hash * (100 / test.trafficAllocation) < cumulativeWeight) {
          return NextResponse.json({
            test: testName,
            variant: variant.name,
            config: variant.config
          })
        }
      }

      // Fallback to first variant
      return NextResponse.json({
        test: testName,
        variant: test.variants[0].name,
        config: test.variants[0].config
      })
    }

    // Return all assignments for user
    const featureFlags: Record<string, boolean | string> = {}
    const abTests: Record<string, string> = {}

    // Evaluate all feature flags
    for (const [name, flag] of Object.entries(FEATURE_FLAGS)) {
      const enabled = flag.enabled && 
                     meetsConditions(flag, country, role, userId) &&
                     (userId ? hashUserId(userId, name) < flag.rolloutPercentage : Math.random() * 100 < flag.rolloutPercentage)
      
      featureFlags[name] = flag.variant || enabled
    }

    // Evaluate all A/B tests
    for (const [name, test] of Object.entries(AB_TESTS)) {
      if (!test.active || !meetsABTestConditions(test, country, role, isNewUser)) {
        abTests[name] = 'control'
        continue
      }

      const hash = userId ? hashUserId(userId, name) : Math.floor(Math.random() * 100)
      
      if (hash >= test.trafficAllocation) {
        abTests[name] = 'control'
        continue
      }

      // Select variant based on weights
      let cumulativeWeight = 0
      let selectedVariant = 'control'
      
      for (const variant of test.variants) {
        cumulativeWeight += variant.weight
        if (hash * (100 / test.trafficAllocation) < cumulativeWeight) {
          selectedVariant = variant.name
          break
        }
      }

      abTests[name] = selectedVariant
    }

    const response: UserAssignment = {
      userId,
      country,
      role,
      isNewUser,
      assignments: {
        featureFlags,
        abTests
      },
      timestamp: Date.now()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Runtime': 'edge',
        'X-Feature-Flags': Object.keys(featureFlags).length.toString(),
        'X-AB-Tests': Object.keys(abTests).length.toString()
      }
    })

  } catch (error) {
    console.error('[EDGE-AB] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Feature flag evaluation failed',
        assignments: {
          featureFlags: {},
          abTests: {}
        },
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      }
    )
  }
}

/**
 * POST: Update feature flag or A/B test (admin only)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const role = request.headers.get('x-user-role')
    
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { type, name, updates } = body

    if (type === 'feature' && FEATURE_FLAGS[name]) {
      // Update feature flag (in production, this would update a database)
      FEATURE_FLAGS[name] = { ...FEATURE_FLAGS[name], ...updates }
      
      return NextResponse.json({
        success: true,
        updated: name,
        type: 'feature'
      })
    }

    if (type === 'test' && AB_TESTS[name]) {
      // Update A/B test (in production, this would update a database)
      AB_TESTS[name] = { ...AB_TESTS[name], ...updates }
      
      return NextResponse.json({
        success: true,
        updated: name,
        type: 'test'
      })
    }

    return NextResponse.json(
      { error: 'Feature flag or A/B test not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('[EDGE-AB] POST Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Update failed',
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      }
    )
  }
}