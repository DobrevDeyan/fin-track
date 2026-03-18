/**
 * Structured Logger with PII Redaction
 *
 * Provides consistent logging across the application with automatic
 * redaction of sensitive information in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

// PII patterns to redact
const PII_PATTERNS = {
  email: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  phone: /(\+?1?\s*\(?[0-9]{3}\)?[\s.-]?[0-9]{3}[\s.-]?[0-9]{4})/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
};

// Fields that contain sensitive data
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'creditCard',
  'cvv',
  'pin',
  'ssn',
];

/**
 * Redact PII from strings
 */
function redactPII(value: string): string {
  let redacted = value;

  // Redact email - keep domain for debugging
  redacted = redacted.replace(PII_PATTERNS.email, (match, user, domain) => {
    return `${user[0]}***@${domain}`;
  });

  // Redact phone numbers
  redacted = redacted.replace(PII_PATTERNS.phone, '***-***-****');

  // Redact SSN
  redacted = redacted.replace(PII_PATTERNS.ssn, '***-**-****');

  // Redact credit cards
  redacted = redacted.replace(PII_PATTERNS.creditCard, '**** **** **** ****');

  return redacted;
}

/**
 * Redact sensitive data from objects
 */
function redactObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return redactPII(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }

  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if field name indicates sensitive data
    const isSensitive = SENSITIVE_FIELDS.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactObject(value);
    } else if (typeof value === 'string') {
      redacted[key] = redactPII(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Check if we should redact based on environment
 */
function shouldRedact(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (context) {
    const redactedContext = shouldRedact() ? redactObject(context) : context;
    return `${prefix} ${message} ${JSON.stringify(redactedContext)}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Logger class with PII redaction
 */
class Logger {
  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, context));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    const formatted = formatMessage('info', message, context);
    console.info(formatted);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    const formatted = formatMessage('warn', message, context);
    console.warn(formatted);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };

    const formatted = formatMessage('error', message, errorContext);
    console.error(formatted);
  }

  /**
   * Log Firestore operations (with automatic PII redaction)
   */
  firestore(operation: string, collection: string, context?: LogContext): void {
    this.debug(`Firestore ${operation}`, {
      collection,
      ...context,
    });
  }

  /**
   * Log API calls (with automatic PII redaction)
   */
  api(method: string, endpoint: string, context?: LogContext): void {
    this.debug(`API ${method}`, {
      endpoint,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { redactPII, redactObject };
