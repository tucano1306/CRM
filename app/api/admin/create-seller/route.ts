/**
 * API temporal para crear seller y vincularlo al authenticated_user
 * Solo para uso administrativo
 */

import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    
    console.log('🔍 [CREATE SELLER] Iniciando proceso para userId:', userId)
    
    // 1. Buscar authenticated_user
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })
    
    if (!authUser) {
      console.error('❌ [CREATE SELLER] authenticated_user no encontrado')
      return NextResponse.json({ 
        error: 'Usuario no encontrado en la base de datos',
        details: 'El usuario debe existir en authenticated_users primero'
      }, { status: 404 })
    }
    
    console.log('✅ [CREATE SELLER] Usuario encontrado:', {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      sellersCount: authUser.sellers.length
    })
    
    // 2. Verificar si ya tiene sellers
    if (authUser.sellers.length > 0) {
      console.log('⚠️  [CREATE SELLER] Usuario ya tiene sellers:', authUser.sellers.map(s => s.id))
      return NextResponse.json({
        message: 'El usuario ya tiene sellers vinculados',
        sellers: authUser.sellers.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email
        }))
      })
    }
    
    // 3. Crear nuevo Seller
    console.log('📝 [CREATE SELLER] Creando nuevo seller...')
    const seller = await prisma.seller.create({
      data: {
        name: authUser.name || 'Vendedor Principal',
        email: authUser.email,
        phone: null,
        isActive: true,
        authenticated_users: {
          connect: { id: authUser.id }
        }
      },
      include: {
        authenticated_users: true
      }
    })
    
    console.log('✅ [CREATE SELLER] Seller creado:', {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      linkedUsers: seller.authenticated_users.length
    })
    
    // 4. Verificar vinculación
    const verifyUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })
    
    console.log('🔗 [CREATE SELLER] Verificación final:', {
      userId: verifyUser?.id,
      sellersCount: verifyUser?.sellers.length,
      sellers: verifyUser?.sellers.map(s => s.id)
    })
    
    return NextResponse.json({
      success: true,
      message: 'Seller creado y vinculado exitosamente',
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        isActive: seller.isActive
      },
      authUser: {
        id: authUser.id,
        email: authUser.email,
        role: authUser.role
      }
    })
    
  } catch (error) {
    console.error('❌ [CREATE SELLER] Error:', error)
    return NextResponse.json({
      error: 'Error al crear seller',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
