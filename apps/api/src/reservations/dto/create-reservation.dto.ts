import { IsUUID, IsString, IsDateString, IsOptional, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateReservationDto {
  @ApiProperty()
  @IsUUID()
  spaceId: string

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  date: string

  @ApiProperty({ example: '14:00' })
  @IsString()
  startTime: string

  @ApiProperty({ example: '18:00' })
  @IsString()
  endTime: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
