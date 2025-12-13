'use client';

import { SignIn, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Lock, Loader2 } from 'lucide-react';

export default function BuyerSignInPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [roleConflict, setRoleConflict] = useState<{
    hasConflict: boolean;
    message: string;
    currentRole: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  // Verificar conflicto de roles después del login
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      checkRoleConflict();
    }
  }, [isLoaded, isSignedIn, user]);

  const checkRoleConflict = async () => {
    setChecking(true);
    try {
      const response = await fetch('/api/auth/check-role-conflict?role=CLIENT');
      const data = await response.json();
      
      if (data.hasConflict) {
        setRoleConflict({
          hasConflict: true,
          message: data.message,
          currentRole: data.existingRole
        });
      } else {
        // No hay conflicto, continuar al catálogo
        router.push('/buyer/catalog');
      }
    } catch (error) {
      console.error('Error checking role conflict:', error);
      // En caso de error, intentar continuar
      router.push('/buyer/catalog');
    } finally {
      setChecking(false);
    }
  };

  // Mostrar mensaje de conflicto si el usuario ya es vendedor
  if (roleConflict?.hasConflict) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-orange-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                ⚠️ Acceso Bloqueado
              </h1>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-orange-800 text-sm">
                  {roleConflict.message}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Tu rol actual es: <strong className="text-orange-600">
                  {roleConflict.currentRole === 'SELLER' ? '🏪 Vendedor' : '🛒 Comprador'}
                </strong>
              </p>
              
              <button
                onClick={() => router.push('/sign-in')}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Ir al Login de Vendedor
              </button>
              
              <button
                onClick={() => router.push('/select-mode')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Volver a Selección de Modo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras verifica
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">🛒 Comprador</h1>
          <p className="mt-2 text-gray-600">Inicia sesión para acceder al catálogo</p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl"
            }
          }}
          fallbackRedirectUrl="/buyer/catalog"
          signUpUrl="/buyer/sign-up"
        />
      </div>
    </div>
  );
}
