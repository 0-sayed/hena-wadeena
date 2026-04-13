import { createZodDto } from 'nestjs-zod';

import { jobPostBaseSchema } from './job-post.schema';

export class UpdateJobPostDto extends createZodDto(jobPostBaseSchema.partial()) {}
