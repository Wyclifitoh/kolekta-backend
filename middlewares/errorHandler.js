const logger = require('../utils/logger');

class ErrorHandler {
  // Main error handling middleware
  static handle(error, req, res, next) {
    logger.error('Unhandled error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      body: req.body
    });

    // Don't send error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Handle different types of errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: isDevelopment ? error.message : undefined
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid data format',
        error: isDevelopment ? error.message : undefined
      });
    }

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable',
        error: isDevelopment ? error.message : undefined
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        error: isDevelopment ? error.message : undefined
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired',
        error: isDevelopment ? error.message : undefined
      });
    }

    // Database-related errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry',
        error: isDevelopment ? error.message : undefined
      });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        message: 'Referenced resource not found',
        error: isDevelopment ? error.message : undefined
      });
    }

    // Rate limiting errors
    if (error.statusCode === 429) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
        error: isDevelopment ? error.message : undefined
      });
    }

    // Default server error
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: isDevelopment ? error.message : undefined,
      requestId: req.id // If you're using request IDs
    });
  }

  // Handle 404 errors
  static notFound(req, res) {
    logger.warn('Route not found:', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id
    });

    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.path,
      method: req.method
    });
  }

  // Async error wrapper
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Promise rejection handler
  static handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled promise rejection:', {
      reason: reason,
      promise: promise
    });

    // Don't exit the process in production, but log it
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }

  // Uncaught exception handler
  static handleUncaughtException(error) {
    logger.fatal('Uncaught exception:', error);
    
    // Always exit on uncaught exceptions
    process.exit(1);
  }
}

// Set up global error handlers
process.on('unhandledRejection', ErrorHandler.handleUnhandledRejection);
process.on('uncaughtException', ErrorHandler.handleUncaughtException);

module.exports = ErrorHandler.handle;
module.exports.notFound = ErrorHandler.notFound;
module.exports.asyncHandler = ErrorHandler.asyncHandler;