import { FastifyRequest, FastifyReply } from 'fastify';
import { UserModel } from '../models/User';
import { PassTemplateModel } from '../models/PassTemplate';
import { GeneratedPassModel } from '../models/GeneratedPass';

export class AdminController {
  static async getUsers(
    request: FastifyRequest<{
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const limit = parseInt(request.query.limit || '20');
      const offset = parseInt(request.query.offset || '0');

      const result = await UserModel.findAll(limit, offset);

      reply.send({
        users: result.users.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })),
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      request.log.error(`'Error in getUsers:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getAllTemplates(
    request: FastifyRequest<{
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const limit = parseInt(request.query.limit || '20');
      const offset = parseInt(request.query.offset || '0');

      const result = await PassTemplateModel.findAll(limit, offset);

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
      request.log.error(`'Error in getAllTemplates:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getAllPasses(
    request: FastifyRequest<{
      Querystring: {
        limit?: string;
        offset?: string;
        walletType?: 'apple' | 'google';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const limit = parseInt(request.query.limit || '20');
      const offset = parseInt(request.query.offset || '0');
      const walletType = request.query.walletType;

      const result = await GeneratedPassModel.findAll(limit, offset, walletType);

      reply.send({
        passes: result.passes,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + limit < result.total,
        },
      });
    } catch (error) {
      request.log.error(`'Error in getAllPasses:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getGlobalStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const [passStats, userCount, templateCount] = await Promise.all([
        GeneratedPassModel.getStats(),
        UserModel.findAll(1, 0).then(result => result.total),
        PassTemplateModel.findAll(1, 0).then(result => result.total),
      ]);

      reply.send({
        stats: {
          totalUsers: userCount,
          totalTemplates: templateCount,
          ...passStats,
        },
      });
    } catch (error) {
      request.log.error(`'Error in getGlobalStats:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async deleteUser(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (request.params.id === request.user?.userId) {
        reply.status(400).send({ error: 'Cannot delete your own account' });
        return;
      }

      const deleted = await UserModel.deleteById(request.params.id);
      if (!deleted) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }

      reply.send({ message: 'User deleted successfully' });
    } catch (error) {
      request.log.error(`'Error in deleteUser:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async deleteTemplate(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const deleted = await PassTemplateModel.deleteById(request.params.id);
      if (!deleted) {
        reply.status(404).send({ error: 'Template not found' });
        return;
      }

      reply.send({ message: 'Template deleted successfully' });
    } catch (error) {
      request.log.error(`'Error in deleteTemplate:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async deletePass(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const deleted = await GeneratedPassModel.deleteById(request.params.id);
      if (!deleted) {
        reply.status(404).send({ error: 'Pass not found' });
        return;
      }

      reply.send({ message: 'Pass deleted successfully' });
    } catch (error) {
      request.log.error(`'Error in deletePass:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }
}