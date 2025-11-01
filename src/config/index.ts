import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'wallet_tags',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  googleCloud: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
    storageBucket: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || '',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  },

  googleWallet: {
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || '',
    serviceAccountEmail: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL || '',
  },

  appleWallet: {
    teamId: process.env.APPLE_WALLET_TEAM_ID || '',
    passTypeId: process.env.APPLE_WALLET_PASS_TYPE_ID || '',
    keyId: process.env.APPLE_WALLET_KEY_ID || '',
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  },
};