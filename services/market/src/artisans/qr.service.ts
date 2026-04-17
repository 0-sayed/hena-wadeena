import { S3Service } from '@hena-wadeena/nest-common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  async generateAndUpload(productId: string): Promise<string> {
    const baseUrl = this.configService.get<string>('PUBLIC_URL', 'https://wadeena.eg');
    const url = `${baseUrl}/artisans/products/${productId}`;

    const buffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });

    const key = `artisans/qr/${productId}.png`;
    await this.s3Service.uploadBuffer(key, buffer, 'image/png');

    return key;
  }

  async deleteByKey(key: string): Promise<void> {
    await this.s3Service.deleteObject(key);
  }
}
