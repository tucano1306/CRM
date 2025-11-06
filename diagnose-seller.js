// DIAGNÓSTICO DE SELLER - Ejecutar en la consola del navegador (F12)
// cuando estés en https://food-order-crm.vercel.app/products o /clients

console.log('🔍 === DIAGNÓSTICO DE SELLER ===\n');

// 1. Verificar cookies de autenticación
console.log('1️⃣ COOKIES DE CLERK:');
const clerkCookies = document.cookie.split(';')
  .filter(c => c.includes('clerk') || c.includes('__session'))
  .map(c => c.trim());
console.log(clerkCookies.length > 0 ? '✅ Cookies encontradas:' : '❌ No hay cookies de Clerk');
clerkCookies.forEach(c => console.log('  -', c.substring(0, 50) + '...'));

// 2. Verificar LocalStorage
console.log('\n2️⃣ LOCALSTORAGE:');
const clerkKeys = Object.keys(localStorage).filter(k => k.includes('clerk'));
console.log(clerkKeys.length > 0 ? '✅ Keys de Clerk encontradas:' : '❌ No hay keys de Clerk');
clerkKeys.forEach(k => console.log('  -', k));

// 3. Probar endpoint de productos
console.log('\n3️⃣ PROBANDO /api/products:');
fetch('/api/products?page=1&limit=5')
  .then(async res => {
    console.log('  Status:', res.status, res.statusText);
    console.log('  Content-Type:', res.headers.get('content-type'));
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      console.log('  ✅ JSON Response:', data);
      if (data.success) {
        console.log('  ✅ Success! Products:', data.data?.length || 0);
      } else {
        console.log('  ❌ Error:', data.error);
      }
    } else {
      const text = await res.text();
      console.log('  ❌ HTML Response (primeros 200 chars):', text.substring(0, 200));
      console.log('  ⚠️ El endpoint está redirigiendo a HTML en lugar de devolver JSON');
    }
  })
  .catch(err => console.error('  ❌ Network Error:', err));

// 4. Probar endpoint de clientes
console.log('\n4️⃣ PROBANDO /api/clients:');
fetch('/api/clients?page=1&limit=5')
  .then(async res => {
    console.log('  Status:', res.status, res.statusText);
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      console.log('  ✅ JSON Response:', data);
      if (data.success) {
        console.log('  ✅ Success! Clients:', data.data?.data?.length || 0);
      } else {
        console.log('  ❌ Error:', data.error);
      }
    } else {
      const text = await res.text();
      console.log('  ❌ HTML Response (primeros 200 chars):', text.substring(0, 200));
      console.log('  ⚠️ El endpoint está redirigiendo a HTML');
    }
  })
  .catch(err => console.error('  ❌ Network Error:', err));

// 5. Verificar si hay errores en React
console.log('\n5️⃣ ESPERANDO 3 SEGUNDOS PARA VER ERRORES DE REACT...\n');
setTimeout(() => {
  console.log('✅ Diagnóstico completado. Revisa los resultados arriba.');
  console.log('\n📋 NEXT STEPS:');
  console.log('   - Si los endpoints devuelven HTML: problema de autenticación/redirección');
  console.log('   - Si devuelven 401: usuario no autenticado');
  console.log('   - Si devuelven 403: usuario sin permisos de seller');
  console.log('   - Si devuelven JSON exitoso: problema en el frontend (React)');
}, 3000);
