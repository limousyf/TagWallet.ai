import { FastifyRequest, FastifyReply } from 'fastify';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const { error } = schema.validate(request.body);
      if (error) {
        reply.status(400).send({
          error: 'Validation error',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
          })),
        });
        return;
      }
    } catch (err) {
      reply.status(400).send({ error: 'Invalid request data' });
    }
  };
};

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().min(1).max(255).required(),
    lastName: Joi.string().min(1).max(255).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(1).max(255).optional(),
    lastName: Joi.string().min(1).max(255).optional(),
    currentPassword: Joi.string().optional(),
    newPassword: Joi.string().min(8).optional(),
  }),

  createTemplate: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    template: Joi.object({
      organizationName: Joi.string().required(),
      description: Joi.string().required(),
      logoText: Joi.string().required(),
      foregroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
      backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
      labelColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      serialNumber: Joi.string().optional(),
      teamIdentifier: Joi.string().optional(),
      passTypeIdentifier: Joi.string().optional(),
      webServiceURL: Joi.string().uri().optional(),
      authenticationToken: Joi.string().optional(),
      relevantDate: Joi.string().isoDate().optional(),
      locations: Joi.array().items(
        Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
          altitude: Joi.number().optional(),
          relevantText: Joi.string().optional(),
        })
      ).optional(),
      barcode: Joi.object({
        message: Joi.string().required(),
        format: Joi.string().valid('PKBarcodeFormatQR', 'PKBarcodeFormatPDF417', 'PKBarcodeFormatAztec', 'PKBarcodeFormatCode128').required(),
        messageEncoding: Joi.string().required(),
        altText: Joi.string().optional(),
      }).optional(),
      nfc: Joi.object({
        message: Joi.string().required(),
        encryptionPublicKey: Joi.string().optional(),
      }).optional(),
      maxDistance: Joi.number().positive().optional(),
    }).required(),
  }),

  createPass: Joi.object({
    templateId: Joi.string().uuid().optional(),
    walletType: Joi.string().valid('apple', 'google').required(),
    passData: Joi.object({
      organizationName: Joi.string().required(),
      description: Joi.string().required(),
      logoText: Joi.string().required(),
      foregroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
      backgroundColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
      labelColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      serialNumber: Joi.string().optional(),
      teamIdentifier: Joi.string().optional(),
      passTypeIdentifier: Joi.string().optional(),
      webServiceURL: Joi.string().uri().optional(),
      authenticationToken: Joi.string().optional(),
      relevantDate: Joi.string().isoDate().optional(),
      locations: Joi.array().items(
        Joi.object({
          latitude: Joi.number().min(-90).max(90).required(),
          longitude: Joi.number().min(-180).max(180).required(),
          altitude: Joi.number().optional(),
          relevantText: Joi.string().optional(),
        })
      ).optional(),
      barcode: Joi.object({
        message: Joi.string().required(),
        format: Joi.string().valid('PKBarcodeFormatQR', 'PKBarcodeFormatPDF417', 'PKBarcodeFormatAztec', 'PKBarcodeFormatCode128').required(),
        messageEncoding: Joi.string().required(),
        altText: Joi.string().optional(),
      }).optional(),
      nfc: Joi.object({
        message: Joi.string().required(),
        encryptionPublicKey: Joi.string().optional(),
      }).optional(),
      maxDistance: Joi.number().positive().optional(),
    }).required(),
  }),
};