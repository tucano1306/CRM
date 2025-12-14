/**
 * Edge Function: Lightweight Analytics & Performance Tracking
 * 
 * Runs on Vercel Edge Runtime for ultra-fast analytics collection
 * Handles user tracking, performance metrics, and event collection
 * 
 * Use Cases:
 * - Page view tracking
 * - Performance metrics collection
 * - User behavior analytics
 * - A/B test result tracking
 * - Real-time monitoring
 */

import { NextRequest, NextResponse } from 'next/server'

// Enable Edge Runtime
export const runtime = 'edge'

interface AnalyticsEvent {
  type: 'pageview' | 'click' | 'conversion' | 'performance' | 'error' | 'custom'
  page?: string
  action?: string
  category?: string
  label?: string
  value?: number
  userId?: string
  sessionId?: string
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceMetrics {
  dns?: number
  connect?: number
  request?: number
  response?: number
  dom?: number
  load?: number
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
}

interface UserSession {
  sessionId: string
  userId?: string
  startTime: number
  lastActivity: number
  pageViews: number
  events: number
  country: string
  device: string
  browser: string
  referrer?: string
  abTests?: Record<string, string>
  features?: Record<string, boolean>
}

interface AnalyticsResponse {
  success: boolean
  eventId?: string
  sessionId?: string
  message?: string
  metrics?: {
    totalEvents: number
    activeSessions: number
    region: string
  }
}

// In-memory stores (in production, use Redis/Database)
const analyticsEvents = new Map<string, AnalyticsEvent[]>()
const userSessions = new Map<string, UserSession>()
const performanceMetrics = new Map<string, PerformanceMetrics[]>()

// Configuration
const MAX_EVENTS_PER_SESSION = 1000
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const MAX_STORED_EVENTS = 10000

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract device info from User-Agent
 */
function getDeviceInfo(userAgent: string): { device: string; browser: string } {
  const ua = userAgent.toLowerCase()
  
  let device = 'desktop'
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'tablet'
  }

  let browser = 'unknown'
  if (ua.includes('chrome')) browser = 'chrome'
  else if (ua.includes('firefox')) browser = 'firefox'
  else if (ua.includes('safari')) browser = 'safari'
  else if (ua.includes('edge')) browser = 'edge'

  return { device, browser }
}

/**
 * Get or create user session
 */
function getOrCreateSession(
  sessionId: string, 
  userId: string | undefined, 
  country: string,
  device: string,
  browser: string,
  referrer?: string
): UserSession {
  const existing = userSessions.get(sessionId)
  const now = Date.now()

  if (existing && (now - existing.lastActivity) < SESSION_TIMEOUT) {
    // Update existing session
    existing.lastActivity = now
    userSessions.set(sessionId, existing)
    return existing
  }

  // Create new session
  const newSession: UserSession = {
    sessionId,
    userId,
    startTime: now,
    lastActivity: now,
    pageViews: 0,
    events: 0,
    country,
    device,
    browser,
    referrer
  }

  userSessions.set(sessionId, newSession)
  return newSession
}

/**
 * Store analytics event
 */
function storeEvent(event: AnalyticsEvent, sessionId: string) {
  const eventId = generateEventId()
  
  // Store event
  if (!analyticsEvents.has(sessionId)) {
    analyticsEvents.set(sessionId, [])
  }
  
  const sessionEvents = analyticsEvents.get(sessionId)!
  
  // Limit events per session
  if (sessionEvents.length >= MAX_EVENTS_PER_SESSION) {
    sessionEvents.shift() // Remove oldest
  }
  
  sessionEvents.push({ ...event, timestamp: Date.now() })
  
  // Global event limit
  const totalEvents = Array.from(analyticsEvents.values()).reduce((sum, events) => sum + events.length, 0)
  if (totalEvents > MAX_STORED_EVENTS) {
    // Remove oldest session
    const oldestSession = Array.from(analyticsEvents.keys())[0]
    analyticsEvents.delete(oldestSession)
  }

  return eventId
}

/**
 * Clean up expired sessions
 */
