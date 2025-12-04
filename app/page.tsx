'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { user, isLoaded } = useUser()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      // Obtener el rol del usuario desde public_metadata o sessionClaims
      const role = (user.publicMetadata?.role as string) || 
                   (user.unsafeMetadata?.role as string) || 
                   null
      setUserRole(role)
      setLoadingRole(false)
    } else if (isLoaded && !user) {
      setLoadingRole(false)
    }
  }, [isLoaded, user])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">
            Food Orders CRM
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Sistema de gestión de pedidos de comida
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          
          {/* Usuario autenticado */}
          <SignedIn>
            <div className="flex justify-center mb-4">
              <UserButton afterSignOutUrl="/" />
            </div>
            
            {loadingRole ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <p className="text-gray-700">
                  ¡Bienvenido! Tu sesión está activa.
                </p>
                
                {/* Opciones para COMPRADOR */}
                {userRole === 'CLIENT' && (
                  <div className="space-y-2">
                    <Link href="/buyer/catalog">
                      <Button className="w-full">
                        🛒 Ver Catálogo
                      </Button>
                    </Link>
                    <Link href="/buyer/orders">
                      <Button className="w-full" variant="outline">
                        📦 Mis Pedidos
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Opciones para VENDEDOR */}
                {userRole === 'SELLER' && (
                  <div className="space-y-2">
                    <Link href="/dashboard">
                      <Button className="w-full">
                        Ir al Dashboard
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button className="w-full" variant="outline">
                        Gestionar Clientes
                      </Button>
                    </Link>
                    <Link href="/orders">
                      <Button className="w-full" variant="outline">
                        Ver Órdenes
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Opciones para ADMIN */}
                {userRole === 'ADMIN' && (
                  <div className="space-y-2">
                    <Link href="/dashboard">
                      <Button className="w-full">
                        Ir al Dashboard
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button className="w-full" variant="outline">
                        Gestionar Clientes
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Sin rol asignado - redirigir a selección de modo */}
                {!userRole && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-2">
                      Selecciona cómo deseas usar la aplicación
                    </p>
                    <Link href="/select-mode">
                      <Button className="w-full">
                        Continuar
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </SignedIn>

          {/* Usuario no autenticado */}
          <SignedOut>
            <p className="text-gray-700 mb-4">
              Inicia sesión para acceder al sistema
            </p>
            <div className="space-y-2">
              <SignInButton mode="redirect">
                <Button className="w-full">
                  Iniciar Sesión
                </Button>
              </SignInButton>
              <Link href="/sign-up">
                <Button className="w-full" variant="outline">
                  Crear Cuenta
                </Button>
              </Link>
            </div>
          </SignedOut>

        </CardContent>
      </Card>
    </div>
  )
}