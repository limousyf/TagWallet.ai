import { FastifyInstance } from 'fastify';
import { TemplateController } from '../controllers/TemplateController';
import { authenticateToken } from '../middleware/auth';
import { validate, schemas } from '../middleware/validation';

export default async function templateRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      preHandler: [authenticateToken, validate(schemas.createTemplate)],
    },
    TemplateController.createTemplate
  );

  fastify.get(
    '/',
    {
      preHandler: [authenticateToken],
    },
    TemplateController.getUserTemplates
  );

  fastify.get(
    '/:id',
    {
      preHandler: [authenticateToken],
    },
    TemplateController.getTemplate
  );

  fastify.put(
    '/:id',
    {
      preHandler: [authenticateToken],
    },
    TemplateController.updateTemplate
  );

  fastify.delete(
    '/:id',
    {
      preHandler: [authenticateToken],
    },
    TemplateController.deleteTemplate
  );
}