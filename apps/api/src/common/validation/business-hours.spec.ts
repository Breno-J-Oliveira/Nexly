import { businessHoursSchema } from './business-hours';
describe('horários de funcionamento', () => {
  it.each([
    {},
    { seg: { abre: '09:00', fecha: '18:00', aberto: true } },
    { dom: { aberto: false } },
    { ter: { abre: '09:00', fecha: '18:00' } },
  ])('aceita configurações válidas: %j', (value) =>
    expect(businessHoursSchema.safeParse(value).success).toBe(true),
  );
  it.each([
    { seg: { abre: '18:00', fecha: '09:00' } },
    { seg: { abre: '24:00' } },
    { seg: { fecha: '12:99' } },
    { seg: { aberto: 'false' } },
    { seg: { ativo: true } },
    { segunda: { aberto: true } },
    [],
  ])('rejeita configuração inconsistente: %j', (value) =>
    expect(businessHoursSchema.safeParse(value).success).toBe(false),
  );
});
