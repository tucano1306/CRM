// ARCHIVO OBSOLETO - Ya no se usa porque el proyecto usa Clerk para autenticación
// Este archivo extendía los tipos de NextAuth que han sido reemplazados por Clerk

/*
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: "ADMIN" | "SELLER" | "CLIENT"
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    email: string
    name: string
    role: "ADMIN" | "SELLER" | "CLIENT"
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    email: string
    name: string
    role: "ADMIN" | "SELLER" | "CLIENT"
  }
}
*/

// Para tipos de Clerk, importa:
// import { useAuth, useUser } from '@clerk/nextjs'
// import { auth } from '@clerk/nextjs/server'

export {}
