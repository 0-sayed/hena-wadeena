import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const reviewKycSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
    rejectionReason: z.string().max(500).optional(),
  })
  .refine(
    (data) =>
      data.status !== 'rejected' || (data.rejectionReason && data.rejectionReason.length > 0),
    {
      message: 'rejectionReason is required when rejecting',
      path: ['rejectionReason'],
    },
  );

export class ReviewKycDto extends createZodDto(reviewKycSchema) {}
