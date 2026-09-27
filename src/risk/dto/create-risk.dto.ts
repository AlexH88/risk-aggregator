import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, Matches } from 'class-validator';

export class CreateRiskDto {
  @ApiProperty({ example: ['7707083893', '7736050003'] })
  @IsArray()
  @ArrayNotEmpty()
  @Matches(/^\d{10}(\d{2})?$/, { each: true, message: 'ИНН должен быть 10 или 12 цифр' })
  inns!: string[];
}