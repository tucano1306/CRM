import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Productos - Food Orders CRM',
  description: 'Gestiona tu catálogo de productos. Añade, edita y organiza los productos de tu negocio.',
  keywords: ['productos', 'catálogo', 'inventario', 'gestión', 'CRM'],
}

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}