import { createZodDto } from 'nestjs-zod';

import { createPackageSchema } from './create-package.dto';

const updatePackageSchema = createPackageSchema.omit({ attractionIds: true }).partial();

export class UpdatePackageDto extends createZodDto(updatePackageSchema) {}
