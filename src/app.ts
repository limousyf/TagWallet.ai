import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { config } from './config';
import { initializeDatabase } from './config/database';
import path from 'path';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import templateRoutes from './routes/templates';
import passRoutes from './routes/passes';
import adminRoutes from './routes/admin';

const createApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
  });

  await app.register(cors, {
    origin: [config.app.frontendUrl, 'http://localhost:3001'],
    credentials: true,
  });

  await app.register(jwt, {
    secret: config.jwt.secret,
  });

  await app.register(multipart);

  // Serve static files
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register API routes first
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(templateRoutes, { prefix: '/api/templates' });
  await app.register(passRoutes, { prefix: '/api/passes' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  // Serve the main app for any non-API routes (temporarily commented out)
  // app.get('/*', async (request, reply) => {
  //   if (request.url.startsWith('/api/')) {
  //     reply.code(404).send({ error: 'API endpoint not found' });
  //     return;
  //   }

  //   return reply.sendFile('index.html');
  // });

  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    if (error.validation) {
      reply.status(400).send({
        error: 'Validation error',
        details: error.validation,
      });
      return;
    }

    if (error.statusCode) {
      reply.status(error.statusCode).send({
        error: error.message,
      });
      return;
    }

    reply.status(500).send({
      error: config.nodeEnv === 'development' ? error.message : 'Internal server error',
    });
  });

  return app;
};

export { createApp, initializeDatabase };