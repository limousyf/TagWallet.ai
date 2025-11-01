import { AuthToken } from './index';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthToken;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthToken;
    user: AuthToken;
  }
}