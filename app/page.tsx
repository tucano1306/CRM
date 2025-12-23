'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, ShoppingBag, Package, LayoutDashboard, Users, ClipboardList, LogIn, UserPlus } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-pastel-beige-100 via-pastel-blue-100/30 to-pastel-cream-100 flex items-center justify-center p-4 blob-bg">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-pastel-blue-200/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-pastel-beige-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <Card className="w-full max-w-md glass-card card-3d rounded-3xl border-0 shadow-soft-lg overflow-hidden">
        {/* Gradient accent bar */}
        <div className="h-2 bg-gradient-to-r from-pastel-blue-400 via-pastel-beige-300 to-pastel-blue-400" />
        
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-pastel-blue-400 to-pastel-blue-500 rounded-2xl shadow-pastel-lg flex items-center justify-center float-3d">
            <ShoppingBag className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold gradient-text-pastel">
            Food Orders CRM
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-2">
            Sistema de gestión de pedidos de comida
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4 pb-8">
          
          {/* Usuario autenticado */}
          <SignedIn>
            <div className="flex justify-center mb-4">
              <div className="p-1 rounded-full bg-gradient-to-br from-pastel-blue-200 to-pastel-beige-200">
                <UserButton />
              </div>
            </div>
            
            {loadingRole ? (
              <div className="flex items-center justify-center py-4">
                <div className="p-3 rounded-full bg-pastel-blue-100">
                  <Loader2 className="w-6 h-6 animate-spin text-pastel-blue-500" />
                </div>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground">
                  ¡Bienvenido! Tu sesión está activa.
                </p>
                
                {/* Opciones para COMPRADOR */}
                {userRole === 'CLIENT' && (
                  <div className="space-y-3 pt-2">
                    <Link href="/buyer/catalog">
                      <Button className="w-full btn-pastel rounded-xl h-12 text-base gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Ver Catálogo
                      </Button>
                    </Link>
                    <Link href="/buyer/orders">
                      <Button className="w-full btn-beige rounded-xl h-12 text-base gap-2" variant="outline">
                        <Package className="w-5 h-5" />
                        Mis Pedidos
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Opciones para VENDEDOR */}
                {(userRole === 'SELLER' || !userRole) && (
                  <div className="space-y-3 pt-2">
                    <Link href="/dashboard">
                      <Button className="w-full btn-pastel rounded-xl h-12 text-base gap-2">
                        <LayoutDashboard className="w-5 h-5" />
                        Ir al Dashboard
                      </Button>
                    </Link>
                    <Link href="/clients">
                      <Button className="w-full btn-beige rounded-xl h-12 text-base gap-2" variant="outline">
                        <Users className="w-5 h-5" />
                        Gestionar Clientes
                      </Button>
                    </Link>
                    <Link href="/orders">
                      <Button className="w-full bg-pastel-beige-100 hover:bg-pastel-beige-200 text-foreground rounded-xl h-12 text-base gap-2 border border-pastel-beige-200" variant="outline">
                        <ClipboardList className="w-5 h-5" />
                        Ver Órdenes
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </SignedIn>

          {/* Usuario no autenticado */}
          <SignedOut>
            <p className="text-muted-foreground mb-4">
              Inicia sesión para acceder al sistema
            </p>
            <div className="space-y-3">
              <SignInButton mode="redirect">
                <Button className="w-full btn-pastel rounded-xl h-12 text-base gap-2">
                  <LogIn className="w-5 h-5" />
                  Iniciar Sesión
                </Button>
              </SignInButton>
              <Link href="/sign-up">
                <Button className="w-full btn-beige rounded-xl h-12 text-base gap-2" variant="outline">
                  <UserPlus className="w-5 h-5" />
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