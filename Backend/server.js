const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const config = require('./config/config');
const authRoutes = require('./routes/authRoutes');
const paperRoutes = require('./routes/papers');
const statsRoutes = require('./routes/statsRoutes');
const specialSessionRoutes = require('./routes/specialSessions');
const notificationRoutes = require('./routes/notificationRoutes');
const emailRoutes = require('./routes/emailRoutes');
const { connectWithRetry } = require('./config/db');

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Configure CORS with specific options
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://192.168.29.29:3000',
      'https://conferencemanagement123.netlify.app',
      'https://confpict.netlify.app',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Not allowed by CORS:', origin);
      // In development, allow all origins for easier testing
      if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  exposedHeaders: ['Set-Cookie', 'Authorization'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/special-sessions', specialSessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailRoutes);

// Health check route with enhanced information
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: config.env,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path
  });
});

// Error handling middleware with better error responses
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: config.env === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle specific types of errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: config.env === 'development' ? err.message : 'Something went wrong!',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

if (config.env === 'development') {
  console.log('Email configuration:', {
    user: config.email.user,
    configured: Boolean(config.email.user && config.email.pass)
  });
}

// Start server
const PORT = config.port;
let server;

async function startServer() {
  try {
    server = app.listen(PORT,'0.0.0.0', () => {
      console.log(`Server is running on port ${PORT} (${config.env} environment)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('Shutting down gracefully...');
  
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('HTTP server closed');
    }
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err);
    process.exit(1);
  }
}

// Handle various shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown();
});

async function main() {
  try {
    await connectWithRetry();
startServer(); 
  } catch (err) {
    console.error('Failed to connect to MongoDB or create admin:', err);
    process.exit(1);
  }
}

main(); 