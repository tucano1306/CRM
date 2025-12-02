import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, getInvitationEmailTemplate } from '@/lib/mailersend'

/**
 * GET /api/debug/test-email
 * Endpoint de prueba para verificar que Mailersend funciona
 */
export async function GET(req: NextRequest) {
  const testEmail = req.nextUrl.searchParams.get('email') || 'tucano0109@gmail.com'
  
  console.log('🧪 [TEST EMAIL] Iniciando prueba...')
  console.log('🧪 [TEST EMAIL] API Key presente:', !!process.env.MAILERSEND_API_KEY)
  console.log('🧪 [TEST EMAIL] API Key (primeros 10 chars):', process.env.MAILERSEND_API_KEY?.substring(0, 10))
  console.log('🧪 [TEST EMAIL] Destinatario:', testEmail)
  
  try {
    const html = getInvitationEmailTemplate({
      sellerName: 'Test Seller',
      invitationLink: 'https://crm-food-order.vercel.app/test-link',
    })
    
    console.log('🧪 [TEST EMAIL] Template generado, enviando...')
    
    const result = await sendEmail({
      to: testEmail,
      subject: '🧪 Prueba de Email - Food Orders CRM',
      html,
    })
    
    console.log('🧪 [TEST EMAIL] Resultado:', result)
    
    return NextResponse.json({
      success: result.success,
      apiKeyConfigured: !!process.env.MAILERSEND_API_KEY,
      apiKeyPrefix: process.env.MAILERSEND_API_KEY?.substring(0, 15) + '...',
      testEmail,
      result,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('🧪 [TEST EMAIL] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      apiKeyConfigured: !!process.env.MAILERSEND_API_KEY,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
