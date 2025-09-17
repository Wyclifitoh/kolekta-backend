const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/health');
  },
  requestWasLimited: (req) => {
    logger.warn('Rate limit reached:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
  }
});

// Call-specific rate limiter (more restrictive)
const callRateLimit = rateLimit({
  windowMs: 60000,
  max: parseInt(process.env.CALL_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `call_${req.user?.id || req.ip}`,
  skip: (req) => req.user?.isAdmin === true,
  handler: (req, res, next, options) => {
    logger.warn('Call rate limit reached:', {
      userId: req.user?.id,
      staffId: req.user?.staffId,
      ip: req.ip,
      path: req.path
    });

    res.status(options.statusCode).json({
      success: false,
      message: 'Too many call requests, please wait before making another call'
    });
  }
});

// Webhook rate limiter (for external systems)
const webhookRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 1000, // Allow high volume for legitimate webhooks
  message: {
    success: false,
    message: 'Webhook rate limit exceeded'
  },
  standardHeaders: false,
  legacyHeaders: false,
  onLimitReached: (req) => {
    logger.warn('Webhook rate limit reached:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
  }
});

// Recording download rate limiter
const recordingRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 50, // 50 recordings per minute per user
  message: {
    success: false,
    message: 'Too many recording requests, please wait'
  },
  keyGenerator: (req) => {
    return `recording_${req.user?.id || req.ip}`;
  },
  onLimitReached: (req) => {
    logger.warn('Recording rate limit reached:', {
      userId: req.user?.id,
      ip: req.ip
    });
  }
});

// Transfer/hangup rate limiter
const callControlRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 control actions per minute
  message: {
    success: false,
    message: 'Too many call control requests'
  },
  keyGenerator: (req) => {
    return `control_${req.user?.id || req.ip}`;
  },
  onLimitReached: (req) => {
    logger.warn('Call control rate limit reached:', {
      userId: req.user?.id,
      action: req.path,
      ip: req.ip
    });
  }
});

// Dynamic rate limiter for suspicious activity
class DynamicRateLimiter {
  constructor() {
    this.suspiciousIPs = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldEntries();
    }, 300000); // Cleanup every 5 minutes
  }

  middleware() {
    return (req, res, next) => {
      const ip = req.ip;
      const now = Date.now();
      
      const ipData = this.suspiciousIPs.get(ip) || {
        attempts: 0,
        lastAttempt: now,
        blocked: false,
        blockExpiry: 0
      };

      // Check if IP is currently blocked
      if (ipData.blocked && now < ipData.blockExpiry) {
        logger.warn('Blocked IP attempted access:', { ip, path: req.path });
        return res.status(429).json({
          success: false,
          message: 'IP temporarily blocked due to suspicious activity'
        });
      }

      // Reset block if expired
      if (ipData.blocked && now >= ipData.blockExpiry) {
        ipData.blocked = false;
        ipData.attempts = 0;
      }

      // Track attempts
      if (now - ipData.lastAttempt < 60000) { // Within last minute
        ipData.attempts++;
      } else {
        ipData.attempts = 1; // Reset counter
      }

      ipData.lastAttempt = now;

      // Block if too many attempts
      if (ipData.attempts > 200) { // Very high threshold for blocking
        ipData.blocked = true;
        ipData.blockExpiry = now + (30 * 60 * 1000); // Block for 30 minutes
        
        logger.error('IP blocked for suspicious activity:', { 
          ip, 
          attempts: ipData.attempts,
          path: req.path 
        });
        
        return res.status(429).json({
          success: false,
          message: 'IP blocked due to excessive requests'
        });
      }

      this.suspiciousIPs.set(ip, ipData);
      next();
    };
  }

  cleanupOldEntries() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (now - data.lastAttempt > oneHour && !data.blocked) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  unblockIP(ip) {
    const ipData = this.suspiciousIPs.get(ip);
    if (ipData) {
      ipData.blocked = false;
      ipData.blockExpiry = 0;
      ipData.attempts = 0;
      this.suspiciousIPs.set(ip, ipData);
      logger.info('IP unblocked manually:', ip);
    }
  }

  getBlockedIPs() {
    const blocked = [];
    const now = Date.now();
    
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.blocked && now < data.blockExpiry) {
        blocked.push({
          ip,
          attempts: data.attempts,
          blockedAt: new Date(data.blockExpiry - (30 * 60 * 1000)),
          expiresAt: new Date(data.blockExpiry)
        });
      }
    }
    
    return blocked;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const dynamicRateLimiter = new DynamicRateLimiter();

module.exports = {
  generalRateLimit,
  callRateLimit,
  webhookRateLimit,
  recordingRateLimit,
  callControlRateLimit,
  dynamicRateLimiter
};