import { Type } from "class-transformer";
import { IsOptional, IsInt, Min, Max } from "class-validator";

export class PaginacaoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function paginated<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
