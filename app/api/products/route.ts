import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - Obtener todos los productos
export async function GET() {
  try {
    const products = db.getProducts();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, unit, price, stock, sellerIds } = body;

    // Validaciones
    if (!name || !description || !unit || !price || stock === undefined) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const newProduct = db.createProduct({
      name,
      description,
      unit,
      price: parseFloat(price),
      stock: parseInt(stock),
      sellerIds: sellerIds || []
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}