import { DynamicModule, Global, Module } from '@nestjs/common';

import { S3Service } from './s3.service';
import { S3_CONFIG } from './s3.tokens';
import type { S3ModuleOptions } from './s3.tokens';

export type { S3ModuleOptions } from './s3.tokens';

@Global()
@Module({})
export class S3Module {
  static forRoot(options: S3ModuleOptions): DynamicModule {
    return {
      module: S3Module,
      providers: [{ provide: S3_CONFIG, useValue: options }, S3Service],
      exports: [S3Service],
    };
  }
}
