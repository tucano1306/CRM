// Script para actualizar el rol de un usuario en Clerk a CLIENT
// Uso: node scripts/set-user-role-client.js <clerk-user-id>

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  console.error('❌ Error: CLERK_SECRET_KEY no está configurado en .env')
  process.exit(1)
}

const userId = process.argv[2]

if (!userId) {
  console.error('❌ Error: Debes proporcionar un userId')
  console.log('\n📖 Uso:')
  console.log('  node scripts/set-user-role-client.js <clerk-user-id>')
  console.log('\n💡 Para obtener tu userId, visita:')
  console.log('  http://localhost:3000/api/debug/user-role')
  process.exit(1)
}

async function updateUserRole() {
  try {
    console.log(`\n🔄 Actualizando rol de usuario: ${userId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: 'CLIENT'
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Clerk API error: ${response.status} - ${error}`)
    }

    const user = await response.json()
    
    console.log('✅ Rol actualizado exitosamente!\n')
    console.log('📋 Información del usuario:')
    console.log(`  • ID: ${user.id}`)
    console.log(`  • Email: ${user.email_addresses?.[0]?.email_address || 'N/A'}`)
    console.log(`  • Nombre: ${user.first_name} ${user.last_name}`)
    console.log(`  • Rol: ${user.public_metadata?.role || 'No definido'}`)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n⚠️  IMPORTANTE:')
    console.log('  1. Cierra sesión en la aplicación')
    console.log('  2. Vuelve a iniciar sesión')
    console.log('  3. Ahora deberías poder acceder a /buyer/*\n')

  } catch (error) {
    console.error('\n❌ Error al actualizar rol:', error.message)
    console.log('\n💡 Verifica que:')
    console.log('  1. El userId sea correcto')
    console.log('  2. CLERK_SECRET_KEY esté configurado correctamente')
    console.log('  3. Tengas permisos para modificar usuarios en Clerk\n')
    process.exit(1)
  }
}

updateUserRole()
