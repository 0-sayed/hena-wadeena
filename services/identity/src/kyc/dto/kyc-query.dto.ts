import { KycStatus } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const kycQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(Object.values(KycStatus) as [string, ...string[]]).default(KycStatus.PENDING),
});

export class KycQueryDto extends createZodDto(kycQuerySchema) {}
