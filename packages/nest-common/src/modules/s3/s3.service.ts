import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { S3_CONFIG } from './s3.tokens';
import type { S3ModuleOptions } from './s3.tokens';

export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  expiresIn?: number; // seconds, default 3600
}

export interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  expiresAt: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultExpiry: number;

  constructor(@Inject(S3_CONFIG) config: S3ModuleOptions) {
    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.bucket = config.bucket;
    this.defaultExpiry = config.defaultExpiry;
  }

  /** Generate a presigned PUT URL for direct browser → S3 upload */
  async getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
    const expiresIn = options.expiresIn ?? this.defaultExpiry;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ContentType: options.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

    return {
      uploadUrl,
      key: options.key,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  /** Generate a presigned GET URL for reading a private file */
  async getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Get the public CDN URL for a key (for public buckets) */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }
}
