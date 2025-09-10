import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener todos los clientes
export async function GET() {
  try {
    const clients = db.getClients();
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST - Crear nuevo cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, address, phone, email, sellerId } = body;

    // Validaciones
    if (!name || !address || !phone || !email) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const newClient = db.createClient({
      name,
      address,
      phone,
      email,
      sellerId
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}