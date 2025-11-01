import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/register',
    {
      preHandler: [validate(schemas.register)],
    },
    AuthController.register
  );

  fastify.post(
    '/login',
    {
      preHandler: [validate(schemas.login)],
    },
    AuthController.login
  );

  fastify.get(
    '/me',
    {
      preHandler: [authenticateToken],
    },
    AuthController.me
  );

  fastify.post(
    '/refresh',
    {
      preHandler: [authenticateToken],
    },
    AuthController.refreshToken
  );
}