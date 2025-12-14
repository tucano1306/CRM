// lib/invoice-config.ts
/**
 * Configuración de información del vendedor para facturas
 * 
 * INSTRUCCIONES:
 * 1. Actualiza estos valores con la información real de tu empresa
 * 2. Esta configuración se usa automáticamente en todas las facturas generadas
 */

export const INVOICE_CONFIG = {
  // Información de la Empresa
  company: {
    name: 'Food Orders CRM',
    legalName: 'Food Orders CRM S.A. de C.V.',
    address: '123 Calle Principal, Ciudad, Estado, CP 00000',
    phone: '(000) 000-0000',
    email: 'contacto@foodorderscrm.com',
    website: 'www.foodorderscrm.com',
    taxId: 'RFC: XXXX000000XXX',  // Actualiza con tu RFC/Tax ID
    logo: '/logo.png',  // Ruta al logo (PNG, JPG, JPEG) - Coloca tu logo en public/logo.png
  },

  // Configuración de Factura
  invoice: {
    defaultTaxRate: 0.1,  // 10% IVA
    defaultPaymentTerms: 30,  // Días para pagar
    currency: 'MXN',  // Moneda
    currencySymbol: '$',
  },

  // Términos y Condiciones (puedes personalizarlos)
  terms: {
    payment: 'Pago neto a 30 días. Se aceptan transferencias bancarias, efectivo o cheque.',
    conditions: [
      'Los productos son propiedad de Food Orders CRM hasta que el pago sea completado.',
      'Los pagos vencidos tendrán un cargo por mora del 2% mensual.',
      'Cualquier disputa debe ser notificada dentro de los 5 días hábiles.',
      'Esta factura está sujeta a las leyes comerciales vigentes.',
    ],
    notes: 'Gracias por su preferencia. Para cualquier consulta, contáctenos.',
  },

  // Información Bancaria (opcional)
  banking: {
    bankName: 'Banco Ejemplo',
    accountNumber: '1234-5678-9012-3456',
    clabe: '012345678901234567',
    swift: 'BANCMXMM',
  },
} as const

// Helper para obtener la configuración del vendedor
export function getSellerInfo(sellerOverrides?: {
  name?: string
  email?: string
  phone?: string
}) {
  return {
    sellerName: sellerOverrides?.name || INVOICE_CONFIG.company.name,
    sellerAddress: INVOICE_CONFIG.company.address,
    sellerPhone: sellerOverrides?.phone || INVOICE_CONFIG.company.phone,
    sellerEmail: sellerOverrides?.email || INVOICE_CONFIG.company.email,
    sellerTaxId: INVOICE_CONFIG.company.taxId,
  }
}

// Helper para obtener configuración de factura
export function getInvoiceDefaults() {
  return {
    taxRate: INVOICE_CONFIG.invoice.defaultTaxRate,
    paymentTermsDays: INVOICE_CONFIG.invoice.defaultPaymentTerms,
    currency: INVOICE_CONFIG.invoice.currency,
    currencySymbol: INVOICE_CONFIG.invoice.currencySymbol,
  }
}

// Helper para obtener términos
export function getInvoiceTerms() {
  return {
    paymentTerms: INVOICE_CONFIG.terms.payment,
    termsAndConditions: INVOICE_CONFIG.terms.conditions.join('\n'),
    notes: INVOICE_CONFIG.terms.notes,
  }
}
