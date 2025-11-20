// app/api/debug/invitations/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// NOTA: El sistema de invitaciones actualmente usa emails directamente
// sin tabla de invitaciones en la base de datos.
// Para probar con un solo email, usa el truco de Gmail Plus Addressing:
// tuEmail+vendedor@gmail.com, tuEmail+cliente1@gmail.com, etc.

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      message: 'Guía para probar con un solo email',
      instructions: {
        title: '📧 Cómo probar con un solo email',
        methods: [
          {
            name: 'Gmail Plus Addressing (Recomendado)',
            description: 'Agrega +algo antes de @gmail.com',
            examples: [
              'tuEmail@gmail.com → Cuenta principal (vendedor)',
              'tuEmail+cliente1@gmail.com → Cliente 1',
              'tuEmail+cliente2@gmail.com → Cliente 2',
              'tuEmail+test@gmail.com → Otro cliente'
            ],
            note: 'Todos los correos llegan a la misma bandeja de entrada pero Clerk los trata como usuarios diferentes'
          },
          {
            name: 'Outlook/Hotmail Dots',
            description: 'Agrega o quita puntos en el nombre',
            examples: [
              'tu.email@outlook.com',
              'tuemail@outlook.com',
              'tu.e.mail@outlook.com'
            ]
          },
          {
            name: 'Emails Temporales',
            description: 'Servicios de email desechable',
            services: [
              'temp-mail.org',
              'guerrillamail.com',
              '10minutemail.com'
            ]
          }
        ],
        howToTest: [
          '1. Como VENDEDOR: Invita a un cliente usando cualquier email',
          '2. El sistema enviará un email con un link de invitación',
          '3. Abre el link en una ventana de incógnito',
          '4. Regístrate con un email diferente (usa +alias si es Gmail)',
          '5. El nuevo usuario se asociará automáticamente como tu cliente'
        ]
      }
    })

  } catch (error) {
    console.error('Error en debug invitations:', error)
    return NextResponse.json({ 
      error: 'Error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
