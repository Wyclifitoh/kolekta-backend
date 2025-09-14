const logger = require('../utils/logger');

class RealtimeNotifier {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(io) {
    this.io = io;
    this.setupSocketHandlers();
    logger.info('Real-time notifier initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('User connected:', socket.userId);
      
      // Store user connection
      this.connectedUsers.set(socket.userId, {
        socketId: socket.id,
        socket: socket,
        staffId: socket.staffId,
        connectedAt: new Date()
      });

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);
      
      // Join staff room for staff users
      if (socket.staffId) {
        socket.join(`staff_${socket.staffId}`);
      }

      // Handle subscription to specific casefiles
      socket.on('subscribe_casefile', (casefileId) => {
        socket.join(`casefile_${casefileId}`);
        logger.info(`User ${socket.userId} subscribed to casefile ${casefileId}`);
      });

      socket.on('unsubscribe_casefile', (casefileId) => {
        socket.leave(`casefile_${casefileId}`);
        logger.info(`User ${socket.userId} unsubscribed from casefile ${casefileId}`);
      });

      socket.on('disconnect', () => {
        logger.info('User disconnected:', socket.userId);
        this.connectedUsers.delete(socket.userId);
      });

      // Send initial connection success
      socket.emit('connected', {
        message: 'Connected to telephony events',
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });
  }

  broadcastCallEvent(eventType, data) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    try {
      const event = {
        type: eventType,
        data: data,
        timestamp: new Date().toISOString()
      };

      logger.info('Broadcasting call event:', { eventType, callUuid: data.call_uuid });

      // Broadcast to all connected clients
      this.io.emit('call_event', event);

      // Send to specific user if staff_id is provided
      if (data.staff_id) {
        this.io.to(`staff_${data.staff_id}`).emit('call_event', event);
      }

      // Send to casefile subscribers if casefile_id is provided
      if (data.casefile_id) {
        this.io.to(`casefile_${data.casefile_id}`).emit('call_event', event);
      }

    } catch (error) {
      logger.error('Failed to broadcast call event:', error);
    }
  }

  notifyUser(userId, eventType, data) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    try {
      const event = {
        type: eventType,
        data: data,
        timestamp: new Date().toISOString()
      };

      this.io.to(`user_${userId}`).emit('user_notification', event);
      logger.info('User notification sent:', { userId, eventType });

    } catch (error) {
      logger.error('Failed to notify user:', error);
    }
  }

  notifyStaff(staffId, eventType, data) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    try {
      const event = {
        type: eventType,
        data: data,
        timestamp: new Date().toISOString()
      };

      this.io.to(`staff_${staffId}`).emit('staff_notification', event);
      logger.info('Staff notification sent:', { staffId, eventType });

    } catch (error) {
      logger.error('Failed to notify staff:', error);
    }
  }

  broadcastIncomingCall(callData) {
    this.broadcastCallEvent('incoming_call', {
      call_uuid: callData.callUuid,
      from_number: callData.fromNumber,
      to_number: callData.toNumber,
      staff_id: callData.staffId,
      casefile_id: callData.casefileId
    });
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values()).map(user => ({
      userId: user.socket.userId,
      staffId: user.staffId,
      socketId: user.socketId,
      connectedAt: user.connectedAt
    }));
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  disconnectUser(userId) {
    const user = this.connectedUsers.get(userId);
    if (user) {
      user.socket.disconnect();
      this.connectedUsers.delete(userId);
      logger.info('User forcibly disconnected:', userId);
    }
  }
}

const realtimeNotifier = new RealtimeNotifier();
module.exports = realtimeNotifier;