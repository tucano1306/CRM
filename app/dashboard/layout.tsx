import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - Food Orders CRM',
  description: 'Panel de control principal. Visualiza estadísticas, métricas y resumen de tu negocio.',
  keywords: ['dashboard', 'panel', 'estadísticas', 'métricas', 'resumen'],
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}