import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener producto por ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const product = db.getProductById(params.id);
    
    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT - Actualizar producto
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updatedProduct = db.updateProduct(params.id, body);

    if (!updatedProduct) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE - Eliminar producto
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = db.deleteProduct(params.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}