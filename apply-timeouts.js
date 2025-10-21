#!/usr/bin/env node
/**
 * Script de Automatización de Timeouts - Backend
 * Aplica withPrismaTimeout a todas las operaciones de Prisma
 */

const fs = require('fs');
const path = require('path');

// Endpoints a procesar
const BACKEND_ENDPOINTS = [
  'app/api/clients/route.tsx',
  'app/api/clients/[id]/route.tsx',
  'app/api/stats/route.tsx',
  'app/api/analytics/dashboard/route.tsx',
  'app/api/analytics/sales/route.tsx',
  'app/api/sellers/route.tsx',
  'app/api/sellers/[id]/route.tsx',
];

/**
 * Agregar imports de timeout si no existen
 */
function addTimeoutImports(content) {
  if (content.includes('withPrismaTimeout') && content.includes('handleTimeoutError')) {
    console.log('  ⚠️  Ya tiene imports de timeout');
    return { content, changed: false };
  }

  // Buscar el último import
  const importRegex = /^import\s+.*$/gm;
  const imports = content.match(importRegex);
  
  if (!imports) {
    console.log('  ⚠️  No se encontraron imports');
    return { content, changed: false };
  }

  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.lastIndexOf(lastImport);
  const insertIndex = lastImportIndex + lastImport.length;

  const timeoutImport = "\nimport { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'";
  
  content = content.slice(0, insertIndex) + timeoutImport + content.slice(insertIndex);
  
  console.log('  ✅ Imports de timeout agregados');
  return { content, changed: true };
}

/**
 * Envolver operaciones de Prisma con withPrismaTimeout
 */
function wrapPrismaOperations(content) {
  let changes = 0;

  // Patrón para operaciones de Prisma
  const prismaPattern = /(await\s+prisma\.\w+\.\w+\([^)]*\))/g;

  const modified = content.replace(prismaPattern, (match) => {
    // No envolver si ya está dentro de withPrismaTimeout
    if (content.includes(`withPrismaTimeout(${match}`)) {
      return match;
    }

    // No envolver si ya está dentro de otra función withPrismaTimeout
    const beforeMatch = content.substring(0, content.indexOf(match));
    if (beforeMatch.includes('withPrismaTimeout(') && 
        !beforeMatch.includes(')') || 
        (beforeMatch.split('withPrismaTimeout(').length - 1) > 
        (beforeMatch.split(')').length - 1)) {
      return match;
    }

    changes++;
    
    // Determinar timeout según tipo de operación
    const timeout = match.includes('$transaction') ? 8000 : 5000;
    
    return `withPrismaTimeout(
      ${match},
      ${timeout}
    )`;
  });

  if (changes > 0) {
    console.log(`  ✅ ${changes} operaciones envueltas con timeout`);
  }

  return { content: modified, changed: changes > 0 };
}

/**
 * Agregar manejo de TimeoutError en catch
 */
function addTimeoutErrorHandling(content) {
  let changes = 0;

  // Buscar bloques catch
  const catchPattern = /catch\s*\((\w+)[^)]*\)\s*\{([^}]*)\}/g;

  const modified = content.replace(catchPattern, (match, errorVar, catchBody) => {
    // Ya tiene manejo de TimeoutError
    if (catchBody.includes('TimeoutError') || catchBody.includes('handleTimeoutError')) {
      return match;
    }

    changes++;

    // Agregar manejo al inicio del catch
    const timeoutHandling = `
    // Manejo de timeout
    if (${errorVar} instanceof TimeoutError) {
      const { error, code, status } = handleTimeoutError(${errorVar})
      console.error('⏱️ Timeout:', { error, code })
      return NextResponse.json({ error, code }, { status })
    }
`;

    return `catch (${errorVar}) {${timeoutHandling}${catchBody}}`;
  });

  if (changes > 0) {
    console.log(`  ✅ ${changes} bloques catch actualizados`);
  }

  return { content: modified, changed: changes > 0 };
}

/**
 * Procesar un archivo
 */
function processFile(filePath) {
  console.log(`\n📄 Procesando: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log('  ❌ Archivo no encontrado');
    return false;
  }

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let modified = false;

  // Aplicar transformaciones
  let result = addTimeoutImports(content);
  content = result.content;
  modified = modified || result.changed;

  result = wrapPrismaOperations(content);
  content = result.content;
  modified = modified || result.changed;

  result = addTimeoutErrorHandling(content);
  content = result.content;
  modified = modified || result.changed;

  // Guardar si hubo cambios
  if (modified) {
    // Crear backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, originalContent, 'utf-8');

    // Guardar modificado
    fs.writeFileSync(filePath, content, 'utf-8');

    console.log(`  ✅ Archivo modificado (backup: ${backupPath})`);
    return true;
  } else {
    console.log('  ℹ️  Sin cambios necesarios');
    return false;
  }
}

/**
 * Main
 */
function main() {
  console.log('🚀 Iniciando automatización de timeouts (Backend)...\n');
  console.log(`📁 Endpoints a procesar: ${BACKEND_ENDPOINTS.length}\n`);

  let processedCount = 0;
  let errorCount = 0;

  for (const endpoint of BACKEND_ENDPOINTS) {
    try {
      const fullPath = path.join(process.cwd(), endpoint);
      if (processFile(fullPath)) {
        processedCount++;
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Completado!');
  console.log(`  • Endpoints modificados: ${processedCount}`);
  console.log(`  • Endpoints sin cambios: ${BACKEND_ENDPOINTS.length - processedCount - errorCount}`);
  console.log(`  • Errores: ${errorCount}`);
  console.log('\n📋 Backups creados: *.backup');
  console.log('⚠️  Revisa los cambios antes de commitear');
}

main();
