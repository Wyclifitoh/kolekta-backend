const ari = require('ari-client');
const AMI = require('asterisk-manager');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const callLogService = require('./callLogService');
const realtimeNotifier = require('./realtimeNotifier');

class AsteriskService {
  constructor() {
    this.ariClient = null;
    this.amiClient = null;
    this.activeChannels = new Map();
    this.activeBridges = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  async initialize() {
    try {
      await this.connectARI();
      await this.connectAMI();
      this.setupEventHandlers();
      logger.info('Asterisk service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Asterisk service:', error);
      throw error;
    }
  }

  async connectARI() {
    try {
      this.ariClient = await ari.connect(
        `http://${process.env.ASTERISK_ARI_HOST}:${process.env.ASTERISK_ARI_PORT}`,
        process.env.ASTERISK_ARI_USERNAME,
        process.env.ASTERISK_ARI_PASSWORD
      );

      this.ariClient.on('StasisStart', this.handleStasisStart.bind(this));
      this.ariClient.on('StasisEnd', this.handleStasisEnd.bind(this));
      this.ariClient.on('ChannelStateChange', this.handleChannelStateChange.bind(this));
      this.ariClient.on('ChannelDestroyed', this.handleChannelDestroyed.bind(this));
      this.ariClient.on('RecordingFinished', this.handleRecordingFinished.bind(this));

      this.ariClient.on('WebSocketError', this.handleConnectionError.bind(this));
      
      logger.info('ARI connection established');
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('ARI connection failed:', error);
      await this.scheduleReconnect();
      throw error;
    }
  }

  async connectAMI() {
    try {
      this.amiClient = new AMI(
        process.env.ASTERISK_AMI_PORT,
        process.env.ASTERISK_AMI_HOST,
        process.env.ASTERISK_AMI_USERNAME,
        process.env.ASTERISK_AMI_SECRET,
        true
      );

      this.amiClient.on('ami', (ami) => {
        logger.info('AMI connection established');
      });

      this.amiClient.on('error', (error) => {
        logger.error('AMI error:', error);
      });

    } catch (error) {
      logger.warn('AMI connection failed (optional):', error);
    }
  }

  setupEventHandlers() {
    // Additional event handlers can be added here
  }

  async originateCall(callData) {
    try {
      const { fromNumber, toNumber, callUuid, staffId, casefileId, options = {} } = callData;
      
      logger.info('Originating call:', { callUuid, fromNumber, toNumber });

      // Create outbound channel
      const channel = this.ariClient.Channel();
      const channelId = `${process.env.ASTERISK_ARI_APP_NAME}-${uuidv4()}`;

      const originateParams = {
        endpoint: `SIP/${fromNumber}`,
        app: process.env.ASTERISK_ARI_APP_NAME,
        appArgs: [callUuid, 'outbound'],
        channelId: channelId,
        callerId: fromNumber,
        timeout: options.timeout || 30,
        variables: {
          CALL_UUID: callUuid,
          STAFF_ID: staffId.toString(),
          CASEFILE_ID: casefileId ? casefileId.toString() : '',
          RECORD_CALL: options.record ? '1' : '0'
        }
      };

      const originatedChannel = await channel.originate(originateParams);

      // Store channel info
      this.activeChannels.set(channelId, {
        callUuid,
        channel: originatedChannel,
        fromNumber,
        toNumber,
        staffId,
        casefileId,
        options
      });

      // Update call log with channel info
      await callLogService.updateCallLog(callUuid, {
        asterisk_channel: channelId,
        status: 'ringing'
      });

      return { success: true, channelId, callUuid };

    } catch (error) {
      logger.error('Call origination failed:', error);
      throw error;
    }
  }

  async transferCall(callUuid, targetExtension) {
    try {
      const channelInfo = this.findChannelByCallUuid(callUuid);
      if (!channelInfo) {
        throw new Error('Call not found');
      }

      const { channel } = channelInfo;
      
      // Create transfer endpoint
      await channel.redirect({
        endpoint: `SIP/${targetExtension}`
      });

      // Log event
      await callLogService.createCallEvent(callUuid, 'transfer', {
        target_extension: targetExtension
      });

      // Notify real-time
      realtimeNotifier.broadcastCallEvent('call_transferred', {
        call_uuid: callUuid,
        target_extension: targetExtension
      });

      return { success: true };

    } catch (error) {
      logger.error('Call transfer failed:', error);
      throw error;
    }
  }

  async hangupCall(callUuid) {
    try {
      const channelInfo = this.findChannelByCallUuid(callUuid);
      if (!channelInfo) {
        throw new Error('Call not found');
      }

      const { channel } = channelInfo;
      await channel.hangup();

      return { success: true };

    } catch (error) {
      logger.error('Call hangup failed:', error);
      throw error;
    }
  }

  async startRecording(callUuid, options = {}) {
    try {
      const channelInfo = this.findChannelByCallUuid(callUuid);
      if (!channelInfo) {
        throw new Error('Call not found');
      }

      const { channel } = channelInfo;
      const recordingName = `${callUuid}-${Date.now()}`;

      const recording = await channel.record({
        name: recordingName,
        format: options.format || 'wav',
        maxDurationSeconds: options.maxDuration || 3600,
        maxSilenceSeconds: options.maxSilence || 5,
        ifExists: 'overwrite'
      });

      // Store recording info
      channelInfo.recording = recording;

      // Log event
      await callLogService.createCallEvent(callUuid, 'recording_started', {
        recording_name: recordingName
      });

      return { success: true, recordingName };

    } catch (error) {
      logger.error('Recording start failed:', error);
      throw error;
    }
  }

  // Event Handlers
  async handleStasisStart(event, channel) {
    try {
      const callUuid = event.args[0];
      const direction = event.args[1] || 'inbound';

      logger.info('Stasis start:', { callUuid, channelId: channel.id, direction });

      // Update call log
      await callLogService.updateCallLog(callUuid, {
        started_at: new Date(),
        status: 'in_progress',
        asterisk_channel: channel.id
      });

      // Create event
      await callLogService.createCallEvent(callUuid, 'call_started', {
        channel_id: channel.id,
        direction
      });

      // Notify real-time
      realtimeNotifier.broadcastCallEvent('call_started', {
        call_uuid: callUuid,
        channel_id: channel.id
      });

      // Auto-answer and continue for outbound calls
      if (direction === 'outbound') {
        await channel.answer();
        
        // Bridge to destination
        const channelInfo = this.findChannelByCallUuid(callUuid);
        if (channelInfo) {
          await this.bridgeToDestination(channel, channelInfo);
        }
      }

    } catch (error) {
      logger.error('Stasis start handler error:', error);
    }
  }

  async handleStasisEnd(event, channel) {
    try {
      logger.info('Stasis end:', { channelId: channel.id });

      // Find call by channel
      const channelInfo = this.findChannelByChannelId(channel.id);
      if (channelInfo) {
        const { callUuid } = channelInfo;
        
        // Update call log
        await callLogService.updateCallLog(callUuid, {
          ended_at: new Date(),
          status: 'completed'
        });

        // Create event
        await callLogService.createCallEvent(callUuid, 'call_ended', {
          channel_id: channel.id
        });

        // Notify real-time
        realtimeNotifier.broadcastCallEvent('call_ended', {
          call_uuid: callUuid,
          channel_id: channel.id
        });

        // Cleanup
        this.activeChannels.delete(channel.id);
      }

    } catch (error) {
      logger.error('Stasis end handler error:', error);
    }
  }

  async handleChannelStateChange(event, channel) {
    try {
      const channelInfo = this.findChannelByChannelId(channel.id);
      if (!channelInfo) return;

      const { callUuid } = channelInfo;

      logger.info('Channel state change:', { 
        callUuid, 
        channelId: channel.id, 
        state: channel.state 
      });

      let updateData = {};
      let eventType = null;

      switch (channel.state) {
        case 'Ringing':
          eventType = 'call_ringing';
          updateData.status = 'ringing';
          break;
        case 'Up':
          eventType = 'call_answered';
          updateData.status = 'answered';
          updateData.answered_at = new Date();
          break;
      }

      if (eventType) {
        // Update call log
        await callLogService.updateCallLog(callUuid, updateData);

        // Create event
        await callLogService.createCallEvent(callUuid, eventType.replace('call_', ''), {
          channel_state: channel.state
        });

        // Notify real-time
        realtimeNotifier.broadcastCallEvent(eventType, {
          call_uuid: callUuid,
          channel_id: channel.id,
          state: channel.state
        });
      }

    } catch (error) {
      logger.error('Channel state change handler error:', error);
    }
  }

  async handleChannelDestroyed(event, channel) {
    try {
      logger.info('Channel destroyed:', { channelId: channel.id });
      
      const channelInfo = this.findChannelByChannelId(channel.id);
      if (channelInfo) {
        this.activeChannels.delete(channel.id);
      }

    } catch (error) {
      logger.error('Channel destroyed handler error:', error);
    }
  }

  async handleRecordingFinished(event, recording) {
    try {
      logger.info('Recording finished:', { recordingName: recording.name });

      // Find call by recording name (contains call UUID)
      const callUuid = recording.name.split('-')[0];
      
      // Process recording (upload to storage, etc.)
      const recordingUrl = await this.processRecording(recording);

      // Update call log
      await callLogService.updateCallLog(callUuid, {
        recording_url: recordingUrl
      });

      // Create event
      await callLogService.createCallEvent(callUuid, 'recording_finished', {
        recording_name: recording.name,
        recording_url: recordingUrl
      });

      // Notify real-time
      realtimeNotifier.broadcastCallEvent('recording_ready', {
        call_uuid: callUuid,
        recording_url: recordingUrl
      });

    } catch (error) {
      logger.error('Recording finished handler error:', error);
    }
  }

  async bridgeToDestination(channel, channelInfo) {
    try {
      const { toNumber, callUuid, options } = channelInfo;

      // Create destination channel
      const destChannel = this.ariClient.Channel();
      const destChannelId = `${process.env.ASTERISK_ARI_APP_NAME}-dest-${uuidv4()}`;

      const destOriginateParams = {
        endpoint: `SIP/${toNumber}`,
        app: process.env.ASTERISK_ARI_APP_NAME,
        appArgs: [callUuid, 'destination'],
        channelId: destChannelId,
        timeout: 30
      };

      const destinationChannel = await destChannel.originate(destOriginateParams);

      // Create bridge
      const bridge = this.ariClient.Bridge();
      const createdBridge = await bridge.create({
        type: 'mixing',
        name: `bridge-${callUuid}`
      });

      // Add channels to bridge
      await createdBridge.addChannel({ channel: [channel.id, destinationChannel.id] });

      // Store bridge info
      this.activeBridges.set(callUuid, {
        bridge: createdBridge,
        channels: [channel, destinationChannel]
      });

      // Start recording if requested
      if (options.record) {
        await this.startRecording(callUuid, options);
      }

    } catch (error) {
      logger.error('Bridge creation failed:', error);
      throw error;
    }
  }

  async processRecording(recording) {
    try {
      // Implementation depends on storage type (S3 vs local)
      const storageType = process.env.STORAGE_TYPE || 'local';
      
      if (storageType === 's3') {
        // Upload to S3 and return URL
        const recordingsService = require('./recordingsService');
        return await recordingsService.uploadToS3(recording);
      } else {
        // Return local file URL
        return `${process.env.BASE_URL}/recordings/${recording.name}.wav`;
      }

    } catch (error) {
      logger.error('Recording processing failed:', error);
      throw error;
    }
  }

  findChannelByCallUuid(callUuid) {
    for (const [channelId, channelInfo] of this.activeChannels) {
      if (channelInfo.callUuid === callUuid) {
        return channelInfo;
      }
    }
    return null;
  }

  findChannelByChannelId(channelId) {
    return this.activeChannels.get(channelId) || null;
  }

  async handleConnectionError(error) {
    logger.error('Asterisk connection error:', error);
    await this.scheduleReconnect();
  }

  async scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    logger.info(`Reconnecting to Asterisk in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connectARI();
      } catch (error) {
        logger.error('Reconnection failed:', error);
      }
    }, delay);
  }

  async disconnect() {
    try {
      if (this.ariClient) {
        this.ariClient.stop();
      }
      if (this.amiClient) {
        this.amiClient.disconnect();
      }
      logger.info('Asterisk service disconnected');
    } catch (error) {
      logger.error('Error disconnecting Asterisk service:', error);
    }
  }
}

const asteriskService = new AsteriskService();
module.exports = asteriskService;