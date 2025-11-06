import { SignIn } from '@clerk/nextjs'

export default function SellerSignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏪 Vendedor - Food Orders CRM
          </h1>
          <p className="text-gray-600">
            Inicia sesión para gestionar tu negocio
          </p>
        </div>
        <SignIn 
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          forceRedirectUrl="/products"
        />
      </div>
    </div>
  )
}