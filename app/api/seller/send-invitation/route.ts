import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

interface InvitationResults {
  whatsappSent: boolean
  errors: string[]
}

function sendWhatsAppInvitation(
  whatsapp: string,
  invitationLink: string,
  results: InvitationResults
) {
  try {
    console.log(`📱 WhatsApp invitación registrada para: ${whatsapp}`)
    console.log(`Link: ${invitationLink}`)
    // WhatsApp se envía desde el cliente usando wa.me URL scheme
    results.whatsappSent = true
  } catch (err) {
    console.error('Error registrando WhatsApp:', err)
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
    const { invitationLink, whatsapp, sellerName } = body

    if (!invitationLink) {
      return NextResponse.json(
        { success: false, error: 'Link de invitación requerido' },
        { status: 400 }
      )
    }

    const results: InvitationResults = {
      whatsappSent: false,
      errors: []
    }

    if (whatsapp) {
      sendWhatsAppInvitation(whatsapp, invitationLink, results)
    }

    console.log(`✅ Invitación preparada por ${sellerName} para WhatsApp: ${whatsapp}`)

    return NextResponse.json({
      success: results.whatsappSent,
      data: results,
      error: results.errors.length > 0 ? results.errors.join(', ') : undefined,
      message: results.whatsappSent 
        ? 'Invitación lista para enviar por WhatsApp'
        : 'No se especificó número de WhatsApp'
    })

  } catch (error) {
    console.error('Error en send-invitation:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
