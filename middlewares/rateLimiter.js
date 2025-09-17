const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 min
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health'), // Skip health checks
  handler: (req, res) => {
    logger.warn('Rate limit reached:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later'
    });
  }
});

// Call-specific rate limiter
const callRateLimit = rateLimit({
  windowMs: 60000,
  max: parseInt(process.env.CALL_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `call_${req.user?.id || req.ip}`,
  skip: (req) => req.user?.isAdmin === true,
  handler: (req, res) => {
    logger.warn('Call rate limit reached:', {
      userId: req.user?.id,
      staffId: req.user?.staffId,
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      message: 'Too many call requests, please wait before making another call'
    });
  }
});

// Webhook rate limiter
const webhookRateLimit = rateLimit({
  windowMs: 60000,
  max: 1000,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Webhook rate limit reached:', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')
    });
    res.status(429).json({
      success: false,
      message: 'Webhook rate limit exceeded'
    });
  }
});

// Recording download rate limiter
const recordingRateLimit = rateLimit({
  windowMs: 60000,
  max: 50,
  keyGenerator: (req) => `recording_${req.user?.id || req.ip}`,
  handler: (req, res) => {
    logger.warn('Recording rate limit reached:', {
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      message: 'Too many recording requests, please wait'
    });
  }
});

// Call control rate limiter
const callControlRateLimit = rateLimit({
  windowMs: 60000,
  max: 30,
  keyGenerator: (req) => `control_${req.user?.id || req.ip}`,
  handler: (req, res) => {
    logger.warn('Call control rate limit reached:', {
      userId: req.user?.id,
      action: req.path,
      ip: req.ip
    });
    res.status(429).json({
      success: false,
      message: 'Too many call control requests'
    });
  }
});

// Dynamic rate limiter for suspicious activity
class DynamicRateLimiter {
  constructor() {
    this.suspiciousIPs = new Map();
    this.cleanupInterval = setInterval(() => this.cleanupOldEntries(), 300000);
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

      if (ipData.blocked && now < ipData.blockExpiry) {
        logger.warn('Blocked IP attempted access:', { ip, path: req.path });
        return res.status(429).json({
          success: false,
          message: 'IP temporarily blocked due to suspicious activity'
        });
      }

      if (ipData.blocked && now >= ipData.blockExpiry) {
        ipData.blocked = false;
        ipData.attempts = 0;
      }

      ipData.attempts = (now - ipData.lastAttempt < 60000)
        ? ipData.attempts + 1
        : 1;

      ipData.lastAttempt = now;

      if (ipData.attempts > 200) {
        ipData.blocked = true;
        ipData.blockExpiry = now + (30 * 60 * 1000);

        logger.error('IP blocked for suspicious activity:', { 
          ip, attempts: ipData.attempts, path: req.path 
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
