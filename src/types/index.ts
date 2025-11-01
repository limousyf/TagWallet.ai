export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PassTemplate {
  id: string;
  userId: string;
  name: string;
  description: string;
  template: PassTemplateData;
  createdAt: Date;
  updatedAt: Date;
}

export interface PassTemplateData {
  organizationName: string;
  description: string;
  logoText: string;
  foregroundColor: string;
  backgroundColor: string;
  labelColor?: string;
  serialNumber?: string;
  teamIdentifier?: string;
  passTypeIdentifier?: string;
  webServiceURL?: string;
  authenticationToken?: string;
  relevantDate?: string;
  locations?: PassLocation[];
  barcode?: PassBarcode;
  nfc?: PassNFC;
  maxDistance?: number;
}

export interface PassLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  relevantText?: string;
}

export interface PassBarcode {
  message: string;
  format: 'PKBarcodeFormatQR' | 'PKBarcodeFormatPDF417' | 'PKBarcodeFormatAztec' | 'PKBarcodeFormatCode128';
  messageEncoding: string;
  altText?: string;
}

export interface PassNFC {
  message: string;
  encryptionPublicKey?: string;
}

export interface GeneratedPass {
  id: string;
  userId: string;
  templateId?: string;
  passData: PassTemplateData;
  walletType: 'apple' | 'google';
  serialNumber: string;
  qrCodeUrl?: string;
  downloadUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthToken {
  userId: string;
  email: string;
  isAdmin: boolean;
}

export interface CreatePassRequest {
  templateId?: string;
  passData: PassTemplateData;
  walletType: 'apple' | 'google';
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  template: PassTemplateData;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  currentPassword?: string;
  newPassword?: string;
}