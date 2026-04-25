import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { UnitsService } from './units.service'
import { CreateUnitDto } from './dto/create-unit.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly service: UnitsService) {}

  @Get()
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiOperation({ summary: 'Listar unidades' })
  findAll(@CurrentUser() user: any, @Query('condominiumId') condominiumId?: string) {
    return this.service.findAll(user.tenantId, condominiumId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar unidade por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.tenantId)
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Criar unidade' })
  create(@Body() dto: CreateUnitDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.tenantId)
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Atualizar unidade' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateUnitDto>, @CurrentUser() user: any) {
    return this.service.update(id, user.tenantId, dto)
  }

  @Post(':id/residents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Adicionar morador à unidade' })
  addResident(@Param('id') id: string, @Body() body: { userId: string; isOwner?: boolean }, @CurrentUser() user: any) {
    return this.service.addResident(id, body.userId, body.isOwner ?? false, user.tenantId)
  }

  @Post(':id/residents/:userId/remove')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Remover morador da unidade' })
  removeResident(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeResident(id, userId)
  }

  @Get(':id/pets')
  @ApiOperation({ summary: 'Listar pets da unidade' })
  findPets(@Param('id') id: string) {
    return this.service.findPets(id)
  }

  @Post(':id/pets')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Cadastrar pet' })
  addPet(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.addPet(id, user.tenantId, body)
  }
}
