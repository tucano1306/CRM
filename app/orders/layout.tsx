import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pedidos - Food Orders CRM',
  description: 'Gestiona todos los pedidos de tu negocio. Ve el estado, confirma y procesa pedidos de clientes.',
  keywords: ['pedidos', 'órdenes', 'ventas', 'clientes', 'procesamiento'],
}

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}