/**
 * Edge Function: Geolocation & Regional Content
 * 
 * Runs on Vercel Edge Runtime for ultra-fast geolocation detection
 * Provides regional pricing, content localization, and market-specific features
 * 
 * Use Cases:
 * - Detect user location for regional pricing
 * - Content localization (language, currency, timezone)
 * - Market-specific feature toggles
 * - Regional compliance (GDPR, CCPA, etc.)
 * - Shipping cost estimation
 */

import { NextRequest, NextResponse } from 'next/server'

// Enable Edge Runtime
export const runtime = 'edge'

// Cache geolocation data for 1 hour
export const revalidate = 3600

interface GeoLocation {
  country: string
  region: string
  city: string
  latitude?: string
  longitude?: string
  timezone?: string
  flag?: string
}

interface RegionalConfig {
  location: GeoLocation
  currency: {
    code: string
    symbol: string
    rate: number
  }
  language: {
    code: string
    name: string
    rtl: boolean
  }
  features: {
    paymentMethods: string[]
    shippingAvailable: boolean
    taxRequired: boolean
    gdprRequired: boolean
  }
  market: {
    name: string
    businessHours: string
    supportPhone?: string
    legalEntity?: string
  }
  timestamp: number
}

// Regional configurations database
const REGIONAL_CONFIGS: Record<string, Partial<RegionalConfig>> = {
  // North America
  US: {
    currency: { code: 'USD', symbol: '$', rate: 1.0 },
    language: { code: 'en', name: 'English', rtl: false },
    features: {
      paymentMethods: ['card', 'paypal', 'apple_pay', 'google_pay'],
      shippingAvailable: true,
      taxRequired: true,
      gdprRequired: false
    },
    market: {
      name: 'United States',
      businessHours: '9 AM - 6 PM EST',
      supportPhone: '+1-800-555-0123'
    }
  },
  CA: {
    currency: { code: 'CAD', symbol: 'C$', rate: 1.35 },
    language: { code: 'en', name: 'English', rtl: false },
    features: {
      paymentMethods: ['card', 'paypal', 'interac'],
      shippingAvailable: true,
      taxRequired: true,
      gdprRequired: false
    },
    market: {
      name: 'Canada',
      businessHours: '9 AM - 6 PM EST'
    }
  },
  MX: {
    currency: { code: 'MXN', symbol: '$', rate: 17.0 },
    language: { code: 'es', name: 'Español', rtl: false },
    features: {
      paymentMethods: ['card', 'oxxo', 'spei'],
      shippingAvailable: true,
      taxRequired: true,
      gdprRequired: false
    },
    market: {
      name: 'México',
      businessHours: '9 AM - 6 PM CST'
    }
  },
  
  // Europe
  GB: {
    currency: { code: 'GBP', symbol: '£', rate: 0.79 },
    language: { code: 'en', name: 'English', rtl: false },
    features: {
      paymentMethods: ['card', 'paypal', 'klarna'],
      shippingAvailable: true,
      taxRequired: true,
      gdprRequired: true
    },
    market: {
      name: 'United Kingdom',
      businessHours: '9 AM - 5 PM GMT'
    }
  },
  DE: {
    currency: { code: 'EUR', symbol: '€', rate: 0.85 },
    language: { code: 'de', name: 'Deutsch', rtl: false },
    features: {
      paymentMethods: ['card', 'paypal', 'sofort', 'giropay'],
      shippingAvailable: true,
      taxRequired: true,
      gdprRequired: true
    },
    market: {
      name: 'Deutschland',
      businessHours: '9 AM - 5 PM CET'
    }
  },
  FR: {
    currency: { code: 'EUR', symbol: '€', rate: 0.85 },
    language: { code: 'fr', name: 'Français', rtl: false },
    features: {
      paymentMethods: ['card', 'paypal', 'bancontact'],
      shippingAvailable: true,
      taxRequired: true,
      gdprRequired: true
    },
    market: {
      name: 'France',
      businessHours: '9 AM - 5 PM CET'
    }
  },

  // Default fallback
  DEFAULT: {
    currency: { code: 'USD', symbol: '$', rate: 1.0 },
    language: { code: 'en', name: 'English', rtl: false },
    features: {
      paymentMethods: ['card', 'paypal'],
      shippingAvailable: false,
      taxRequired: false,
      gdprRequired: false
    },
    market: {
      name: 'International',
      businessHours: '24/7'
    }
  }
}

