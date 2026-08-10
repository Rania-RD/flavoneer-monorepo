import * as Sentry from '@sentry/react-native';

const BUGSINK_DSN = 'https://7190edb146e04fb582a6d0d909d5a29f@zapper.synbiodiet.com/3';

Sentry.init({
  dsn: BUGSINK_DSN,
  enableAutoPerformanceTracing: false,
  enableAutoSessionTracking: false,
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
