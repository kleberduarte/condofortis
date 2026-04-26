import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bull'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './common/prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { TenantsModule } from './tenants/tenants.module'
import { CondominiumsModule } from './condominiums/condominiums.module'
import { UnitsModule } from './units/units.module'
import { FinancialModule } from './financial/financial.module'
import { ReservationsModule } from './reservations/reservations.module'
import { AccessModule } from './access/access.module'
import { OccurrencesModule } from './occurrences/occurrences.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AssembliesModule } from './assemblies/assemblies.module'
import { EventsModule } from './events/events.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    CondominiumsModule,
    UnitsModule,
    FinancialModule,
    ReservationsModule,
    AccessModule,
    OccurrencesModule,
    NotificationsModule,
    AssembliesModule,
    EventsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
