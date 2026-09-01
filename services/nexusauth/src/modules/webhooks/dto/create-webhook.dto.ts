import { IsString, IsArray, ArrayMinSize, ArrayMaxSize, IsUrl, IsOptional, IsBoolean } from 'class-validator';

// V46 FIX: allowlist of valid webhook events to prevent arbitrary event subscription
export const ALLOWED_WEBHOOK_EVENTS = [
  'user.registered',
  'user.login',
  'user.logout',
  'user.password_changed',
  'user.2fa_enabled',
  'user.2fa_disabled',
  'tenant.user_invited',
] as const;

export class CreateWebhookDto {
  @IsString()
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] })
  url!: string;

  // V46 FIX: bound the array size to prevent DoS via huge event lists
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  events!: string[];
}
