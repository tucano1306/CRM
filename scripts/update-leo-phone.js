const { Client } = require('pg')

const DATABASE_URL = "postgresql://neondb_owner:npg_0dqOPGfJ7CVx@ep-spring-night-adj6vmii-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"

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

main()
