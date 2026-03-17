import { IncomingMessage } from 'http';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { generateId } from '../../utils/uuid';

@Module({})
export class LoggerModule {
  static forRoot(serviceName: string) {
    return PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        genReqId: (req: IncomingMessage) => {
          const headerId = req.headers['x-request-id'];
          const normalizedId = typeof headerId === 'string' ? headerId.trim() : '';
          return normalizedId.length > 0 ? normalizedId : generateId();
        },
        customProps: () => ({
          service: serviceName,
        }),
        redact: ['req.headers.authorization'],
        serializers: {
          req: (req: { method: string; url: string }) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    });
  }
}
