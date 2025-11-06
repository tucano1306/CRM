import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * ENDPOINT TEMPORAL PARA ELIMINAR CLIENTE FANTASMA
 * GET /api/force-delete-client?email=l3oyucon1978@gmail.com
 * También acepta DELETE para compatibilidad
 */
export async function GET(request: Request) {
  return handleDelete(request);
}

export async function DELETE(request: Request) {
  return handleDelete(request);
}

async function handleDelete(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Intentando eliminar cliente: ${email}`);

    // Buscar el cliente
    const client = await prisma.client.findFirst({
      where: { email },
      include: {
        authenticated_users: true,
        orders: true,
        quotes: true,
        returns: true,
      }
    });

    if (!client) {
      return NextResponse.json({
        success: true,
        message: 'Cliente no existe',
        canCreate: true
      });
    }

    console.log(`📋 Cliente encontrado: ${client.id}`);

    // Paso 1: Eliminar items de órdenes
    if (client.orders.length > 0) {
      console.log(`🗑️ Eliminando items de ${client.orders.length} órdenes...`);
      for (const order of client.orders) {
        await prisma.orderItem.deleteMany({
          where: { orderId: order.id }
        });
      }
    }

    // Paso 2: Eliminar órdenes
    if (client.orders.length > 0) {
      console.log(`🗑️ Eliminando ${client.orders.length} órdenes...`);
      await prisma.order.deleteMany({
        where: { clientId: client.id }
      });
    }

    // Paso 3: Eliminar cotizaciones
    if (client.quotes.length > 0) {
      console.log(`🗑️ Eliminando ${client.quotes.length} cotizaciones...`);
      await prisma.quote.deleteMany({
        where: { clientId: client.id }
      });
    }

    // Paso 4: Eliminar devoluciones
    if (client.returns.length > 0) {
      console.log(`🗑️ Eliminando ${client.returns.length} devoluciones...`);
      await prisma.return.deleteMany({
        where: { clientId: client.id }
      });
    }

    // Paso 5: Desvincular usuarios autenticados
    if (client.authenticated_users.length > 0) {
      console.log(`🔗 Desvinculando ${client.authenticated_users.length} usuarios...`);
      await prisma.client.update({
        where: { id: client.id },
        data: {
          authenticated_users: {
            disconnect: client.authenticated_users.map(u => ({ id: u.id }))
          }
        }
      });
    }

    // Paso 6: ELIMINAR EL CLIENTE
    console.log(`🗑️ Eliminando cliente...`);
    await prisma.client.delete({
      where: { id: client.id }
    });

    console.log(`✅ Cliente eliminado exitosamente`);

    return NextResponse.json({
      success: true,
      message: `Cliente ${email} eliminado exitosamente`,
      deletedClient: {
        id: client.id,
        email: client.email,
        name: client.name
      },
      deleted: {
        orders: client.orders.length,
        quotes: client.quotes.length,
        returns: client.returns.length,
        authUsers: client.authenticated_users.length
      }
    });

  } catch (error: any) {
    console.error('❌ Error eliminando cliente:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
