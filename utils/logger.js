const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'asterisk-call-system' },
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    }),

    // File transport for call-specific logs
    new winston.transports.File({
      filename: path.join(logDir, 'calls.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          // Only log call-related messages
          if (info.message && (
            info.message.includes('call') ||
            info.message.includes('Call') ||
            info.message.includes('asterisk') ||
            info.message.includes('Asterisk')
          )) {
            return info;
          }
          return false;
        })()
      ),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5
    })
  ],

  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ],

  // Handle rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Create child loggers for specific modules
logger.asterisk = logger.child({ module: 'asterisk' });
logger.database = logger.child({ module: 'database' });
logger.queue = logger.child({ module: 'queue' });
logger.api = logger.child({ module: 'api' });
logger.auth = logger.child({ module: 'auth' });
logger.websocket = logger.child({ module: 'websocket' });

// Utility functions for structured logging
logger.logCall = (action, callData) => {
  logger.info(`Call ${action}`, {
    call_uuid: callData.callUuid,
    staff_id: callData.staffId,
    from_number: callData.fromNumber,
    to_number: callData.toNumber,
    direction: callData.direction,
    action: action
  });
};

logger.logCallEvent = (eventType, callUuid, eventData = {}) => {
  logger.info(`Call event: ${eventType}`, {
    call_uuid: callUuid,
    event_type: eventType,
    ...eventData
  });
};

logger.logApiRequest = (req, responseTime) => {
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    user_id: req.user?.id,
    response_time_ms: responseTime,
    user_agent: req.get('User-Agent')
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  });
};

// Performance monitoring
logger.time = (label) => {
  const startTime = process.hrtime.bigint();
  return () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    logger.debug(`Performance: ${label}`, { duration_ms: duration });
    return duration;
  };
};

module.exports = logger;