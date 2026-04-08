import { WALLET_REF_TYPES } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const transferWalletSchema = z.object({
  fromUserId: z.uuid(),
  toUserId: z.uuid(),
  amountPiasters: z
    .int({ message: 'amountPiasters must be a positive integer' })
    .min(1, { message: 'amountPiasters must be a positive integer' }),
  refType: z.enum(WALLET_REF_TYPES),
  refId: z.uuid(),
  noteAr: z.string().optional(),
  idempotencyKey: z.string().min(1),
});

export class TransferWalletDto extends createZodDto(transferWalletSchema) {}
