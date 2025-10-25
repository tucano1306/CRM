import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🎟️  Seeding coupons...')

  // Eliminar cupones existentes (opcional)
  await prisma.coupon.deleteMany({})

  // Crear cupones
  const coupons = await prisma.coupon.createMany({
    data: [
      {
        code: 'DESCUENTO10',
        description: 'Descuento del 10% en cualquier compra',
        discountType: 'PERCENTAGE',
        discountValue: 0.10,
        isActive: true,
        validFrom: new Date(),
      },
      {
        code: 'PRIMERACOMPRA',
        description: '15% de descuento en tu primera compra',
        discountType: 'PERCENTAGE',
        discountValue: 0.15,
        minPurchase: 50.00,
        maxDiscount: 20.00,
        usageLimit: 1,
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      },
      {
        code: 'ENVIOGRATIS',
        description: 'Envío gratis en compras mayores a $100',
        discountType: 'FIXED',
        discountValue: 10.00,
        minPurchase: 100.00,
        isActive: true,
        validFrom: new Date(),
      },
      {
        code: 'VERANO2024',
        description: '20% de descuento - Promoción de verano',
        discountType: 'PERCENTAGE',
        discountValue: 0.20,
        minPurchase: 75.00,
        maxDiscount: 50.00,
        usageLimit: 100,
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 días
      },
      {
        code: '50OFF',
        description: '$50 de descuento en compras mayores a $200',
        discountType: 'FIXED',
        discountValue: 50.00,
        minPurchase: 200.00,
        usageLimit: 50,
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
      },
    ],
  })

  console.log(`✅ ${coupons.count} cupones creados`)

  // Mostrar cupones creados
  const allCoupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  })

  console.log('\n📋 Cupones disponibles:')
  allCoupons.forEach((coupon) => {
    console.log(`  - ${coupon.code}: ${coupon.description}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
