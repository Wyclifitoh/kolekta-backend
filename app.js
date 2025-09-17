// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');

// Utilities & Middleware
const logger = require('./utils/logger');
const database = require('./database/connection');
const rateLimiter = require('./middlewares/rateLimiter');
const authMiddleware = require('./middlewares/auth');
const errorHandler = require('./middlewares/errorHandler');

// Services
const asteriskService = require('./services/asteriskService');
const realtimeNotifier = require('./services/realtimeNotifier');
const queueService = require('./services/queueService');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const appRoutes = require('./routes/appRoutes');
const caseFileRoutes = require('./routes/caseFileRoutes');
const telephonyRoutes = require('./routes/telephony');
const healthRoutes = require('./routes/health');

const PORT = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// -------------------
// Middleware
// -------------------
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS setup
app.use(
  cors({
    origin: [
      'https://smartcollect.hapmodproperties.co.ke',
      'https://kolekta.netlify.app',
      'http://localhost:5174',
      'http://localhost:5173'
    ],
    methods: 'GET,POST,PUT,DELETE',
    credentials: true
  })
);

// Logging
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  })
);

// Rate limiting
app.use('/api/telephony/call', rateLimiter.callRateLimit);
app.use('/api', rateLimiter.generalRateLimit);

// -------------------
// WebSocket
// -------------------
io.use(authMiddleware.socketAuth);
realtimeNotifier.initialize(io);

// -------------------
// Routes
// -------------------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/casefile', caseFileRoutes);
app.use('/api', appRoutes);
app.use('/api/telephony', telephonyRoutes);
app.use('/health', healthRoutes);

// Error handler
app.use(errorHandler);

// -------------------
// Start Server
// -------------------
async function startServer() {
  try {
    // Test DB connection
   // await database.testConnection();
    logger.info('Database connection established');

    // Initialize services
    await queueService.initialize();
    logger.info('Queue service initialized');

    await asteriskService.initialize();
    logger.info('Asterisk service initialized');

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await asteriskService.disconnect();
  await queueService.close();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();

module.exports = { app, server };
