// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'MAIL_USER', 'MAIL_PASS'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Environment variable ${envVar} is required but not set.`);
    process.exit(1);
  }
}

const config = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '30d'
  },
  email: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  cors: {
    origin: function(origin, callback) {
      const allowedOrigins = [
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
        callback(new Error('Not allowed by CORS'));
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
    exposedHeaders: [
      'Set-Cookie', 
      'Authorization'
    ],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  },
  port: parseInt(process.env.PORT || '5000', 10),
  env: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

module.exports = config; 
