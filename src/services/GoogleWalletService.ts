import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';
import { config } from '../config';
import { PassTemplateData } from '../types';
import QRCode from 'qrcode';

export class GoogleWalletService {
  private walletClient: any;
  private storage: Storage;
  private bucketName: string;

  constructor() {
    const credentials = require(config.googleCloud.credentialsPath);

    this.walletClient = google.walletobjects({
      version: 'v1',
      auth: new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
      }),
    });

    this.storage = new Storage({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.credentialsPath,
    });
    this.bucketName = config.googleCloud.storageBucket;
  }

  async createClass(passData: PassTemplateData): Promise<string> {
    const classId = `${config.googleWallet.issuerId}.wallet_tag_class_${Date.now()}`;

    const classObject = {
      id: classId,
      issuerName: passData.organizationName,
      reviewStatus: 'UNDER_REVIEW',
      displayName: {
        defaultValue: {
          language: 'en-US',
          value: passData.logoText,
        },
      },
      hexBackgroundColor: passData.backgroundColor,
      logo: {
        sourceUri: {
          uri: 'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/pass_google_logo.jpg',
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: 'Logo',
          },
        },
      },
      textModulesData: [
        {
          header: 'Description',
          body: passData.description,
          id: 'description',
        },
      ],
    };

    if (passData.locations && passData.locations.length > 0) {
      (classObject as any).locations = passData.locations.map(location => ({
        latitude: location.latitude,
        longitude: location.longitude,
        kind: 'walletobjects#latLongPoint',
      }));
    }

    try {
      await this.walletClient.genericclass.insert({
        requestBody: classObject,
      });
      return classId;
    } catch (error) {
      if (error.code === 409) {
        return classId;
      }
      console.error('Error creating Google Wallet class:', error);
      throw new Error(`Failed to create Google Wallet class: ${error.message}`);
    }
  }

  async createObject(passData: PassTemplateData, serialNumber: string, classId: string): Promise<any> {
    const objectId = `${config.googleWallet.issuerId}.${serialNumber}`;

    const objectData = {
      id: objectId,
      classId: classId,
      state: 'ACTIVE',
      heroImage: {
        sourceUri: {
          uri: 'https://storage.googleapis.com/wallet-lab-tools-codelab-artifacts-public/google-io-hero-demo-only.jpg',
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: 'Hero image',
          },
        },
      },
      textModulesData: [
        {
          header: 'Serial Number',
          body: serialNumber,
          id: 'serial',
        },
        {
          header: 'Generated',
          body: new Date().toLocaleString(),
          id: 'generated',
        },
      ],
      linksModuleData: {
        uris: [
          {
            uri: `${config.app.apiBaseUrl}/api/passes/${serialNumber}/google`,
            description: 'View Pass Details',
            id: 'pass_details',
          },
        ],
      },
    };

    if (passData.barcode) {
      (objectData as any).barcode = {
        type: this.mapBarcodeFormat(passData.barcode.format),
        value: passData.barcode.message,
        alternateText: passData.barcode.altText || passData.barcode.message,
      };
    }

    try {
      const response = await this.walletClient.genericobject.insert({
        requestBody: objectData,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Google Wallet object:', error);
      throw new Error(`Failed to create Google Wallet object: ${error.message}`);
    }
  }

  async generateSaveUrl(objectId: string): Promise<string> {
    const baseUrl = 'https://pay.google.com/gp/v/save/';
    const payload = {
      iss: config.googleWallet.serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      payload: {
        genericObjects: [
          {
            id: objectId,
          },
        ],
      },
    };

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(payload, require(config.googleCloud.credentialsPath).private_key, {
      algorithm: 'RS256',
    });

    return `${baseUrl}${token}`;
  }

  async generateQRCode(data: string): Promise<Buffer> {
    try {
      const qrCodeBuffer = await QRCode.toBuffer(data, {
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      });

      return qrCodeBuffer;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  async uploadQRCodeToStorage(qrCodeBuffer: Buffer, fileName: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(`qr-codes/${fileName}`);

      await file.save(qrCodeBuffer, {
        metadata: {
          contentType: 'image/png',
        },
        public: true,
      });

      return `https://storage.googleapis.com/${this.bucketName}/qr-codes/${fileName}`;
    } catch (error) {
      console.error('Error uploading QR code to storage:', error);
      throw new Error(`Failed to upload QR code: ${error.message}`);
    }
  }

  async createPassWithQR(passData: PassTemplateData, serialNumber: string): Promise<{
    saveUrl: string;
    qrCodeUrl: string;
  }> {
    try {
      const classId = await this.createClass(passData);
      const objectData = await this.createObject(passData, serialNumber, classId);
      const saveUrl = await this.generateSaveUrl(objectData.id);

      const qrCodeBuffer = await this.generateQRCode(saveUrl);
      const qrFileName = `${serialNumber}_google_qr.png`;
      const qrCodeUrl = await this.uploadQRCodeToStorage(qrCodeBuffer, qrFileName);

      return {
        saveUrl,
        qrCodeUrl,
      };
    } catch (error) {
      console.error('Error creating Google Wallet pass with QR:', error);
      throw error;
    }
  }

  private mapBarcodeFormat(format: string): string {
    const formatMap = {
      'PKBarcodeFormatQR': 'QR_CODE',
      'PKBarcodeFormatPDF417': 'PDF_417',
      'PKBarcodeFormatAztec': 'AZTEC',
      'PKBarcodeFormatCode128': 'CODE_128',
    };

    return formatMap[format] || 'QR_CODE';
  }

  async updateObject(objectId: string, updates: any): Promise<any> {
    try {
      const response = await this.walletClient.genericobject.patch({
        resourceId: objectId,
        requestBody: updates,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating Google Wallet object:', error);
      throw new Error(`Failed to update Google Wallet object: ${error.message}`);
    }
  }

  async getObject(objectId: string): Promise<any> {
    try {
      const response = await this.walletClient.genericobject.get({
        resourceId: objectId,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting Google Wallet object:', error);
      throw new Error(`Failed to get Google Wallet object: ${error.message}`);
    }
  }
}