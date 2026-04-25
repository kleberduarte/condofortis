import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CondominiumsService } from './condominiums.service'
import { CreateCondominiumDto } from './dto/create-condominium.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('Condominiums')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('condominiums')
export class CondominiumsController {
  constructor(private readonly service: CondominiumsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar condomínios do tenant' })
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.tenantId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar condomínio por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar condomínio' })
  create(@Body() dto: CreateCondominiumDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.tenantId)
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Atualizar condomínio' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCondominiumDto>, @CurrentUser() user: any) {
    return this.service.update(id, user.tenantId, dto)
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Desativar condomínio' })
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user.tenantId)
  }

  @Get(':id/blocks')
  @ApiOperation({ summary: 'Listar blocos do condomínio' })
  findBlocks(@Param('id') id: string) {
    return this.service.findBlocks(id)
  }

  @Post(':id/blocks')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Criar bloco' })
  createBlock(@Param('id') id: string, @Body() body: { name: string }, @CurrentUser() user: any) {
    return this.service.createBlock(id, body.name, user.tenantId)
  }

  @Get(':id/spaces')
  @ApiOperation({ summary: 'Listar espaços comuns' })
  findSpaces(@Param('id') id: string) {
    return this.service.findSpaces(id)
  }

  @Post(':id/spaces')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Criar espaço comum' })
  createSpace(@Param('id') id: string, @Body() body: any) {
    return this.service.createSpace(id, body)
  }
}
