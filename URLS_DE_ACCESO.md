# 🔗 URLs de Acceso - Bargain CRM

## 🌐 URL Base de Producción
```
https://food-order-mo3yped1e-tucano0109-5495s-projects.vercel.app
```

---

## 🎯 URLs de Acceso Directo

### 👤 Para Vendedores:
```
https://food-order-mo3yped1e-tucano0109-5495s-projects.vercel.app/?mode=seller
```

**Características:**
- ✅ Dashboard de vendedor
- ✅ Gestión de productos
- ✅ Gestión de clientes  
- ✅ Órdenes y cotizaciones
- ✅ Reportes y estadísticas

---

### 🛒 Para Compradores:
```
https://food-order-mo3yped1e-tucano0109-5495s-projects.vercel.app/?mode=buyer
```

**Características:**
- ✅ Catálogo de productos
- ✅ Carrito de compras
- ✅ Mis pedidos
- ✅ Cotizaciones recibidas
- ✅ Historial de compras

---

### 🏠 Página de Selección:
```
https://food-order-mo3yped1e-tucano0109-5495s-projects.vercel.app/select-mode
```

Página de aterrizaje donde puedes elegir tu tipo de acceso.

---

## 📋 Cómo Funciona

1. **Usuario visita URL con `?mode=seller`:**
   - Middleware verifica que el usuario tenga rol SELLER/ADMIN
   - Si no tiene permisos → Redirige a login con mensaje de error
   - Si tiene permisos → Accede al dashboard de vendedor

2. **Usuario visita URL con `?mode=buyer`:**
   - Middleware verifica que el usuario tenga rol CLIENT
   - Si no tiene permisos → Redirige a login con mensaje de error
   - Si tiene permisos → Accede al dashboard de comprador

3. **Usuario visita URL sin parámetro:**
   - Redirige a `/select-mode` para elegir tipo de acceso

---

## 🔐 Seguridad

El middleware valida:
- ✅ Usuario autenticado
- ✅ Rol correcto para el modo solicitado
- ✅ Rate limiting por IP
- ✅ CORS headers
- ✅ Logs de seguridad

---

## 📱 URLs Cortas (Opcional)

Puedes usar un acortador de URLs gratuito como:
- bit.ly
- tinyurl.com
- rebrandly.com

**Ejemplo:**
- `bit.ly/bargain-seller` → Vendedores
- `bit.ly/bargain-buyer` → Compradores

---

## 🚀 Próximos Pasos (Cuando esté listo para producción)

1. **Comprar dominio personalizado** (ej: `bargain-food.com`)
2. **Configurar subdominios en Vercel:**
   - `seller.bargain-food.com`
   - `shop.bargain-food.com`
3. **URLs finales serán:**
   - Vendedores: `seller.bargain-food.com`
   - Compradores: `shop.bargain-food.com`

---

## 📝 Notas

- Las URLs actuales son **completamente funcionales** para pruebas
- El sistema valida permisos en cada request
- No necesitas pagar nada por ahora
- Cuando estés listo para producción, podemos migrar a subdominios personalizados

---

**Última actualización:** 5 de noviembre de 2025
