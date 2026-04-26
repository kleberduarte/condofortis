import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { FinancialService } from './financial.service'
import { CreateInvoiceDto, GenerateBulkInvoicesDto } from './dto/create-invoice.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { UserRole, InvoiceStatus } from '@condofortis/types'

@ApiTags('Financial')
@ApiBearerAuth()
@Controller('financial')
export class FinancialController {
  constructor(private readonly service: FinancialService) {}

  @Get('invoices')
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiOperation({ summary: 'Listar cobranças' })
  findAll(
    @CurrentUser() user: any,
    @Query('condominiumId') condominiumId?: string,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.service.findAll(user.tenantId, condominiumId, status)
  }

  @Get('invoices/overdue')
  @ApiQuery({ name: 'condominiumId', required: false })
  @ApiOperation({ summary: 'Listar inadimplentes' })
  getOverdue(@CurrentUser() user: any, @Query('condominiumId') condominiumId?: string) {
    return this.service.getOverdue(user.tenantId, condominiumId)
  }

  @Get('stats/:condominiumId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Resumo financeiro do condomínio' })
  getStats(@Param('condominiumId') condominiumId: string, @CurrentUser() user: any) {
    return this.service.getStats(user.tenantId, condominiumId)
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Buscar cobrança por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.tenantId)
  }

  @Post('invoices')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Criar cobrança individual' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.tenantId)
  }

  @Post('invoices/bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Gerar cobranças em massa para o condomínio' })
  generateBulk(@Body() dto: GenerateBulkInvoicesDto, @CurrentUser() user: any) {
    return this.service.generateBulk(dto, user.tenantId)
  }

  @Patch('invoices/:id/pay')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Marcar como pago' })
  markAsPaid(
    @Param('id') id: string,
    @Body() body: { paidAmount?: number },
    @CurrentUser() user: any,
  ) {
    return this.service.markAsPaid(id, user.tenantId, body.paidAmount)
  }

  @Delete('invoices/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Cancelar cobrança' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.cancel(id, user.tenantId)
  }
}
