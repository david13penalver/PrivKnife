export type ExifCategory = 'Device' | 'Location' | 'Timestamp' | 'Technical' | 'Other';

export interface ExifTag {
  id?: number;
  name: string;
  category: ExifCategory;
  value: string;
  isSensitive: boolean;
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  formatted: string;
}

export interface ParsedMetadata {
  hasMetadata: boolean;
  format: 'jpeg' | 'png' | 'unknown';
  tagCount: number;
  tags: ExifTag[];
  gpsCoordinates?: GpsCoordinates;
  fileSize: number;
  fileName: string;
}

export interface StrippedResult {
  cleanedBuffer: Uint8Array;
  originalSize: number;
  cleanedSize: number;
  tagsRemovedCount: number;
  mimeType: string;
}
