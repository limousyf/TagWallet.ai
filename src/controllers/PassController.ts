import { FastifyRequest, FastifyReply } from 'fastify';
import { GeneratedPassModel } from '../models/GeneratedPass';
import { PassTemplateModel } from '../models/PassTemplate';
import { AppleWalletService } from '../services/AppleWalletService';
import { GoogleWalletService } from '../services/GoogleWalletService';
import { CreatePassRequest } from '../types';

export class PassController {
  private static appleWalletService: AppleWalletService | null = null;
  private static googleWalletService: GoogleWalletService | null = null;

  private static getAppleWalletService(): AppleWalletService {
    if (!this.appleWalletService) {
      this.appleWalletService = new AppleWalletService();
    }
    return this.appleWalletService;
  }

  private static getGoogleWalletService(): GoogleWalletService {
    if (!this.googleWalletService) {
      this.googleWalletService = new GoogleWalletService();
    }
    return this.googleWalletService;
  }

  static async createPass(
    request: FastifyRequest<{ Body: CreatePassRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const { templateId, passData, walletType } = request.body;

      if (templateId) {
        const template = await PassTemplateModel.findById(templateId);
        if (!template) {
          reply.status(404).send({ error: 'Template not found' });
          return;
        }

        if (template.userId !== request.user.userId) {
          reply.status(403).send({ error: 'Access denied to this template' });
          return;
        }
      }

      const generatedPass = await GeneratedPassModel.create(
        request.user.userId,
        passData,
        walletType,
        templateId
      );

      let downloadUrl: string;
      let qrCodeUrl: string;

      if (walletType === 'apple') {
        const result = await PassController.getAppleWalletService().createPassWithQR(
          passData,
          generatedPass.serialNumber
        );
        downloadUrl = result.passUrl;
        qrCodeUrl = result.qrCodeUrl;
      } else {
        const result = await PassController.getGoogleWalletService().createPassWithQR(
          passData,
          generatedPass.serialNumber
        );
        downloadUrl = result.saveUrl;
        qrCodeUrl = result.qrCodeUrl;
      }

      const updatedPass = await GeneratedPassModel.updateUrls(
        generatedPass.id,
        qrCodeUrl,
        downloadUrl
      );

      reply.status(201).send({
        message: 'Pass created successfully',
        pass: {
          id: updatedPass.id,
          serialNumber: updatedPass.serialNumber,
          walletType: updatedPass.walletType,
          downloadUrl: updatedPass.downloadUrl,
          qrCodeUrl: updatedPass.qrCodeUrl,
          createdAt: updatedPass.createdAt,
        },
      });
    } catch (error) {
      request.log.error(`'Error in createPass:' ${error}`);
      reply.status(500).send({
        error: 'Failed to create pass',
        details: error.message,
      });
    }
  }

  static async getUserPasses(
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
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const limit = parseInt(request.query.limit || '20');
      const offset = parseInt(request.query.offset || '0');
      const walletType = request.query.walletType;

      const result = await GeneratedPassModel.findByUserId(
        request.user.userId,
        limit,
        offset,
        walletType
      );

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
      request.log.error(`'Error in getUserPasses:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getPass(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const pass = await GeneratedPassModel.findById(request.params.id);
      if (!pass) {
        reply.status(404).send({ error: 'Pass not found' });
        return;
      }

      if (pass.userId !== request.user.userId && !request.user.isAdmin) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      reply.send({ pass });
    } catch (error) {
      request.log.error(`'Error in getPass:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getPassBySerial(
    request: FastifyRequest<{
      Params: { serialNumber: string; walletType: 'apple' | 'google' }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { serialNumber, walletType } = request.params;

      const pass = await GeneratedPassModel.findBySerialNumber(serialNumber, walletType);
      if (!pass) {
        reply.status(404).send({ error: 'Pass not found' });
        return;
      }

      reply.send({
        pass: {
          id: pass.id,
          serialNumber: pass.serialNumber,
          walletType: pass.walletType,
          passData: pass.passData,
          downloadUrl: pass.downloadUrl,
          qrCodeUrl: pass.qrCodeUrl,
          createdAt: pass.createdAt,
        },
      });
    } catch (error) {
      request.log.error(`'Error in getPassBySerial:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async deletePass(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const pass = await GeneratedPassModel.findById(request.params.id);
      if (!pass) {
        reply.status(404).send({ error: 'Pass not found' });
        return;
      }

      if (pass.userId !== request.user.userId && !request.user.isAdmin) {
        reply.status(403).send({ error: 'Access denied' });
        return;
      }

      const deleted = await GeneratedPassModel.deleteById(
        request.params.id,
        request.user.isAdmin ? undefined : request.user.userId
      );

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

  static async getPassStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const stats = await GeneratedPassModel.getStats(request.user.userId);

      reply.send({ stats });
    } catch (error) {
      request.log.error(`'Error in getPassStats:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }
}