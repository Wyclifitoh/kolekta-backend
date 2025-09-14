const Bull = require('bull');
const Redis = require('redis');
const logger = require('../utils/logger');
const asteriskService = require('./asteriskService');
const callLogService = require('./callLogService');

class QueueService {
  constructor() {
    this.redisClient = null;
    this.telephonyQueue = null;
    this.recordingQueue = null;
  }

  async initialize() {
    try {
      // Initialize Redis connection
      this.redisClient = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailure: 5000,
        maxRetriesPerRequest: 3
      });

      await this.redisClient.connect();
      
      // Initialize queues
      this.telephonyQueue = new Bull('telephony operations', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 25,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });

      this.recordingQueue = new Bull('recording operations', {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          password: process.env.REDIS_PASSWORD || undefined
        }
      });

      // Setup job processors
      this.setupJobProcessors();
      
      // Setup event listeners
      this.setupEventListeners();

      logger.info('Queue service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  setupJobProcessors() {
    // Telephony queue processors
    this.telephonyQueue.process('originate_call', 5, async (job) => {
      const { callData } = job.data;
      logger.info('Processing originate call job:', callData.callUuid);
      
      try {
        const result = await asteriskService.originateCall(callData);
        
        // Update job progress
        job.progress(100);
        
        return result;
      } catch (error) {
        logger.error('Originate call job failed:', error);
        throw error;
      }
    });

    this.telephonyQueue.process('transfer_call', 3, async (job) => {
      const { callUuid, targetExtension } = job.data;
      logger.info('Processing transfer call job:', { callUuid, targetExtension });
      
      try {
        const result = await asteriskService.transferCall(callUuid, targetExtension);
        job.progress(100);
        return result;
      } catch (error) {
        logger.error('Transfer call job failed:', error);
        throw error;
      }
    });

    this.telephonyQueue.process('hangup_call', 10, async (job) => {
      const { callUuid } = job.data;
      logger.info('Processing hangup call job:', callUuid);
      
      try {
        const result = await asteriskService.hangupCall(callUuid);
        job.progress(100);
        return result;
      } catch (error) {
        logger.error('Hangup call job failed:', error);
        throw error;
      }
    });

    // Recording queue processors
    this.recordingQueue.process('process_recording', 3, async (job) => {
      const { recordingData } = job.data;
      logger.info('Processing recording job:', recordingData.callUuid);
      
      try {
        const recordingsService = require('./recordingsService');
        const result = await recordingsService.processRecording(recordingData);
        
        job.progress(100);
        return result;
      } catch (error) {
        logger.error('Recording processing job failed:', error);
        throw error;
      }
    });
  }

  setupEventListeners() {
    // Telephony queue events
    this.telephonyQueue.on('completed', (job, result) => {
      logger.info('Telephony job completed:', { 
        jobId: job.id, 
        jobType: job.name,
        result: result
      });
    });

    this.telephonyQueue.on('failed', (job, error) => {
      logger.error('Telephony job failed:', {
        jobId: job.id,
        jobType: job.name,
        error: error.message
      });
    });

    this.telephonyQueue.on('stalled', (job) => {
      logger.warn('Telephony job stalled:', {
        jobId: job.id,
        jobType: job.name
      });
    });

    // Recording queue events
    this.recordingQueue.on('completed', (job, result) => {
      logger.info('Recording job completed:', {
        jobId: job.id,
        result: result
      });
    });

    this.recordingQueue.on('failed', (job, error) => {
      logger.error('Recording job failed:', {
        jobId: job.id,
        error: error.message
      });
    });
  }

  // Job creation methods
  async originateCallJob(callData, options = {}) {
    try {
      const job = await this.telephonyQueue.add('originate_call', {
        callData
      }, {
        delay: options.delay || 0,
        priority: options.priority || 0,
        jobId: `originate-${callData.callUuid}`
      });

      logger.info('Originate call job queued:', {
        jobId: job.id,
        callUuid: callData.callUuid
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue originate call job:', error);
      throw error;
    }
  }

  async transferCallJob(callUuid, targetExtension) {
    try {
      const job = await this.telephonyQueue.add('transfer_call', {
        callUuid,
        targetExtension
      }, {
        jobId: `transfer-${callUuid}-${Date.now()}`
      });

      logger.info('Transfer call job queued:', {
        jobId: job.id,
        callUuid
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue transfer call job:', error);
      throw error;
    }
  }

  async hangupCallJob(callUuid) {
    try {
      const job = await this.telephonyQueue.add('hangup_call', {
        callUuid
      }, {
        jobId: `hangup-${callUuid}`
      });

      logger.info('Hangup call job queued:', {
        jobId: job.id,
        callUuid
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue hangup call job:', error);
      throw error;
    }
  }

  async processRecordingJob(recordingData) {
    try {
      const job = await this.recordingQueue.add('process_recording', {
        recordingData
      });

      logger.info('Recording processing job queued:', {
        jobId: job.id,
        callUuid: recordingData.callUuid
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue recording processing job:', error);
      throw error;
    }
  }

  // Queue management methods
  async getQueueStats() {
    try {
      const telephonyStats = await this.telephonyQueue.getJobCounts();
      const recordingStats = await this.recordingQueue.getJobCounts();

      return {
        telephony: telephonyStats,
        recording: recordingStats
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async getActiveJobs() {
    try {
      const telephonyActive = await this.telephonyQueue.getActive();
      const recordingActive = await this.recordingQueue.getActive();

      return {
        telephony: telephonyActive.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress(),
          processedOn: job.processedOn
        })),
        recording: recordingActive.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress(),
          processedOn: job.processedOn
        }))
      };
    } catch (error) {
      logger.error('Failed to get active jobs:', error);
      throw error;
    }
  }

  async cleanOldJobs(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    try {
      await this.telephonyQueue.clean(maxAge, 'completed');
      await this.telephonyQueue.clean(maxAge, 'failed');
      await this.recordingQueue.clean(maxAge, 'completed');
      await this.recordingQueue.clean(maxAge, 'failed');

      logger.info('Old jobs cleaned');
    } catch (error) {
      logger.error('Failed to clean old jobs:', error);
    }
  }

  async close() {
    try {
      if (this.telephonyQueue) {
        await this.telephonyQueue.close();
      }
      if (this.recordingQueue) {
        await this.recordingQueue.close();
      }
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      logger.info('Queue service closed');
    } catch (error) {
      logger.error('Error closing queue service:', error);
    }
  }
}

const queueService = new QueueService();
module.exports = queueService;