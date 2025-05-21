require('dotenv').config(); // Load environment variables from .env file

const config = {
  // Database configuration
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/prediction-platform',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    }
  },
  
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
      credentials: true
    }
  },
  
  // Session configuration
  session: {
    secret: process.env.SESSION_SECRET || 'prediction-platform-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }
};

module.exports = config;