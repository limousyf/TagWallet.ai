import { createApp, initializeDatabase } from './app';
import { config } from './config';

const start = async () => {
  try {
    console.log('Starting Wallet Tags Service...');

    await initializeDatabase();
    console.log('Database initialized');

    const app = await createApp();

    await app.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    console.log(`Server listening on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Frontend URL: ${config.app.frontendUrl}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

start();