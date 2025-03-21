const config = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/conference-app'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '24h'
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  },
  port: process.env.PORT || 5000
};

module.exports = config; 