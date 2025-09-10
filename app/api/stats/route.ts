import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const stats = db.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}