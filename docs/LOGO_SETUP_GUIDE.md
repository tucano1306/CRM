# 🎨 Guía: Agregar Tu Logo a las Facturas

## 📍 Ubicación del Logo

Coloca tu logo en la carpeta `public/` de tu proyecto:

```
food-order CRM/
├── public/
│   └── logo.png          ← COLOCA TU LOGO AQUÍ
├── lib/
│   └── invoice-config.ts ← Configurar ruta del logo aquí
```

---

## 📐 Especificaciones del Logo

### Tamaño Recomendado
- **Dimensiones:** 200x200px o mayor
- **Proporción:** Cuadrado (1:1) preferible
- **Resolución:** Mínimo 72 DPI, recomendado 150 DPI

### Formatos Soportados
- ✅ **PNG** (recomendado) - Soporta transparencia
- ✅ **JPG/JPEG** - Si no necesitas transparencia
- ❌ **SVG** - No soportado directamente por jsPDF

### Características Ideales
- ✅ Fondo transparente (PNG)
- ✅ Colores sólidos y claros
- ✅ Alta resolución
- ✅ Aspecto profesional
- ⚠️ Evitar fondos blancos (se verá bien en PDF)

---

## 🔧 Configuración

### Paso 1: Preparar tu Logo

1. **Edita tu logo** usando:
   - Photoshop, GIMP, Canva, etc.
   - Dimensiones: 200x200px mínimo
   - Formato: PNG con transparencia

2. **Exporta el archivo:**
   - Nombre: `logo.png`
   - Calidad: Alta
   - Fondo: Transparente

### Paso 2: Colocar el Logo

Copia tu archivo `logo.png` a la carpeta `public/`:

```bash
# Windows PowerShell
Copy-Item "C:\ruta\a\tu\logo.png" "C:\Users\tucan\Desktop\food-order CRM\public\logo.png"

# Windows (explorador)
# Arrastra y suelta logo.png en la carpeta public/
```

### Paso 3: Configurar la Ruta

Edita `lib/invoice-config.ts` (línea 19):

```typescript
export const INVOICE_CONFIG = {
  company: {
    name: 'Tu Empresa',
    // ... otros campos
    logo: '/logo.png',  // ← Ruta al logo
  },
}
```

**Rutas válidas:**
```typescript
logo: '/logo.png',           // Logo en public/logo.png
logo: '/images/logo.png',    // Logo en public/images/logo.png
logo: '/brand/company.jpg',  // Logo JPG en public/brand/company.jpg
```

---

## 🎨 Opciones de Logo

### Opción 1: PNG con Transparencia (Recomendado)

```typescript
// lib/invoice-config.ts
company: {
  logo: '/logo.png',
}
```

**Ventajas:**
- ✅ Se ve profesional sobre fondo azul
- ✅ No tiene cuadro blanco alrededor
- ✅ Se adapta a cualquier color de fondo

### Opción 2: JPG con Fondo Blanco

```typescript
// lib/invoice-config.ts
company: {
  logo: '/logo.jpg',
}
```

**Ventajas:**
- ✅ Archivo más pequeño
- ⚠️ Puede tener cuadro blanco visible

### Opción 3: Sin Logo (Placeholder)

Si no configuras un logo o el archivo no existe:
- Se muestra un círculo blanco con el texto "LOGO"
- El PDF se genera normalmente

---

## 🖼️ Cómo Se Ve en la Factura

### Con Logo PNG (Transparencia)

```
┌──────────────────────────────────────────────┐
│ ████████████████████████████ [FONDO AZUL]   │
│ ██                                           │
│ ██  [🏢 LOGO]              FACTURA          │
│ ██                         #ORD-001          │
│ ██                                           │
└──────────────────────────────────────────────┘
```

### Con Logo JPG (Fondo Blanco)

```
┌──────────────────────────────────────────────┐
│ ████████████████████████████ [FONDO AZUL]   │
│ ██                                           │
│ ██  ┌─────┐                 FACTURA         │
│ ██  │LOGO │                 #ORD-001         │
│ ██  └─────┘                                  │
└──────────────────────────────────────────────┘
```

### Sin Logo (Placeholder)

