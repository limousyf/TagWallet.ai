import { FastifyInstance } from 'fastify';
import { PassController } from '../controllers/PassController';
import { authenticateToken } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';

export default async function passRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [authenticateToken, validate(schemas.createPass)],
    },
    PassController.createPass
  );

  fastify.get(
    '/',
    {
      preHandler: [authenticateToken],
    },
    PassController.getUserPasses
  );

  fastify.get(
    '/stats',
    {
      preHandler: [authenticateToken],
    },
    PassController.getPassStats
  );

  fastify.get(
    '/:id',
    {
      preHandler: [authenticateToken],
    },
    PassController.getPass
  );

  fastify.get(
    '/:serialNumber/:walletType',
    PassController.getPassBySerial
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [authenticateToken],
    },
    PassController.deletePass
  );
}