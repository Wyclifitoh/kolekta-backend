const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const authMiddleware = require('../middlewares/auth');
const rateLimiter = require('../middlewares/rateLimiter');
const callLogService = require('../services/callLogService');
const queueService = require('../services/queueService');
const asteriskService = require('../services/asteriskService');
const recordingsService = require('../services/recordingsService');
const realtimeNotifier = require('../services/realtimeNotifier');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation middleware
const validateErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// POST /api/telephony/call - Initiate a call
router.post('/call',
  authMiddleware.requireAuth,
  rateLimiter.callRateLimit,
  [
    body('callerStaffId').isInt().withMessage('Caller Staff ID must be an integer'),
    body('fromNumber').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid from number format'),
    body('toNumber').matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid to number format'),
    body('casefileId').optional().isInt().withMessage('Casefile ID must be an integer'),
    body('clientId').optional().isInt().withMessage('Client ID must be an integer'),
    body('options').optional().isObject().withMessage('Options must be an object'),
    body('options.record').optional().isBoolean().withMessage('Record option must be boolean'),
    body('options.codec').optional().isString().withMessage('Codec must be a string'),
    body('options.timeout').optional().isInt({ min: 10, max: 300 }).withMessage('Timeout must be between 10-300 seconds')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { callerStaffId, fromNumber, toNumber, casefileId, clientId, options = {} } = req.body;

      // Check if user is authorized to make calls for this staff member
      if (req.user.staffId !== callerStaffId && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to make calls for this staff member'
        });
      }

      // Generate call UUID
      const callUuid = uuidv4();

      // Create call log
      const callLog = await callLogService.createCallLog({
        callUuid,
        casefileId,
        staffId: callerStaffId,
        clientId,
        fromNumber,
        toNumber,
        direction: 'outbound',
        meta: {
          initiated_by: req.user.id,
          options
        }
      });

      // Queue the call origination
      const job = await queueService.originateCallJob({
        callUuid,
        staffId: callerStaffId,
        fromNumber,
        toNumber,
        casefileId,
        clientId,
        options
      });

      // Create initial event
      await callLogService.createCallEvent(callUuid, 'initiated', {
        initiated_by: req.user.id,
        job_id: job.id
      });

      logger.info('Call initiated:', {
        callUuid,
        staffId: callerStaffId,
        fromNumber,
        toNumber,
        userId: req.user.id
      });

      res.json({
        success: true,
        callId: callLog.id,
        callUuid: callUuid,
        status: 'initiated',
        message: 'Call has been queued for processing'
      });

    } catch (error) {
      logger.error('Call initiation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate call',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/telephony/transfer - Transfer an active call
router.post('/transfer',
  authMiddleware.requireAuth,
  [
    body('callId').isInt().withMessage('Call ID must be an integer'),
    body('targetExt').matches(/^[0-9]+$/).withMessage('Target extension must be numeric')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { callId, targetExt } = req.body;

      // Get call details
      const callLog = await callLogService.getCallById(callId);
      if (!callLog) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }

      // Check authorization
      if (callLog.staff_id !== req.user.staffId && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to transfer this call'
        });
      }

      // Queue transfer job
      const job = await queueService.transferCallJob(callLog.call_uuid, targetExt);

      res.json({
        success: true,
        message: 'Call transfer has been queued',
        jobId: job.id
      });

    } catch (error) {
      logger.error('Call transfer failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to transfer call',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/telephony/hangup - Hangup call
router.post('/hangup',
  authMiddleware.requireAuth,
  [
    body('callId').isInt().withMessage('Call ID must be an integer')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { callId } = req.body;

      // Get call details
      const callLog = await callLogService.getCallById(callId);
      if (!callLog) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }

      // Check authorization
      if (callLog.staff_id !== req.user.staffId && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to hangup this call'
        });
      }

      // Queue hangup job
      const job = await queueService.hangupCallJob(callLog.call_uuid);

      res.json({
        success: true,
        message: 'Call hangup has been queued',
        jobId: job.id
      });

    } catch (error) {
      logger.error('Call hangup failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to hangup call',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/telephony/calls - List calls with pagination
router.get('/calls',
  authMiddleware.requireAuth,
  [
    query('casefileId').optional().isInt().withMessage('Casefile ID must be an integer'),
    query('staffId').optional().isInt().withMessage('Staff ID must be an integer'),
    query('clientId').optional().isInt().withMessage('Client ID must be an integer'),
    query('direction').optional().isIn(['inbound', 'outbound']).withMessage('Direction must be inbound or outbound'),
    query('status').optional().isString().withMessage('Status must be a string'),
    query('dateFrom').optional().isISO8601().withMessage('Date from must be valid ISO date'),
    query('dateTo').optional().isISO8601().withMessage('Date to must be valid ISO date'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
    query('sortBy').optional().isIn(['created_at', 'started_at', 'duration_seconds']).withMessage('Invalid sort field'),
    query('sortOrder').optional().isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const filters = {
        casefileId: req.query.casefileId ? parseInt(req.query.casefileId) : undefined,
        staffId: req.query.staffId ? parseInt(req.query.staffId) : undefined,
        clientId: req.query.clientId ? parseInt(req.query.clientId) : undefined,
        direction: req.query.direction,
        status: req.query.status,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      // Apply user-level filtering for non-admin users
      if (!req.user.isAdmin) {
        filters.staffId = req.user.staffId;
      }

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const result = await callLogService.getCallLogs(filters, pagination);

      res.json({
        success: true,
        data: result.calls,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Failed to get calls:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve calls',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/telephony/calls/:callId - Get call details
router.get('/calls/:callId',
  authMiddleware.requireAuth,
  [
    param('callId').isInt().withMessage('Call ID must be an integer')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);

      const callLog = await callLogService.getCallById(callId);
      if (!callLog) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }

      // Check authorization
      if (!req.user.isAdmin && callLog.staff_id !== req.user.staffId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this call'
        });
      }

      res.json({
        success: true,
        data: callLog
      });

    } catch (error) {
      logger.error('Failed to get call details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve call details',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/telephony/calls/:callId/events - Get call events timeline
router.get('/calls/:callId/events',
  authMiddleware.requireAuth,
  [
    param('callId').isInt().withMessage('Call ID must be an integer')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const callId = parseInt(req.params.callId);

      const callLog = await callLogService.getCallById(callId);
      if (!callLog) {
        return res.status(404).json({
          success: false,
          message: 'Call not found'
        });
      }

      // Check authorization
      if (!req.user.isAdmin && callLog.staff_id !== req.user.staffId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this call'
        });
      }

      const events = await callLogService.getCallEvents(callLog.call_uuid);

      res.json({
        success: true,
        data: events
      });

    } catch (error) {
      logger.error('Failed to get call events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve call events',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// POST /api/telephony/recording-webhook - Recording webhook
router.post('/recording-webhook',
  [
    body('call_uuid').isUUID().withMessage('Call UUID must be valid'),
    body('recording_url').isURL().withMessage('Recording URL must be valid'),
    body('recording_duration').optional().isInt().withMessage('Recording duration must be an integer')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const { call_uuid, recording_url, recording_duration } = req.body;

      // Update call log with recording URL
      await callLogService.updateCallLog(call_uuid, {
        recording_url: recording_url
      });

      // Create recording event
      await callLogService.createCallEvent(call_uuid, 'recording_webhook', {
        recording_url,
        recording_duration
      });

      // Notify real-time subscribers
      realtimeNotifier.broadcastCallEvent('recording_ready', {
        call_uuid,
        recording_url,
        recording_duration
      });

      logger.info('Recording webhook processed:', { call_uuid, recording_url });

      res.json({
        success: true,
        message: 'Recording webhook processed'
      });

    } catch (error) {
      logger.error('Recording webhook failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process recording webhook',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/telephony/stats - Get telephony statistics
router.get('/stats',
  authMiddleware.requireAuth,
  [
    query('staffId').optional().isInt().withMessage('Staff ID must be an integer'),
    query('dateFrom').optional().isISO8601().withMessage('Date from must be valid ISO date'),
    query('dateTo').optional().isISO8601().withMessage('Date to must be valid ISO date')
  ],
  validateErrors,
  async (req, res) => {
    try {
      const filters = {
        staffId: req.query.staffId ? parseInt(req.query.staffId) : undefined,
        dateFrom: req.query.dateFrom,
        dateTo: req.query.dateTo
      };

      // Apply user-level filtering for non-admin users
      if (!req.user.isAdmin) {
        filters.staffId = req.user.staffId;
      }

      const callStats = await callLogService.getCallStats(filters);
      const queueStats = await queueService.getQueueStats();
      const recordingStats = await recordingsService.getRecordingStats();

      res.json({
        success: true,
        data: {
          calls: callStats,
          queues: queueStats,
          recordings: recordingStats,
          realtime: {
            connected_users: realtimeNotifier.getConnectedUsers().length
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// GET /api/telephony/recording/:filePath - Serve recording files (local storage)
router.get('/recording/:filePath(*)',
  authMiddleware.requireAuth,
  async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const { expires, signature } = req.query;

      // Verify signed URL
      const isValid = await recordingsService.verifySignedUrl(filePath, expires, signature);
      if (!isValid) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired recording access URL'
        });
      }

      // Get recording file
      const fullPath = await recordingsService.getRecording(filePath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      
      // Stream file
      const fs = require('fs');
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);

    } catch (error) {
      logger.error('Failed to serve recording:', error);
      
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          message: 'Recording not found'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to serve recording',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;