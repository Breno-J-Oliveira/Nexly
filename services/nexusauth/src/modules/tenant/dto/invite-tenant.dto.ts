import { IsString, IsEmail, IsOptional, IsIn } from 'class-validator';

export class InviteTenantDto {
  @IsEmail()
  email!: string;

  // NM5 FIX: Remove 'ADMIN' from allowed roles in DTO.
  // The service layer already validates that ADMIN cannot be set via invitation
  // (tenant.service.ts:127-134), but defense-in-depth requires the DTO to also
  // reject it. This prevents privilege escalation if the service validation
  // is accidentally removed in the future.
  @IsString()
  @IsIn(['MANAGER', 'USER'])
  @IsOptional()
  role?: string;
}