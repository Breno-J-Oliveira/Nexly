import { IsBoolean, IsIn, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';

const staffRoles = ['OPERATIONS', 'FINANCE', 'VIEWER'] as const;
type StaffRole = (typeof staffRoles)[number];

export class PlatformCandidatesDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(120)
  busca?: string;
}

export class AddPlatformMemberDto {
  @IsUUID()
  usuarioId!: string;

  @IsIn(staffRoles)
  papel!: StaffRole;
}

export class UpdatePlatformMemberDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsIn(staffRoles)
  papel?: StaffRole;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  ativo?: boolean | null;
}
