// Este archivo fuerza a VS Code a recargar los tipos de Prisma
// Puedes eliminarlo después

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Si ves autocompletado aquí, los tipos están cargados:
async function test() {
  // Descomenta estas líneas y verifica si hay autocompletado:
  // await prisma.quote.
  // await prisma.quoteItem.
  
  console.log('Tipos disponibles:', Object.keys(prisma).filter(k => k.includes('quote')))
}

// No ejecutes este archivo, solo es para verificar tipos
export {}
