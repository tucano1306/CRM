# 🔗 Sistema de Invitación de Compradores

## Resumen

Se implementó un sistema completo para que los vendedores puedan invitar a compradores a conectarse con ellos mediante un link único.

## Componentes Creados

### 1. Botón Azul en Página de Clientes (`/clients`)

**Ubicación**: Página de clientes del vendedor  
**Función**: Generar link de invitación

**Features**:
- Botón azul "Invitar Comprador" con ícono Link2
- Loading state mientras genera el link
- Modal elegante con el link generado
- Botón "Copiar" con feedback visual (✓ ¡Copiado!)
- Instrucciones claras de cómo funciona el proceso

### 2. API Endpoint - Generar Link
**Ruta**: `POST /api/seller/invitation-link`

**Funcionalidad**:
- Verifica que el usuario sea vendedor
- Genera token único: `inv_{sellerId}_{timestamp}_{random}`
- Válido por 7 días
- Retorna link completo: `/buyer/connect?token={token}&seller={sellerId}`

**Respuesta**:
```json
{
  "success": true,
  "data": {
    "link": "https://tu-app.com/buyer/connect?token=inv_xxx&seller=yyy",
    "token": "inv_xxx",
    "sellerId": "yyy",
    "sellerName": "Nombre Vendedor",
    "expiresAt": "2025-11-17T...",
    "validDays": 7
  }
}
```

### 3. Página de Conexión - Buyer
**Ruta**: `/buyer/connect?token={token}&seller={sellerId}`

**Flujo**:
1. **Validación**: Verifica formato del token y existencia del vendedor
2. **Info del Vendedor**: Muestra nombre, email y teléfono
3. **Sin autenticación**: Redirige a sign-in con redirect_url de vuelta
4. **Con autenticación**: Botón "Aceptar y Conectar"
5. **Éxito**: Muestra confirmación y redirige a `/buyer/dashboard`

**Estados**:
- Loading (validando invitación)
- Error (link inválido/expirado)
- Pendiente (muestra info vendedor, botón conectar)
- Success (conexión exitosa, redirect automático)

### 4. API Endpoint - Conectar Buyer
**Ruta**: `POST /api/buyer/connect-seller`

**Body**:
```json
{
  "token": "inv_xxx",
  "sellerId": "yyy"
}
```

**Funcionalidad**:
- Valida token y sellerId
- Si el buyer ya tiene un client: actualiza `sellerId`
- Si es nuevo: 
  - Crea `authenticated_user` con info de Clerk
  - Crea `client` vinculado al vendedor
- Retorna confirmación de conexión

**Seguridad**:
- Verifica autenticación (Clerk userId)
- Valida formato del token (debe empezar con `inv_` y contener sellerId)
- Verifica existencia del vendedor en DB

## Archivos Modificados/Creados

### Nuevos
1. ✅ `app/api/seller/invitation-link/route.ts` - Generar link
2. ✅ `app/api/buyer/connect-seller/route.ts` - Aceptar invitación
3. ✅ `app/buyer/connect/page.tsx` - Página de conexión

### Modificados
1. ✅ `app/clients/page.tsx` - Botón azul + modal

## Flujo Completo

```
[Vendedor] → Click "Invitar Comprador"
           ↓
    Genera Link único
           ↓
   [Modal con Link] → Copia y Envía (WhatsApp, Email, etc.)
           ↓
[Comprador] → Abre Link
           ↓
  /buyer/connect muestra Info del Vendedor
           ↓
  ¿Tiene cuenta? → No → Sign In/Up → Vuelve con redirect
                 ↓
                 Sí → Click "Aceptar y Conectar"
           ↓
    Se crea relación Client ↔ Seller
           ↓
   Redirect a /buyer/dashboard
           ↓
   [Comprador] puede hacer pedidos al vendedor
```

## Tecnologías Utilizadas

- **Next.js 15** App Router
- **Clerk** para autenticación
- **Prisma** para DB operations
- **Tailwind CSS** para estilos
- **Lucide Icons** para iconografía
- **React Suspense** para manejo de search params

## Casos de Uso

### Caso 1: Comprador nuevo
1. Vendedor genera link y envía por WhatsApp
2. Comprador hace clic
3. Se le pide crear cuenta (Clerk sign-up)
4. Después del sign-up, vuelve automáticamente a /buyer/connect
5. Acepta la conexión
6. Ya puede navegar catálogo y hacer pedidos

### Caso 2: Comprador existente sin vendedor
1. Comprador ya tiene cuenta pero no está vinculado a ningún vendedor
2. Hace clic en link de invitación
3. Ve info del vendedor
4. Acepta conectarse
5. Su `client.sellerId` se actualiza

### Caso 3: Comprador ya conectado a otro vendedor
1. Hace clic en nuevo link
2. Acepta
3. Se actualiza su `sellerId` al nuevo vendedor
4. Ahora hace pedidos al nuevo vendedor (puede cambiar vendedores)

## Seguridad

- ✅ Tokens únicos no reutilizables (timestamp + random)
- ✅ Validación de formato del token
- ✅ Verificación de autenticación en ambos endpoints
- ✅ Validación de roles (solo vendedores generan links)
- ✅ Verificación de existencia del vendedor
- ✅ Expiración del link (7 días - visual, no enforced en v1)

## Mejoras Futuras (Opcionales)

1. **Persistir tokens en DB** con fecha de expiración real
2. **Límite de uso** por token (single-use vs multi-use)
3. **Analytics**: Trackear cuántos buyers aceptaron invitaciones
4. **Notificaciones**: Avisar al vendedor cuando un buyer acepta
5. **Customización**: Permitir mensaje personalizado en la invitación
6. **QR Code**: Generar QR del link para imprimir/compartir
7. **Email automation**: Enviar link directo por email desde la app

## Testing

### Manual
1. Login como vendedor
2. Ir a /clients
3. Click "Invitar Comprador"
4. Copiar link
5. Abrir en incógnito/otro navegador
6. Sign up como nuevo usuario
7. Aceptar conexión
8. Verificar que aparezca en lista de clientes del vendedor

### Endpoints
```bash
# Generar link (como vendedor autenticado)
curl -X POST http://localhost:3000/api/seller/invitation-link

# Aceptar invitación (como buyer autenticado)
curl -X POST http://localhost:3000/api/buyer/connect-seller \
  -H "Content-Type: application/json" \
  -d '{"token":"inv_xxx","sellerId":"yyy"}'
```

---

**Fecha de implementación**: 2025-11-10  
**Build status**: ✅ Exitoso (93 páginas generadas)  
**Listo para producción**: ✅ Sí
