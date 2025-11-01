import { FastifyInstance } from 'fastify';
import { AdminController } from '../controllers/AdminController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/users',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.getUsers
  );

  fastify.get(
    '/templates',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.getAllTemplates
  );

  fastify.get(
    '/passes',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.getAllPasses
  );

  fastify.get(
    '/stats',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.getGlobalStats
  );

  fastify.delete(
    '/users/:id',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.deleteUser
  );

  fastify.delete(
    '/templates/:id',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.deleteTemplate
  );

  fastify.delete(
    '/passes/:id',
    {
      preHandler: [authenticateToken, requireAdmin],
    },
    AdminController.deletePass
  );
}