const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');

class RecordingsService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local';
    this.s3Client = null;
    
    if (this.storageType === 's3') {
      this.initializeS3();
    }
  }

  initializeS3() {
    try {
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      this.s3Client = new AWS.S3();
      logger.info('S3 client initialized');
    } catch (error) {
      logger.error('Failed to initialize S3 client:', error);
      throw error;
    }
  }

  async processRecording(recordingData) {
    try {
      const { callUuid, recordingName, recordingPath } = recordingData;
      
      logger.info('Processing recording:', { callUuid, recordingName });

      let recordingUrl;

      if (this.storageType === 's3') {
        recordingUrl = await this.uploadToS3(recordingData);
      } else {
        recordingUrl = await this.processLocalRecording(recordingData);
      }

      // Update call log with recording URL
      const callLogService = require('./callLogService');
      await callLogService.updateCallLog(callUuid, {
        recording_url: recordingUrl
      });

      // Create casefile interaction if applicable
      const callLog = await callLogService.getCallLog(callUuid);
      if (callLog && callLog.casefile_id) {
        await callLogService.createCasefileInteraction(callLog);
      }

      return { success: true, recordingUrl };

    } catch (error) {
      logger.error('Recording processing failed:', error);
      throw error;
    }
  }

  async uploadToS3(recordingData) {
    try {
      const { callUuid, recordingName, recordingPath } = recordingData;
      const bucket = process.env.S3_BUCKET;
      
      if (!bucket) {
        throw new Error('S3_BUCKET environment variable not set');
      }

      // Read file
      const fileBuffer = await fs.readFile(recordingPath);
      
      // Generate S3 key
      const s3Key = `recordings/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${callUuid}/${recordingName}`;

      // Upload parameters
      const uploadParams = {
        Bucket: bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'audio/wav',
        Metadata: {
          'call-uuid': callUuid,
          'uploaded-at': new Date().toISOString()
        }
      };

      const result = await this.s3Client.upload(uploadParams).promise();
      
      // Delete local file after successful upload
      try {
        await fs.unlink(recordingPath);
        logger.info('Local recording file deleted:', recordingPath);
      } catch (unlinkError) {
        logger.warn('Failed to delete local recording file:', unlinkError);
      }

      logger.info('Recording uploaded to S3:', result.Location);
      return result.Location;

    } catch (error) {
      logger.error('S3 upload failed:', error);
      throw error;
    }
  }

  async processLocalRecording(recordingData) {
    try {
      const { callUuid, recordingName, recordingPath } = recordingData;
      
      // Create directory structure
      const recordingsDir = process.env.LOCAL_RECORDINGS_PATH || '/var/recordings';
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      const targetDir = path.join(recordingsDir, year.toString(), month, callUuid);
      await fs.mkdir(targetDir, { recursive: true });

      // Move file to organized location
      const targetPath = path.join(targetDir, recordingName);
      await fs.rename(recordingPath, targetPath);

      // Generate access URL (signed URL for security)
      const recordingUrl = await this.generateSignedUrl(targetPath);
      
      logger.info('Recording processed locally:', targetPath);
      return recordingUrl;

    } catch (error) {
      logger.error('Local recording processing failed:', error);
      throw error;
    }
  }

  async generateSignedUrl(filePath, expirationHours = 24) {
    try {
      // Generate a signed URL for secure access to local files
      const expiration = Date.now() + (expirationHours * 60 * 60 * 1000);
      const relativePath = path.relative(process.env.LOCAL_RECORDINGS_PATH || '/var/recordings', filePath);
      
      // Create signature
      const secret = process.env.JWT_SECRET;
      const payload = `${relativePath}:${expiration}`;
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      const baseUrl = process.env.BASE_URL || 'http://localhost:4000';
      return `${baseUrl}/api/telephony/recording/${encodeURIComponent(relativePath)}?expires=${expiration}&signature=${signature}`;

    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  async verifySignedUrl(filePath, expires, signature) {
    try {
      // Check expiration
      if (Date.now() > parseInt(expires)) {
        return false;
      }

      // Verify signature
      const secret = process.env.JWT_SECRET;
      const payload = `${filePath}:${expires}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      return signature === expectedSignature;

    } catch (error) {
      logger.error('Signed URL verification failed:', error);
      return false;
    }
  }

  async getRecording(filePath) {
    try {
      const fullPath = path.join(
        process.env.LOCAL_RECORDINGS_PATH || '/var/recordings',
        filePath
      );

      // Check if file exists
      await fs.access(fullPath);
      
      return fullPath;

    } catch (error) {
      logger.error('Failed to get recording:', error);
      throw error;
    }
  }

  async deleteRecording(callUuid) {
    try {
      if (this.storageType === 's3') {
        await this.deleteFromS3(callUuid);
      } else {
        await this.deleteLocalRecording(callUuid);
      }

      logger.info('Recording deleted:', callUuid);

    } catch (error) {
      logger.error('Failed to delete recording:', error);
      throw error;
    }
  }

  async deleteFromS3(callUuid) {
    try {
      const bucket = process.env.S3_BUCKET;
      const prefix = `recordings/${callUuid}/`;

      // List objects with the call UUID prefix
      const listParams = {
        Bucket: bucket,
        Prefix: prefix
      };

      const listedObjects = await this.s3Client.listObjectsV2(listParams).promise();

      if (listedObjects.Contents.length === 0) {
        logger.info('No recordings found to delete for call:', callUuid);
        return;
      }

      // Delete all objects
      const deleteParams = {
        Bucket: bucket,
        Delete: {
          Objects: listedObjects.Contents.map(({ Key }) => ({ Key }))
        }
      };

      await this.s3Client.deleteObjects(deleteParams).promise();
      logger.info('S3 recordings deleted for call:', callUuid);

    } catch (error) {
      logger.error('S3 deletion failed:', error);
      throw error;
    }
  }

  async deleteLocalRecording(callUuid) {
    try {
      const recordingsDir = process.env.LOCAL_RECORDINGS_PATH || '/var/recordings';
      const searchPath = path.join(recordingsDir, '**', callUuid);
      
      // Find and delete directories containing the call UUID
      const glob = require('glob');
      const dirs = glob.sync(searchPath, { onlyDirectories: true });
      
      for (const dir of dirs) {
        await fs.rmdir(dir, { recursive: true });
        logger.info('Local recording directory deleted:', dir);
      }

    } catch (error) {
      logger.error('Local recording deletion failed:', error);
      throw error;
    }
  }

  async getRecordingStats() {
    try {
      if (this.storageType === 's3') {
        return await this.getS3Stats();
      } else {
        return await this.getLocalStats();
      }
    } catch (error) {
      logger.error('Failed to get recording stats:', error);
      throw error;
    }
  }

  async getS3Stats() {
    try {
      const bucket = process.env.S3_BUCKET;
      const listParams = {
        Bucket: bucket,
        Prefix: 'recordings/'
      };

      const objects = await this.s3Client.listObjectsV2(listParams).promise();
      
      const totalSize = objects.Contents.reduce((sum, obj) => sum + obj.Size, 0);
      const totalCount = objects.Contents.length;

      return {
        storage_type: 's3',
        total_recordings: totalCount,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / 1024 / 1024 * 100) / 100
      };

    } catch (error) {
      logger.error('Failed to get S3 stats:', error);
      throw error;
    }
  }

  async getLocalStats() {
    try {
      const recordingsDir = process.env.LOCAL_RECORDINGS_PATH || '/var/recordings';
      
      // Use a simple directory traversal to count files and sizes
      let totalSize = 0;
      let totalCount = 0;

      const glob = require('glob');
      const files = glob.sync(path.join(recordingsDir, '**', '*.{wav,mp3,ogg}'));
      
      for (const file of files) {
        const stats = await fs.stat(file);
        totalSize += stats.size;
        totalCount++;
      }

      return {
        storage_type: 'local',
        total_recordings: totalCount,
        total_size_bytes: totalSize,
        total_size_mb: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        storage_path: recordingsDir
      };

    } catch (error) {
      logger.error('Failed to get local stats:', error);
      throw error;
    }
  }
}

const recordingsService = new RecordingsService();
module.exports = recordingsService;