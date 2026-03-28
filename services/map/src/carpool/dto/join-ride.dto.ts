import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const joinRideSchema = z.object({
  seats: z.number().int().min(1).max(4).default(1),
});

export class JoinRideDto extends createZodDto(joinRideSchema) {}
