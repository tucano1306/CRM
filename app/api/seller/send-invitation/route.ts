import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sendEmail, getInvitationEmailTemplate } from '@/lib/mailersend'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { invitationLink, email, whatsapp, sms, sellerName } = body

    if (!invitationLink) {
      return NextResponse.json(
        { success: false, error: 'Link de invitación requerido' },
        { status: 400 }
      )
    }

    const results = {
      emailSent: false,
      whatsappSent: false,
      smsSent: false,
      errors: [] as string[]
    }

    // Enviar por Email con Mailersend
    if (email) {
      try {
        console.log(`📧 =================================`)
        console.log(`📧 ENVIANDO EMAIL CON MAILERSEND`)
        console.log(`📧 Destinatario: ${email}`)
        console.log(`📧 Link: ${invitationLink}`)
        console.log(`📧 =================================`)

        const html = getInvitationEmailTemplate({
          sellerName: sellerName || 'Un vendedor',
          invitationLink,
        })

        const result = await sendEmail({
          to: email,
          subject: `${sellerName || 'Un vendedor'} te invita a conectarte`,
          html,
        })

        if (result.success) {
          console.log('✅ Email enviado exitosamente. ID:', result.messageId)
          results.emailSent = true
        } else {
          console.error('❌ Error de Mailersend:', result.error)
          results.errors.push(`Email: ${result.error}`)
        }
      } catch (err: any) {
        console.error('❌ Error enviando email:', err)
        results.errors.push(`Email: ${err.message}`)
      }
    }

    // Enviar por WhatsApp (simulado - requiere Twilio)
    if (whatsapp) {
      try {
        console.log(`📱 WhatsApp simulado a: ${whatsapp}`)
        console.log(`Link: ${invitationLink}`)
        
        // TODO: Integrar con Twilio WhatsApp API
        results.whatsappSent = true // Simulado por ahora
      } catch (err) {
        console.error('Error enviando WhatsApp:', err)
      }
    }

    // Enviar por SMS (simulado - requiere Twilio)
    if (sms) {
      try {
        console.log(`📱 SMS simulado a: ${sms}`)
        console.log(`Link: ${invitationLink}`)
        
        // TODO: Integrar con Twilio SMS
        results.smsSent = true // Simulado por ahora
      } catch (err) {
        console.error('Error enviando SMS:', err)
      }
    }

    return NextResponse.json({
      success: true,
      data: results
    })

  } catch (error) {
    console.error('Error en send-invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
