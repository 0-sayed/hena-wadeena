import { IncomingMessage } from 'http';

import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { generateId } from '../../utils/uuid';

@Module({})
export class LoggerModule {
  static forRoot(serviceName: string) {
    return PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        genReqId: (req: IncomingMessage) => {
          return (req.headers['x-request-id'] as string) || generateId();
        },
        customProps: () => ({
          service: serviceName,
        }),
        redact: ['req.headers.authorization'],
        serializers: {
          req: (req: Record<string, unknown>) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res: Record<string, unknown>) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    });
  }
}
