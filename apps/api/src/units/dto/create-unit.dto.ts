import { IsString, IsEnum, IsOptional, IsNumber, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UnitType } from '@condofortis/types'
import { Type } from 'class-transformer'

export class CreateUnitDto {
  @ApiProperty()
  @IsUUID()
  condominiumId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  blockId?: string

  @ApiProperty()
  @IsString()
  number: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  floor?: number

  @ApiPropertyOptional({ enum: UnitType })
  @IsOptional()
  @IsEnum(UnitType)
  type?: UnitType

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fraction?: number
}
