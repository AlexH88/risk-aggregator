import { IsOptional, IsISO8601, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryHistoryDto {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @Type(() => Number) page = 1;
  @IsOptional() @Type(() => Number) limit = 20;
}