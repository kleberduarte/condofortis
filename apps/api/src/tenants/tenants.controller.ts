import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { TenantsService, CreateTenantDto } from './tenants.service'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Listar todos os tenants' })
  findAll() {
    return this.tenantsService.findAll()
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Buscar tenant por ID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id)
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Criar novo tenant' })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto)
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Atualizar tenant (plano, status)' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateTenantDto> & { isActive?: boolean }) {
    return this.tenantsService.update(id, dto)
  }
}
