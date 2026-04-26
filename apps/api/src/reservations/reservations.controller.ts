import { Controller, Get, Post, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ReservationsService } from './reservations.service'
import { CreateReservationDto } from './dto/create-reservation.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole } from '@condofortis/types'

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC, UserRole.DOORMAN)
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiOperation({ summary: 'Listar todas as reservas' })
  findAll(@CurrentUser() user: any, @Query('condominiumId') condominiumId?: string) {
    return this.service.findAll(user.tenantId, condominiumId)
  }

  @Get('mine')
  @ApiOperation({ summary: 'Minhas reservas' })
  findMine(@CurrentUser() user: any) {
    return this.service.findMyReservations(user.id, user.tenantId)
  }

  @Get('availability')
  @ApiQuery({ name: 'spaceId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiOperation({ summary: 'Verificar disponibilidade de espaço' })
  getAvailability(@Query('spaceId') spaceId: string, @Query('date') date: string) {
    return this.service.getAvailability(spaceId, date)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar reserva por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.tenantId)
  }

  @Post()
  @ApiOperation({ summary: 'Criar reserva' })
  create(@Body() dto: CreateReservationDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id, user.tenantId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar reserva' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC].includes(user.role)
    return this.service.cancel(id, user.id, user.tenantId, isAdmin)
  }
}
