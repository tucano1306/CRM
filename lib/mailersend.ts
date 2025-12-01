/**
 * Mailersend Email Service
 * 
 * Plan gratuito: 3,000 emails/mes
 * Documentación: https://developers.mailersend.com/
 */

const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email'

interface EmailParams {
  to: string | string[]
  subject: string
  html: string
  from?: {
    email: string
    name: string
  }
}

interface MailersendResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Enviar email usando Mailersend API
 */
export async function sendEmail(params: EmailParams): Promise<MailersendResponse> {
  const apiKey = process.env.MAILERSEND_API_KEY
  
  if (!apiKey) {
    console.error('❌ MAILERSEND_API_KEY no está configurada')
    return { success: false, error: 'API key no configurada' }
  }

  // Normalizar destinatarios
  const recipients = Array.isArray(params.to) ? params.to : [params.to]
  
  const payload = {
    from: {
      email: params.from?.email || 'noreply@trial-neqvygm0yxxg0p7w.mlsender.net',
      name: params.from?.name || 'Food Orders CRM'
    },
    to: recipients.map(email => ({ email })),
    subject: params.subject,
    html: params.html,
  }

  try {
    console.log('📧 [MAILERSEND] Enviando email...')
    console.log('📧 [MAILERSEND] Destinatarios:', recipients)
    
    const response = await fetch(MAILERSEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (response.ok || response.status === 202) {
      const messageId = response.headers.get('x-message-id') || 'unknown'
      console.log('✅ [MAILERSEND] Email enviado exitosamente. ID:', messageId)
      return { success: true, messageId }
    }

    const errorData = await response.json().catch(() => ({}))
    console.error('❌ [MAILERSEND] Error:', response.status, errorData)
    return { 
      success: false, 
      error: errorData.message || `HTTP ${response.status}` 
    }
  } catch (error: any) {
    console.error('❌ [MAILERSEND] Error de conexión:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Template para email de invitación
 */
export function getInvitationEmailTemplate(params: {
  sellerName: string
  invitationLink: string
}): string {
  return `
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
            <p><strong>${params.sellerName}</strong> te ha invitado a conectarte en Food Orders CRM.</p>
            <p>Con esta conexión podrás:</p>
            <ul>
              <li>✅ Ver el catálogo de productos</li>
              <li>✅ Hacer pedidos fácilmente</li>
              <li>✅ Ver el historial de tus órdenes</li>
              <li>✅ Recibir cotizaciones personalizadas</li>
            </ul>
            <center>
              <a href="${params.invitationLink}" class="button">
                🔗 Aceptar Invitación
              </a>
            </center>
            <p style="color: #6b7280; font-size: 14px;">
              O copia este link en tu navegador:<br>
              <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-top: 10px;">
                ${params.invitationLink}
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
  `
}

/**
 * Template para confirmación de orden
 */
export function getOrderConfirmationTemplate(params: {
  orderNumber: string
  clientName: string
  totalAmount: string
  items: Array<{ name: string; quantity: number; price: string }>
}): string {
  const itemsHtml = params.items
    .map(item => `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.price}</td></tr>`)
    .join('')

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; }
          .total { font-size: 24px; font-weight: bold; color: #10b981; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Orden Confirmada</h1>
            <p>Orden #${params.orderNumber}</p>
          </div>
          <div class="content">
            <p>Hola <strong>${params.clientName}</strong>,</p>
            <p>Tu orden ha sido confirmada exitosamente.</p>
            
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <p class="total">Total: ${params.totalAmount}</p>
            
            <p>Te notificaremos cuando tu pedido esté listo.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
