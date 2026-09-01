import { IsBoolean, IsArray, IsOptional, IsString, IsUrl, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  events?: string[];

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] })
  url?: string;
}
