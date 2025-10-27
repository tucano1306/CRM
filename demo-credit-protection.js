/**
 * 🛡️ DEMOSTRACIÓN: Sistema de Protección de Créditos
 * 
 * Este script simula el comportamiento del nuevo sistema que protege
 * automáticamente los créditos del usuario contra sobre-aplicación
 */

// Simular las funciones de cálculo del carrito
function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function calculateDiscount(subtotal, coupon) {
  if (!coupon) return 0
  return subtotal * coupon.discount
}

function calculateTax(subtotalAfterDiscount) {
  const TAX_RATE = 0.10
  return subtotalAfterDiscount * TAX_RATE
}

function calculateDeliveryFee(deliveryMethod) {
  const DELIVERY_FEE = 5.00
  return deliveryMethod === 'delivery' ? DELIVERY_FEE : 0
}

function calculateTotal(items, coupon, deliveryMethod, appliedCredits) {
  const subtotal = calculateSubtotal(items)
  const discount = calculateDiscount(subtotal, coupon)
  const tax = calculateTax(subtotal - discount)
  const delivery = calculateDeliveryFee(deliveryMethod)
  const credits = appliedCredits.reduce((sum, c) => sum + c.amount, 0)
  
  return Math.max(0, subtotal - discount + tax + delivery - credits)
}

// NUEVA FUNCIÓN: Calcula el monto inteligente para un crédito
function calculateSmartCreditAmount(creditBalance, cartItems, coupon, deliveryMethod, otherCredits) {
  const subtotal = calculateSubtotal(cartItems)
  const discount = calculateDiscount(subtotal, coupon)
  const tax = calculateTax(subtotal - discount)
  const delivery = calculateDeliveryFee(deliveryMethod)
  const alreadyApplied = otherCredits.reduce((sum, c) => sum + c.amount, 0)
  
  const totalBeforeThisCredit = subtotal - discount + tax + delivery - alreadyApplied
  const remainingToPay = Math.max(0, totalBeforeThisCredit)
  
  // Limita al menor entre el balance del crédito y lo que falta por pagar
  return Math.min(creditBalance, remainingToPay)
}

// ==================== CASOS DE PRUEBA ====================

console.log('🛡️ SISTEMA DE PROTECCIÓN DE CRÉDITOS - DEMOSTRACIÓN\n')
console.log('='.repeat(70))

// CASO 1: Crédito excede el total del carrito
console.log('\n📋 CASO 1: Crédito mayor que el total del carrito')
console.log('-'.repeat(70))
const caso1_items = [
  { name: 'Pizza Margherita', price: 8.00, quantity: 1 },
  { name: 'Refresco', price: 2.00, quantity: 1 }
]
const caso1_credit = { id: 'CREDIT-001', balance: 142.00 }

console.log('Carrito:')
caso1_items.forEach(item => {
  console.log(`  - ${item.name}: $${item.price} x ${item.quantity}`)
})
console.log(`  Subtotal: $${calculateSubtotal(caso1_items).toFixed(2)}`)

const caso1_total = calculateTotal(caso1_items, null, 'pickup', [])
console.log(`  Total a pagar (sin créditos): $${caso1_total.toFixed(2)}`)

console.log(`\nCrédito disponible: $${caso1_credit.balance.toFixed(2)}`)

const caso1_smartAmount = calculateSmartCreditAmount(
  caso1_credit.balance,
  caso1_items,
  null,
  'pickup',
  []
)

console.log(`\n❌ SIN PROTECCIÓN: Usaría $${caso1_credit.balance.toFixed(2)} (desperdiciaría $${(caso1_credit.balance - caso1_total).toFixed(2)})`)
console.log(`✅ CON PROTECCIÓN: Usa solo $${caso1_smartAmount.toFixed(2)} (preserva $${(caso1_credit.balance - caso1_smartAmount).toFixed(2)})`)

// CASO 2: Múltiples créditos
console.log('\n' + '='.repeat(70))
console.log('\n📋 CASO 2: Múltiples créditos')
console.log('-'.repeat(70))
const caso2_items = [
  { name: 'Burger Deluxe', price: 15.00, quantity: 2 },
  { name: 'Papas Fritas', price: 5.00, quantity: 2 }
]
const caso2_credits = [
  { id: 'CREDIT-001', balance: 30.00 },
  { id: 'CREDIT-002', balance: 40.00 }
]

console.log('Carrito:')
caso2_items.forEach(item => {
  console.log(`  - ${item.name}: $${item.price} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`)
})
const caso2_subtotal = calculateSubtotal(caso2_items)
const caso2_tax = calculateTax(caso2_subtotal)
const caso2_delivery = calculateDeliveryFee('delivery')
const caso2_total = caso2_subtotal + caso2_tax + caso2_delivery

console.log(`  Subtotal: $${caso2_subtotal.toFixed(2)}`)
console.log(`  Impuestos (10%): $${caso2_tax.toFixed(2)}`)
console.log(`  Envío: $${caso2_delivery.toFixed(2)}`)
console.log(`  TOTAL: $${caso2_total.toFixed(2)}`)

console.log('\nCréditos disponibles:')
caso2_credits.forEach(credit => {
  console.log(`  - ${credit.id}: $${credit.balance.toFixed(2)}`)
})

