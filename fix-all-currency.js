const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Función para actualizar un archivo
function updateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  const originalContent = content;
  
  // Verificar si ya importa formatPrice
  const hasFormatPriceImport = content.includes("formatPrice");
  
  if (!hasFormatPriceImport) {
    // Buscar el último import
    const importRegex = /(import\s+.*?\s+from\s+['"][^'"]+['"])/g;
    const imports = content.match(importRegex);
    
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport);
      
      // Insertar el import de formatPrice después del último import
      const newImport = "\nimport { formatPrice } from '@/lib/utils'";
      content = content.slice(0, lastImportIndex + lastImport.length) + 
                newImport + 
                content.slice(lastImportIndex + lastImport.length);
      
      modified = true;
    }
  }
  
  // Reemplazar patrones comunes de formateo de moneda
  const patterns = [
    // Patrón 1: ${valor.toFixed(2)}
    {
      regex: /\$\{([^}]+?)\.toFixed\(2\)\}/g,
      replace: (match, value) => `{formatPrice(${value.trim()})}`
    },
    // Patrón 2: ${Number(valor).toFixed(2)}
    {
      regex: /\$\{Number\(([^)]+)\)\.toFixed\(2\)\}/g,
      replace: (match, value) => `{formatPrice(${value.trim()})}`
    },
    // Patrón 3: $valor.toFixed(2) (dentro de strings)
    {
      regex: /\$\$\{([^}]+?)\.toFixed\(2\)\}/g,
      replace: (match, value) => `\${formatPrice(${value.trim()})}`
    },
    // Patrón 4: dentro de template literals sin $
    {
      regex: /: \$\$\{Number\(([^)]+)\)\.toFixed\(2\)\}/g,
      replace: (match, value) => `: \${formatPrice(${value.trim()})}`
    },
  ];
  
  patterns.forEach(({ regex, replace }) => {
    content = content.replace(regex, replace);
  });
  
  if (content !== originalContent) {
    modified = true;
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ ${filePath}`);
    return true;
  }
  
  return false;
}

// Buscar todos los archivos .tsx
const files = glob.sync('**/*.tsx', {
  ignore: ['node_modules/**', '.next/**', 'backups/**'],
  cwd: __dirname
});

console.log(`🔍 Encontrados ${files.length} archivos .tsx\n`);
console.log('📝 Actualizando archivos con formato de moneda incorrecto:\n');

let updatedCount = 0;

files.forEach(file => {
  if (updateFile(file)) {
    updatedCount++;
  }
});

console.log(`\n✅ Proceso completado: ${updatedCount} archivos actualizados`);
