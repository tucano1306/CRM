const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log('Generando hashes de contraseñas...\n');
  
  const passwords = {
    admin: 'admin123',
    seller: 'seller123',
    client: 'client123'
  };

  for (const [role, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`${role.toUpperCase()}:`);
    console.log(`  Password: ${password}`);
    console.log(`  Hash: ${hash}\n`);
  }
}

generateHashes().catch(console.error);