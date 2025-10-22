# 📁 Carpeta Public - Assets Públicos

## 🎨 Agregar Tu Logo

### Coloca tu logo aquí:
```
public/
├── logo.png          ← COLOCA TU LOGO AQUÍ
└── README.md         (este archivo)
```

---

## ✅ Especificaciones del Logo

| Propiedad | Valor Recomendado |
|-----------|-------------------|
| **Formato** | PNG con transparencia |
| **Tamaño** | 200x200px o mayor |
| **Proporción** | Cuadrado (1:1) |
| **Fondo** | Transparente |
| **Nombre** | `logo.png` |

---

## 📝 Instrucciones

### Paso 1: Prepara tu logo
- Edita tu logo en cualquier editor de imágenes
- Asegúrate de tener fondo transparente
- Exporta como PNG

### Paso 2: Copia el archivo aquí
```bash
# Copia tu logo a esta carpeta
Copy-Item "ruta\a\tu\logo.png" "public\logo.png"
```

O simplemente **arrastra y suelta** tu archivo en esta carpeta.

### Paso 3: Listo
- El logo aparecerá automáticamente en las facturas
- No necesitas reiniciar el servidor
- Genera una factura de prueba en `/orders`

---

## 🔧 Configuración Avanzada

Si quieres usar otro nombre o ubicación:

```typescript
// lib/invoice-config.ts
company: {
  logo: '/logo.png',           // Logo en public/logo.png
  // o
  logo: '/images/company.jpg', // Logo en public/images/company.jpg
  // o
  logo: '/brand/logo.png',     // Logo en public/brand/logo.png
}
```

---

## ❌ Sin Logo

Si no colocas un logo:
- Se mostrará un **placeholder** automáticamente
- Las facturas funcionarán perfectamente
- Puedes agregarlo después sin problema

---

## 🎯 Otros Assets

Esta carpeta también puede contener:
- Imágenes de productos
- Iconos
- Archivos estáticos
- Documentos públicos

**Ejemplo:**
```
public/
├── logo.png
├── images/
│   ├── product-1.jpg
│   └── product-2.jpg
├── icons/
│   └── favicon.ico
└── documents/
    └── terms.pdf
```

---

## 📚 Documentación

- **Guía completa:** `docs/LOGO_SETUP_GUIDE.md`
- **Inicio rápido:** `docs/LOGO_QUICK_START.md`

---

**🎨 Tip:** Usa [Remove.bg](https://remove.bg) para quitar el fondo de tu logo gratis.
