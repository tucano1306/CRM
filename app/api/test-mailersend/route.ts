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
    const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'noreply@test-zxk54v8vq11ljy6v.mlsender.net'

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'MAILERSEND_API_KEY no configurada',
        configured: false
      })
    }

    // Verificar validez de la API key y obtener dominios
    const response = await fetch('https://api.mailersend.com/v1/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()

    if (response.ok) {
      // Extraer dominios verificados
      const domains = data.data || []
      const verifiedDomains = domains.filter((d: any) => d.is_verified)
      const trialDomains = domains.filter((d: any) => d.name?.includes('mlsender.net'))
      
      return NextResponse.json({
        success: true,
        configured: true,
        apiKeyValid: true,
        currentFromEmail: fromEmail,
        domains: domains.map((d: any) => ({
          name: d.name,
          verified: d.is_verified,
          status: d.status
        })),
        verifiedDomains: verifiedDomains.map((d: any) => d.name),
        trialDomains: trialDomains.map((d: any) => d.name),
        suggestion: trialDomains.length > 0 
          ? `Configura MAILERSEND_FROM_EMAIL=noreply@${trialDomains[0].name} en Vercel`
          : 'No se encontraron dominios trial',
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
