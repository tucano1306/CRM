const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Iniciando limpieza de base de datos...\n');

  try {
    // Orden de eliminación importante por las relaciones de foreign keys
    
    // 1. Eliminar historial de estados de órdenes
    const deletedHistory = await prisma.orderStatusHistory.deleteMany({});
    console.log(`✅ Historial de estados eliminado: ${deletedHistory.count} registros`);

    // 2. Eliminar uso de notas de crédito
    const deletedCreditUsages = await prisma.creditNoteUsage.deleteMany({});
    console.log(`✅ Uso de notas de crédito eliminado: ${deletedCreditUsages.count} registros`);

    // 3. Eliminar notas de crédito
    const deletedCreditNotes = await prisma.creditNote.deleteMany({});
    console.log(`✅ Notas de crédito eliminadas: ${deletedCreditNotes.count} registros`);

    // 4. Eliminar items de devolución
    const deletedReturnItems = await prisma.returnItem.deleteMany({});
    console.log(`✅ Items de devolución eliminados: ${deletedReturnItems.count} registros`);

    // 5. Eliminar devoluciones
    const deletedReturns = await prisma.return.deleteMany({});
    console.log(`✅ Devoluciones eliminadas: ${deletedReturns.count} registros`);

    // 6. Eliminar items de órdenes
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ Items de órdenes eliminados: ${deletedOrderItems.count} registros`);

    // 7. Eliminar órdenes
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Órdenes eliminadas: ${deletedOrders.count} registros`);

    // 8. Eliminar items de órdenes recurrentes
    const deletedRecurringItems = await prisma.recurringOrderItem.deleteMany({});
    console.log(`✅ Items de órdenes recurrentes eliminados: ${deletedRecurringItems.count} registros`);

    // 9. Eliminar órdenes recurrentes
    const deletedRecurringOrders = await prisma.recurringOrder.deleteMany({});
    console.log(`✅ Órdenes recurrentes eliminadas: ${deletedRecurringOrders.count} registros`);

    // 10. Eliminar items de cotizaciones
    const deletedQuoteItems = await prisma.quoteItem.deleteMany({});
    console.log(`✅ Items de cotizaciones eliminados: ${deletedQuoteItems.count} registros`);

    // 11. Eliminar cotizaciones
    const deletedQuotes = await prisma.quote.deleteMany({});
    console.log(`✅ Cotizaciones eliminadas: ${deletedQuotes.count} registros`);

    // 12. Eliminar mensajes de chat
    const deletedMessages = await prisma.chatMessage.deleteMany({});
    console.log(`✅ Mensajes de chat eliminados: ${deletedMessages.count} registros`);

    // 13. Eliminar horarios de chat
    const deletedChatSchedules = await prisma.chatSchedule.deleteMany({});
    console.log(`✅ Horarios de chat eliminados: ${deletedChatSchedules.count} registros`);

    // 14. Eliminar notificaciones
    const deletedNotifications = await prisma.notification.deleteMany({});
    console.log(`✅ Notificaciones eliminadas: ${deletedNotifications.count} registros`);

    // 15. Eliminar favoritos
    const deletedFavorites = await prisma.favorite.deleteMany({});
    console.log(`✅ Favoritos eliminados: ${deletedFavorites.count} registros`);

    // 16. Eliminar carritos guardados
    const deletedCarts = await prisma.savedCart.deleteMany({});
    console.log(`✅ Carritos guardados eliminados: ${deletedCarts.count} registros`);

    // 17. Eliminar historial de productos
    const deletedPriceHistory = await prisma.productHistory.deleteMany({});
    console.log(`✅ Historial de productos eliminado: ${deletedPriceHistory.count} registros`);

    // 18. Eliminar tags de productos
    const deletedProductTags = await prisma.productTag.deleteMany({});
    console.log(`✅ Tags de productos eliminados: ${deletedProductTags.count} registros`);

    // 19. Eliminar productos de clientes
    const deletedClientProducts = await prisma.clientProduct.deleteMany({});
    console.log(`✅ Productos de clientes eliminados: ${deletedClientProducts.count} registros`);

    // 20. Eliminar productos
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Productos eliminados: ${deletedProducts.count} registros`);

    // 21. Eliminar clientes (compradores)
    const deletedClients = await prisma.client.deleteMany({});
    console.log(`✅ Clientes/Compradores eliminados: ${deletedClients.count} registros`);

    // 22. Eliminar vendedores
    const deletedSellers = await prisma.seller.deleteMany({});
    console.log(`✅ Vendedores eliminados: ${deletedSellers.count} registros`);

    // 23. Eliminar usuarios autenticados
    const deletedUsers = await prisma.authenticated_users.deleteMany({});
    console.log(`✅ Usuarios autenticados eliminados: ${deletedUsers.count} registros`);

    console.log('\n🎉 Base de datos limpiada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error limpiando la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
