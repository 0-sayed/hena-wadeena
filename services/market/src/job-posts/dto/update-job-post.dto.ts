import { createZodDto } from 'nestjs-zod';

import { createJobPostSchema } from './job-post.schema';

export class UpdateJobPostDto extends createZodDto(createJobPostSchema.partial()) {}
