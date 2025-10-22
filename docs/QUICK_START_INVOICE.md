# 🎯 Guía Rápida: Actualizar Información del Vendedor

## 📍 Ubicación del Archivo

```
food-order CRM/
├── lib/
│   └── invoice-config.ts  ← EDITA ESTE ARCHIVO
```

---

## ✏️ Ejemplo de Configuración

### ANTES (valores por defecto):

```typescript
export const INVOICE_CONFIG = {
  company: {
    name: 'Food Orders CRM',
    legalName: 'Food Orders CRM S.A. de C.V.',
    address: '123 Calle Principal, Ciudad, Estado, CP 00000',
    phone: '(000) 000-0000',
    email: 'contacto@foodorderscrm.com',
    website: 'www.foodorderscrm.com',
    taxId: 'RFC: XXXX000000XXX',
  },
```

### DESPUÉS (ejemplo personalizado):

```typescript
export const INVOICE_CONFIG = {
  company: {
    name: 'Distribuidora El Buen Sabor',
    legalName: 'Distribuidora El Buen Sabor S.A. de C.V.',
    address: 'Av. Reforma 456, Col. Centro, CDMX, CP 06000',
    phone: '(55) 1234-5678',
    email: 'ventas@elbuensabor.com',
    website: 'www.elbuensabor.com',
    taxId: 'RFC: DBS850123ABC',
  },
```

---

## 🔢 Campos Explicados

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `name` | Nombre comercial de tu empresa | "Mi Empresa de Alimentos" |
| `legalName` | Razón social completa | "Mi Empresa S.A. de C.V." |
| `address` | Dirección física completa | "Calle 123, Ciudad, CP 12345" |
| `phone` | Teléfono con lada | "(55) 1234-5678" |
| `email` | Email de contacto | "ventas@miempresa.com" |
| `website` | Sitio web (sin https://) | "www.miempresa.com" |
| `taxId` | RFC o Tax ID | "RFC: ABC123456XYZ" |

---

## 💰 Configuración de Impuestos

```typescript
  invoice: {
    defaultTaxRate: 0.16,  // ← 16% IVA para México
    // o
    defaultTaxRate: 0.10,  // ← 10% para otros países
    // o
    defaultTaxRate: 0.00,  // ← Sin impuestos
    
    defaultPaymentTerms: 30,  // ← Días para pagar (15, 30, 45, 60)
    currency: 'MXN',  // ← MXN, USD, EUR, etc.
    currencySymbol: '$',  // ← $, €, £, etc.
  },
```

---

## 📋 Personalizar Términos

```typescript
  terms: {
    payment: 'Pago neto a 30 días. Se aceptan transferencias bancarias, efectivo o cheque.',
    
    conditions: [
      'Los productos son propiedad de [TU EMPRESA] hasta que el pago sea completado.',
      'Los pagos vencidos tendrán un cargo por mora del 2% mensual.',
      'Cualquier disputa debe ser notificada dentro de los 5 días hábiles.',
      'Esta factura está sujeta a las leyes comerciales vigentes.',
      // Agrega o modifica según tus políticas
    ],
    
    notes: '¡Gracias por su preferencia! Estamos para servirle.',
  },
```

---

## 🏦 Información Bancaria (Opcional)

Si quieres que aparezca en las facturas:

```typescript
  banking: {
    bankName: 'BBVA Bancomer',
    accountNumber: '0123456789',
    clabe: '012180001234567890',
    swift: 'BCMRMXMM',
  },
```

**Nota:** Esta sección es opcional. Si no la necesitas, déjala como está o elimínala.

---

## ✅ Verificar Cambios

Después de editar `lib/invoice-config.ts`:

1. **Guarda el archivo** (Ctrl + S)
2. **Recarga la aplicación** (el servidor detecta cambios automáticamente)
3. **Genera una factura de prueba**:
   - Ve a `/orders`
   - Expande una orden
   - Clic en "Ver Factura"
4. **Verifica que aparezca tu información**

---

## 🎨 Vista Previa de la Factura

Tu información aparecerá así en el PDF:

```
┌─────────────────────────────────────────────────────────┐
│ FACTURA                                                 │
│                                                         │
│ TU EMPRESA                      CLIENTE                │
│ Tu Dirección                    Nombre del Cliente     │
│ Tu Teléfono                     Dirección del Cliente  │
│ Tu Email                        Teléfono del Cliente   │
│ RFC: TU-RFC                                            │
│                                                         │
│ PRODUCTOS                                              │
│ ┌─────┬─────────┬─────┬──────┬────────┬───────────┐ │
│ │ SKU │ Nombre  │ Qty │ Unit │ Precio │ Subtotal  │ │
│ └─────┴─────────┴─────┴──────┴────────┴───────────┘ │
│                                                         │
│                              Subtotal: $1,000.00       │
│                              IVA (16%): $160.00        │
│                              TOTAL: $1,160.00          │
│                                                         │
│ TÉRMINOS DE PAGO                                       │
│ Tu texto de términos de pago...                       │
│                                                         │
│ TÉRMINOS Y CONDICIONES                                 │
│ Tus términos y condiciones...                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Errores Comunes

### ❌ No aparece mi información
- **Causa:** No guardaste el archivo
- **Solución:** Presiona Ctrl + S y recarga

### ❌ Error de sintaxis
- **Causa:** Olvidaste una coma o comilla
- **Solución:** Verifica que cada línea termine con coma (excepto la última)

### ❌ La factura está en blanco
- **Causa:** Error en el formato de los datos
- **Solución:** Revisa la consola del navegador (F12)

---

## 📱 Contacto Rápido

**Archivo a editar:** `lib/invoice-config.ts`  
**Líneas importantes:** 10-20 (información de empresa)  
**Líneas de impuestos:** 23-27 (configuración de factura)  

---

**¡Listo! Con estos cambios, tus facturas tendrán tu información personalizada.** 🎉
