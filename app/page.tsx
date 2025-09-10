import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function HomePage() {
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
            <p className="text-gray-700">
              ¡Bienvenido! Tu sesión está activa.
            </p>
            <div className="space-y-2">
              <Link href="/dashboard">
                <Button className="w-full">
                  Ir al Dashboard
                </Button>
              </Link>
              <Link href="/products">
                <Button className="w-full" variant="outline">
                  Gestionar Productos
                </Button>
              </Link>
              <Link href="/clients">
                <Button className="w-full" variant="outline">
                  Gestionar Clientes
                </Button>
              </Link>
            </div>
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