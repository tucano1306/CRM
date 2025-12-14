/**
 * React Hook: Edge Functions Integration
 * 
 * Provides easy integration with Vercel Edge Functions
 * for authentication, geolocation, feature flags, and analytics
 */

import { useState, useEffect, useCallback } from 'react'

interface EdgeAuth {
  authenticated: boolean
  userId?: string
  role?: string
  sessionId?: string
  region?: string
}

interface EdgeLocation {
  location: {
    country: string
    region: string
    city: string
    flag: string
  }
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
  }
}

interface EdgeFeatures {
  assignments: {
    featureFlags: Record<string, boolean | string>
    abTests: Record<string, string>
  }
}

interface EdgeAnalyticsEvent {
  type: 'pageview' | 'click' | 'conversion' | 'performance' | 'error' | 'custom'
  page?: string
  action?: string
  category?: string
  label?: string
  value?: number
  metadata?: Record<string, any>
}

interface UseEdgeFunctionsOptions {
  enableAuth?: boolean
  enableLocation?: boolean
  enableFeatures?: boolean
  enableAnalytics?: boolean
  refreshInterval?: number
}

interface UseEdgeFunctionsReturn {
  // Data
  auth: EdgeAuth | null
  location: EdgeLocation | null
  features: EdgeFeatures | null
  
  // Loading states
  loading: boolean
  authLoading: boolean
  locationLoading: boolean
  featuresLoading: boolean
  
  // Error states
  error: string | null
  authError: string | null
  locationError: string | null
  featuresError: string | null
  
  // Functions
  checkAuth: () => Promise<EdgeAuth | null>
  getLocation: () => Promise<EdgeLocation | null>
  getFeatures: () => Promise<EdgeFeatures | null>
  trackEvent: (event: EdgeAnalyticsEvent) => Promise<void>
  trackEvents: (events: EdgeAnalyticsEvent[]) => Promise<void>
  preprocessRequest: (endpoint: string, data: any) => Promise<{ valid: boolean; errors?: string[]; transformedData?: any }>
  
  // Utilities
  hasFeature: (flagName: string) => boolean
  getABTestVariant: (testName: string) => string
  isInRegion: (countries: string[]) => boolean
  formatPrice: (price: number) => string
}

