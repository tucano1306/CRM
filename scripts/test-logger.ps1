# Script de Testing para Sistema de Logging
# Prueba diferentes niveles, categorías y features del logger

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 LOGGER TESTING SCRIPT" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================================
# TEST 1: Niveles de Log Básicos
# ============================================================================
Write-Host "========================================" -ForegroundColor Green
Write-Host "TEST 1: Niveles de Log Básicos" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Ejecutando tests de niveles de log...`n"

$testScript = @"
const logger = require('./lib/logger').default;
const { LogCategory } = require('./lib/logger');

console.log('Testing DEBUG level:');
logger.debug(LogCategory.SYSTEM, 'This is a debug message', {
  userId: 'user_123',
  endpoint: '/api/test'
});

console.log('\nTesting INFO level:');
logger.info(LogCategory.API, 'This is an info message', {
  endpoint: '/api/clients',
  method: 'GET',
  statusCode: 200
});

console.log('\nTesting WARN level:');
logger.warn(LogCategory.RATE_LIMIT, 'This is a warning message', {
  remaining: 5,
  userId: 'user_456'
});

console.log('\nTesting ERROR level:');
try {
  throw new Error('Test error for logging');
} catch (error) {
  logger.error(LogCategory.API, 'This is an error message', error, {
    endpoint: '/api/test',
    method: 'POST'
  });
}

console.log('\nTesting FATAL level:');
try {
  throw new Error('Critical system failure');
} catch (error) {
  logger.fatal(LogCategory.DATABASE, 'This is a fatal message', error, {
    database: 'postgres',
    connection: 'lost'
  });
}
"@

$testScript | Out-File -FilePath "test-logger-basic.js" -Encoding utf8
node test-logger-basic.js
Remove-Item "test-logger-basic.js"

# ============================================================================
# TEST 2: Request Logger
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 2: Request Logger" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Testing request tracking with IDs...`n"

$testScript = @"
const { createRequestLogger } = require('./lib/logger');

const requestLogger = createRequestLogger({
  userId: 'user_789',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0 Test'
});

console.log('Starting request...');
requestLogger.start('/api/products', 'GET');

// Simular operación async
setTimeout(() => {
  console.log('Ending request...');
  requestLogger.end('/api/products', 'GET', 200);
}, 150);

// Simular error en otro request
setTimeout(() => {
  const errorLogger = createRequestLogger({
    userId: 'user_789',
    ip: '192.168.1.100'
  });
  
  errorLogger.start('/api/orders', 'POST');
  
  try {
    throw new Error('Database connection timeout');
  } catch (error) {
    errorLogger.error('/api/orders', 'POST', error);
  }
}, 300);

// Esperar a que terminen
setTimeout(() => {
  console.log('\n✅ Request logging tests completed');
}, 500);
"@

$testScript | Out-File -FilePath "test-logger-request.js" -Encoding utf8
node test-logger-request.js
Start-Sleep -Milliseconds 600
Remove-Item "test-logger-request.js"

# ============================================================================
# TEST 3: Performance Timer
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 3: Performance Timer" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Testing performance monitoring...`n"

$testScript = @"
const { createPerformanceTimer } = require('./lib/logger');

// Test 1: Operación rápida (bajo threshold)
console.log('Test 1: Fast operation (bajo threshold)');
const fastTimer = createPerformanceTimer('fast-operation', 100);
setTimeout(() => {
  fastTimer.end({ operation: 'fast', testId: '1' });
}, 50);

// Test 2: Operación lenta (sobre threshold)
setTimeout(() => {
  console.log('\nTest 2: Slow operation (sobre threshold)');
  const slowTimer = createPerformanceTimer('slow-operation', 100);
  setTimeout(() => {
    slowTimer.end({ operation: 'slow', testId: '2' });
  }, 200);
}, 100);

// Test 3: Sin threshold
setTimeout(() => {
  console.log('\nTest 3: No threshold');
  const noThresholdTimer = createPerformanceTimer('no-threshold-op');
  setTimeout(() => {
    noThresholdTimer.end({ operation: 'normal', testId: '3' });
  }, 75);
}, 350);

setTimeout(() => {
  console.log('\n✅ Performance timer tests completed');
}, 650);
"@

$testScript | Out-File -FilePath "test-logger-performance.js" -Encoding utf8
node test-logger-performance.js
Start-Sleep -Milliseconds 700
Remove-Item "test-logger-performance.js"

# ============================================================================
# TEST 4: Métodos de Utilidad
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 4: Métodos de Utilidad" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Testing utility methods...`n"

$testScript = @"
const logger = require('./lib/logger').default;

console.log('1. API Start/End:');
logger.apiStart('/api/clients', 'GET', { userId: 'user_123' });
setTimeout(() => {
  logger.apiEnd('/api/clients', 'GET', 200, 125, { userId: 'user_123' });
}, 50);

