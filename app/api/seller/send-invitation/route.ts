import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { Resend } from 'resend'

// Lazy initialization para evitar errores durante el build
let resendInstance: Resend | null = null
function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está configurada')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
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

    const results = {
      emailSent: false,
      whatsappSent: false,
      smsSent: false,
      errors: [] as string[]
    }

    // Enviar por Email con Resend
    if (email) {
      try {
        console.log(`📧 =================================`)
        console.log(`📧 ENVIANDO EMAIL`)
        console.log(`📧 Destinatario: ${email}`)
        console.log(`📧 Link: ${invitationLink}`)
        console.log(`📧 API Key presente: ${process.env.RESEND_API_KEY ? 'SÍ' : 'NO'}`)
        console.log(`📧 API Key (primeros 10 chars): ${process.env.RESEND_API_KEY?.substring(0, 10)}...`)
        console.log(`📧 =================================`)
        
        // NOTA: En desarrollo, Resend solo permite enviar a tucano0109@gmail.com
        // Para producción, verifica un dominio en resend.com/domains
        const testMode = process.env.NODE_ENV === 'development'
        const recipientEmail = testMode ? 'tucano0109@gmail.com' : email

        if (testMode && email !== 'tucano0109@gmail.com') {
          console.log(`⚠️ MODO TEST: Enviando a ${recipientEmail} en lugar de ${email}`)
        }

        const resend = getResend()
        const { data, error } = await resend.emails.send({
          from: 'Food Orders CRM <onboarding@resend.dev>', // Usa tu dominio verificado en producción
          to: [recipientEmail],
          subject: `${sellerName || 'Un vendedor'} te invita a conectarte`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                  .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                  .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎉 ¡Tienes una invitación!</h1>
                  </div>
                  <div class="content">
                    <p>Hola,</p>
                    <p><strong>${sellerName || 'Un vendedor'}</strong> te ha invitado a conectarte en Food Orders CRM.</p>
                    <p>Con esta conexión podrás:</p>
                    <ul>
                      <li>✅ Ver el catálogo de productos</li>
                      <li>✅ Hacer pedidos fácilmente</li>
                      <li>✅ Ver el historial de tus órdenes</li>
                      <li>✅ Recibir cotizaciones personalizadas</li>
                    </ul>
                    <center>
                      <a href="${invitationLink}" class="button">
                        🔗 Aceptar Invitación
                      </a>
                    </center>
                    <p style="color: #6b7280; font-size: 14px;">
                      O copia este link en tu navegador:<br>
                      <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px;">
                        ${invitationLink}
                      </code>
                    </p>
                    <p style="color: #ef4444; font-size: 14px;">
                      ⚠️ Este link es válido por 7 días.
                    </p>
                  </div>
                  <div class="footer">
                    <p>Food Orders CRM - Sistema de gestión de pedidos</p>
                    <p>Si no esperabas este email, puedes ignorarlo.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
        })

        if (error) {
          console.error('❌ Error de Resend:', error)
          results.errors.push(`Email: ${error.message}`)
        } else {
          console.log('✅ Email enviado exitosamente:', data)
          results.emailSent = true
        }
      } catch (err: any) {
        console.error('❌ Error enviando email:', err)
        results.errors.push(`Email: ${err.message}`)
      }
    }

    // Enviar por WhatsApp (simulado - requiere Twilio)
    if (whatsapp) {
      try {
        console.log(`� WhatsApp simulado a: ${whatsapp}`)
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
