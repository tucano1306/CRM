import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener cliente por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const client = db.getClientById(params.id);
    
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT - Actualizar cliente
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updatedClient = db.updateClient(params.id, body);

    if (!updatedClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updatedClient);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE - Eliminar cliente
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = db.deleteClient(params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cliente eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}