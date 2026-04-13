import { createZodDto } from 'nestjs-zod';

import { updateJobPostSchema } from './job-post.schema';

export class UpdateJobPostDto extends createZodDto(updateJobPostSchema) {}
