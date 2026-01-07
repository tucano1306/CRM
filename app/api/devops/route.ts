import type { NextApiRequest, NextApiResponse } from 'next';

type Service = {
  name: string;
  url: string;
  description: string;
  status: 'running' | 'optional' | 'down';
  credentials?: string;
  icon: string;
};

type DashboardData = {
  services: Service[];
  commands: {
    command: string;
    description: string;
  }[];
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardData>
) {
  const services: Service[] = [
    {
      name: 'Aplicación',
      url: 'http://localhost:3000',
      description: 'Aplicación principal Next.js',
      status: 'running',
      icon: '🍔'
    },
    {
      name: 'Jenkins',
      url: 'http://localhost:8082',
      description: 'CI/CD Server',
      status: 'optional',
      credentials: 'admin / (ver .env)',
      icon: '🔧'
    },
    {
      name: 'Grafana',
      url: 'http://localhost:3001',
      description: 'Dashboards y Métricas',
      status: 'optional',
      credentials: 'admin / admin',
      icon: '📊'
    },
    {
      name: 'Prometheus',
      url: 'http://localhost:9090',
      description: 'Monitoreo de Métricas',
      status: 'optional',
      icon: '📈'
    },
    {
      name: 'SonarQube',
      url: 'http://localhost:9000',
      description: 'Análisis de Código',
      status: 'optional',
      credentials: 'admin / admin',
      icon: '🔍'
    },
    {
      name: 'Adminer',
      url: 'http://localhost:8080',
      description: 'Database UI',
      status: 'running',
      icon: '🗄️'
    },
    {
      name: 'Alertmanager',
      url: 'http://localhost:9093',
      description: 'Gestión de Alertas',
      status: 'optional',
      icon: '🔔'
    },
    {
      name: 'cAdvisor',
      url: 'http://localhost:8081',
      description: 'Container Monitoring',
      status: 'optional',
      icon: '📦'
    }
  ];

  const commands = [
    {
      command: 'npm run dev',
      description: 'Iniciar aplicación en desarrollo'
    },
    {
      command: 'npm run docker:dev',
      description: 'Iniciar servicios Docker (DB, Redis)'
    },
    {
      command: 'docker-compose --profile monitoring up -d',
      description: 'Iniciar Prometheus y Grafana'
    },
    {
      command: 'docker-compose --profile ci up -d',
      description: 'Iniciar Jenkins y SonarQube'
    },
    {
      command: 'docker-compose ps',
      description: 'Ver estado de servicios'
    },
    {
      command: 'npm run prisma:studio',
      description: 'Abrir Prisma Studio'
    }
  ];

  res.status(200).json({ services, commands });
}
