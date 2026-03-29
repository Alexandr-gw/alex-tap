import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) {}
    transform(value: unknown) {
        const parsed = this.schema.safeParse(value);
        if (!parsed.success) {
            throw new BadRequestException({
                ok: false,
                error: 'validation_error',
                issues: parsed.error.issues,
            });
        }
        return parsed.data;
    }
}
