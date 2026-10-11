export type SignatureTemplate = 'modern' | 'compact' | 'corporate' | 'minimal' | 'two-column';

export type SignatureFont =
  | 'Arial, sans-serif'
  | 'Helvetica, sans-serif'
  | 'Georgia, serif'
  | "'Times New Roman', serif"
  | 'Verdana, sans-serif'
  | "'Trebuchet MS', sans-serif";

export type SignatureFontSize = 'sm' | 'md' | 'lg';

export type SignatureAvatarShape = 'round' | 'square' | 'rounded';

export interface SignaturePersonalInfo {
  fullName: string;
  jobTitle: string;
  department: string;
  company: string;
}

export interface SignatureContactInfo {
  email: string;
  phone: string;
  mobile: string;
  website: string;
  address: string;
}

export interface SignatureSocialLinks {
  linkedin: string;
  twitter: string;
  github: string;
  instagram: string;
  facebook: string;
  youtube: string;
}

export interface SignatureImagesConfig {
  avatarUrl: string;
  avatarShape: SignatureAvatarShape;
  avatarSize: number;
  logoUrl: string;
  logoSize: number;
}

export interface SignatureStyleConfig {
  template: SignatureTemplate;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  fontFamily: SignatureFont;
  fontSize: SignatureFontSize;
  disclaimerText: string;
  includeBranding: boolean;
}

export interface SignatureConfig {
  personal: SignaturePersonalInfo;
  contact: SignatureContactInfo;
  social: SignatureSocialLinks;
  images: SignatureImagesConfig;
  style: SignatureStyleConfig;
}

export interface SignatureExportState {
  copiedRichText: boolean;
  copiedRawHtml: boolean;
}