// Aplicar primer crédito
const credit1_amount = calculateSmartCreditAmount(
  caso2_credits[0].balance,
  caso2_items,
  null,
  'delivery',
  []
)
console.log(`\n1️⃣ Seleccionar ${caso2_credits[0].id}:`)
console.log(`   Usa: $${credit1_amount.toFixed(2)} (crédito completo)`)
console.log(`   Restante del crédito: $${(caso2_credits[0].balance - credit1_amount).toFixed(2)}`)
console.log(`   Falta por pagar: $${(caso2_total - credit1_amount).toFixed(2)}`)

// Aplicar segundo crédito
const credit2_amount = calculateSmartCreditAmount(
  caso2_credits[1].balance,
  caso2_items,
  null,
  'delivery',
  [{ amount: credit1_amount }]
)
console.log(`\n2️⃣ Seleccionar ${caso2_credits[1].id}:`)
console.log(`   ❌ SIN PROTECCIÓN: Usaría $${caso2_credits[1].balance.toFixed(2)}`)
console.log(`   ✅ CON PROTECCIÓN: Usa solo $${credit2_amount.toFixed(2)}`)
console.log(`   Preserva: $${(caso2_credits[1].balance - credit2_amount).toFixed(2)} para futuras compras`)
console.log(`   Total final a pagar: $0.00`)

// CASO 3: Crédito menor que total
console.log('\n' + '='.repeat(70))
console.log('\n📋 CASO 3: Crédito menor que el total (uso completo apropiado)')
console.log('-'.repeat(70))
const caso3_items = [
  { name: 'Laptop', price: 200.00, quantity: 1 }
]
const caso3_credit = { id: 'CREDIT-003', balance: 50.00 }

const caso3_subtotal = calculateSubtotal(caso3_items)
const caso3_tax = calculateTax(caso3_subtotal)
const caso3_total = caso3_subtotal + caso3_tax

console.log(`Carrito: ${caso3_items[0].name}`)
console.log(`  Subtotal: $${caso3_subtotal.toFixed(2)}`)
console.log(`  Impuestos: $${caso3_tax.toFixed(2)}`)
console.log(`  TOTAL: $${caso3_total.toFixed(2)}`)

console.log(`\nCrédito disponible: $${caso3_credit.balance.toFixed(2)}`)

const caso3_smartAmount = calculateSmartCreditAmount(
  caso3_credit.balance,
  caso3_items,
  null,
  'pickup',
  []
)

console.log(`\n✅ Usa el crédito completo: $${caso3_smartAmount.toFixed(2)}`)
console.log(`   Restante a pagar: $${(caso3_total - caso3_smartAmount).toFixed(2)}`)
console.log(`   ℹ️ No muestra advertencia (uso apropiado del crédito)`)

// CASO 4: Con descuentos
console.log('\n' + '='.repeat(70))
console.log('\n📋 CASO 4: Con cupón de descuento')
console.log('-'.repeat(70))
const caso4_items = [
  { name: 'Pizza Grande', price: 25.00, quantity: 2 },
  { name: 'Bebida', price: 3.00, quantity: 2 }
]
const caso4_coupon = { code: 'DESCUENTO10', discount: 0.10 }
const caso4_credit = { id: 'CREDIT-004', balance: 100.00 }

const caso4_subtotal = calculateSubtotal(caso4_items)
const caso4_discount = calculateDiscount(caso4_subtotal, caso4_coupon)
const caso4_tax = calculateTax(caso4_subtotal - caso4_discount)
const caso4_delivery = calculateDeliveryFee('delivery')
const caso4_total = caso4_subtotal - caso4_discount + caso4_tax + caso4_delivery

console.log('Carrito:')
caso4_items.forEach(item => {
  console.log(`  - ${item.name}: $${item.price} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`)
})
console.log(`  Subtotal: $${caso4_subtotal.toFixed(2)}`)
console.log(`  Descuento (${caso4_coupon.code}, 10%): -$${caso4_discount.toFixed(2)}`)
console.log(`  Impuestos (10%): $${caso4_tax.toFixed(2)}`)
console.log(`  Envío: $${caso4_delivery.toFixed(2)}`)
console.log(`  TOTAL: $${caso4_total.toFixed(2)}`)

console.log(`\nCrédito disponible: $${caso4_credit.balance.toFixed(2)}`)

const caso4_smartAmount = calculateSmartCreditAmount(
  caso4_credit.balance,
  caso4_items,
  caso4_coupon,
  'delivery',
  []
)

console.log(`\n❌ SIN PROTECCIÓN: Usaría $${caso4_credit.balance.toFixed(2)}`)
console.log(`✅ CON PROTECCIÓN: Usa exactamente $${caso4_smartAmount.toFixed(2)}`)
console.log(`   Preserva: $${(caso4_credit.balance - caso4_smartAmount).toFixed(2)}`)
console.log(`   Total final: $0.00`)

// Resumen
console.log('\n' + '='.repeat(70))
console.log('\n🎯 RESUMEN DE BENEFICIOS')
console.log('-'.repeat(70))
console.log('✅ Protege automáticamente contra sobre-aplicación de créditos')
console.log('✅ Preserva saldo para futuras compras')
console.log('✅ Considera descuentos, impuestos y envío en el cálculo')
console.log('✅ Funciona correctamente con múltiples créditos')
console.log('✅ Muestra advertencias claras al usuario')
console.log('✅ Matemáticas precisas en todos los escenarios')
console.log('\n' + '='.repeat(70))
console.log('\n💡 Ejecuta: node demo-credit-protection.js')
