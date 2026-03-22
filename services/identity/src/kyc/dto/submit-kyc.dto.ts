import { KycDocType } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const submitKycSchema = z.object({
  docType: z.enum(Object.values(KycDocType) as [string, ...string[]]),
  docUrl: z.url(),
});

export class SubmitKycDto extends createZodDto(submitKycSchema) {}
