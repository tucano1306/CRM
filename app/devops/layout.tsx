import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DevOps Dashboard | Food Orders CRM',
  description: 'Acceso centralizado a todas las herramientas DevOps del proyecto Food Orders CRM',
};

export default function DevOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
