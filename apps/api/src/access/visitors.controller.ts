import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { VisitorsService } from './visitors.service'
import { CreateVisitorDto } from './dto/create-visitor.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('Visitors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly service: VisitorsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC, UserRole.DOORMAN)
  @ApiOperation({ summary: 'Listar visitantes ativos' })
  findAll(@CurrentUser() user: any, @Query('condominiumId') condominiumId?: string) {
    return this.service.findAll(user.tenantId, condominiumId)
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC, UserRole.DOORMAN, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Cadastrar visitante / gerar QR Code' })
  create(@Body() dto: CreateVisitorDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.tenantId)
  }

  @Post('authorize')
  @Roles(UserRole.DOORMAN, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Autorizar acesso via QR Code' })
  authorize(@Body() body: { qrCode: string }) {
    return this.service.authorize(body.qrCode)
  }

  @Patch(':id/checkin')
  @Roles(UserRole.DOORMAN, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Registrar entrada do visitante' })
  checkin(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.checkin(id, user.tenantId)
  }

  @Patch(':id/checkout')
  @Roles(UserRole.DOORMAN, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Registrar saída do visitante' })
  checkout(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.checkout(id, user.tenantId)
  }

  @Patch(':id/deny')
  @Roles(UserRole.DOORMAN, UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Negar acesso ao visitante' })
  deny(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deny(id, user.tenantId)
  }
}
