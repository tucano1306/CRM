import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/debug/mailersend-info
 * Obtiene información detallada de Mailersend: dominios, recipients, y configuración
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.MAILERSEND_API_KEY
    const fromEmail = process.env.MAILERSEND_FROM_EMAIL || 'noreply@test-zxk54v8vq11ljy6v.mlsender.net'

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'MAILERSEND_API_KEY no configurada',
      }, { status: 500 })
    }

    console.log('🔍 [MAILERSEND INFO] Consultando API...')
    console.log('🔍 [MAILERSEND INFO] FROM EMAIL configurado:', fromEmail)

    // 1. Obtener dominios
    const domainsResponse = await fetch('https://api.mailersend.com/v1/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const domainsData = await domainsResponse.json()
    console.log('📦 [MAILERSEND INFO] Dominios response:', JSON.stringify(domainsData, null, 2))

    // 2. Obtener recipients (destinatarios verificados)
    const recipientsResponse = await fetch('https://api.mailersend.com/v1/recipients', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const recipientsData = await recipientsResponse.json().catch(() => ({ data: [] }))
    console.log('📦 [MAILERSEND INFO] Recipients response:', JSON.stringify(recipientsData, null, 2))

    if (!domainsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Error consultando Mailersend API',
        details: domainsData,
        statusCode: domainsResponse.status
      }, { status: domainsResponse.status })
    }

    const domains = domainsData.data || []
    const verifiedDomains = domains.filter((d: any) => d.is_verified)
    const trialDomain = domains.find((d: any) => d.name === 'test-zxk54v8vq11ljy6v.mlsender.net')

    // Información detallada del dominio trial
    let trialDomainDetails = null
    if (trialDomain) {
      const domainDetailResponse = await fetch(`https://api.mailersend.com/v1/domains/${trialDomain.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      })
      trialDomainDetails = await domainDetailResponse.json().catch(() => null)
    }

    return NextResponse.json({
      success: true,
      apiKeyConfigured: true,
      currentFromEmail: fromEmail,
      
      // Información de dominios
      domains: domains.map((d: any) => ({
        id: d.id,
        name: d.name,
        verified: d.is_verified,
        status: d.domain_settings?.send_paused ? 'paused' : 'active',
        createdAt: d.created_at
      })),
      
      // Dominios verificados
      verifiedDomains: verifiedDomains.map((d: any) => d.name),
      
      // Dominio trial específico
      trialDomain: trialDomain ? {
        id: trialDomain.id,
        name: trialDomain.name,
        verified: trialDomain.is_verified,
        details: trialDomainDetails
      } : null,
      
      // Recipients (direcciones de email verificadas)
      recipients: recipientsData.data || [],
      
      // Recomendación
      recommendation: trialDomain 
        ? `✅ Dominio verificado. Puedes usar cualquier dirección como: noreply@${trialDomain.name}, hello@${trialDomain.name}, etc.`
        : '❌ Dominio trial no encontrado',
      
      // Posible problema
      possibleIssue: !trialDomain?.is_verified 
        ? 'El dominio trial no está verificado'
        : 'El dominio está verificado, el problema puede ser otro (API key, límites, etc.)',
      
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ [MAILERSEND INFO] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
