import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { sendEmail, getInvitationEmailTemplate } from '@/lib/mailersend'

interface InvitationResults {
  emailSent: boolean
  whatsappSent: boolean
  smsSent: boolean
  errors: string[]
}

async function sendEmailInvitation(
  email: string,
  invitationLink: string,
  sellerName: string,
  results: InvitationResults
) {
  try {
    console.log(`📧 =================================`)
    console.log(`📧 ENVIANDO EMAIL CON MAILERSEND`)
    console.log(`📧 Destinatario: ${email}`)
    console.log(`📧 Vendedor: ${sellerName}`)
    console.log(`📧 Link: ${invitationLink}`)
    console.log(`📧 API Key configurada: ${process.env.MAILERSEND_API_KEY ? 'SI' : 'NO'}`)
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

    console.log('📧 Resultado de sendEmail:', result)

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

function sendWhatsAppInvitation(
  whatsapp: string,
  invitationLink: string,
  results: InvitationResults
) {
  try {
    console.log(`📱 WhatsApp simulado a: ${whatsapp}`)
    console.log(`Link: ${invitationLink}`)
    // NOTE: Future integration point for Twilio WhatsApp API
    results.whatsappSent = true
  } catch (err) {
    console.error('Error enviando WhatsApp:', err)
  }
}

function sendSmsInvitation(
  sms: string,
  invitationLink: string,
  results: InvitationResults
) {
  try {
    console.log(`📱 SMS simulado a: ${sms}`)
    console.log(`Link: ${invitationLink}`)
    // NOTE: Future integration point for Twilio SMS
    results.smsSent = true
  } catch (err) {
    console.error('Error enviando SMS:', err)
  }
}

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

    const results: InvitationResults = {
      emailSent: false,
      whatsappSent: false,
      smsSent: false,
      errors: []
    }

    if (email) {
      await sendEmailInvitation(email, invitationLink, sellerName, results)
    }

    if (whatsapp) {
      sendWhatsAppInvitation(whatsapp, invitationLink, results)
    }

    if (sms) {
      sendSmsInvitation(sms, invitationLink, results)
    }

    return NextResponse.json({
      success: results.emailSent || results.whatsappSent || results.smsSent,
      data: results,
      message: results.errors.length > 0 
        ? `Errores: ${results.errors.join(', ')}`
        : 'Invitación enviada exitosamente'
    })

  } catch (error) {
    console.error('Error en send-invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
