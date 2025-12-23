const { Client } = require('pg')

// IMPORTANTE: Usar variable de entorno DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  
  try {
    await client.connect()
    
    // Actualizar Leo
    const result = await client.query(`
      UPDATE clients 
      SET phone = '+17862585427', "whatsappNumber" = '+17862585427'
      WHERE email = 'l3oyucon1978@gmail.com'
      RETURNING name, email, phone, "whatsappNumber"
    `)
    
    console.log('✅ Cliente actualizado:', result.rows[0])
    
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await client.end()
  }
}

await main()
