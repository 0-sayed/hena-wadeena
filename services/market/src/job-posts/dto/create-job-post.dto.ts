import { createZodDto } from 'nestjs-zod';

import { createJobPostSchema } from './job-post.schema';

export class CreateJobPostDto extends createZodDto(createJobPostSchema) {}
