const express = require('express');
const database = require('../database/connection');
const asteriskService = require('../services/asteriskService');
const queueService = require('../services/queueService');
const logger = require('../utils/logger');

const router = express.Router();

// GET /health - Basic health check
router.get('/', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {}
  };

  let overallStatus = 'ok';

  try {
    // Database health
    try {
      await database.testConnection();
      healthCheck.services.database = { status: 'ok' };
    } catch (error) {
      healthCheck.services.database = { 
        status: 'error', 
        error: error.message 
      };
      overallStatus = 'error';
    }

    // Asterisk health
    try {
      const asteriskStatus = asteriskService.ariClient ? 'connected' : 'disconnected';
      healthCheck.services.asterisk = { 
        status: asteriskStatus === 'connected' ? 'ok' : 'error',
        ari_connected: asteriskStatus === 'connected'
      };
      
      if (asteriskStatus === 'disconnected') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      healthCheck.services.asterisk = { 
        status: 'error', 
        error: error.message 
      };
      overallStatus = 'error';
    }

    // Queue health
    try {
      const queueStats = await queueService.getQueueStats();
      healthCheck.services.queue = { 
        status: 'ok',
        stats: queueStats
      };
    } catch (error) {
      healthCheck.services.queue = { 
        status: 'error', 
        error: error.message 
      };
      overallStatus = 'degraded';
    }

    healthCheck.status = overallStatus;

  } catch (error) {
    logger.error('Health check error:', error);
    healthCheck.status = 'error';
    healthCheck.error = error.message;
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

// GET /health/detailed - Detailed health check with metrics
router.get('/detailed', async (req, res) => {
  try {
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {}
    };

    // Database detailed check
    try {
      const dbStart = Date.now();
      await database.query('SELECT 1');
      const dbLatency = Date.now() - dbStart;
      
      healthCheck.services.database = {
        status: 'ok',
        latency_ms: dbLatency,
        connection_limit: 10 // From pool config
      };
    } catch (error) {
      healthCheck.services.database = {
        status: 'error',
        error: error.message
      };
    }

    // Asterisk detailed check
    healthCheck.services.asterisk = {
      status: asteriskService.ariClient ? 'ok' : 'error',
      ari_connected: !!asteriskService.ariClient,
      ami_connected: !!asteriskService.amiClient,
      active_channels: asteriskService.activeChannels.size,
      active_bridges: asteriskService.activeBridges.size,
      reconnect_attempts: asteriskService.reconnectAttempts
    };

    // Queue detailed check
    try {
      const queueStats = await queueService.getQueueStats();
      const activeJobs = await queueService.getActiveJobs();
      
      healthCheck.services.queue = {
        status: 'ok',
        stats: queueStats,
        active_jobs: {
          telephony: activeJobs.telephony.length,
          recording: activeJobs.recording.length
        }
      };
    } catch (error) {
      healthCheck.services.queue = {
        status: 'error',
        error: error.message
      };
    }

    res.json(healthCheck);

  } catch (error) {
    logger.error('Detailed health check error:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/ready - Kubernetes-style readiness check
router.get('/ready', async (req, res) => {
  try {
    // Check if all critical services are ready
    await database.testConnection();
    
    // Asterisk connection is not critical for readiness
    // Queue service should be available
    await queueService.getQueueStats();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /health/live - Kubernetes-style liveness check
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;