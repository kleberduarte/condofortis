import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OccurrenceStatus } from '@condofortis/types'

export class CreateOccurrenceDto {
  @ApiProperty()
  @IsUUID()
  condominiumId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  unitId?: string

  @ApiProperty()
  @IsString()
  title: string

  @ApiProperty()
  @IsString()
  description: string
}

export class UpdateOccurrenceStatusDto {
  @ApiProperty({ enum: OccurrenceStatus })
  @IsEnum(OccurrenceStatus)
  status: OccurrenceStatus
}
