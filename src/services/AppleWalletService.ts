import { PKPass } from 'passkit-generator';
import { Storage } from '@google-cloud/storage';
import { config } from '../config';
import { PassTemplateData, GeneratedPass } from '../types';
import path from 'path';
import QRCode from 'qrcode';

export class AppleWalletService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage({
      projectId: config.googleCloud.projectId,
      keyFilename: config.googleCloud.credentialsPath,
    });
    this.bucketName = config.googleCloud.storageBucket;
  }

  async generatePass(passData: PassTemplateData, serialNumber: string): Promise<Buffer> {
    try {
      // According to passkit-generator docs, need to use PKPass.from with a model object
      const model = {
        formatVersion: 1,
        passTypeIdentifier: config.appleWallet.passTypeId,
        teamIdentifier: config.appleWallet.teamId,
        organizationName: passData.organizationName,
        description: passData.description,
        logoText: passData.logoText,
        foregroundColor: passData.foregroundColor,
        backgroundColor: passData.backgroundColor,
        labelColor: passData.labelColor || passData.foregroundColor,
        serialNumber: serialNumber,
        webServiceURL: passData.webServiceURL,
        authenticationToken: passData.authenticationToken,
        generic: {
          primaryFields: [
            {
              key: 'title',
              label: 'Wallet Tag',
              value: passData.logoText,
            },
          ],
          secondaryFields: [
            {
              key: 'organization',
              label: 'Organization',
              value: passData.organizationName,
            },
          ],
          auxiliaryFields: [
            {
              key: 'serial',
              label: 'Serial Number',
              value: serialNumber,
            },
          ],
          backFields: [
            {
              key: 'description',
              label: 'Description',
              value: passData.description,
            },
            {
              key: 'generated',
              label: 'Generated',
              value: new Date().toLocaleString(),
            },
          ],
        },
      };

      if ((passData as any).relevantDate) {
        (model as any).relevantDate = (passData as any).relevantDate;
      }

      if (passData.locations && passData.locations.length > 0) {
        (model as any).locations = passData.locations.map(location => ({
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude,
          relevantText: location.relevantText,
        }));

        if (passData.maxDistance) {
          (model as any).maxDistance = passData.maxDistance;
        }
      }

      if (passData.barcode) {
        (model as any).barcodes = [
          {
            format: passData.barcode.format,
            message: passData.barcode.message,
            messageEncoding: passData.barcode.messageEncoding,
            altText: passData.barcode.altText,
          },
        ];
      }

      if (passData.nfc) {
        (model as any).nfc = {
          message: passData.nfc.message,
          encryptionPublicKey: passData.nfc.encryptionPublicKey,
        };
      }

      // Create pass.json buffer from our model
      const passJsonBuffer = Buffer.from(JSON.stringify(model));

      // Load certificates
      const wwdrBuffer = await this.getCertificate('wwdr.pem');
      const signerCertBuffer = await this.getCertificate('signerCert.pem');
      const signerKeyBuffer = await this.getCertificate('signerKey.key');

      // Create pass using PKPass constructor with inline buffers
      const pass = new PKPass(
        {
          "pass.json": passJsonBuffer,
        },
        {
          wwdr: wwdrBuffer,
          signerCert: signerCertBuffer,
          signerKey: signerKeyBuffer,
          signerKeyPassphrase: process.env.APPLE_WALLET_KEY_PASSPHRASE || '',
        }
      );
      return pass.getAsBuffer();
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      throw new Error(`Failed to generate Apple Wallet pass: ${error.message}`);
    }
  }

  async uploadPassToStorage(passBuffer: Buffer, fileName: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(`apple-passes/${fileName}`);

      await file.save(passBuffer, {
        metadata: {
          contentType: 'application/vnd.apple.pkpass',
        },
        public: true,
      });

      return `https://storage.googleapis.com/${this.bucketName}/apple-passes/${fileName}`;
    } catch (error) {
      console.error('Error uploading pass to storage:', error);
      throw new Error(`Failed to upload pass: ${error.message}`);
    }
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

  private async getCertificate(fileName: string): Promise<Buffer> {
    try {
      if (config.nodeEnv === 'development') {
        const fs = await import('fs');
        const certificatePath = path.join(process.cwd(), 'certificates', fileName);
        return fs.readFileSync(certificatePath);
      } else {
        const bucket = this.storage.bucket(this.bucketName);
        const file = bucket.file(`certificates/${fileName}`);
        const [buffer] = await file.download();
        return buffer;
      }
    } catch (error) {
      console.error(`Error loading certificate ${fileName}:`, error);
      throw new Error(`Certificate ${fileName} not found. Please ensure Apple Wallet certificates are properly configured.`);
    }
  }

  async createPassWithQR(passData: PassTemplateData, serialNumber: string): Promise<{
    passUrl: string;
    qrCodeUrl: string;
  }> {
    try {
      const passBuffer = await this.generatePass(passData, serialNumber);
      const passFileName = `${serialNumber}.pkpass`;
      const passUrl = await this.uploadPassToStorage(passBuffer, passFileName);

      const qrData = passUrl;
      const qrCodeBuffer = await this.generateQRCode(qrData);
      const qrFileName = `${serialNumber}_qr.png`;
      const qrCodeUrl = await this.uploadQRCodeToStorage(qrCodeBuffer, qrFileName);

      return {
        passUrl,
        qrCodeUrl,
      };
    } catch (error) {
      console.error('Error creating pass with QR:', error);
      throw error;
    }
  }
}