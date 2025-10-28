# ESTRUCTURA DEL PROYECTO - Food Orders CRM

## ✅ ESTRUCTURA LIMPIA Y ORGANIZADA

### 📁 Estructura Principal

```
food-order-crm/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   ├── buyer/                    # Páginas del comprador
│   ├── seller/                   # Páginas del vendedor (obsoleto, usar /)
│   ├── chat/                     # Chat del vendedor
│   ├── clients/                  # Gestión de clientes
│   ├── dashboard/                # Dashboard vendedor
│   ├── orders/                   # Gestión de órdenes
│   ├── products/                 # Gestión de productos
│   ├── quotes/                   # Sistema de cotizaciones
│   ├── recurring-orders/         # Órdenes recurrentes
│   ├── returns/                  # Devoluciones
│   ├── stats/                    # Estadísticas
│   └── ...
│
├── components/                   # Componentes React
│   ├── chat/                     # Componentes de chat
│   ├── clients/                  # Componentes de clientes
│   ├── notifications/            # Sistema de notificaciones
│   ├── orders/                   # Componentes de órdenes
│   ├── products/                 # Componentes de productos
│   ├── providers/                # Context providers
│   ├── quotes/                   # Componentes de cotizaciones
│   ├── returns/                  # Componentes de devoluciones
│   ├── shared/                   # Componentes compartidos
│   └── ui/                       # Componentes UI base (shadcn)
│
├── lib/                          # Librerías y utilidades
│   ├── events/                   # Sistema de eventos
│   ├── api-client.ts            # Cliente HTTP
│   ├── db.ts                    # Mock DB para tests
│   ├── logger.ts                # Sistema de logging
│   ├── notifications.ts         # Lógica de notificaciones
│   ├── prisma.ts                # Cliente Prisma singleton
│   ├── timeout.ts               # Manejo de timeouts
│   ├── utils.ts                 # Utilidades generales
│   └── validations.ts           # Schemas Zod
│
├── prisma/                       # Prisma ORM
│   ├── migrations/              # Migraciones de BD
│   ├── schema.prisma            # Schema de la BD
│   └── seed.ts                  # Datos semilla
│
├── hooks/                        # Custom React Hooks
│   ├── usePrefetch.ts
│   └── useUnreadMessages.ts
│
├── types/                        # Definiciones TypeScript
│   └── index.ts
│
├── public/                       # Archivos estáticos
│   ├── uploads/                 # Archivos subidos
│   └── NOTIFICATION_SOUND_SETUP.md
│
├── scripts/                      # Scripts de utilidad
│   └── ...
│
├── database/                     # Esquemas SQL (referencia)
│   ├── schema.sql
│   ├── quotes-migration.sql
│   ├── recurring-orders-migration.sql
│   └── add_returns_system.sql
│
├── backups/                      # Backups del schema
│   └── schema-backup-*.prisma
│
├── docs/                         # Documentación
│
├── __tests__/                    # Tests
│
├── .github/                      # GitHub Actions
│
├── middleware.ts                 # Middleware de Next.js
├── tailwind.config.js           # Config Tailwind
├── tsconfig.json                # Config TypeScript
├── next-env.d.ts                # Types de Next.js
├── package.json                 # Dependencias
├── vercel.json                  # Config Vercel
├── .gitignore                   # Git ignore
├── .env.example                 # Ejemplo de variables
│
├── start-crm.ps1                # Script para iniciar proyecto
├── restart-server.ps1           # Script para reiniciar
├── download-notification-sound.ps1
│
└── Documentación:
    ├── APLICAR_MIGRACION_ORDENES_RECURRENTES.md
    ├── CHAT_FILE_UPLOAD_NOTIFICATION_SOUND.md
    ├── CHAT_NUEVAS_FUNCIONALIDADES.md
    ├── CLIENTS_UI_IMPROVEMENTS.md
    ├── FUNCIONES_NO_IMPLEMENTADAS.md
    ├── INSTRUCCIONES_SONIDO.md
    ├── INTEGRACION_VISUAL_COMPLETADA.md
    ├── RECURRING_ORDERS_NOTIFICATIONS_FIX.md
    ├── REINICIAR_SERVIDOR.md
    ├── SISTEMA_COTIZACIONES_COMPLETADO.md
    └── SISTEMA_ORDENES_RECURRENTES_COMPLETO.md
```

