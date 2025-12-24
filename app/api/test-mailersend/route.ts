import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const apiKey = process.env.MAILERSEND_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'MAILERSEND_API_KEY no configurada',
        configured: false
      })
    }

    // Verificar validez de la API key
    const response = await fetch('https://api.mailersend.com/v1/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        configured: true,
        apiKeyValid: true,
        domains: data.data || [],
        message: 'API key válida y funcionando'
      })
    } else {
      return NextResponse.json({
        success: false,
        configured: true,
        apiKeyValid: false,
        error: data.message || 'API key inválida',
        statusCode: response.status
      })
    }
  } catch (error: any) {
    console.error('Error testing Mailersend:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
