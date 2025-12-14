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

// Additional CORS configurations (strict, custom, dynamic) can be added here as needed
