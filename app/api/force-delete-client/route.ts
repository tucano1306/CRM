import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * ENDPOINT PARA RECUPERAR CLIENTE FANTASMA
 * Asigna el cliente huérfano al seller autenticado
 * GET /api/force-delete-client?email=l3oyucon1978@gmail.com
 */
export async function GET(request: Request) {
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

    console.log(`🔧 Recuperando cliente fantasma: ${email}`);

    // 1. Obtener el seller del usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: {
        sellers: true
      }
    });

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no tiene seller asignado' },
        { status: 403 }
      );
    }

    const seller = authUser.sellers[0];
    console.log(`✅ Seller encontrado: ${seller.id}`);

    // 2. Buscar el cliente fantasma
    const client = await prisma.client.findFirst({
      where: { email },
      include: {
        authenticated_users: true,
        seller: true,
        orders: true,
        quotes: true
      }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        message: 'Cliente no existe',
        canCreate: true
      });
    }

    console.log(`👤 Cliente encontrado: ${client.id}`);
    console.log(`   Seller actual: ${client.sellerId || '❌ SIN SELLER'}`);

    // 3. Si ya tiene seller, informar
    if (client.sellerId) {
      if (client.sellerId === seller.id) {
        return NextResponse.json({
          success: true,
          message: 'Cliente ya está asignado a tu seller',
          client: {
            id: client.id,
            email: client.email,
            name: client.name,
            sellerId: client.sellerId,
            sellerName: client.seller?.name
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Cliente ya está asignado a otro seller',
          client: {
            id: client.id,
            email: client.email,
            name: client.name,
            sellerId: client.sellerId,
            sellerName: client.seller?.name
          }
        }, { status: 409 });
      }
    }

    // 4. ASIGNAR EL SELLER AL CLIENTE
    console.log(`� Asignando seller ${seller.id} al cliente ${client.id}...`);
    
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: { sellerId: seller.id },
      include: {
        seller: true,
        authenticated_users: true
      }
    });

    console.log(`✅ Cliente recuperado exitosamente`);

    return NextResponse.json({
      success: true,
      message: `Cliente ${email} recuperado y asignado a tu seller exitosamente`,
      client: {
        id: updatedClient.id,
        email: updatedClient.email,
        name: updatedClient.name,
        sellerId: updatedClient.sellerId,
        sellerName: updatedClient.seller?.name,
        ordersCount: client.orders.length,
        quotesCount: client.quotes.length,
        authUsersCount: updatedClient.authenticated_users.length
      },
      action: 'Cliente fantasma recuperado - ahora visible en tu lista de clientes'
    });

  } catch (error: any) {
    console.error('❌ Error recuperando cliente:', error);
    
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
