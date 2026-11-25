import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddPlatformMemberDto, UpdatePlatformMemberDto } from './platform-team.dto';

describe('DTOs da equipe da plataforma', () => {
  it.each([null, 'false', 1])('rejeita o estado inválido %p', async (ativo) => {
    const dto = plainToInstance(
      UpdatePlatformMemberDto,
      { ativo },
      { enableImplicitConversion: true },
    );
    await expect(validate(dto)).resolves.toHaveLength(1);
  });

  it('preserva false para desativação', async () => {
    const dto = plainToInstance(
      UpdatePlatformMemberDto,
      { ativo: false },
      { enableImplicitConversion: true },
    );
    expect(dto.ativo).toBe(false);
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejeita o papel OWNER em ambos os fluxos de gravação', async () => {
    const data = { usuarioId: '12e23bec-cfcc-4f7e-b2ad-648fee25f713', papel: 'OWNER' };
    await expect(validate(plainToInstance(AddPlatformMemberDto, data))).resolves.toHaveLength(1);
    await expect(
      validate(plainToInstance(UpdatePlatformMemberDto, { papel: 'OWNER' })),
    ).resolves.toHaveLength(1);
  });
});
