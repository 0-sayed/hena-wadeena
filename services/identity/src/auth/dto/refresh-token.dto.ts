import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}
