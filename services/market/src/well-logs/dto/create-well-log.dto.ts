import { NvDistrict } from '@hena-wadeena/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const schema = z.object({
  area: z.enum(NvDistrict),
  pump_hours: z.number().positive(),
  kwh_consumed: z.number().positive(),
  cost_piasters: z.number().int().nonnegative(),
  water_m3_est: z.number().positive().optional(),
  depth_to_water_m: z.number().positive().optional(),
  logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
});

export class CreateWellLogDto extends createZodDto(schema) {}
