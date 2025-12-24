import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('🧹 Iniciando limpieza de base de datos...\n');

try {
  // Orden de eliminación importante por las relaciones de foreign keys
    
    // 1. Eliminar historial de estados de órdenes
    const deletedHistory = await prisma.orderStatusHistory.deleteMany({});
    console.log(`✅ Historial de estados eliminado: ${deletedHistory.count} registros`);

    // 2. Eliminar cambios de estado de órdenes (idempotencia)
    const deletedStatusChanges = await prisma.orderStatusChange.deleteMany({});
    console.log(`✅ Cambios de estado eliminados: ${deletedStatusChanges.count} registros`);

    // 3. Eliminar actualizaciones de estado de órdenes
    const deletedStatusUpdates = await prisma.orderStatusUpdate.deleteMany({});
    console.log(`✅ Actualizaciones de estado eliminadas: ${deletedStatusUpdates.count} registros`);

    // 4. Eliminar problemas de órdenes
    const deletedOrderIssues = await prisma.orderIssue.deleteMany({});
    console.log(`✅ Problemas de órdenes eliminados: ${deletedOrderIssues.count} registros`);

    // 5. Eliminar uso de notas de crédito
    const deletedCreditUsages = await prisma.creditNoteUsage.deleteMany({});
    console.log(`✅ Uso de notas de crédito eliminado: ${deletedCreditUsages.count} registros`);

    // 6. Eliminar notas de crédito
    const deletedCreditNotes = await prisma.creditNote.deleteMany({});
    console.log(`✅ Notas de crédito eliminadas: ${deletedCreditNotes.count} registros`);

    // 7. Eliminar items de devolución
    const deletedReturnItems = await prisma.returnItem.deleteMany({});
    console.log(`✅ Items de devolución eliminados: ${deletedReturnItems.count} registros`);

    // 8. Eliminar devoluciones
    const deletedReturns = await prisma.return.deleteMany({});
    console.log(`✅ Devoluciones eliminadas: ${deletedReturns.count} registros`);

    // 9. Eliminar ejecuciones de órdenes recurrentes
    const deletedRecurringExecs = await prisma.recurringOrderExecution.deleteMany({});
    console.log(`✅ Ejecuciones recurrentes eliminadas: ${deletedRecurringExecs.count} registros`);

    // 10. Eliminar items de órdenes
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ Items de órdenes eliminados: ${deletedOrderItems.count} registros`);

    // 11. Eliminar órdenes
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Órdenes eliminadas: ${deletedOrders.count} registros`);

    // 12. Eliminar órdenes pendientes
    const deletedPendingOrders = await prisma.pending_orders.deleteMany({});
    console.log(`✅ Órdenes pendientes eliminadas: ${deletedPendingOrders.count} registros`);

    // 13. Eliminar items de órdenes recurrentes
    const deletedRecurringItems = await prisma.recurringOrderItem.deleteMany({});
    console.log(`✅ Items de órdenes recurrentes eliminados: ${deletedRecurringItems.count} registros`);

    // 14. Eliminar órdenes recurrentes
    const deletedRecurringOrders = await prisma.recurringOrder.deleteMany({});
    console.log(`✅ Órdenes recurrentes eliminadas: ${deletedRecurringOrders.count} registros`);

    // 15. Eliminar items de cotizaciones
    const deletedQuoteItems = await prisma.quoteItem.deleteMany({});
    console.log(`✅ Items de cotizaciones eliminados: ${deletedQuoteItems.count} registros`);

    // 16. Eliminar cotizaciones
    const deletedQuotes = await prisma.quote.deleteMany({});
    console.log(`✅ Cotizaciones eliminadas: ${deletedQuotes.count} registros`);

    // 17. Eliminar mensajes de chat
    const deletedMessages = await prisma.chatMessage.deleteMany({});
    console.log(`✅ Mensajes de chat eliminados: ${deletedMessages.count} registros`);

    // 18. Eliminar horarios de chat
    const deletedChatSchedules = await prisma.chatSchedule.deleteMany({});
    console.log(`✅ Horarios de chat eliminados: ${deletedChatSchedules.count} registros`);

    // 19. Eliminar horarios de órdenes
    const deletedOrderSchedules = await prisma.orderSchedule.deleteMany({});
    console.log(`✅ Horarios de órdenes eliminados: ${deletedOrderSchedules.count} registros`);

    // 20. Eliminar notificaciones
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`✅ Notificaciones eliminadas: ${deletedNotifications.count} registros`);

    // 21. Eliminar solicitudes de conexión
    const deletedConnectionRequests = await prisma.connectionRequest.deleteMany({});
    console.log(`✅ Solicitudes de conexión eliminadas: ${deletedConnectionRequests.count} registros`);

    // 22. Eliminar favoritos
    const deletedFavorites = await prisma.favorite.deleteMany({});
    console.log(`✅ Favoritos eliminados: ${deletedFavorites.count} registros`);

    // 23. Eliminar carritos guardados
    const deletedCarts = await prisma.savedCart.deleteMany({});
    console.log(`✅ Carritos guardados eliminados: ${deletedCarts.count} registros`);

    // 24. Eliminar items del carrito
    const deletedCartItems = await prisma.cartItem.deleteMany({});
    console.log(`✅ Items del carrito eliminados: ${deletedCartItems.count} registros`);

    // 25. Eliminar historial de productos
    const deletedPriceHistory = await prisma.productHistory.deleteMany({});
    console.log(`✅ Historial de productos eliminado: ${deletedPriceHistory.count} registros`);

    // 26. Eliminar tags de productos
    const deletedProductTags = await prisma.productTag.deleteMany({});
    console.log(`✅ Tags de productos eliminados: ${deletedProductTags.count} registros`);

    // 27. Eliminar variantes de productos
    const deletedVariants = await prisma.productVariant.deleteMany({});
    console.log(`✅ Variantes de productos eliminadas: ${deletedVariants.count} registros`);

    // 28. Eliminar productos de clientes
    const deletedClientProducts = await prisma.clientProduct.deleteMany({});
    console.log(`✅ Productos de clientes eliminados: ${deletedClientProducts.count} registros`);

    // 29. Eliminar relación producto-vendedor
    const deletedProductSellers = await prisma.productSeller.deleteMany({});
    console.log(`✅ Relaciones producto-vendedor eliminadas: ${deletedProductSellers.count} registros`);

    // 30. Eliminar productos
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Productos eliminados: ${deletedProducts.count} registros`);

    // 31. Eliminar schedules
    const deletedSchedules = await prisma.schedules.deleteMany({});
    console.log(`✅ Schedules eliminados: ${deletedSchedules.count} registros`);

    // 32. Eliminar clientes (compradores)
    const deletedClients = await prisma.client.deleteMany({});
    console.log(`✅ Clientes/Compradores eliminados: ${deletedClients.count} registros`);

    // 33. Eliminar vendedores
    const deletedSellers = await prisma.seller.deleteMany({});
    console.log(`✅ Vendedores eliminados: ${deletedSellers.count} registros`);

    // 34. Eliminar usuarios autenticados
    const deletedUsers = await prisma.authenticated_users.deleteMany({});
    console.log(`✅ Usuarios autenticados eliminados: ${deletedUsers.count} registros`);

    console.log('\n🎉 Base de datos limpiada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
