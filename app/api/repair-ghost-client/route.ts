import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSeller } from '@/lib/auth-helpers';

/**
 * ENDPOINT PARA REPARAR CLIENTES FANTASMA
 * Asigna el seller actual a un cliente que existe pero no tiene seller
 * GET /api/repair-ghost-client?email=l3oyucon1978@gmail.com
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

    // Obtener el seller del usuario actual
    const seller = await getSeller(userId);

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }

    console.log(`🔧 Reparando cliente fantasma: ${email}`);
    console.log(`👤 Seller asignado: ${seller.id} (${seller.name})`);

    // Buscar el cliente
    const client = await prisma.client.findFirst({
      where: { email },
      include: {
        seller: true,
        authenticated_users: true,
      }
    });

    if (!client) {
      return NextResponse.json({
        success: false,
        error: 'Cliente no encontrado',
        message: `No existe ningún cliente con el email: ${email}`,
        canCreate: true
      }, { status: 404 });
    }

    console.log(`📋 Cliente encontrado:`);
    console.log(`   ID: ${client.id}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Nombre: ${client.name}`);
    console.log(`   Seller actual: ${client.sellerId || '❌ SIN SELLER'}`);

    // Si ya tiene un seller diferente, advertir
    if (client.sellerId && client.sellerId !== seller.id) {
      return NextResponse.json({
        success: false,
        error: 'Cliente ya tiene otro seller',
        message: `Este cliente ya está asignado a otro vendedor`,
        currentSeller: {
          id: client.seller?.id,
          name: client.seller?.name
        },
        yourSeller: {
          id: seller.id,
          name: seller.name
        }
      }, { status: 400 });
    }

    // Si ya tiene el seller correcto
    if (client.sellerId === seller.id) {
      return NextResponse.json({
        success: true,
        alreadyFixed: true,
        message: `El cliente ya está correctamente asignado a tu vendedor`,
        client: {
          id: client.id,
          email: client.email,
          name: client.name,
          sellerId: client.sellerId,
          sellerName: seller.name
        }
      });
    }

    // REPARAR: Asignar el seller
    console.log(`🔧 Asignando seller ${seller.id} al cliente...`);
    
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        sellerId: seller.id
      },
      include: {
        seller: true
      }
    });

    console.log(`✅ Cliente reparado exitosamente`);

    return NextResponse.json({
      success: true,
      fixed: true,
      message: `Cliente ${email} ahora está asignado a tu vendedor`,
      client: {
        id: updatedClient.id,
        email: updatedClient.email,
        name: updatedClient.name,
        phone: updatedClient.phone,
        address: updatedClient.address,
        sellerId: updatedClient.sellerId,
        sellerName: updatedClient.seller?.name
      },
      action: 'SELLER_ASSIGNED',
      nextSteps: 'El cliente ahora debería aparecer en tu lista de clientes (/clients)'
    });

  } catch (error: any) {
    console.error('❌ Error reparando cliente:', error);
    
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
