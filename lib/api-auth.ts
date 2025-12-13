/**
 * 🔐 API Auth Helpers
 * 
 * Funciones centralizadas para autenticación en rutas API
 * Elimina duplicación de código de auth en 25+ archivos
 */

import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ==================== TIPOS ====================

export type UserRole = 'SELLER' | 'CLIENT' | 'ADMIN'

export interface AuthResult {
  success: true
  userId: string
  role: UserRole
  sellerId?: string
  clientId?: string
}

export interface AuthError {
  success: false
  error: string
  status: number
  response: NextResponse
}

export type AuthCheck = AuthResult | AuthError

// ==================== RESPUESTAS DE ERROR ESTANDARIZADAS ====================

export const ApiErrors = {
  unauthorized: () => NextResponse.json(
    { success: false, error: 'No autorizado' }, 
    { status: 401 }
  ),
  
  forbidden: (message = 'No tienes permiso para esta acción') => NextResponse.json(
    { success: false, error: message }, 
    { status: 403 }
  ),
  
  notFound: (resource = 'Recurso') => NextResponse.json(
    { success: false, error: `${resource} no encontrado` }, 
    { status: 404 }
  ),
  
  badRequest: (message = 'Solicitud inválida') => NextResponse.json(
    { success: false, error: message }, 
    { status: 400 }
  ),
  
  serverError: (message = 'Error interno del servidor') => NextResponse.json(
    { success: false, error: message }, 
    { status: 500 }
  ),
  
  conflict: (message = 'Conflicto con el estado actual') => NextResponse.json(
    { success: false, error: message }, 
    { status: 409 }
  ),
}

// ==================== HELPERS DE AUTH ====================

/**
 * Obtiene el usuario autenticado actual
 * Retorna error si no hay sesión
 */
export async function requireAuth(): Promise<AuthCheck> {
  const { userId } = await auth()
  
  if (!userId) {
    return {
      success: false,
      error: 'No autorizado',
      status: 401,
      response: ApiErrors.unauthorized()
    }
  }
  
  // Obtener rol del usuario
  const user = await currentUser()
  const role = (user?.publicMetadata?.role as UserRole) || 'CLIENT'
  
  return {
    success: true,
    userId,
    role
  }
}

/**
 * Requiere que el usuario sea un vendedor
 */
export async function requireSeller(): Promise<AuthCheck> {
  const authResult = await requireAuth()
  
  if (!authResult.success) {
    return authResult
  }
  
  // Buscar seller por Clerk userId
  const seller = await prisma.seller.findFirst({
    where: {
      authenticated_users: {
        some: { authId: authResult.userId }
      }
    }
  })
  
  if (!seller) {
    return {
      success: false,
      error: 'No tienes permiso de vendedor',
      status: 403,
      response: ApiErrors.forbidden('No tienes permiso de vendedor')
    }
  }
  
  return {
    ...authResult,
    role: 'SELLER',
    sellerId: seller.id
  }
}

/**
 * Requiere que el usuario sea un cliente/comprador
 */
export async function requireClient(): Promise<AuthCheck> {
  const authResult = await requireAuth()
  
  if (!authResult.success) {
    return authResult
  }
  
  // Buscar client por Clerk userId
  const client = await prisma.client.findFirst({
    where: {
      authenticated_users: {
        some: { authId: authResult.userId }
      }
    }
  })
  
  if (!client) {
    return {
      success: false,
      error: 'No tienes permiso de comprador',
      status: 403,
      response: ApiErrors.forbidden('No tienes permiso de comprador')
    }
  }
  
  return {
    ...authResult,
    role: 'CLIENT',
    clientId: client.id
  }
}

/**
 * Requiere cualquier rol válido (seller o client)
 * Útil para endpoints compartidos
 */
export async function requireAnyRole(): Promise<AuthCheck> {
  const authResult = await requireAuth()
  
  if (!authResult.success) {
    return authResult
  }
  
  // Intentar como seller primero
  const seller = await prisma.seller.findFirst({
    where: {
      authenticated_users: {
        some: { authId: authResult.userId }
      }
    }
  })
  
  if (seller) {
    return {
      ...authResult,
      role: 'SELLER',
      sellerId: seller.id
    }
  }
  
  // Si no es seller, intentar como client
  const client = await prisma.client.findFirst({
    where: {
      authenticated_users: {
        some: { authId: authResult.userId }
      }
    }
  })
  
  if (client) {
    return {
      ...authResult,
      role: 'CLIENT',
      clientId: client.id
    }
  }
  
  return {
    success: false,
    error: 'Usuario no tiene rol asignado',
    status: 403,
    response: ApiErrors.forbidden('Usuario no tiene rol asignado')
  }
}

/**
 * Verifica que el vendedor tenga acceso a un recurso específico
 */
export function verifySellerOwnership(
  sellerId: string, 
  resourceSellerId: string
): boolean {
  return sellerId === resourceSellerId
}

/**
 * Verifica que el cliente tenga acceso a un recurso específico
 */
export function verifyClientOwnership(
  clientId: string, 
  resourceClientId: string
): boolean {
  return clientId === resourceClientId
}

// ==================== WRAPPER HELPERS ====================

/**
 * Wrapper para handlers de API que requieren autenticación de seller
 */
export async function withSellerAuth<T>(
  handler: (sellerId: string, userId: string) => Promise<NextResponse<T>>
): Promise<NextResponse> {
  const authResult = await requireSeller()
  
  if (!authResult.success) {
    return authResult.response
  }
  
  return handler(authResult.sellerId!, authResult.userId)
}

/**
 * Wrapper para handlers de API que requieren autenticación de client
 */
export async function withClientAuth<T>(
  handler: (clientId: string, userId: string) => Promise<NextResponse<T>>
): Promise<NextResponse> {
  const authResult = await requireClient()
  
  if (!authResult.success) {
    return authResult.response
  }
  
  return handler(authResult.clientId!, authResult.userId)
}
