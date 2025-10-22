# 📄 Sistema de Facturación - Guía de Configuración

## ✅ Estado de la Instalación

### Dependencias Instaladas
- ✅ `jspdf@3.0.3` - Generación de PDFs
- ✅ `jspdf-autotable@5.0.2` - Tablas para PDFs

### Archivos del Sistema
- ✅ `lib/invoiceGenerator.ts` - Generador de PDF
- ✅ `lib/invoice-config.ts` - **Configuración centralizada**
- ✅ `components/orders/InvoiceButton.tsx` - Componente de botones
- ✅ `app/orders/page.tsx` - Integración en página de órdenes

---

## 🔧 Personalización de la Información

### PASO 1: Actualizar Información de la Empresa

Edita el archivo `lib/invoice-config.ts`:

```typescript
export const INVOICE_CONFIG = {
  company: {
    name: 'Food Orders CRM',  // ← Cambia por el nombre de tu empresa
    legalName: 'Food Orders CRM S.A. de C.V.',  // ← Razón social
    address: '123 Calle Principal, Ciudad, Estado, CP 00000',  // ← Tu dirección
    phone: '(000) 000-0000',  // ← Tu teléfono
    email: 'contacto@foodorderscrm.com',  // ← Tu email
    website: 'www.foodorderscrm.com',  // ← Tu sitio web
    taxId: 'RFC: XXXX000000XXX',  // ← Tu RFC o Tax ID
  },
```

### PASO 2: Configurar Impuestos y Términos de Pago

En el mismo archivo, ajusta:

```typescript
  invoice: {
    defaultTaxRate: 0.10,  // ← 10% IVA (ajusta según tu país)
    defaultPaymentTerms: 30,  // ← Días para pagar
    currency: 'MXN',  // ← Moneda (MXN, USD, etc.)
    currencySymbol: '$',  // ← Símbolo
  },
```

### PASO 3: Personalizar Términos y Condiciones

Edita los términos legales:

```typescript
  terms: {
    payment: 'Pago neto a 30 días...',  // ← Términos de pago
    conditions: [
      'Primera condición...',
      'Segunda condición...',
      // Agrega todas las que necesites
    ],
    notes: 'Gracias por su preferencia.',  // ← Nota final
  },
```

### PASO 4: Información Bancaria (Opcional)

Si quieres incluir datos bancarios:

```typescript
  banking: {
    bankName: 'Banco Ejemplo',  // ← Nombre del banco
    accountNumber: '1234-5678-9012-3456',  // ← Número de cuenta
    clabe: '012345678901234567',  // ← CLABE (México)
    swift: 'BANCMXMM',  // ← Código SWIFT
  },
```

---

## 🎨 Cómo Usar el Sistema

### En la Página de Órdenes

1. Ve a `/orders`
2. Expande cualquier orden (clic en la tarjeta)
3. Busca la sección **"Factura"** (fondo azul claro)
4. Usa los botones:
   - **"Ver Factura"** - Abre el PDF en nueva pestaña
   - **"Descargar PDF"** - Descarga directamente

### Características del PDF Generado

✅ **Información incluida:**
- Número de factura
- Fechas (emisión y vencimiento)
- Datos del vendedor y cliente
- Lista detallada de productos con SKU
- Cálculo de subtotal, impuestos y total
- Términos de pago
- Condiciones legales

✅ **Diseño profesional:**
- Colores corporativos
- Tablas organizadas
- Total destacado en verde
- Footer con información de contacto

---

## 🔍 Verificación de Datos

### Campos Requeridos en las Órdenes

El sistema obtiene los siguientes datos automáticamente:

**Del Cliente:**
- Nombre
- Razón social (si existe)
- Dirección
- Teléfono
- Email

**Del Vendedor:**
- Nombre (del usuario en sesión)
- Email
- Teléfono

**De los Productos:**
- SKU
- Nombre
- Cantidad
- Unidad (case, kg, lb, etc.)
- Precio unitario
- Subtotal

### API Actualizada

La API `/api/orders` ahora incluye todos estos campos:
- ✅ `client.businessName`
- ✅ `client.address`
- ✅ `seller.email`
- ✅ `seller.phone`
- ✅ `product.unit`

---

## 📝 Notas Importantes

### Cálculo de Impuestos
- El impuesto por defecto es **10%**
- Se calcula automáticamente sobre el subtotal
- Configurable en `invoice-config.ts`

### Fechas de Vencimiento
- Por defecto: **30 días** después de la orden
- Configurable en `invoice-config.ts`

### Formato de Números
- Moneda: `$1,234.56` (formato en pesos)
- Se puede cambiar el símbolo en la configuración

### Manejo de Datos Faltantes
- Si falta `businessName`, solo usa el nombre
- Si faltan notas, usa la nota por defecto
- Los términos y condiciones siempre se incluyen

---

## 🚀 Próximos Pasos Opcionales

### Mejoras Recomendadas

1. **Logo de la Empresa**
   - Edita `lib/invoiceGenerator.ts` línea ~60
   - Reemplaza el placeholder con tu logo

2. **Múltiples Idiomas**
   - Crea `invoice-config.en.ts` para inglés
   - Detecta idioma del cliente

3. **Envío por Email**
   - Integra con servicio de email
   - Envía factura automáticamente

4. **Historial de Facturas**
   - Guarda facturas generadas en la BD
   - Agrega tabla `Invoice` en Prisma

5. **Códigos QR**
   - Agrega QR para verificación
   - Usa librería `qrcode`

---

## 💡 Solución de Problemas

### Error: "Cannot find module 'jspdf'"
```bash
npm install jspdf jspdf-autotable
```

### La factura no muestra todos los datos
- Verifica que la orden tenga todos los campos
- Revisa la consola del navegador
- Asegúrate de que la API devuelve los datos completos

### Formato incorrecto en el PDF
- Revisa `lib/invoiceGenerator.ts`
- Ajusta dimensiones y posiciones
- Prueba con diferentes tamaños de datos

---

## 📞 Soporte

Para más ayuda, revisa:
- `components/orders/USAGE_EXAMPLES.md` - Ejemplos de uso
- `lib/invoiceGenerator.ts` - Código del generador
- `lib/invoice-config.ts` - Configuración

---

**¡Sistema de facturación listo para producción! 🎉**

Actualiza la configuración en `lib/invoice-config.ts` y estarás listo para generar facturas profesionales.
