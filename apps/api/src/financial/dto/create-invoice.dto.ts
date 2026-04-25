import { IsString, IsUUID, IsNumber, IsDateString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  condominiumId: string

  @ApiProperty()
  @IsUUID()
  unitId: string

  @ApiProperty({ example: '2024-01' })
  @IsString()
  reference: string

  @ApiProperty()
  @IsDateString()
  dueDate: string

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  amount: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountAmount?: number
}

export class GenerateBulkInvoicesDto {
  @ApiProperty()
  @IsUUID()
  condominiumId: string

  @ApiProperty({ example: '2024-01' })
  @IsString()
  reference: string

  @ApiProperty()
  @IsDateString()
  dueDate: string
}
