import { FastifyRequest, FastifyReply } from 'fastify';
import { UserModel } from '../models/User';
import { config } from '../config';
import { RegisterRequest, LoginRequest, AuthToken } from '../types';

export class AuthController {
  static async register(
    request: FastifyRequest<{ Body: RegisterRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email, password, firstName, lastName } = request.body;

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        reply.status(409).send({ error: 'User with this email already exists' });
        return;
      }

      const user = await UserModel.create({
        email,
        password,
        firstName,
        lastName,
      });

      const tokenPayload: AuthToken = {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      };

      const token = request.server.jwt.sign(tokenPayload);

      reply.status(201).send({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        },
        token,
      });
    } catch (error) {
      request.log.error(`'Error in register:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async login(
    request: FastifyRequest<{ Body: LoginRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { email, password } = request.body;

      const user = await UserModel.findByEmail(email);
      if (!user) {
        reply.status(401).send({ error: 'Invalid credentials' });
        return;
      }

      const isValidPassword = await UserModel.validatePassword(user, password);
      if (!isValidPassword) {
        reply.status(401).send({ error: 'Invalid credentials' });
        return;
      }

      const tokenPayload: AuthToken = {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      };

      const token = request.server.jwt.sign(tokenPayload);

      reply.send({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        },
        token,
      });
    } catch (error) {
      request.log.error(`'Error in login:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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
      request.log.error(`'Error in me:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }

  static async refreshToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

      const tokenPayload: AuthToken = {
        userId: user.id,
        email: user.email,
        isAdmin: user.isAdmin,
      };

      const token = request.server.jwt.sign(tokenPayload);

      reply.send({
        message: 'Token refreshed successfully',
        token,
      });
    } catch (error) {
      request.log.error(`'Error in refreshToken:' ${error}`);
      reply.status(500).send({ error: 'Internal server error' });
    }
  }
}