import { SignIn } from '@clerk/nextjs';

export default function BuyerSignInPage() {
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
