# 🔧 Solución de Problemas - start-crm.ps1

## ❌ Problema: Los navegadores no se abren

### Síntomas
- Ejecutas `.\start-crm.ps1`
- El script termina pero no abre Edge ni Chrome
- No ves ninguna ventana de navegador

---

## 🔍 Diagnóstico Rápido

### 1. Verificar que el servidor está corriendo

```powershell
# Ejecuta esto en PowerShell:
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

**Si muestra resultados:** El servidor está corriendo ✅  
**Si no muestra nada:** El servidor NO está corriendo ❌

---

## ✅ Soluciones

### Solución 1: Usar el Script Simple

Si `start-crm.ps1` no funciona, usa el script alternativo:

```powershell
.\start-simple.ps1
```

Este script te guía paso a paso.

---

### Solución 2: Inicio Manual (Más Confiable)

#### Paso 1: Iniciar el Servidor

Abre una **nueva terminal de PowerShell**:

```powershell
cd "C:\Users\tucan\Desktop\food-order CRM"
npm run dev
```

Espera hasta ver:
```
✓ Ready in 2s
```

#### Paso 2: Abrir Navegadores Manualmente

**Para VENDEDOR (Edge):**
1. Abre Microsoft Edge
2. Ve a: `http://localhost:3000/sign-in`
3. Inicia sesión con: `tucano0109@gmail.com`

**Para COMPRADOR (Chrome Incognito):**
1. Abre Chrome
2. Presiona `Ctrl + Shift + N` (modo incógnito)
3. Ve a: `http://localhost:3000/sign-in`
4. Inicia sesión con: `l3oyucon1978@gmail.com`

---

### Solución 3: Verificar Permisos de Ejecución

PowerShell podría estar bloqueando scripts:

```powershell
# Ver política actual
Get-ExecutionPolicy

# Si dice "Restricted", cambia a:
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

# Luego intenta de nuevo:
.\start-crm.ps1
```

---

### Solución 4: Verificar Rutas de Navegadores

Verifica que Edge y Chrome estén instalados:

```powershell
# Verificar Edge
Get-Command msedge -ErrorAction SilentlyContinue

# Verificar Chrome
Get-Command chrome -ErrorAction SilentlyContinue
```

**Si alguno no aparece:**
- Instala el navegador faltante
- O abre manualmente la URL después

---

## 🔍 Diagnóstico Avanzado

### Problema: Script se ejecuta pero navegadores no abren

#### Causa Probable 1: Antivirus/Firewall
- Windows Defender o antivirus podría bloquear
- **Solución:** Abre navegadores manualmente

#### Causa Probable 2: Navegadores no en PATH
- Los comandos `msedge` o `chrome` no se encuentran
- **Solución:** Usa rutas completas:

```powershell
# Edge con ruta completa
Start-Process "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" "http://localhost:3000/sign-in"

# Chrome con ruta completa
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" "--incognito http://localhost:3000/sign-in"
```

#### Causa Probable 3: Servidor no inició
- El servidor toma más de 30 segundos en iniciar
- **Solución:** Aumenta el tiempo de espera en el script o inicia manualmente

---

## 🐛 Debugging

### Ver logs del servidor

Si el servidor no inicia, verifica los errores:

```powershell
# Inicia con output visible
npm run dev
```

Errores comunes:
- **"Port 3000 already in use"** → Otro proceso usa el puerto
  ```powershell
  # Ver qué proceso usa el puerto
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
  
  # Matar el proceso
  Stop-Process -Id XXXX -Force
  ```

- **"Module not found"** → Falta instalar dependencias
  ```powershell
  npm install
  ```

- **"Cannot find module 'jspdf'"** → Instala jsPDF
  ```powershell
  npm install jspdf jspdf-autotable
  ```

---

## 📋 Checklist de Verificación

Antes de ejecutar el script, verifica:

- [ ] Node.js está instalado (`node --version`)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Puerto 3000 está libre
- [ ] Edge y/o Chrome están instalados
- [ ] PowerShell tiene permisos de ejecución
- [ ] No hay errores en el código (revisar terminal)

---

## 🎯 Método Alternativo: Usar el Terminal de VS Code

Si PowerShell externo no funciona:

1. Abre VS Code
2. Terminal → New Terminal
3. Ejecuta:
   ```bash
   npm run dev
   ```
4. Espera a que inicie
5. Abre navegadores manualmente

---

## 🚀 Script de Emergencia

Copia y pega esto en PowerShell si nada funciona:

```powershell
# Ir a directorio del proyecto
cd "C:\Users\tucan\Desktop\food-order CRM"

# Iniciar servidor en background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

# Esperar 15 segundos
Write-Host "Esperando servidor..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Abrir navegadores
Start-Process msedge "http://localhost:3000/sign-in"
Start-Sleep -Seconds 2
Start-Process chrome "--incognito http://localhost:3000/sign-in"

Write-Host "Listo!" -ForegroundColor Green
```

---

## 📞 Última Opción: Todo Manual

1. **Terminal 1:**
   ```powershell
   npm run dev
   ```

2. **Navegador 1 (Edge):**
   - Abre: `http://localhost:3000/sign-in`
   - Login: `tucano0109@gmail.com`

3. **Navegador 2 (Chrome Incognito):**
   - Abre modo incógnito
   - Ve a: `http://localhost:3000/sign-in`
   - Login: `l3oyucon1978@gmail.com`

---

## ✅ Verificación Final

Una vez que todo esté abierto:

1. **Edge debe mostrar:** Interfaz azul (vendedor)
2. **Chrome debe mostrar:** Interfaz morada (comprador)
3. **Si ambos muestran lo mismo:** Cierra todo y usa emails diferentes

---

## 📚 Archivos Relevantes

- `start-crm.ps1` - Script principal (automático)
- `start-simple.ps1` - Script simple (paso a paso)
- `package.json` - Configuración de scripts
- `.env.local` - Variables de entorno

---

## 🆘 Ayuda Adicional

Si sigues teniendo problemas:

1. Revisa la consola del navegador (F12) para errores
2. Revisa el terminal donde corre `npm run dev` para errores del servidor
3. Verifica que `.env.local` tenga las credenciales de Clerk correctas
4. Asegúrate de estar usando Node.js 18 o superior

---

**💡 Tip:** La forma más confiable es siempre iniciar el servidor manualmente (`npm run dev`) y luego abrir los navegadores tú mismo.
