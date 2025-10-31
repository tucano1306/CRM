import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable performance monitoring
  enabled: process.env.NODE_ENV === 'production',

  // Additional context
  environment: process.env.NODE_ENV,
  
  // Replay integration for session recording
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
