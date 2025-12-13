'use client';

import { SignUp, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Lock, Loader2 } from 'lucide-react';

export default function BuyerSignUpPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [roleConflict, setRoleConflict] = useState<{
    hasConflict: boolean;
    message: string;
    currentRole: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);

  // Verificar conflicto de roles si el usuario ya está logueado
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
      }
    } catch (error) {
      console.error('Error checking role conflict:', error);
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
                ⚠️ Registro Bloqueado
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
                Ya tienes una cuenta como: <strong className="text-orange-600">
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">🛒 Registro de Comprador</h1>
          <p className="mt-2 text-gray-600">Crea tu cuenta para conectarte con vendedores</p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl"
            }
          }}
          signInUrl="/buyer/sign-in"
        />
      </div>
    </div>
  );
}
