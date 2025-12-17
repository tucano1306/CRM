'use client'

import { SignIn, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const { isSignedIn } = useAuth()

  useEffect(() => {
    if (isSignedIn) {
      router.push('/dashboard')
    }
  }, [isSignedIn, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Food Orders CRM</h1>
          <p className="text-gray-600">Gestiona tus pedidos de forma eficiente</p>
        </div>
        
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl"
            }
          }}
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />

        <div className="mt-6 p-4 bg-white rounded-lg shadow-md">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">ℹ️ Información:</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Si no tienes cuenta, haz clic en &quot;Sign up&quot; en el formulario</p>
          <p>• El sistema usa autenticación con Clerk</p>
          <p>• Tu rol se asignará automáticamente al registrarte</p>
        </div>
        </div>

        <div className="mt-4 text-center">
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
