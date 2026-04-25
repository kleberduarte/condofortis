import { IsString, IsOptional, IsNotEmpty } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

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
}
