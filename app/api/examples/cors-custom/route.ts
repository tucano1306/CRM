/**
 * EJEMPLO: API Route con CORS Personalizado
 * 
 * Demuestra cómo usar configuraciones CORS específicas
 * para un endpoint que requiere configuración diferente al default
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleCorsPreflightRequest, addCorsHeaders, corsConfigs } from '@/lib/cors'

// ============================================================================
// OPCIÓN 1: CORS Público (permite cualquier origen sin credenciales)
// Útil para APIs públicas, documentación, health checks
// ============================================================================

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request, corsConfigs.public)
}

export async function GET(request: NextRequest) {
  try {
    // Esta es una API pública, cualquiera puede acceder
    const publicData = {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/health',
        '/api/public/products',
        '/api/public/docs'
      ]
    }

    const response = NextResponse.json({
      success: true,
      data: publicData
    })

    // Agregar headers CORS públicos
    return addCorsHeaders(response, request, corsConfigs.public)
  } catch (error) {
    const errorResponse = NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500 }
    )
    return addCorsHeaders(errorResponse, request, corsConfigs.public)
  }
}

// ============================================================================
// OPCIÓN 2: CORS Estricto (un solo origen con credenciales)
// Descomenta para usar en lugar del público
// ============================================================================

/*
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request, corsConfigs.strict)
}

export async function POST(request: NextRequest) {
  try {
    // Endpoint protegido que requiere autenticación
    const { userId } = await auth()
    
    if (!userId) {
      const errorResponse = NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
      return addCorsHeaders(errorResponse, request, corsConfigs.strict)
    }

    // Procesar request...
    const response = NextResponse.json({ success: true })
    return addCorsHeaders(response, request, corsConfigs.strict)
  } catch (error) {
    const errorResponse = NextResponse.json(
      { success: false, error: 'Error' },
      { status: 500 }
    )
    return addCorsHeaders(errorResponse, request, corsConfigs.strict)
  }
}
*/

// ============================================================================
// OPCIÓN 3: CORS Personalizado (configuración completamente custom)
// ============================================================================

/*
import { getCorsHeaders } from '@/lib/cors'

const customCorsConfig = {
  origin: ['https://mi-app.com', 'https://mi-dashboard.com'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 3600 // 1 hora
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, customCorsConfig)
  
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  })
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: 'custom cors' })
  
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, customCorsConfig)
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  return response
}
*/

// ============================================================================
// OPCIÓN 4: CORS Dinámico (basado en condiciones)
// ============================================================================

/*
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isPublic = searchParams.get('public') === 'true'
    
    const response = NextResponse.json({ 
      data: isPublic ? 'public data' : 'private data' 
    })
    
    // Elegir config CORS basado en condición
    const corsConfig = isPublic ? corsConfigs.public : corsConfigs.strict
    
    return addCorsHeaders(response, request, corsConfig)
  } catch (error) {
    const errorResponse = NextResponse.json(
      { success: false, error: 'Error' },
      { status: 500 }
    )
    return addCorsHeaders(errorResponse, request, corsConfigs.public)
  }
}
*/