setTimeout(() => {
  console.log('\n2. Auth Events:');
  logger.authEvent('login', 'user_456', { ip: '192.168.1.1' });
  logger.authEvent('failed', undefined, { ip: '192.168.1.2', email: 'test@example.com' });
}, 100);

setTimeout(() => {
  console.log('\n3. Database Query:');
  logger.dbQuery('findMany', 'Client', 45, { count: 150 });
}, 200);

setTimeout(() => {
  console.log('\n4. Event Emitted:');
  logger.eventEmitted('ORDER_CREATED', {
    userId: 'user_789',
    orderId: 'order_123'
  }, {
    amount: 150.00,
    items: 5
  });
}, 300);

setTimeout(() => {
  console.log('\n5. Security Event:');
  logger.security('suspicious-activity', 'high', {
    userId: 'user_suspicious',
    ip: '192.168.1.999'
  }, {
    action: 'mass-delete-attempt',
    affectedRecords: 1000
  });
}, 400);

setTimeout(() => {
  console.log('\n✅ Utility methods tests completed');
}, 500);
"@

$testScript | Out-File -FilePath "test-logger-utility.js" -Encoding utf8
node test-logger-utility.js
Start-Sleep -Milliseconds 600
Remove-Item "test-logger-utility.js"

# ============================================================================
# TEST 5: Buffer Management
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 5: Buffer Management" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Testing log buffer...`n"

$testScript = @"
const logger = require('./lib/logger').default;
const { LogCategory } = require('./lib/logger');

// Generar varios logs
for (let i = 0; i < 5; i++) {
  logger.info(LogCategory.SYSTEM, \`Log message \${i + 1}\`, {
    testId: i + 1
  });
}

// Ver buffer
const buffer = logger.getBuffer();
console.log(\`\nBuffer tiene \${buffer.length} logs\`);

// Limpiar buffer
logger.clearBuffer();
const emptyBuffer = logger.getBuffer();
console.log(\`Buffer después de limpiar: \${emptyBuffer.length} logs\`);

console.log('\n✅ Buffer management tests completed');
"@

$testScript | Out-File -FilePath "test-logger-buffer.js" -Encoding utf8
node test-logger-buffer.js
Remove-Item "test-logger-buffer.js"

# ============================================================================
# TEST 6: Todas las Categorías
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "TEST 6: Todas las Categorías" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Testing all log categories...`n"

$testScript = @"
const logger = require('./lib/logger').default;
const { LogCategory } = require('./lib/logger');

const categories = [
  'API',
  'AUTH',
  'DATABASE',
  'RATE_LIMIT',
  'CORS',
  'EVENTS',
  'CRON',
  'WEBHOOK',
  'VALIDATION',
  'PERFORMANCE',
  'SECURITY',
  'SYSTEM'
];

categories.forEach(category => {
  logger.info(LogCategory[category], \`Testing \${category} category\`, {
    category: category,
    testMode: true
  });
});

console.log(\`\n✅ Logged to all \${categories.length} categories\`);
"@

$testScript | Out-File -FilePath "test-logger-categories.js" -Encoding utf8
node test-logger-categories.js
Remove-Item "test-logger-categories.js"

# ============================================================================
# RESUMEN
# ============================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE TESTS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Test 1: Niveles de log (DEBUG, INFO, WARN, ERROR, FATAL)" -ForegroundColor Green
Write-Host "✅ Test 2: Request logger con tracking de IDs" -ForegroundColor Green
Write-Host "✅ Test 3: Performance timer con thresholds" -ForegroundColor Green
Write-Host "✅ Test 4: Métodos de utilidad especializados" -ForegroundColor Green
Write-Host "✅ Test 5: Buffer management (get, clear)" -ForegroundColor Green
Write-Host "✅ Test 6: Todas las categorías de log" -ForegroundColor Green

Write-Host "`n📝 Notas:" -ForegroundColor Yellow
Write-Host "  - En desarrollo: formato pretty con iconos" -ForegroundColor White
Write-Host "  - En producción: formato JSON estructurado" -ForegroundColor White
Write-Host "  - Logs DEBUG solo visibles en desarrollo" -ForegroundColor White
Write-Host "  - Errores incluyen stack traces automáticamente" -ForegroundColor White

Write-Host "`n🚀 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Agregar logging a todos los API endpoints" -ForegroundColor White
Write-Host "  2. Instalar Sentry o Logtail para logging externo" -ForegroundColor White
Write-Host "  3. Configurar alertas para errores críticos" -ForegroundColor White
Write-Host "  4. Monitorear performance en producción" -ForegroundColor White

Write-Host "`n========================================`n" -ForegroundColor Cyan