// Country flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  US: '🇺🇸', CA: '🇨🇦', MX: '🇲🇽',
  GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷',
  ES: '🇪🇸', IT: '🇮🇹', BR: '🇧🇷',
  AR: '🇦🇷', CL: '🇨🇱', CO: '🇨🇴'
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Extract geolocation from Vercel Edge headers
    const country = request.headers.get('x-vercel-ip-country') || 'US'
    const region = request.headers.get('x-vercel-ip-country-region') || 'Unknown'
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown'
    const latitude = request.headers.get('x-vercel-ip-latitude') || '0'
    const longitude = request.headers.get('x-vercel-ip-longitude') || '0'
    
    // Get timezone from geolocation or headers
    const timezone = request.headers.get('cf-timezone') || 
                    Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Build location object
    const location: GeoLocation = {
      country,
      region,
      city,
      latitude,
      longitude,
      timezone,
      flag: COUNTRY_FLAGS[country] || '🌍'
    }

    // Get regional configuration
    const regionalConfig = REGIONAL_CONFIGS[country] || REGIONAL_CONFIGS.DEFAULT
    
    // Build complete response
    const response: RegionalConfig = {
      location,
      currency: regionalConfig.currency!,
      language: regionalConfig.language!,
      features: regionalConfig.features!,
      market: regionalConfig.market!,
      timestamp: Date.now()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Runtime': 'edge',
        'X-User-Country': country,
        'X-User-Currency': regionalConfig.currency?.code || 'USD'
      }
    })

  } catch (error) {
    console.error('[EDGE-GEO] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Geolocation detection failed',
        fallback: REGIONAL_CONFIGS.DEFAULT,
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
 * POST: Custom Location Override
 * Allows manual location setting for testing or user preference
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { country, action } = body

    if (!country) {
      return NextResponse.json(
        { error: 'Country code required' },
        { status: 400 }
      )
    }

    // Validate country code
    if (!REGIONAL_CONFIGS[country] && country !== 'DEFAULT') {
      return NextResponse.json(
        { error: 'Unsupported country code' },
        { status: 400 }
      )
    }

    const regionalConfig = REGIONAL_CONFIGS[country] || REGIONAL_CONFIGS.DEFAULT
    
    // Handle different actions
    switch (action) {
      case 'pricing':
        return NextResponse.json({
          currency: regionalConfig.currency,
          taxRequired: regionalConfig.features?.taxRequired,
          country
        })

      case 'features':
        return NextResponse.json({
          features: regionalConfig.features,
          country
        })

      case 'localization':
        return NextResponse.json({
          language: regionalConfig.language,
          market: regionalConfig.market,
          country
        })

      default:
        // Return full config
        const location: GeoLocation = {
          country,
          region: 'Override',
          city: 'Override',
          flag: COUNTRY_FLAGS[country] || '🌍'
        }

        return NextResponse.json({
          location,
          ...regionalConfig,
          timestamp: Date.now()
        })
    }

  } catch (error) {
    console.error('[EDGE-GEO] POST Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Location override failed',
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

/**
 * Helper function: Calculate shipping cost based on location
 * Can be called by other edge functions
 */
async function calculateShipping(country: string, weight: number) {
  const config = REGIONAL_CONFIGS[country] || REGIONAL_CONFIGS.DEFAULT
  
  if (!config.features?.shippingAvailable) {
    return { available: false, cost: 0 }
  }

  // Basic shipping calculation (in production, use actual shipping API)
  const baseCost = country === 'US' ? 5.99 : 
                   country === 'CA' ? 8.99 : 
                   country === 'MX' ? 7.99 : 
                   15.99 // International

  const weightMultiplier = Math.max(1, Math.ceil(weight / 1000)) // Per kg
  
  return {
    available: true,
    cost: baseCost * weightMultiplier,
    currency: config.currency?.code,
    estimatedDays: country === 'US' ? '2-3' : 
                   country === 'CA' ? '3-5' : 
                   country === 'MX' ? '5-7' : 
                   '7-14'
  }
}