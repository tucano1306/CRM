import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clientes - Food Orders CRM',
  description: 'Gestiona tu base de clientes. Ve información, historial de pedidos y contacta con tus clientes.',
  keywords: ['clientes', 'usuarios', 'contactos', 'base de datos', 'gestión'],
}

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}