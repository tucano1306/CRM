import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [['html'], ['github'], ['list']]
    : [['html'], ['list']],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.CI
      ? 'http://localhost:3000'
      : 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    // ⚠️ Setup project DESHABILITADO temporalmente
    // Issue: Clerk <SignIn /> no carga en Playwright (formulario no aparece)
    // TODO: Resolver integración antes de habilitar auth visual
    // { 
    //   name: 'setup',
    //   testMatch: /auth\.setup\.ts/,
    // },

    // Test projects
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // ⚠️ storageState deshabilitado hasta resolver Clerk integration
        // storageState: 'e2e/.auth/client.json',
      },
      // ⚠️ Sin dependencia de setup hasta resolver Clerk
      // dependencies: ['setup'],
      testIgnore: [
        /auth\.setup\.ts/,
        /simple-debug\.spec\.ts/, // Test de debug temporal
      ],
    },

    // Comentar otros navegadores para evitar rate limiting en desarrollo local
    // Descomentar solo para CI/CD completo
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: 'e2e/.auth/client.json',
    //   },
    //   dependencies: ['setup'],
    // },

    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: 'e2e/.auth/client.json',
    //   },
    //   dependencies: ['setup'],
    // },

    // /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: {
    //     ...devices['Pixel 5'],
    //     storageState: 'e2e/.auth/client.json',
    //   },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: {
    //     ...devices['iPhone 12'],
    //     storageState: 'e2e/.auth/client.json',
    //   },
    //   dependencies: ['setup'],
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
