import { FastifyRequest, FastifyReply } from 'fastify';
import { PassTemplateModel } from '../models/PassTemplate';
import { CreateTemplateRequest } from '../types';

export class TemplateController {
  static async createTemplate(
    request: FastifyRequest<{ Body: CreateTemplateRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const template = await PassTemplateModel.create(request.user.userId, request.body);

      reply.status(201).send({
        message: 'Template created successfully',
        template,
      });
    } catch (error) {
      request.log.error('Error in createTemplate:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getUserTemplates(
    request: FastifyRequest<{
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(request.query.limit || '20');
      const offset = parseInt(request.query.offset || '0');

      const result = await PassTemplateModel.findByUserId(
        request.user.userId,
        limit,
        offset
      );

      reply.send({
        templates: result.templates,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      request.log.error('Error in getUserTemplates:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const template = await PassTemplateModel.findById(request.params.id);
      if (!template) {
        reply.status(404).send({ error: 'Template not found' });
        return;
      }

      if (template.userId !== request.user.userId && !request.user.isAdmin) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      reply.send({ template });
    } catch (error) {
      request.log.error('Error in getTemplate:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async updateTemplate(
    request: FastifyRequest<{
      Params: { id: string };
      Body: Partial<CreateTemplateRequest>;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const template = await PassTemplateModel.findById(request.params.id);
      if (!template) {
        reply.status(404).send({ error: 'Template not found' });
        return;
      }

      if (template.userId !== request.user.userId) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const updatedTemplate = await PassTemplateModel.update(
        request.params.id,
        request.user.userId,
        request.body
      );

      if (!updatedTemplate) {
        reply.status(404).send({ error: 'Template not found' });
        return;
      }

      reply.send({
        message: 'Template updated successfully',
        template: updatedTemplate,
      });
    } catch (error) {
      request.log.error('Error in updateTemplate:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async deleteTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const template = await PassTemplateModel.findById(request.params.id);
      if (!template) {
        reply.status(404).send({ error: 'Template not found' });
        return;
      }

      if (template.userId !== request.user.userId && !request.user.isAdmin) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const deleted = await PassTemplateModel.deleteById(
        request.params.id,
        request.user.isAdmin ? undefined : request.user.userId
      );

      if (!deleted) {
        reply.status(404).send({ error: 'Template not found' });
        return;
      }

      reply.send({ message: 'Template deleted successfully' });
    } catch (error) {
      request.log.error('Error in deleteTemplate:', error);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }
}