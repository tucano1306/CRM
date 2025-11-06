# 🔧 Guía para Configurar Webhook de Clerk

## ✅ Estado Actual

- [x] CLERK_WEBHOOK_SECRET configurado en Vercel
- [x] Endpoint del webhook existe: `/api/webhooks/clerk`
- [ ] **PENDIENTE**: Webhook configurado en Clerk Dashboard

---

## 📋 Pasos para Configurar el Webhook

### **1. Ir a Clerk Dashboard**

Ve a: https://dashboard.clerk.com

### **2. Seleccionar tu Aplicación**

Busca el proyecto: **Food Orders CRM**

### **3. Configurar Webhook**

1. En el menú lateral: **Configure** → **Webhooks**
2. Click en **"+ Add Endpoint"**

### **4. Configuración del Endpoint**

```
Endpoint URL: https://food-order-crm.vercel.app/api/webhooks/clerk
Description: User sync to database
```

### **5. Seleccionar Eventos**

**IMPORTANTE**: Marca estas 3 casillas:

- ✅ `user.created` - Cuando un usuario se registra
- ✅ `user.updated` - Cuando un usuario actualiza su perfil
- ✅ `user.deleted` - Cuando un usuario se elimina

### **6. Verificar el Signing Secret**

Después de crear el webhook, Clerk mostrará un **Signing Secret**.

**Debe coincidir con el que tienes en Vercel:**
```
whsec_kFKmpccoXmDC8wnfauLnX1WJ2yqHUk6h
```

Si NO coincide:
1. Copia el nuevo secret de Clerk
2. Actualiza en Vercel:
   ```bash
   vercel env add CLERK_WEBHOOK_SECRET production
   # Pega el nuevo secret
   
   vercel env add CLERK_WEBHOOK_SECRET preview
   # Pega el nuevo secret
   
   vercel env add CLERK_WEBHOOK_SECRET development
   # Pega el nuevo secret
   ```
3. Redeploy: `vercel --prod`

### **7. Probar el Webhook**

Clerk tiene un botón **"Send Test Event"** en la configuración del webhook.

1. Click en "Send Test Event"
2. Selecciona: `user.created`
3. Click "Send"
4. Deberías ver un **✓ Success** (200 OK)

Si ves error:
- **401/403**: El secret no coincide
- **404**: La URL está mal
- **500**: Error en el código del webhook

---

## 🧪 Probar con Usuario Real

### **Opción A: Registrar usuario nuevo**

1. Abre ventana incógnito
2. Ve a: https://food-order-crm.vercel.app/sign-up
3. Regístrate con: `test-buyer@example.com`
4. Completa el registro

**Verificar que funcionó:**
```bash
node find-user.js test-buyer@example.com
```

Deberías ver:
- ✅ Usuario creado en `authenticated_users`
- ✅ Si existía cliente con ese email → Vinculado automáticamente
- ✅ Role: CLIENT
- ✅ Puede acceder a /buyer/catalog

### **Opción B: Usar tu usuario existente (leonic26@hotmail.com)**

Como ya te registraste pero el webhook no se ejecutó:

**Solución 1 - Trigger manual del webhook:**
1. Ve a Clerk Dashboard
2. Busca el usuario: `leonic26@hotmail.com`
3. Click en el usuario
4. Click en **"⋯" (tres puntos)** → **"Delete user"**
5. Confirma eliminación
6. Vuelve a registrarte con el mismo email
7. Esta vez el webhook SÍ debería ejecutarse

**Solución 2 - Crear el usuario manualmente:**
```bash
node create-buyer-user.js
```

Pero esto NO es la solución permanente, solo temporal.

---

## 🔍 Verificar que el Webhook Funciona

### **Ver logs en Vercel:**

1. Ve a: https://vercel.com
2. Tu proyecto: **food-order-crm**
3. Tab: **Logs**
4. Buscar: `/api/webhooks/clerk`

Deberías ver logs como:
```
📩 Webhook recibido: user.created
✅ Usuario creado: test@example.com (CLIENT)
🔍 Cliente encontrado con email test@example.com
✅ Usuario vinculado automáticamente con cliente existente
```

Si ves errores:
```
❌ Error verificando webhook
❌ CLERK_WEBHOOK_SECRET no configurado
❌ Headers de Svix faltantes
```

Entonces hay un problema de configuración.

---

## ✅ Checklist Final

Una vez configurado todo, verifica:

- [ ] Webhook configurado en Clerk Dashboard
- [ ] Eventos `user.created`, `user.updated`, `user.deleted` seleccionados
- [ ] Signing Secret coincide con el de Vercel
- [ ] Test event desde Clerk: **Success (200 OK)**
- [ ] Registro de usuario nuevo: Aparece en la BD
- [ ] Login funciona correctamente
- [ ] Usuario comprador ve `/buyer/catalog`

---

## 🆘 Si Aún No Funciona

1. **Revisar logs de Vercel** durante el registro
2. **Verificar que la URL del webhook es correcta** (sin espacios, https://)
3. **Confirmar que el secret está bien copiado** (sin comillas extras)
4. **Intentar eliminar y recrear el webhook** en Clerk
5. **Contactar soporte de Clerk** si persiste el problema

---

## 📞 Siguiente Paso

**AHORA MISMO:**

1. Ve a https://dashboard.clerk.com
2. Configura el webhook como indiqué arriba
3. Envía un "Test Event" de `user.created`
4. Si sale ✓ Success → Listo!
5. Elimina el usuario `leonic26@hotmail.com` de Clerk
6. Regístrate de nuevo con ese email
7. Verifica que ahora SÍ aparece en la BD

**Avísame cuando hayas configurado el webhook y te ayudo a verificar que funcione!** 🚀
