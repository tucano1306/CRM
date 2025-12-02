import { SignUp } from '@clerk/nextjs';

export default function BuyerSignUpPage() {
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
