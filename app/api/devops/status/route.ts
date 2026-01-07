import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type ServiceCheck = {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'unknown';
  responseTime?: number;
  port: number;
  category: string;
};

async function checkService(url: string, timeout = 2000): Promise<{ status: boolean; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    return {
      status: response.ok || response.status === 401, // 401 means service is running but needs auth
      responseTime,
    };
  } catch {
    return {
      status: false,
      responseTime: Date.now() - startTime,
    };
  }
}

export async function GET() {
  const services = [
    { name: 'Aplicación', url: 'http://localhost:3000', port: 3000, category: 'core' },
    { name: 'Adminer', url: 'http://localhost:8080', port: 8080, category: 'core' },
    { name: 'Grafana', url: 'http://localhost:3001', port: 3001, category: 'monitoring' },
    { name: 'Prometheus', url: 'http://localhost:9090', port: 9090, category: 'monitoring' },
    { name: 'Alertmanager', url: 'http://localhost:9093', port: 9093, category: 'monitoring' },
    { name: 'cAdvisor', url: 'http://localhost:8081', port: 8081, category: 'monitoring' },
    { name: 'Jenkins', url: 'http://localhost:8082', port: 8082, category: 'cicd' },
    { name: 'SonarQube', url: 'http://localhost:9000', port: 9000, category: 'cicd' },
  ];

  const checks: ServiceCheck[] = await Promise.all(
    services.map(async (service) => {
      const { status, responseTime } = await checkService(service.url);
      
      return {
        name: service.name,
        url: service.url,
        status: status ? 'online' : 'offline',
        responseTime,
        port: service.port,
        category: service.category,
      } as ServiceCheck;
    })
  );

  const summary = {
    total: checks.length,
    online: checks.filter((c) => c.status === 'online').length,
    offline: checks.filter((c) => c.status === 'offline').length,
    lastCheck: new Date().toISOString(),
  };

  return NextResponse.json({
    summary,
    services: checks,
  });
}
