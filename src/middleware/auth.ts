import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthToken } from '../types';

declare module 'fastify' {
  export interface FastifyRequest {
    user?: AuthToken;
  }
}

export const authenticateToken = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      reply.status(401).send({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as AuthToken;
    request.user = decoded;
  } catch (error) {
    reply.status(403).send({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (!request.user) {
    reply.status(401).send({ error: 'Authentication required' });
    return;
  }

  if (!request.user.isAdmin) {
    reply.status(403).send({ error: 'Admin access required' });
    return;
  }
};