export function useEdgeFunctions(
  userId?: string,
  role?: string,
  options: UseEdgeFunctionsOptions = {}
): UseEdgeFunctionsReturn {
  const {
    enableAuth = true,
    enableLocation = true,
    enableFeatures = true,
    enableAnalytics = true,
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = options

  // State
  const [auth, setAuth] = useState<EdgeAuth | null>(null)
  const [location, setLocation] = useState<EdgeLocation | null>(null)
  const [features, setFeatures] = useState<EdgeFeatures | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [featuresLoading, setFeaturesLoading] = useState(false)
  
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [featuresError, setFeaturesError] = useState<string | null>(null)

  // Session ID for analytics
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

  // Check authentication
  const checkAuth = useCallback(async (): Promise<EdgeAuth | null> => {
    if (!enableAuth) return null
    
    try {
      setAuthLoading(true)
      setAuthError(null)
      
      const response = await fetch('/api/edge/auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`Auth check failed: ${response.status}`)
      }
      
      const authData = await response.json()
      setAuth(authData)
      return authData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Auth check failed'
      setAuthError(errorMessage)
      setAuth(null)
      return null
    } finally {
      setAuthLoading(false)
    }
  }, [enableAuth])

  // Get location and regional settings
  const getLocation = useCallback(async (): Promise<EdgeLocation | null> => {
    if (!enableLocation) return null
    
    try {
      setLocationLoading(true)
      setLocationError(null)
      
      const response = await fetch('/api/edge/geolocation')
      
      if (!response.ok) {
        throw new Error(`Location check failed: ${response.status}`)
      }
      
      const locationData = await response.json()
      setLocation(locationData)
      return locationData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Location check failed'
      setLocationError(errorMessage)
      setLocation(null)
      return null
    } finally {
      setLocationLoading(false)
    }
  }, [enableLocation])

  // Get feature flags and A/B tests
  const getFeatures = useCallback(async (): Promise<EdgeFeatures | null> => {
    if (!enableFeatures || !userId) return null
    
    try {
      setFeaturesLoading(true)
      setFeaturesError(null)
      
      const response = await fetch('/api/edge/ab-testing', {
        headers: {
          'x-user-id': userId,
          'x-user-role': role || '',
          'x-is-new-user': 'false' // You might want to track this properly
        }
      })
      
      if (!response.ok) {
        throw new Error(`Features check failed: ${response.status}`)
      }
      
      const featuresData = await response.json()
      setFeatures(featuresData)
      return featuresData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Features check failed'
      setFeaturesError(errorMessage)
      setFeatures(null)
      return null
    } finally {
      setFeaturesLoading(false)
    }
  }, [enableFeatures, userId, role])

  // Track single analytics event
  const trackEvent = useCallback(async (event: EdgeAnalyticsEvent): Promise<void> => {
    if (!enableAnalytics) return
    
    try {
      await fetch('/api/edge/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userId,
          events: [event]
        })
      })
    } catch (err) {
      console.warn('Analytics tracking failed:', err)
    }
  }, [enableAnalytics, sessionId, userId])

  // Track multiple analytics events
  const trackEvents = useCallback(async (events: EdgeAnalyticsEvent[]): Promise<void> => {
    if (!enableAnalytics || events.length === 0) return
    
    try {
      await fetch('/api/edge/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          userId,
          events
        })
      })
    } catch (err) {
      console.warn('Analytics tracking failed:', err)
    }
  }, [enableAnalytics, sessionId, userId])

  // Preprocess API requests
  const preprocessRequest = useCallback(async (endpoint: string, data: any) => {
    try {
      const response = await fetch('/api/edge/preprocess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-endpoint': endpoint
        },
        body: JSON.stringify(data)
      })
      
      return await response.json()
    } catch (err) {
      console.error('Edge preprocessing failed:', err)
      return {
        valid: false,
        errors: ['Preprocessing failed']
      }
    }
  }, [])

  // Utility: Check if feature flag is enabled
  const hasFeature = useCallback((flagName: string): boolean => {
    return Boolean(features?.assignments?.featureFlags?.[flagName])
  }, [features])

  // Utility: Get A/B test variant
  const getABTestVariant = useCallback((testName: string): string => {
    return features?.assignments?.abTests?.[testName] || 'control'
  }, [features])

  // Utility: Check if user is in specific region
  const isInRegion = useCallback((countries: string[]): boolean => {
    return countries.includes(location?.location?.country || '')
  }, [location])

  // Utility: Format price with regional currency
  const formatPrice = useCallback((price: number): string => {
    if (!location?.currency) {
      return `$${price.toFixed(2)}`
    }
    
    const convertedPrice = price * location.currency.rate
    return `${location.currency.symbol}${convertedPrice.toFixed(2)}`
  }, [location])

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      setError(null)
      
      try {
        const promises = []
        
        if (enableAuth) promises.push(checkAuth())
        if (enableLocation) promises.push(getLocation())
        if (enableFeatures && userId) promises.push(getFeatures())
        
        await Promise.all(promises)
        
        // Track page view if analytics enabled
        if (enableAnalytics) {
          trackEvent({
            type: 'pageview',
            page: globalThis.location.pathname,
            category: 'navigation'
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load edge data')
      } finally {
        setLoading(false)
      }
    }
    
    loadInitialData()
  }, [enableAuth, enableLocation, enableFeatures, enableAnalytics, userId, checkAuth, getLocation, getFeatures, trackEvent])

  // Periodic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return
    
    const interval = setInterval(() => {
      if (enableAuth) checkAuth()
      if (enableFeatures && userId) getFeatures()
      // Don't refresh location as it rarely changes
    }, refreshInterval)
    
    return () => clearInterval(interval)
  }, [refreshInterval, enableAuth, enableFeatures, userId, checkAuth, getFeatures])

  // Track page changes
  useEffect(() => {
    if (!enableAnalytics) return
    
    const handleRouteChange = () => {
      trackEvent({
        type: 'pageview',
        page: globalThis.location.pathname,
        category: 'navigation'
      })
    }
    
    // Listen for route changes (Next.js)
    if (typeof globalThis.window !== 'undefined') {
      globalThis.addEventListener('popstate', handleRouteChange)
      return () => globalThis.removeEventListener('popstate', handleRouteChange)
    }
  }, [enableAnalytics, trackEvent])

  return {
    // Data
    auth,
    location,
    features,
    
    // Loading states
    loading,
    authLoading,
    locationLoading,
    featuresLoading,
    
    // Error states
    error,
    authError,
    locationError,
    featuresError,
    
    // Functions
    checkAuth,
    getLocation,
    getFeatures,
    trackEvent,
    trackEvents,
    preprocessRequest,
    
    // Utilities
    hasFeature,
    getABTestVariant,
    isInRegion,
    formatPrice
  }
}