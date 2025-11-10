import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

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
    const { invitationLink, email, whatsapp, sms } = body

    if (!invitationLink) {
      return NextResponse.json(
        { success: false, error: 'Link de invitación requerido' },
        { status: 400 }
      )
    }

    const results = {
      emailSent: false,
      whatsappSent: false,
      smsSent: false
    }

    // Enviar por Email (simulado - aquí integrarías Resend, SendGrid, etc.)
    if (email) {
      try {
        console.log(`📧 Enviando email a: ${email}`)
        console.log(`Link: ${invitationLink}`)
        
        // TODO: Integrar con servicio de email real
        // await resend.emails.send({
        //   from: 'noreply@tu-dominio.com',
        //   to: email,
        //   subject: 'Invitación para conectar como comprador',
        //   html: `<p>Has sido invitado a conectarte. <a href="${invitationLink}">Haz clic aquí</a></p>`
        // })
        
        results.emailSent = true
      } catch (err) {
        console.error('Error enviando email:', err)
      }
    }

    // Enviar por WhatsApp (simulado - aquí integrarías Twilio, WhatsApp Business API, etc.)
    if (whatsapp) {
      try {
        console.log(`💬 Enviando WhatsApp a: ${whatsapp}`)
        console.log(`Link: ${invitationLink}`)
        
        // TODO: Integrar con Twilio WhatsApp API
        // await twilioClient.messages.create({
        //   from: 'whatsapp:+14155238886',
        //   to: `whatsapp:+1${whatsapp}`,
        //   body: `Has sido invitado a conectarte: ${invitationLink}`
        // })
        
        results.whatsappSent = true
      } catch (err) {
        console.error('Error enviando WhatsApp:', err)
      }
    }

    // Enviar por SMS (simulado - aquí integrarías Twilio SMS, etc.)
    if (sms) {
      try {
        console.log(`📱 Enviando SMS a: ${sms}`)
        console.log(`Link: ${invitationLink}`)
        
        // TODO: Integrar con Twilio SMS
        // await twilioClient.messages.create({
        //   from: '+1234567890',
        //   to: `+1${sms}`,
        //   body: `Has sido invitado a conectarte: ${invitationLink}`
        // })
        
        results.smsSent = true
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