## 🗑️ ARCHIVOS ELIMINADOS (63 archivos, 0.15 MB)

### Scripts JavaScript de Debugging (18 archivos):
- apply-timeouts.js
- change-role-to-client.js
- check-columns.js, check-credits.js, check-products.js
- check-return-credit.js, check-return.js
- create-missing-credit.js, create-test-return.js
- demo-credit-protection.js
- diagnostic-order-animations.js
- find-client.js
- fix-all-currency.js, fix-currency-format.js, fix-seller-auth.js
- list-sellers.js
- test-credit-endpoint.js
- verify-seller-authid.js

### Scripts SQL de Debugging (26 archivos):
- check-*.sql (10 archivos)
- verify-*.sql (5 archivos)
- fix-*.sql (2 archivos)
- create-seller-relation.sql
- debug-quote-issue.sql
- link-client-auth.sql, link-client-seller.sql
- simulate-prisma-query.sql
- update-*.sql (3 archivos)
- cleanup-migration.sql

### Archivos de Testing (5 archivos):
- test-buyer-orders-preview.html
- test-order-animations.html
- test-prisma.ts
- test-quotes-models.ts
- verify-prisma-types.ts

### Scripts PowerShell/Batch Temporales (8 archivos):
- abrir-navegadores.ps1, abrir-navegadores.bat
- apply-recurring-orders-migration.ps1
- clean-rebuild.ps1
- clear-cache.ps1
- fix-route-params.ps1
- open-browsers.ps1
- update-currency-format.ps1

### Otros (6 archivos):
- apply-timeouts-frontend.py
- test-credit-protection.md
- FLUJO-VERIFICACION-PEDIDOS.md
- RESUMEN-FORMATO-COMPRADOR.md
- RESUMEN-FORMATO-MONEDA.md
- npm-dev.log

## 📋 ARCHIVOS IMPORTANTES QUE SE MANTIENEN

### Scripts de Utilidad:
- ✅ `start-crm.ps1` - Inicia el proyecto completo
- ✅ `restart-server.ps1` - Reinicia el servidor
- ✅ `download-notification-sound.ps1` - Descarga sonido de notificación

### Documentación:
- ✅ Todas las guías de implementación importantes
- ✅ Instrucciones de sistemas completados
- ✅ Mejoras documentadas

### Configuración:
- ✅ `.env.example` - Template de variables
- ✅ `vercel.json` - Deployment config
- ✅ `tailwind.config.js` - Estilos
- ✅ `tsconfig.json` - TypeScript
- ✅ `package.json` - Dependencias
- ✅ `middleware.ts` - Auth y routing

### Base de Datos:
- ✅ `database/` - Schemas SQL de referencia
- ✅ `backups/` - Backups del schema Prisma
- ✅ `prisma/` - Schema activo y migraciones

## 🔒 .gitignore ACTUALIZADO

El `.gitignore` ahora previene que se agreguen archivos temporales:
- Scripts de debugging (check-*, verify-*, fix-*)
- Scripts de testing (test-*)
- Scripts temporales de migración (apply-*)
- Logs de desarrollo
- Archivos de documentación temporal

## 🎯 BENEFICIOS DE LA LIMPIEZA

1. ✅ **Proyecto más limpio** - Sin archivos de debugging
2. ✅ **Mejor organización** - Estructura clara
3. ✅ **Menos confusión** - Solo archivos necesarios
4. ✅ **Git más rápido** - Menos archivos para rastrear
5. ✅ **Deploy más limpio** - Solo código productivo
6. ✅ **Espacio liberado** - 0.15 MB recuperados

## 📝 NOTAS

- Los archivos eliminados eran scripts temporales de desarrollo
- Toda la funcionalidad del proyecto se mantiene intacta
- La documentación importante se preservó
- Los backups y schemas SQL se mantienen como referencia
- El `.gitignore` evitará futuros archivos temporales

---

**Proyecto limpiado y optimizado exitosamente! 🎉**
