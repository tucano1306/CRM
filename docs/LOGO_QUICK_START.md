# 🚀 QUICK START: Agregar Logo a las Facturas

## 3 Pasos Simples

### 1️⃣ Prepara tu logo
- Formato: **PNG con transparencia** (recomendado)
- Tamaño: **200x200px** o mayor
- Nombre: **logo.png**

### 2️⃣ Colócalo aquí
```
public/logo.png  ← Arrastra tu logo aquí
```

### 3️⃣ Actualiza la configuración (opcional)
Si usaste otro nombre o formato:

```typescript
// lib/invoice-config.ts (línea 19)
company: {
  logo: '/logo.png',  // ← Cambia si usaste otro nombre
}
```

---

## ✅ ¡Listo!

Tu logo aparecerá automáticamente en todas las facturas.

---

## 📸 Vista Previa

**Con tu logo:**
```
┌────────────────────────────────────┐
│ [AZUL OSCURO - HEADER]             │
│  🏢                    FACTURA     │
│  TU LOGO              #ORD-001     │
└────────────────────────────────────┘
```

**Sin logo (placeholder):**
```
┌────────────────────────────────────┐
│ [AZUL OSCURO - HEADER]             │
│  ( ○ )                 FACTURA     │
│  LOGO                 #ORD-001     │
└────────────────────────────────────┘
```

---

## ❓ Problemas Comunes

### ❌ El logo no aparece
1. Verifica que el archivo esté en `public/logo.png`
2. Reinicia el servidor: `npm run dev`
3. Genera una nueva factura

### ❌ Logo con fondo blanco
- Usa **PNG con transparencia**
- Herramienta gratuita: [Remove.bg](https://remove.bg)

### ❌ Logo pixelado
- Usa una imagen más grande (500x500px o mayor)
- Mantén proporción cuadrada (1:1)

---

## 📚 Documentación Completa

Para más detalles: `docs/LOGO_SETUP_GUIDE.md`

---

**🎨 Tip:** Si no tienes logo ahora, las facturas funcionan perfectamente con el placeholder. Puedes agregarlo después.
