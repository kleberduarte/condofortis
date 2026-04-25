import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateVisitorDto {
  @ApiProperty()
  @IsUUID()
  condominiumId: string

  @ApiProperty()
  @IsUUID()
  unitId: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedAt?: string
}
