import { ValidateIf } from 'class-validator';

/** Permite omitir um campo de atualização, mas valida null como qualquer outro valor. */
export function OptionalField(): PropertyDecorator {
  return ValidateIf((_object, value: unknown) => value !== undefined);
}
