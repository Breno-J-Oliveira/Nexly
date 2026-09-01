import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      // M3 FIX: In production, return generic error without exposing schema structure.
      // Schema details (field names, constraints) aid attackers in probing the API.
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
        });
      }
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }
    return result.data;
  }
}
