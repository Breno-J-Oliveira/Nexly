import { ValidateBy } from 'class-validator';
import { z } from 'zod';

const horario = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const dia = z
  .object({ aberto: z.boolean().optional(), abre: horario.optional(), fecha: horario.optional() })
  .strict()
  .refine((value) => value.aberto === false || (value.abre ?? '08:00') < (value.fecha ?? '20:00'));
export const businessHoursSchema = z
  .object({
    seg: dia.optional(),
    ter: dia.optional(),
    qua: dia.optional(),
    qui: dia.optional(),
    sex: dia.optional(),
    sab: dia.optional(),
    dom: dia.optional(),
  })
  .strict();

export function IsBusinessHours(): PropertyDecorator {
  return ValidateBy({
    name: 'isBusinessHours',
    validator: {
      validate: (value: unknown) => businessHoursSchema.safeParse(value).success,
      defaultMessage: () =>
        'Informe horários válidos, com abertura anterior ao fechamento, e dias da semana reconhecidos.',
    },
  });
}