function cleanupSessions() {
  const now = Date.now()
  for (const [sessionId, session] of userSessions.entries()) {
    if ((now - session.lastActivity) > SESSION_TIMEOUT) {
      userSessions.delete(sessionId)
      analyticsEvents.delete(sessionId)
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Extract headers
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const country = request.headers.get('x-vercel-ip-country') || 'unknown'
    const referer = request.headers.get('referer')
    
    // Get device info
    const { device, browser } = getDeviceInfo(userAgent)

    // Parse request body
    const body = await request.json()
    const { 
      events = [], 
      sessionId, 
      userId, 
      performance,
      abTests,
      features 
    } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, message: 'Session ID required' },
        { status: 400 }
      )
    }

    // Get or create session
    const session = getOrCreateSession(sessionId, userId, country, device, browser, referer || undefined)
    
    // Update session with A/B tests and features
    if (abTests) session.abTests = abTests
    if (features) session.features = features

    // Process events
    const eventIds: string[] = []
    
    for (const eventData of events) {
      const event: AnalyticsEvent = {
        type: eventData.type || 'custom',
        page: eventData.page,
        action: eventData.action,
        category: eventData.category,
        label: eventData.label,
        value: eventData.value,
        userId: userId || session.userId,
        sessionId,
        timestamp: Date.now(),
        metadata: {
          country,
          device,
          browser,
          referrer: referer,
          ...eventData.metadata
        }
      }

      const eventId = storeEvent(event, sessionId)
      eventIds.push(eventId)

      // Update session counters
      session.events++
      if (event.type === 'pageview') {
        session.pageViews++
      }
    }

    // Store performance metrics
    if (performance) {
      if (!performanceMetrics.has(sessionId)) {
        performanceMetrics.set(sessionId, [])
      }
      
      const sessionPerf = performanceMetrics.get(sessionId)!
      sessionPerf.push({
        ...performance,
        timestamp: Date.now()
      } as any)

      // Limit performance entries
      if (sessionPerf.length > 100) {
        sessionPerf.shift()
      }
    }

    // Update session
    userSessions.set(sessionId, session)

    const response: AnalyticsResponse = {
      success: true,
      eventId: eventIds[0],
      sessionId,
      message: `Processed ${events.length} events`,
      metrics: {
        totalEvents: session.events,
        activeSessions: userSessions.size,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Runtime': 'edge',
        'X-Session-Events': session.events.toString(),
        'X-Active-Sessions': userSessions.size.toString()
      }
    })

  } catch (error) {
    console.error('[EDGE-ANALYTICS] Error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Analytics processing failed'
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
 * GET: Retrieve analytics data and metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const metric = url.searchParams.get('metric')
    const _userId = url.searchParams.get('userId') // Available for future per-user analytics

    // Clean up expired sessions
    cleanupSessions()

    if (sessionId) {
      // Get specific session data
      const session = userSessions.get(sessionId)
      const events = analyticsEvents.get(sessionId) || []
      const performance = performanceMetrics.get(sessionId) || []

      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        session,
        events: events.slice(-50), // Last 50 events
        performance: performance.slice(-10), // Last 10 performance entries
        metrics: {
          totalEvents: events.length,
          totalPerformanceEntries: performance.length,
          sessionDuration: Date.now() - session.startTime
        }
      })
    }

    if (metric === 'overview') {
      // Get overview metrics
      const now = Date.now()
      const activeSessions = Array.from(userSessions.values())
        .filter(session => (now - session.lastActivity) < SESSION_TIMEOUT)

      const totalEvents = Array.from(analyticsEvents.values())
        .reduce((sum, events) => sum + events.length, 0)

      const totalPageViews = activeSessions
        .reduce((sum, session) => sum + session.pageViews, 0)

      // Device breakdown
      const deviceStats = activeSessions.reduce((stats, session) => {
        stats[session.device] = (stats[session.device] || 0) + 1
        return stats
      }, {} as Record<string, number>)

      // Browser breakdown
      const browserStats = activeSessions.reduce((stats, session) => {
        stats[session.browser] = (stats[session.browser] || 0) + 1
        return stats
      }, {} as Record<string, number>)

      // Country breakdown
      const countryStats = activeSessions.reduce((stats, session) => {
        stats[session.country] = (stats[session.country] || 0) + 1
        return stats
      }, {} as Record<string, number>)

      return NextResponse.json({
        overview: {
          activeSessions: activeSessions.length,
          totalEvents,
          totalPageViews,
          avgEventsPerSession: activeSessions.length > 0 ? totalEvents / activeSessions.length : 0,
          avgPageViewsPerSession: activeSessions.length > 0 ? totalPageViews / activeSessions.length : 0
        },
        breakdown: {
          devices: deviceStats,
          browsers: browserStats,
          countries: countryStats
        },
        timestamp: Date.now()
      })
    }

    // Default: return basic metrics
    return NextResponse.json({
      status: 'healthy',
      metrics: {
        activeSessions: userSessions.size,
        totalEventsSessions: analyticsEvents.size,
        performanceSessionsTracked: performanceMetrics.size,
        region: process.env.VERCEL_REGION || 'unknown',
        uptime: Date.now() - startTime
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[EDGE-ANALYTICS] GET Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Analytics retrieval failed',
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
 * DELETE: Clear analytics data (admin only)
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const role = request.headers.get('x-user-role')
    
    if (role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const action = url.searchParams.get('action')

    if (sessionId) {
      // Clear specific session
      userSessions.delete(sessionId)
      analyticsEvents.delete(sessionId)
      performanceMetrics.delete(sessionId)
      
      return NextResponse.json({
        success: true,
        message: `Session ${sessionId} cleared`
      })
    }

    if (action === 'cleanup') {
      // Clean up expired sessions
      cleanupSessions()
      
      return NextResponse.json({
        success: true,
        message: 'Expired sessions cleaned up',
        remaining: {
          sessions: userSessions.size,
          eventSessions: analyticsEvents.size,
          performanceSessions: performanceMetrics.size
        }
      })
    }

    if (action === 'clear-all') {
      // Clear all data
      const counts = {
        sessions: userSessions.size,
        eventSessions: analyticsEvents.size,
        performanceSessions: performanceMetrics.size
      }
      
      userSessions.clear()
      analyticsEvents.clear()
      performanceMetrics.clear()
      
      return NextResponse.json({
        success: true,
        message: 'All analytics data cleared',
        cleared: counts
      })
    }

    return NextResponse.json(
      { error: 'Invalid delete action' },
      { status: 400 }
    )

  } catch (error) {
    console.error('[EDGE-ANALYTICS] DELETE Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Analytics deletion failed',
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

// Periodic cleanup (every 10 minutes)
setInterval(cleanupSessions, 10 * 60 * 1000)