const fs = require('fs');
const path = require('path');

// Archivos a actualizar
const filesToUpdate = [
  // Orders components
  'components/orders/OrderDetailModal.tsx',
  
  // Returns components
  'components/returns/CreditNotesViewer.tsx',
  'components/returns/CreateReturnModal.tsx',
  'components/returns/ReturnDetailModal.tsx',
  'components/returns/ModernReturnsManager.tsx',
  'components/returns/CreateManualReturnModal.tsx',
  'components/returns/ReturnsManager.tsx',
  
  // Quotes components
  'components/quotes/QuoteDetailModal.tsx',
  'components/quotes/QuotesManager.tsx',
  'components/quotes/CreateQuoteModal.tsx',
  'components/quotes/ModernBuyerQuotes.tsx',
  
  // Recurring orders
  'components/recurring-orders/ModernRecurringOrdersManager.tsx',
  
  // App pages
  'app/products/page.tsx',
  'app/dashboard/page.tsx',
  'app/buyer/cart/page.tsx',
  'app/buyer/orders/page.tsx',
  'app/buyer/quotes/page.tsx',
];

function updateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Verificar si ya importa formatPrice
  const hasFormatPriceImport = content.includes("formatPrice");
  
  if (!hasFormatPriceImport) {
    // Buscar el último import de react o lucide-react
    const importRegex = /(import.*from ['"](?:react|lucide-react|@\/components|@\/lib)['"])/g;
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
      console.log(`✅ Agregado import formatPrice en ${filePath}`);
    }
  }
  
  // Reemplazar patrones comunes de formateo de moneda
  const replacements = [
    // Patrón: ${valor.toFixed(2)}
    {
      pattern: /\$\{([^}]+?)\.toFixed\(2\)\}/g,
      replacement: (match, value) => `{formatPrice(${value.trim()})}`
    },
    // Patrón: ${Number(valor).toFixed(2)}
    {
      pattern: /\$\{Number\(([^)]+)\)\.toFixed\(2\)\}/g,
      replacement: (match, value) => `{formatPrice(${value.trim()})}`
    },
    // Patrón: ${(cálculo complejo).toFixed(2)}
    {
      pattern: /\$\{(\([^)]+\))\.toFixed\(2\)\}/g,
      replacement: (match, value) => `{formatPrice${value}}`
    },
  ];
  
  let originalContent = content;
  
  replacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });
  
  if (content !== originalContent) {
    modified = true;
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Actualizado ${filePath}`);
  } else if (!modified) {
    console.log(`ℹ️  Sin cambios en ${filePath}`);
  }
}

console.log('🔧 Iniciando corrección de formato de moneda...\n');

filesToUpdate.forEach(file => {
  updateFile(file);
});

console.log('\n✅ Proceso completado');
