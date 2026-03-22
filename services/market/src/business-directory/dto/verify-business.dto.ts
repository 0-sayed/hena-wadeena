import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const verifyBusinessSchema = z
  .object({
    status: z.enum(['verified', 'rejected', 'suspended']),
    rejectionReason: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'rejected' && !data.rejectionReason) {
      ctx.addIssue({
        code: 'custom',
        message: 'rejectionReason is required when status is rejected',
        path: ['rejectionReason'],
      });
    }
  });

export class VerifyBusinessDto extends createZodDto(verifyBusinessSchema) {}
