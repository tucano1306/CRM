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
    const [domainsResponse, sendersResponse] = await Promise.all([
      fetch('https://api.mailersend.com/v1/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      }),
      fetch('https://api.mailersend.com/v1/email', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })
    ])

    const domainsData = await domainsResponse.json()
    const sendersData = await sendersResponse.json().catch(() => ({ data: [] }))

    if (domainsResponse.ok) {
      // Extraer dominios verificados
      const domains = domainsData.data || []
      const verifiedDomains = domains.filter((d: any) => d.is_verified)
      const trialDomains = domains.filter((d: any) => d.name?.includes('mlsender.net'))
      
      // Información de senders
      const senders = sendersData.data || []
      
      return NextResponse.json({
        success: true,
        configured: true,
        apiKeyValid: true,
        currentFromEmail: fromEmail,
        domains: domains.map((d: any) => ({
          name: d.name,
          verified: d.is_verified,
          status: d.status,
          id: d.id
        })),
        verifiedDomains: verifiedDomains.map((d: any) => d.name),
        trialDomains: trialDomains.map((d: any) => d.name),
        senders: senders,
        recommendation: trialDomains.length > 0 
          ? `Usa cualquier email @${trialDomains[0].name} (ejemplo: noreply@${trialDomains[0].name})`
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
