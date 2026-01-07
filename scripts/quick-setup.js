#!/usr/bin/env node

/**
 * 🚀 Quick Setup Script for Food Orders CRM with Vercel
 * Simplifica la configuración inicial del proyecto
 */

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const readline = require('node:readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}\n`)
};

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function checkPrerequisites() {
  log.info('Verificando requisitos...');
  
  const hasNode = await checkCommand('node');
  const hasNpm = await checkCommand('npm');
  const hasGit = await checkCommand('git');
  
  if (!hasNode || !hasNpm) {
    throw new Error('Node.js y npm son requeridos. Instala desde https://nodejs.org/');
  }
  
  if (!hasGit) {
    log.warning('Git no encontrado. Se recomienda instalarlo.');
  }
  
  log.success('Requisitos verificados');
}

async function installDependencies() {
  log.info('Instalando dependencias...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    log.success('Dependencias instaladas');
  } catch (err) {
    throw new Error(`Error instalando dependencias: ${err.message}`);
  }
}

async function setupEnvironment() {
  const envExists = fs.existsSync('.env');
  
  if (envExists) {
    log.info('Archivo .env ya existe');
    return;
  }
  
  log.info('Creando archivo .env...');
  
  const setupEnv = await question('¿Quieres configurar las variables de entorno ahora? (s/n): ');
  
  if (setupEnv.toLowerCase() === 's') {
    const clerkKey = await question('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ');
    const clerkSecret = await question('CLERK_SECRET_KEY: ');
    
    // NOSONAR - Development credentials only, using env vars
    const dbUser = process.env.DB_USER || 'crmuser';
    const dbPass = process.env.DB_PASSWORD || 'crmpassword'; // pragma: allowlist secret
    
    const envContent = `# Database (Local Development)
DATABASE_URL=postgresql://${dbUser}:${dbPass}@localhost:5432/food_orders_crm
DIRECT_URL=postgresql://${dbUser}:${dbPass}@localhost:5432/food_orders_crm

# Redis (Local Development)
REDIS_URL=redis://localhost:6379

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${clerkKey}
CLERK_SECRET_KEY=${clerkSecret}

# Node Environment
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
`;
    
    fs.writeFileSync('.env', envContent);
    log.success('Archivo .env creado');
  } else {
    if (fs.existsSync('.env.example')) {
      fs.copyFileSync('.env.example', '.env');
    }
    log.warning('Archivo .env creado desde template. Recuerda editarlo!');
  }
}

async function setupDatabase() {
  const setupDb = await question('\n¿Quieres iniciar la base de datos local con Docker? (s/n): ');
  
  if (setupDb.toLowerCase() === 's') {
    const hasDocker = await checkCommand('docker');
    
    if (hasDocker) {
      log.info('Iniciando PostgreSQL y Redis...');
      try {
        execSync('docker-compose -f docker-compose.dev-simple.yml up -d db redis adminer', { stdio: 'inherit' });
        log.success('Base de datos iniciada en localhost:5432');
        log.success('Redis iniciado en localhost:6379');
        log.success('Adminer (DB UI) disponible en http://localhost:8080');
      } catch (err) {
        log.error(`Error iniciando servicios Docker: ${err.message}`);
      }
    } else {
      log.warning('Docker no encontrado. Instala Docker Desktop para usar DB local.');
    }
  }
}

async function runMigrations() {
  const shouldRunMigrations = await question('\n¿Quieres ejecutar las migraciones de Prisma? (s/n): ');
  
  if (shouldRunMigrations.toLowerCase() === 's') {
    log.info('Generando Prisma Client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      log.success('Prisma Client generado');
      
      log.info('Ejecutando migraciones...');
      execSync('npx prisma migrate dev', { stdio: 'inherit' });
      log.success('Migraciones completadas');
    } catch (err) {
      log.warning(`Error en migraciones: ${err.message}. Verifica la conexión a la base de datos.`);
    }
  }
}

async function setupVercel() {
  const shouldSetupVercel = await question('\n¿Quieres configurar Vercel CLI? (s/n): ');
  
  if (shouldSetupVercel.toLowerCase() === 's') {
    const hasVercel = await checkCommand('vercel');
    
    if (hasVercel) {
      log.info('Vercel CLI ya está instalado');
    } else {
      log.info('Instalando Vercel CLI...');
      try {
        execSync('npm install -g vercel', { stdio: 'inherit' });
        log.success('Vercel CLI instalado');
      } catch (err) {
        log.error(`Error instalando Vercel CLI: ${err.message}`);
      }
    }
    
    log.info('Configurando proyecto Vercel...');
    log.info('Ejecuta: vercel login');
    log.info('Luego: vercel link');
  }
}

function showNextSteps() {
  log.header('✅ Setup Completado!');
  
  console.log(`
${colors.cyan}Próximos pasos:${colors.reset}

${colors.green}1. Desarrollo Local:${colors.reset}
   npm run dev
   → Abre http://localhost:3000

${colors.green}2. Ver Base de Datos:${colors.reset}
   → Adminer: http://localhost:8080
   → Prisma Studio: npm run prisma:studio

${colors.green}3. Deploy a Vercel:${colors.reset}
   vercel login
   vercel link
   vercel deploy

${colors.green}4. Comandos Útiles:${colors.reset}
   npm run dev          - Desarrollo local
   npm run build        - Build producción
   npm run test         - Ejecutar tests
   npm run lint         - Linter
   
${colors.green}5. Accesos Rápidos:${colors.reset}
   App:       http://localhost:3000
   Adminer:   http://localhost:8080
   Grafana:   http://localhost:3001 (opcional)
   DevOps:    http://localhost:3000/devops

${colors.yellow}Nota:${colors.reset} Para producción, todo se desplegará automáticamente en Vercel
cuando hagas push a main/develop.

${colors.cyan}Documentación:${colors.reset}
   README.md
   DEVOPS_README.md
   docs/DEVOPS_DASHBOARD_README.md
  `);
}

async function main() {
  log.header('🚀 Food Orders CRM - Quick Setup para Vercel');

  await checkPrerequisites();
  await installDependencies();
  await setupEnvironment();
  await setupDatabase();
  await runMigrations();
  await setupVercel();
  showNextSteps();
  
  rl.close();
}

try {
  await main();
} catch (error) {
  log.error(`Error fatal: ${error.message}`);
  rl.close();
  process.exit(1);
}
