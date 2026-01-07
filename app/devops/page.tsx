'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type ServiceStatus = {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking';
  responseTime?: number;
  port: number;
  category: string;
};

type StatusSummary = {
  total: number;
  online: number;
  offline: number;
  lastCheck: string;
};

interface Service {
  name: string;
  url: string;
  description: string;
  icon: string;
  credentials?: string;
  category: 'core' | 'monitoring' | 'cicd';
  port: number;
}

const services: Service[] = [
  {
    name: 'Aplicación',
    url: 'http://localhost:3000',
    description: 'Next.js App con Clerk Auth',
    icon: '🍔',
    category: 'core',
    port: 3000,
  },
  {
    name: 'Adminer',
    url: 'http://localhost:8080',
    description: 'Database Management UI',
    icon: '🗄️',
    credentials: 'crmuser / crmpassword',
    category: 'core',
    port: 8080,
  },
  {
    name: 'Grafana',
    url: 'http://localhost:3001',
    description: 'Dashboards y Métricas',
    icon: '📊',
    credentials: 'admin / admin',
    category: 'monitoring',
    port: 3001,
  },
  {
    name: 'Prometheus',
    url: 'http://localhost:9090',
    description: 'Sistema de Monitoreo',
    icon: '📈',
    category: 'monitoring',
    port: 9090,
  },
  {
    name: 'Alertmanager',
    url: 'http://localhost:9093',
    description: 'Gestión de Alertas',
    icon: '🔔',
    category: 'monitoring',
    port: 9093,
  },
  {
    name: 'cAdvisor',
    url: 'http://localhost:8081',
    description: 'Container Monitoring',
    icon: '📦',
    category: 'monitoring',
    port: 8081,
  },
  {
    name: 'Jenkins',
    url: 'http://localhost:8082',
    description: 'CI/CD Automation',
    icon: '🔧',
    credentials: 'Ver .env',
    category: 'cicd',
    port: 8082,
  },
  {
    name: 'SonarQube',
    url: 'http://localhost:9000',
    description: 'Análisis de Código',
    icon: '🔍',
    credentials: 'admin / admin',
    category: 'cicd',
    port: 9000,
  },
];

const commands = [
  { cmd: 'npm run dev', desc: 'Iniciar desarrollo' },
  { cmd: 'npm run docker:dev', desc: 'Iniciar Docker services' },
  { cmd: 'docker-compose --profile monitoring up -d', desc: 'Iniciar monitoreo' },
  { cmd: 'docker-compose --profile ci up -d', desc: 'Iniciar CI/CD' },
  { cmd: 'docker-compose ps', desc: 'Ver estado' },
  { cmd: 'npm run prisma:studio', desc: 'Abrir Prisma Studio' },
];

