import { IsString, IsOptional, IsNotEmpty, IsNumber, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateCondominiumDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnpj?: string

  @ApiProperty()
  @IsString()
  street: string

  @ApiProperty()
  @IsString()
  number: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  complement?: string

  @ApiProperty()
  @IsString()
  neighborhood: string

  @ApiProperty()
  @IsString()
  city: string

  @ApiProperty()
  @IsString()
  state: string

  @ApiProperty()
  @IsString()
  zipCode: string

  @ApiPropertyOptional({ description: 'Taxa condominial mensal padrão (R$)', example: 650 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  monthlyFee?: number
}
