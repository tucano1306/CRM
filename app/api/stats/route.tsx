import { NextResponse } from 'next/server';
import db from '@/lib/postgres';

export async function GET() {
  try {
    const stats = await db.stats.getSummary();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}