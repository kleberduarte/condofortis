import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { OccurrencesService } from './occurrences.service'
import { CreateOccurrenceDto, UpdateOccurrenceStatusDto } from './dto/create-occurrence.dto'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('occurrences')
@ApiBearerAuth()
@Controller('occurrences')
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ocorrências' })
  findAll(
    @CurrentUser() user: { tenantId: string },
    @Query('condominiumId') condominiumId?: string,
  ) {
    return this.occurrencesService.findAll(user.tenantId, condominiumId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ocorrência por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: { tenantId: string }) {
    return this.occurrencesService.findOne(id, user.tenantId)
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nova ocorrência' })
  create(
    @Body() dto: CreateOccurrenceDto,
    @CurrentUser() user: { id: string; tenantId: string },
  ) {
    return this.occurrencesService.create(dto, user.tenantId, user.id)
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Atualizar status da ocorrência' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOccurrenceStatusDto,
    @CurrentUser() user: { tenantId: string },
  ) {
    return this.occurrencesService.updateStatus(id, user.tenantId, dto)
  }
}