```
┌──────────────────────────────────────────────┐
│ ████████████████████████████ [FONDO AZUL]   │
│ ██                                           │
│ ██   ( ○ )                  FACTURA         │
│ ██   LOGO                   #ORD-001         │
│ ██                                           │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Solución de Problemas

### El logo no aparece

**Problema:** El PDF muestra el placeholder en lugar de tu logo

**Soluciones:**

1. **Verifica la ruta del archivo:**
   ```bash
   # Debe existir
   ls public/logo.png
   ```

2. **Verifica la configuración:**
   ```typescript
   // lib/invoice-config.ts
   logo: '/logo.png',  // ¿Coincide con el nombre del archivo?
   ```

3. **Reinicia el servidor:**
   ```bash
   # Detén (Ctrl+C) y reinicia
   npm run dev
   ```

4. **Verifica el formato:**
   - Solo PNG, JPG, JPEG son soportados
   - SVG NO funciona directamente

### El logo se ve distorsionado

**Problema:** El logo aparece estirado o pixelado

**Soluciones:**

1. **Usa un logo de mayor resolución:**
   - Mínimo: 200x200px
   - Recomendado: 500x500px o mayor

2. **Mantén proporción cuadrada:**
   - Edita tu logo para que sea 1:1 (cuadrado)
   - No estires la imagen

3. **Ajusta el tamaño en el código:**
   ```typescript
   // lib/invoiceGenerator.ts (línea ~74)
   doc.addImage(logoPath, format, 15, 10, 20, 20)
   //                              ^   ^   ^   ^
   //                              X   Y   W   H
   
   // Para logo más grande:
   doc.addImage(logoPath, format, 12, 8, 25, 25)
   ```

### El logo tiene fondo blanco visible

**Problema:** Se ve un cuadro blanco alrededor del logo

**Soluciones:**

1. **Usa PNG con transparencia:**
   - Abre tu logo en editor de imágenes
   - Elimina el fondo blanco
   - Exporta como PNG con transparencia

2. **Herramientas recomendadas:**
   - [Remove.bg](https://remove.bg) - Quitar fondo online
   - Photoshop - Seleccionar y eliminar fondo
   - GIMP - Herramienta gratuita
   - Canva - Remover fondo

### Error al generar PDF

**Problema:** La factura no se genera o muestra error

**Soluciones:**

1. **Verifica la consola del navegador (F12):**
   ```
   Error: Image not found
   ```

2. **Asegúrate que el archivo existe:**
   - Ruta correcta en `public/`
   - Nombre correcto en configuración

3. **El sistema usará placeholder automáticamente:**
   - Si hay error, se muestra "LOGO"
   - La factura se genera sin problema

---

## 🎯 Recomendaciones

### Para Mejor Resultado

1. **Logo profesional:**
   - Diseñado por un diseñador gráfico
   - Alta resolución
   - Fondo transparente

2. **Colores coherentes:**
   - Que combine con el azul del header
   - Contraste suficiente para legibilidad

3. **Formato PNG:**
   - Siempre preferir PNG sobre JPG
   - Transparencia es clave

4. **Tamaño del archivo:**
   - Mantener < 500KB
   - Optimizar con herramientas como TinyPNG

### Alternativa: Logo en Base64

Para mayor portabilidad, puedes usar base64:

```typescript
// lib/invoice-config.ts
company: {
  logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
}
```

**Convertir a Base64:**
```bash
# Online: https://base64-image.de/
# O usando Node.js:
const fs = require('fs')
const imageBuffer = fs.readFileSync('logo.png')
const base64Image = imageBuffer.toString('base64')
console.log('data:image/png;base64,' + base64Image)
```

---

## 📚 Recursos Útiles

### Crear/Editar Logos

- [Canva](https://canva.com) - Diseño online gratuito
- [LogoMakr](https://logomakr.com) - Crear logos simples
- [Hatchful](https://hatchful.shopify.com) - Generador de logos

### Quitar Fondos

- [Remove.bg](https://remove.bg) - Eliminar fondo automáticamente
- [Photopea](https://photopea.com) - Editor tipo Photoshop online
- [GIMP](https://gimp.org) - Editor gratuito de escritorio

### Optimizar Imágenes

- [TinyPNG](https://tinypng.com) - Comprimir PNG
- [Squoosh](https://squoosh.app) - Optimizador de Google
- [ImageOptim](https://imageoptim.com) - Herramienta de escritorio

---

## ✅ Checklist

- [ ] Logo preparado (200x200px mínimo)
- [ ] Formato PNG con transparencia
- [ ] Archivo copiado a `public/logo.png`
- [ ] Configuración actualizada en `invoice-config.ts`
- [ ] Servidor reiniciado
- [ ] Factura de prueba generada
- [ ] Logo se ve correctamente en PDF

---

## 🎉 Resultado Final

Una vez configurado correctamente, tu logo aparecerá:
- ✅ En la esquina superior izquierda
- ✅ Sobre fondo azul del header
- ✅ En todas las facturas generadas
- ✅ Con aspecto profesional

**Tamaño en PDF:** 20x20 unidades (aproximadamente 7x7mm)  
**Posición:** (15, 10) - Esquina superior izquierda

---

**¿Necesitas ayuda adicional?** Revisa la consola del navegador (F12) al generar una factura para ver mensajes de error específicos.
