import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { hasAccess: false, reason: "No autenticado" },
        { status: 401 }
      );
    }

    // Buscar authenticated_user y sus clientes
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { clients: true }
    });

    console.log("validate-access - userId:", userId);
    console.log("validate-access - authUser:", authUser?.id);
    console.log("validate-access - clients count:", authUser?.clients?.length || 0);

    if (!authUser || authUser.clients.length === 0) {
      return NextResponse.json(
        { hasAccess: false, reason: "Sin cliente asociado" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      hasAccess: true,
      clientId: authUser.clients[0].id,
      sellerId: authUser.clients[0].sellerId
    });

  } catch (error) {
    console.error("Error en validate-access:", error);
    return NextResponse.json(
      { hasAccess: false, reason: "Error interno" },
      { status: 500 }
    );
  }
}
