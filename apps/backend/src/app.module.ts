import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { LeadsModule } from './modules/leads/leads.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { FunnelsModule } from './modules/funnels/funnels.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingsModule } from './modules/settings/settings.module';
import { QueueModule } from './queue/queue.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { AdSpendModule } from './modules/ad-spend/ad-spend.module';
import { SequencesModule } from './modules/sequences/sequences.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AdCampaignsModule } from './modules/ad-campaigns/ad-campaigns.module';
import { AdAccountsModule } from './modules/ad-accounts/ad-accounts.module';
import { GoogleAdsModule } from './modules/google-ads/google-ads.module';
import { AudienceExportsModule } from './modules/audience-exports/audience-exports.module';
import { ChatModule } from './modules/chat/chat.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { DealsModule } from './modules/deals/deals.module';
import { WidgetModule } from './modules/widget/widget.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminBillingModule } from './modules/admin-billing/admin-billing.module';
import { TikTokAdsModule } from './modules/tiktok-ads/tiktok-ads.module';
import { AutomationFlowsModule } from './modules/automation-flows/automation-flows.module';
import { SmsModule } from './modules/sms/sms.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MessengerModule } from './modules/messenger/messenger.module';
import { BudgetOptimizerModule } from './modules/budget-optimizer/budget-optimizer.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { MailModule } from './common/mail/mail.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { RolesGuard } from './common/guards/roles.guard';
import { PlanGuard } from './common/guards/plan.guard';

@Module({
  imports: [
    // Configuración global — carga .env antes que todo
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting global: 100 req/min por IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // JwtModule global para que TenantMiddleware pueda verificar tokens
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),

    MailModule,
    DatabaseModule,
    AuthModule,
    LeadsModule,
    QuizModule,
    FunnelsModule,
    MessagingModule,
    WebhooksModule,
    AnalyticsModule,
    SettingsModule,
    QueueModule,
    ConversationsModule,
    AdSpendModule,
    SequencesModule,
    AppointmentsModule,
    AdCampaignsModule,
    AdAccountsModule,
    GoogleAdsModule,
    AudienceExportsModule,
    ChatModule,
    InstagramModule,
    RealtimeModule,
    DealsModule,
    WidgetModule,
    BillingModule,
    AdminBillingModule,
    TikTokAdsModule,
    AutomationFlowsModule,
    SmsModule,
    ApiKeysModule,
    NotificationsModule,
    MessengerModule,
    BudgetOptimizerModule,
    AuditModule,
    EcommerceModule,
    UsersModule,
  ],
  // RolesGuard and PlanGuard use Reflector from @nestjs/core.
  // Registering here makes them available for injection in any module
  // without needing to declare them in each feature module separately.
  providers: [RolesGuard, PlanGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplica TenantMiddleware a todas las rutas protegidas
    // Las rutas públicas (quiz, webhook) simplemente no tendrán tenantId en req
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/auth/login', method: RequestMethod.POST },
        { path: 'api/v1/auth/register', method: RequestMethod.POST },
        { path: 'api/v1/webhooks/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/quiz/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/instagram/webhook', method: RequestMethod.ALL },
        { path: 'api/v1/instagram/oauth/callback', method: RequestMethod.GET },
        { path: 'api/v1/google-ads/oauth/callback', method: RequestMethod.GET },
        { path: 'api/v1/widget/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/billing/webhook', method: RequestMethod.POST },
        { path: 'api/v1/tiktok-ads/oauth/callback', method: RequestMethod.GET },
        { path: 'api/v1/messenger/webhook', method: RequestMethod.ALL },
      )
      .forRoutes('*');

    // AuditMiddleware — logs mutating requests (POST/PUT/PATCH/DELETE) to audit_logs
    consumer
      .apply(AuditMiddleware)
      .forRoutes('api/v1/*');
  }
}
