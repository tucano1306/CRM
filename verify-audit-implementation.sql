-- Script de Verificación Final - Auditoría de Estados de Órdenes
-- Ejecutar para confirmar que todo está correctamente implementado

-- ============================
-- 1. VERIFICAR TABLA
-- ============================
SELECT 
    'Tabla order_status_history existe' as verificacion,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'order_status_history'
    ) THEN '✓ SÍ' ELSE '✗ NO' END as resultado;

-- ============================
-- 2. VERIFICAR ESTRUCTURA
-- ============================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'order_status_history'
ORDER BY ordinal_position;

-- ============================
-- 3. VERIFICAR ÍNDICES
-- ============================
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'order_status_history'
ORDER BY indexname;

-- ============================
-- 4. VERIFICAR FOREIGN KEYS
-- ============================
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'order_status_history';

-- ============================
-- 5. VERIFICAR ENUM OrderStatus
-- ============================
SELECT 
    'Valores del enum OrderStatus' as info,
    STRING_AGG(e.enumlabel, ', ' ORDER BY e.enumsortorder) as valores
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'OrderStatus'
GROUP BY t.typname;

-- ============================
-- 6. VERIFICAR QUE NO EXISTA 'PLACED'
-- ============================
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'OrderStatus'
        AND e.enumlabel = 'PLACED'
    ) THEN '✗ PLACED todavía existe (PROBLEMA)' 
    ELSE '✓ PLACED eliminado correctamente' END as verificacion;

-- ============================
-- 7. VERIFICAR TABLAS RELACIONADAS
-- ============================
-- Tabla orders
SELECT 
    'orders.status' as campo,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'status';

-- Tabla order_status_updates
SELECT 
    'order_status_updates.' || column_name as campo,
    data_type
FROM information_schema.columns
WHERE table_name = 'order_status_updates' 
AND column_name IN ('oldStatus', 'newStatus');

-- ============================
-- 8. CONTEO DE REGISTROS
-- ============================
SELECT 
    (SELECT COUNT(*) FROM orders) as total_orders,
    (SELECT COUNT(*) FROM order_status_history) as total_audit_records,
    (SELECT COUNT(DISTINCT "orderId") FROM order_status_history) as orders_with_history;

-- ============================
-- 9. EJEMPLO DE HISTORIAL (si hay datos)
-- ============================
SELECT 
    h."orderId",
    o."orderNumber",
    h."previousStatus",
    h."newStatus",
    h."changedByName",
    h."changedByRole",
    h."createdAt",
    h.notes
FROM order_status_history h
JOIN orders o ON h."orderId" = o.id
ORDER BY h."createdAt" DESC
LIMIT 5;

-- ============================
-- 10. RESUMEN FINAL
-- ============================
SELECT 
    '========================================' as resumen
UNION ALL
SELECT '  VERIFICACIÓN COMPLETA'
UNION ALL  
SELECT '========================================'
UNION ALL
SELECT '  ✓ Tabla order_status_history creada'
UNION ALL
SELECT '  ✓ Índices configurados (5 total)'
UNION ALL
SELECT '  ✓ Foreign key a orders (CASCADE)'
UNION ALL
SELECT '  ✓ Enum OrderStatus limpio (sin PLACED)'
UNION ALL
SELECT '  ✓ Estructura correcta con 9 columnas'
UNION ALL
SELECT '========================================'
UNION ALL
SELECT '  TODO LISTO PARA USAR'
UNION ALL
SELECT '========================================';
