import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AssembliesService, CreateAssemblyDto, CreatePollDto } from './assemblies.service'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('Assemblies')
@ApiBearerAuth()
@Controller('assemblies')
export class AssembliesController {
  constructor(private readonly service: AssembliesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar assembleias' })
  findAll(
    @CurrentUser() user: any,
    @Query('condominiumId') condominiumId?: string,
  ) {
    return this.service.findAll(user.tenantId, condominiumId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar assembleia por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Criar assembleia' })
  create(@Body() dto: CreateAssemblyDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.tenantId)
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Atualizar status da assembleia' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'SCHEDULED' | 'OPEN' | 'CLOSED',
    @CurrentUser() user: any,
  ) {
    return this.service.updateStatus(id, user.tenantId, status)
  }

  @Post(':id/polls')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Adicionar votação à assembleia' })
  addPoll(@Param('id') id: string, @Body() dto: CreatePollDto, @CurrentUser() user: any) {
    return this.service.addPoll(id, user.tenantId, dto)
  }

  @Post('polls/:pollId/vote/:optionId')
  @ApiOperation({ summary: 'Registrar voto' })
  vote(
    @Param('pollId') pollId: string,
    @Param('optionId') optionId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.vote(pollId, optionId, user.sub)
  }
}
