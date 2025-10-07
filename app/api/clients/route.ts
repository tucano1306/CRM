import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/postgres';

export async function GET() {
  try {
    const clients = await db.clients.getAll();
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, phone, email, seller_id } = body;

    if (!name || !address || !phone || !email) {
      return NextResponse.json(
        { error: 'Campos requeridos faltantes' },
        { status: 400 }
      );
    }

    const newClient = await db.clients.create({
      name,
      address,
      phone,
      email,
      seller_id
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('Error al crear cliente:', error);
    return NextResponse.json(
      { error: 'Error al crear cliente' },
      { status: 500 }
    );
  }
}