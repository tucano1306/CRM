-- Verificar todos los valores de estado en uso
SELECT DISTINCT "oldStatus" as status FROM order_status_updates 
UNION 
SELECT DISTINCT "newStatus" as status FROM order_status_updates
UNION
SELECT DISTINCT status FROM orders;
