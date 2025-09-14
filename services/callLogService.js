const database = require('../database/connection');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class CallLogService {
  async createCallLog(callData) {
    try {
      const {
        callUuid = uuidv4(),
        casefileId,
        staffId,
        clientId,
        fromNumber,
        toNumber,
        direction,
        meta = {}
      } = callData;

      const sql = `
        INSERT INTO call_logs 
        (call_uuid, casefile_id, staff_id, client_id, from_number, to_number, direction, status, meta)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'initiated', ?)
      `;

      const params = [
        callUuid,
        casefileId || null,
        staffId || null,
        clientId || null,
        fromNumber,
        toNumber,
        direction,
        JSON.stringify(meta)
      ];

      const result = await database.query(sql, params);
      
      logger.info('Call log created:', { callUuid, id: result.insertId });
      
      return {
        id: result.insertId,
        callUuid,
        ...callData
      };

    } catch (error) {
      logger.error('Failed to create call log:', error);
      throw error;
    }
  }

  async updateCallLog(callUuid, updateData) {
    try {
      const allowedFields = [
        'started_at', 'answered_at', 'ended_at', 'duration_seconds',
        'status', 'recording_url', 'asterisk_channel', 'meta'
      ];

      const updates = [];
      const params = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          
          // Handle JSON fields
          if (key === 'meta' && typeof updateData[key] === 'object') {
            params.push(JSON.stringify(updateData[key]));
          } else {
            params.push(updateData[key]);
          }
        }
      });

      if (updates.length === 0) {
        return null;
      }

      // Calculate duration if we have both answered_at and ended_at
      if (updateData.ended_at && updateData.answered_at) {
        const duration = Math.floor(
          (new Date(updateData.ended_at) - new Date(updateData.answered_at)) / 1000
        );
        updates.push('duration_seconds = ?');
        params.push(duration);
      }

      updates.push('updated_at = NOW()');
      params.push(callUuid);

      const sql = `UPDATE call_logs SET ${updates.join(', ')} WHERE call_uuid = ?`;
      
      const result = await database.query(sql, params);
      
      logger.info('Call log updated:', { callUuid, affectedRows: result.affectedRows });
      
      return result.affectedRows > 0;

    } catch (error) {
      logger.error('Failed to update call log:', error);
      throw error;
    }
  }

  async getCallLog(callUuid) {
    try {
      const sql = `
        SELECT * FROM call_logs 
        WHERE call_uuid = ?
      `;

      const result = await database.query(sql, [callUuid]);
      
      if (result.length === 0) {
        return null;
      }

      const callLog = result[0];
      
      // Parse JSON fields
      if (callLog.meta) {
        try {
          callLog.meta = JSON.parse(callLog.meta);
        } catch (e) {
          callLog.meta = {};
        }
      }

      return callLog;

    } catch (error) {
      logger.error('Failed to get call log:', error);
      throw error;
    }
  }

  async getCallById(id) {
    try {
      const sql = `
        SELECT * FROM call_logs 
        WHERE id = ?
      `;

      const result = await database.query(sql, [id]);
      
      if (result.length === 0) {
        return null;
      }

      const callLog = result[0];
      
      // Parse JSON fields
      if (callLog.meta) {
        try {
          callLog.meta = JSON.parse(callLog.meta);
        } catch (e) {
          callLog.meta = {};
        }
      }

      return callLog;

    } catch (error) {
      logger.error('Failed to get call by ID:', error);
      throw error;
    }
  }

  async getCallLogs(filters = {}, pagination = {}) {
    try {
      const {
        casefileId,
        staffId,
        clientId,
        direction,
        status,
        dateFrom,
        dateTo
      } = filters;

      const {
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = pagination;

      const conditions = [];
      const params = [];

      if (casefileId) {
        conditions.push('casefile_id = ?');
        params.push(casefileId);
      }

      if (staffId) {
        conditions.push('staff_id = ?');
        params.push(staffId);
      }

      if (clientId) {
        conditions.push('client_id = ?');
        params.push(clientId);
      }

      if (direction) {
        conditions.push('direction = ?');
        params.push(direction);
      }

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      if (dateFrom) {
        conditions.push('created_at >= ?');
        params.push(dateFrom);
      }

      if (dateTo) {
        conditions.push('created_at <= ?');
        params.push(dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get total count
      const countSql = `SELECT COUNT(*) as total FROM call_logs ${whereClause}`;
      const countResult = await database.query(countSql, params);
      const total = countResult[0].total;

      // Get paginated results
      const offset = (page - 1) * limit;
      const dataSql = `
        SELECT * FROM call_logs 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const dataResult = await database.query(dataSql, [...params, limit, offset]);

      // Parse JSON fields
      const calls = dataResult.map(call => {
        if (call.meta) {
          try {
            call.meta = JSON.parse(call.meta);
          } catch (e) {
            call.meta = {};
          }
        }
        return call;
      });

      return {
        calls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Failed to get call logs:', error);
      throw error;
    }
  }

  async createCallEvent(callUuid, eventType, eventData = {}) {
    try {
      // First get the call ID
      const callLog = await this.getCallLog(callUuid);
      if (!callLog) {
        throw new Error(`Call not found: ${callUuid}`);
      }

      const sql = `
        INSERT INTO call_events 
        (call_id, event_type, event_data)
        VALUES (?, ?, ?)
      `;

      const params = [
        callLog.id,
        eventType,
        JSON.stringify(eventData)
      ];

      const result = await database.query(sql, params);
      
      logger.info('Call event created:', { 
        callUuid, 
        eventType, 
        eventId: result.insertId 
      });
      
      return {
        id: result.insertId,
        call_id: callLog.id,
        event_type: eventType,
        event_data: eventData
      };

    } catch (error) {
      logger.error('Failed to create call event:', error);
      throw error;
    }
  }

  async getCallEvents(callUuid) {
    try {
      const callLog = await this.getCallLog(callUuid);
      if (!callLog) {
        return [];
      }

      const sql = `
        SELECT * FROM call_events 
        WHERE call_id = ?
        ORDER BY occurred_at ASC
      `;

      const result = await database.query(sql, [callLog.id]);

      // Parse JSON fields
      const events = result.map(event => {
        if (event.event_data) {
          try {
            event.event_data = JSON.parse(event.event_data);
          } catch (e) {
            event.event_data = {};
          }
        }
        return event;
      });

      return events;

    } catch (error) {
      logger.error('Failed to get call events:', error);
      throw error;
    }
  }

  async createCasefileInteraction(callLog) {
    try {
      if (!callLog.casefile_id || !callLog.staff_id) {
        return null; // No casefile or staff associated
      }

      const duration = callLog.duration_seconds 
        ? `${Math.floor(callLog.duration_seconds / 60)}m ${callLog.duration_seconds % 60}s`
        : 'N/A';

      const title = `${callLog.direction === 'outbound' ? 'Outbound' : 'Inbound'} call to ${callLog.to_number}`;
      
      const notes = [
        `Call ${callLog.status}`,
        `Duration: ${duration}`,
        callLog.recording_url ? `Recording: ${callLog.recording_url}` : 'No recording'
      ].join(' | ');

      const sql = `
        INSERT INTO casefile_interactions 
        (casefile_id, staff_id, interaction_type, title, notes, meta)
        VALUES (?, ?, 'call', ?, ?, ?)
      `;

      const meta = {
        call_uuid: callLog.call_uuid,
        call_id: callLog.id,
        direction: callLog.direction,
        duration_seconds: callLog.duration_seconds,
        recording_url: callLog.recording_url
      };

      const params = [
        callLog.casefile_id,
        callLog.staff_id,
        title,
        notes,
        JSON.stringify(meta)
      ];

      const result = await database.query(sql, params);
      
      logger.info('Casefile interaction created:', { 
        casefileId: callLog.casefile_id,
        interactionId: result.insertId 
      });

      return result.insertId;

    } catch (error) {
      logger.error('Failed to create casefile interaction:', error);
      throw error;
    }
  }

  async getCallStats(filters = {}) {
    try {
      const { staffId, dateFrom, dateTo } = filters;
      
      const conditions = [];
      const params = [];

      if (staffId) {
        conditions.push('staff_id = ?');
        params.push(staffId);
      }

      if (dateFrom) {
        conditions.push('created_at >= ?');
        params.push(dateFrom);
      }

      if (dateTo) {
        conditions.push('created_at <= ?');
        params.push(dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const sql = `
        SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'answered' THEN 1 END) as answered_calls,
          COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_calls,
          COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_calls,
          COUNT(CASE WHEN recording_url IS NOT NULL THEN 1 END) as recorded_calls,
          AVG(duration_seconds) as avg_duration,
          SUM(duration_seconds) as total_duration
        FROM call_logs 
        ${whereClause}
      `;

      const result = await database.query(sql, params);
      
      return result[0];

    } catch (error) {
      logger.error('Failed to get call stats:', error);
      throw error;
    }
  }
}

const callLogService = new CallLogService();
module.exports = callLogService;