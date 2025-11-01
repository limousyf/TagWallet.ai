import { FastifyRequest, FastifyReply } from 'fastify';
import { UserModel } from '../models/User';
import { UpdateProfileRequest } from '../types';

export class UserController {
  static async updateProfile(
    request: FastifyRequest<{ Body: UpdateProfileRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const { currentPassword, newPassword, ...updateData } = request.body;

      if (newPassword && !currentPassword) {
        reply.status(400).send({ error: 'Current password required to change password' });
        return;
      }

      if (currentPassword) {
        const user = await UserModel.findById(request.user.userId);
        if (!user) {
          reply.status(404).send({ error: 'User not found' });
          return;
        }

        const isValidPassword = await UserModel.validatePassword(user, currentPassword);
        if (!isValidPassword) {
          reply.status(400).send({ error: 'Current password is incorrect' });
          return;
        }
      }

      const updatedUser = await UserModel.update(request.user.userId, {
        ...updateData,
        newPassword,
      });

      if (!updatedUser) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }

      reply.send({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          isAdmin: updatedUser.isAdmin,
          updatedAt: updatedUser.updatedAt,
        },
      });
    } catch (error) {
      request.log.error(`'Error in updateProfile:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      if (!request.user) {
        reply.status(401).send({ error: 'Authentication required' });
        return;
      }

      const user = await UserModel.findById(request.user.userId);
      if (!user) {
        reply.status(404).send({ error: 'User not found' });
        return;
      }

      reply.send({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (error) {
      request.log.error(`'Error in getProfile:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }
}