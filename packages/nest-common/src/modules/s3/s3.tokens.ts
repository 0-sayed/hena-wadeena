export const S3_CONFIG = 'S3_CONFIG';

export interface S3ModuleOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  defaultExpiry: number;
}
