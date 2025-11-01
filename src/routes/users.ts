import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/UserController';
import { authenticateToken } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';

export default async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/profile',
    {
      preHandler: [authenticateToken],
    },
    UserController.getProfile
  );

  fastify.put(
    '/profile',
    {
      preHandler: [authenticateToken, validate(schemas.updateProfile)],
    },
    UserController.updateProfile
  );
}