export default function DevOpsDashboard() {
  const [copiedCommand, setCopiedCommand] = useState<string>('');
  const [serviceStatuses, setServiceStatuses] = useState<Record<number, ServiceStatus>>({});
  const [summary, setSummary] = useState<StatusSummary | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const checkAllServices = async () => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/devops/status', {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        
        const statusMap: Record<number, ServiceStatus> = {};
        data.services.forEach((service: ServiceStatus) => {
          statusMap[service.port] = service;
        });
        setServiceStatuses(statusMap);
      }
    } catch (error) {
      console.error('Error checking services:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkAllServices();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(checkAllServices, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(text);
      setTimeout(() => setCopiedCommand(''), 2000);
    } catch {
      alert(`Copiar: ${text}`);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'from-blue-500 to-blue-600';
      case 'monitoring':
        return 'from-orange-500 to-orange-600';
      case 'cicd':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'core':
        return 'Servicios Principales';
      case 'monitoring':
        return 'Monitoreo';
      case 'cicd':
        return 'CI/CD';
      default:
        return 'Otros';
    }
  };

  const getStatusBadge = (port: number) => {
    const status = serviceStatuses[port];
    
    if (!status || status.status === 'checking') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <span className="mr-1 h-2 w-2 rounded-full bg-gray-400 animate-pulse"></span>{' '}
          Verificando...
        </span>
      );
    }
    
    if (status.status === 'online') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="mr-1 h-2 w-2 rounded-full bg-green-500"></span>{' '}
          Online {status.responseTime ? `(${status.responseTime}ms)` : ''}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <span className="mr-1 h-2 w-2 rounded-full bg-red-500"></span>{' '}
        Offline
      </span>
    );
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            🚀 DevOps Dashboard
          </h1>
          <p className="text-xl text-white/90 mb-6">
            Food Orders CRM - Monitoreo en Tiempo Real
          </p>
          
          <div className="flex justify-center gap-4 mb-6">
            <Link
              href="/"
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg backdrop-blur-sm transition-all"
            >
              ← Volver a la App
            </Link>
            <button
              onClick={checkAllServices}
              disabled={isChecking}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg backdrop-blur-sm transition-all disabled:opacity-50"
              type="button"
            >
              {isChecking ? '🔄 Verificando...' : '🔄 Verificar Estado'}
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-6 py-2 rounded-lg backdrop-blur-sm transition-all ${
                autoRefresh ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
              type="button"
            >
              {autoRefresh ? '⏸️ Auto-refresh ON' : '▶️ Auto-refresh OFF'}
            </button>
          </div>

          {/* Status Summary */}
          {summary && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white">
                <div className="text-3xl font-bold">{summary.total}</div>
                <div className="text-sm text-white/80">Total Servicios</div>
              </div>
              <div className="bg-green-500/20 backdrop-blur-md rounded-lg p-4 text-white border-2 border-green-400">
                <div className="text-3xl font-bold">{summary.online}</div>
                <div className="text-sm text-white/80">Online</div>
              </div>
              <div className="bg-red-500/20 backdrop-blur-md rounded-lg p-4 text-white border-2 border-red-400">
                <div className="text-3xl font-bold">{summary.offline}</div>
                <div className="text-sm text-white/80">Offline</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 text-white">
                <div className="text-lg font-bold">
                  {Math.round((summary.online / summary.total) * 100)}%
                </div>
                <div className="text-sm text-white/80">Uptime</div>
              </div>
            </div>
          )}
        </header>

        {/* Services by Category */}
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category} className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getCategoryColor(category)}`}>
                {getCategoryName(category)}
              </span>
              {category === 'monitoring' && (
                <span className="text-sm text-white/70 font-normal">
                  docker-compose --profile monitoring up -d
                </span>
              )}
              {category === 'cicd' && (
                <span className="text-sm text-white/70 font-normal">
                  docker-compose --profile ci up -d
                </span>
              )}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryServices.map((service) => (
                <div
                  key={service.port}
                  className="bg-white rounded-xl shadow-2xl p-6 hover:shadow-3xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{service.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{service.name}</h3>
                        <span className="text-sm text-gray-500">:{service.port}</span>
                      </div>
                    </div>
                    {getStatusBadge(service.port)}
                  </div>

                  <p className="text-gray-600 mb-4 text-sm">{service.description}</p>

                  {service.credentials && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-4">
                      <p className="text-xs text-yellow-800">
                        🔑 {service.credentials}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full text-center px-4 py-2 rounded-lg text-white font-medium bg-gradient-to-r ${getCategoryColor(
                        service.category
                      )} hover:opacity-90 transition-all`}
                    >
                      Abrir {service.name}
                    </a>
                    <button
                      onClick={() => copyToClipboard(service.url)}
                      className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-all"
                      type="button"
                    >
                      {copiedCommand === service.url ? '✓ Copiado!' : '📋 Copiar URL'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Commands Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">⚡ Comandos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commands.map((item) => (
              <button
                key={item.cmd}
                onClick={() => copyToClipboard(item.cmd)}
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all text-left group"
                type="button"
              >
                <div className="flex-1">
                  <code className="text-sm text-green-600 font-mono block mb-1">
                    {item.cmd}
                  </code>
                  <span className="text-xs text-gray-600">{item.desc}</span>
                </div>
                <span className="ml-4 text-gray-400 group-hover:text-gray-600">
                  {copiedCommand === item.cmd ? '✓' : '📋'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🎯 Acciones Rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => copyToClipboard('npm run dev')}
              className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:opacity-90 transition-all font-medium"
              type="button"
            >
              📱 Iniciar Dev
            </button>
            <button
              onClick={() => copyToClipboard('npm run docker:dev')}
              className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:opacity-90 transition-all font-medium"
              type="button"
            >
              🐳 Iniciar Docker
            </button>
            <button
              onClick={() => copyToClipboard('docker-compose ps')}
              className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-all font-medium"
              type="button"
            >
              📊 Ver Estado
            </button>
            <button
              onClick={() => copyToClipboard('npm run prisma:studio')}
              className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:opacity-90 transition-all font-medium"
              type="button"
            >
              🗄️ Prisma Studio
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">ℹ️ Información de Deployment</h2>
          <div className="prose prose-sm max-w-none">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-800 mb-2">🌐 En Vercel (Producción)</h3>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>✅ Dashboard funcional</li>
                  <li>✅ Monitoreo en tiempo real</li>
                  <li>✅ Auto-refresh disponible</li>
                  <li>⚠️ Servicios corren localmente</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 mb-2">💻 En Local (Desarrollo)</h3>
                <ul className="text-gray-700 space-y-1 text-sm">
                  <li>✅ Verificación de estado real</li>
                  <li>✅ Acceso directo a servicios</li>
                  <li>✅ Comandos ejecutables</li>
                  <li>✅ Hot reload activo</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Esta página verifica el estado de los servicios en tiempo real.
                Activa el auto-refresh para monitoreo continuo cada 10 segundos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-white/80">
          <p className="mb-2">🍔 Food Orders CRM - DevOps Dashboard con Monitoreo en Tiempo Real</p>
          <p className="text-sm">
            {summary && (
              <span>Última verificación: {new Date(summary.lastCheck).toLocaleTimeString()}</span>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
