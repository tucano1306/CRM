#!/usr/bin/env python3
"""
Script de Automatización de Timeouts - Frontend
Aplica apiCall a todos los componentes React
"""

import os
import re
from pathlib import Path

# Componentes a procesar
FRONTEND_COMPONENTS = [
    'app/orders/page.tsx',
    'app/products/page.tsx',
    'app/clients/page.tsx',
    'app/buyer/catalog/page.tsx',
    'app/dashboard/page.tsx',
    'components/buyer/OrderCountdown.tsx',
    'components/products/ProductCard.tsx',
    'components/orders/OrderCard.tsx',
]

def add_frontend_imports(content):
    """Agregar imports de api-client si no existen"""
    if 'apiCall' in content and 'getErrorMessage' in content:
        print('  ⚠️  Ya tiene imports de api-client')
        return content, False
    
    # Buscar la línea de 'use client'
    if "'use client'" in content or '"use client"' in content:
        # Agregar después de 'use client'
        imports = "\nimport { apiCall, getErrorMessage } from '@/lib/api-client'"
        content = re.sub(
            r"('use client'|\"use client\")\n",
            r"\1\n" + imports + "\n",
            content,
            count=1
        )
    else:
        # Agregar 'use client' y los imports al inicio
        imports = "'use client'\n\nimport { apiCall, getErrorMessage } from '@/lib/api-client'\n\n"
        content = imports + content
    
    print('  ✅ Imports agregados')
    return content, True

def add_state_variables(content):
    """Agregar variables de estado para timeout y error"""
    # Buscar el primer useState
    first_use_state = re.search(r'const \[\w+, set\w+\] = useState', content)
    
    if not first_use_state:
        print('  ⚠️  No se encontró useState')
        return content, False
    
    # Verificar si ya existen los estados
    if 'timedOut' in content and 'setTimedOut' in content:
        print('  ⚠️  Ya tiene estados de timeout')
        return content, False
    
    # Agregar después del primer useState
    new_states = """  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
"""
    
    pos = first_use_state.end()
    content = content[:pos] + '\n' + new_states + content[pos:]
    
    print('  ✅ Estados agregados')
    return content, True

def replace_fetch_with_api_call(content):
    """Reemplazar fetch con apiCall"""
    changes = 0
    
    # Patrón para fetch simple
    fetch_pattern = r'(const|let)\s+(\w+)\s+=\s+await\s+fetch\([\'"]([^\'"]+)[\'"]\s*,?\s*(\{[^}]*\})?\)'
    
    def replace_fetch(match):
        nonlocal changes
        var_type = match.group(1)
        var_name = match.group(2)
        url = match.group(3)
        options = match.group(4) or '{}'
        
        # No reemplazar si ya es apiCall
        if 'apiCall' in match.group(0):
            return match.group(0)
        
        changes += 1
        
        # Construir el reemplazo con apiCall
        replacement = f"""const result = await apiCall('{url}', {{
      ...{options},
      timeout: 5000,
      onTimeout: () => setTimedOut(true)
    }})

    if (result.success) {{
      const {var_name} = result.data
    }} else {{
      setError(result.error || 'Error en la solicitud')
      return
    }}"""
        
        return replacement
    
    modified = re.sub(fetch_pattern, replace_fetch, content)
    
    if changes > 0:
        print(f'  ✅ {changes} fetch reemplazados con apiCall')
    
    return modified, changes > 0

def add_timeout_ui(content):
    """Agregar UI para estados de timeout y error"""
    # Buscar el return del componente
    return_match = re.search(r'return\s*\(', content)
    
    if not return_match:
        print('  ⚠️  No se encontró return statement')
        return content, False
    
    # Verificar si ya tiene UI de timeout
    if 'timedOut &&' in content or 'error &&' in content:
        print('  ⚠️  Ya tiene UI de timeout')
        return content, False
    
    # Agregar UI de timeout y error después del return
    timeout_ui = """
    {/* ✅ UI de Timeout */}
    {timedOut && (
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-600" />
          <p className="text-yellow-800">
            La operación está tardando más de lo esperado. Por favor, intenta de nuevo.
          </p>
        </div>
      </div>
    )}

    {/* ✅ UI de Error */}
    {error && (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )}
"""
    
    pos = return_match.end()
    # Insertar después del return (
    content = content[:pos] + timeout_ui + content[pos:]
    
    print('  ✅ UI de timeout agregada')
    return content, True

def add_lucide_imports(content):
    """Agregar imports de lucide-react si no existen"""
    if 'Clock' in content or 'AlertCircle' in content:
        return content, False
    
    # Buscar imports de lucide existentes
    lucide_import = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', content)
    
    if lucide_import:
        # Agregar a los imports existentes
        existing_imports = lucide_import.group(1)
        if 'Clock' not in existing_imports:
            new_imports = existing_imports.rstrip() + ', Clock, AlertCircle'
            content = content.replace(lucide_import.group(0), 
                                     f"import {{ {new_imports} }} from 'lucide-react'")
            print('  ✅ Iconos de lucide agregados')
            return content, True
    else:
        # Agregar import nuevo
        first_import = re.search(r'^import\s+', content, re.MULTILINE)
        if first_import:
            lucide = "import { Clock, AlertCircle } from 'lucide-react'\n"
            pos = first_import.start()
            content = content[:pos] + lucide + content[pos:]
            print('  ✅ Import de lucide agregado')
            return content, True
    
    return content, False

def process_file(file_path):
    """Procesar un archivo frontend"""
    print(f'\n📄 Procesando: {file_path}')
    
    if not os.path.exists(file_path):
        print(f'  ❌ Archivo no encontrado')
        return False
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    modified = False
    
    # Aplicar transformaciones
    content, changed = add_frontend_imports(content)
    modified = modified or changed
    
    content, changed = add_lucide_imports(content)
    modified = modified or changed
    
    content, changed = add_state_variables(content)
    modified = modified or changed
    
    content, changed = replace_fetch_with_api_call(content)
    modified = modified or changed
    
    content, changed = add_timeout_ui(content)
    modified = modified or changed
    
    # Guardar si hubo cambios
    if modified:
        # Crear backup
        backup_path = file_path + '.backup'
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(original_content)
        
        # Guardar modificado
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f'  ✅ Archivo modificado (backup: {backup_path})')
        return True
    else:
        print(f'  ℹ️  Sin cambios necesarios')
        return False

def main():
    """Main"""
    print('🚀 Iniciando automatización de timeouts (Frontend)...\n')
    print(f'📁 Componentes a procesar: {len(FRONTEND_COMPONENTS)}\n')
    
    processed_count = 0
    error_count = 0
    
    for component in FRONTEND_COMPONENTS:
        try:
            full_path = os.path.join(os.getcwd(), component)
            if process_file(full_path):
                processed_count += 1
        except Exception as e:
            print(f'  ❌ Error: {str(e)}')
            error_count += 1
    
    print('\n' + '='*50)
    print(f'\n✅ Completado!')
    print(f'  • Componentes modificados: {processed_count}')
    print(f'  • Componentes sin cambios: {len(FRONTEND_COMPONENTS) - processed_count - error_count}')
    print(f'  • Errores: {error_count}')
    print('\n📋 Backups creados: *.backup')
    print('⚠️  Revisa los cambios antes de commitear')

if __name__ == '__main__':
    main()
