import { DynamicModule, Global, Module } from '@nestjs/common';

import { S3Service } from './s3.service';

export const S3_CONFIG = 'S3_CONFIG';

export interface S3ModuleOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  defaultExpiry: number;
}

@Global()
@Module({})
export class S3Module {
  static forRoot(options: S3ModuleOptions): DynamicModule {
    return {
      module: S3Module,
      providers: [
        { provide: S3_CONFIG, useValue: options },
        S3Service,
      ],
      exports: [S3Service],
    };
  }
}
