import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { env } from './config/env';
import { getJwtKeys } from './config/jwt-keys';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ClientesModule } from './clientes/clientes.module';
import { ProfissionaisModule } from './profissionais/profissionais.module';
import { ServicosModule } from './servicos/servicos.module';
import { AgendamentosModule } from './agendamentos/agendamentos.module';
import { ProdutosModule } from './produtos/produtos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { VendasModule } from './vendas/vendas.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ConfiguracoesModule } from './configuracoes/configuracoes.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    EventEmitterModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const keys = getJwtKeys();
        return {
          privateKey: keys.privateKey,
          publicKey: keys.publicKey,
          signOptions: { algorithm: 'RS256', expiresIn: env.JWT_ACCESS_TTL },
        };
      },
    }),
    AuthModule,
    UsuariosModule,
    ClientesModule,
    ProfissionaisModule,
    ServicosModule,
    AgendamentosModule,
    ProdutosModule,
    EstoqueModule,
    VendasModule,
    RelatoriosModule,
    DashboardModule,
    WhatsAppModule,
    ConfiguracoesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Ordem: o NestJS executa interceptors na ordem inversa de registro.
    // Tenant deve rodar antes do Logging para que os logs incluam contexto de tenant.
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
