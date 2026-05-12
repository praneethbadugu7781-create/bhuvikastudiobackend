import * as Sentry from '@sentry/node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '0.1'),
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error && error.message?.includes('ECONNREFUSED')) {
        return null;
      }

      if (event.request) {
        delete event.request.headers?.authorization;
        delete event.request.headers?.cookie;
      }

      if (event.extra?.body) {
        const sanitized = { ...event.extra.body };
        if (sanitized.password) delete sanitized.password;
        if (sanitized.card) delete sanitized.card;
        if (sanitized.token) delete sanitized.token;
        event.extra.body = sanitized;
      }

      return event;
    },
  });

  console.log('Sentry initialized');
}

export function captureException(error, context = {}) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message, level = 'info') {
  Sentry.captureMessage(message, level);
}

export function addBreadcrumb(message, category = 'default', level = 'info') {
  Sentry.addBreadcrumb({ message, category, level });
}

export function getSentryMiddleware() {
  return [
    Sentry.Handlers.requestHandler(),
    Sentry.Handlers.errorHandler(),
  ];
}
