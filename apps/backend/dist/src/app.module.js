"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const jwt_1 = require("@nestjs/jwt");
const database_module_1 = require("./database/database.module");
const auth_module_1 = require("./modules/auth/auth.module");
const leads_module_1 = require("./modules/leads/leads.module");
const quiz_module_1 = require("./modules/quiz/quiz.module");
const funnels_module_1 = require("./modules/funnels/funnels.module");
const messaging_module_1 = require("./modules/messaging/messaging.module");
const webhooks_module_1 = require("./modules/webhooks/webhooks.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const settings_module_1 = require("./modules/settings/settings.module");
const queue_module_1 = require("./queue/queue.module");
const conversations_module_1 = require("./modules/conversations/conversations.module");
const ad_spend_module_1 = require("./modules/ad-spend/ad-spend.module");
const sequences_module_1 = require("./modules/sequences/sequences.module");
const appointments_module_1 = require("./modules/appointments/appointments.module");
const ad_campaigns_module_1 = require("./modules/ad-campaigns/ad-campaigns.module");
const ad_accounts_module_1 = require("./modules/ad-accounts/ad-accounts.module");
const google_ads_module_1 = require("./modules/google-ads/google-ads.module");
const audience_exports_module_1 = require("./modules/audience-exports/audience-exports.module");
const chat_module_1 = require("./modules/chat/chat.module");
const instagram_module_1 = require("./modules/instagram/instagram.module");
const realtime_module_1 = require("./modules/realtime/realtime.module");
const deals_module_1 = require("./modules/deals/deals.module");
const widget_module_1 = require("./modules/widget/widget.module");
const billing_module_1 = require("./modules/billing/billing.module");
const tiktok_ads_module_1 = require("./modules/tiktok-ads/tiktok-ads.module");
const automation_flows_module_1 = require("./modules/automation-flows/automation-flows.module");
const sms_module_1 = require("./modules/sms/sms.module");
const api_keys_module_1 = require("./modules/api-keys/api-keys.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const messenger_module_1 = require("./modules/messenger/messenger.module");
const budget_optimizer_module_1 = require("./modules/budget-optimizer/budget-optimizer.module");
const audit_module_1 = require("./modules/audit/audit.module");
const tenant_middleware_1 = require("./common/middleware/tenant.middleware");
const audit_middleware_1 = require("./common/middleware/audit.middleware");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(tenant_middleware_1.TenantMiddleware)
            .exclude({ path: 'api/v1/auth/login', method: common_1.RequestMethod.POST }, { path: 'api/v1/auth/register', method: common_1.RequestMethod.POST }, { path: 'api/v1/webhooks/(.*)', method: common_1.RequestMethod.ALL }, { path: 'api/v1/quiz/(.*)', method: common_1.RequestMethod.ALL }, { path: 'api/v1/instagram/webhook', method: common_1.RequestMethod.ALL }, { path: 'api/v1/instagram/oauth/callback', method: common_1.RequestMethod.GET }, { path: 'api/v1/google-ads/oauth/callback', method: common_1.RequestMethod.GET }, { path: 'api/v1/widget/(.*)', method: common_1.RequestMethod.ALL }, { path: 'api/v1/billing/webhook', method: common_1.RequestMethod.POST }, { path: 'api/v1/tiktok-ads/oauth/callback', method: common_1.RequestMethod.GET }, { path: 'api/v1/messenger/webhook', method: common_1.RequestMethod.ALL })
            .forRoutes('*');
        consumer
            .apply(audit_middleware_1.AuditMiddleware)
            .forRoutes('api/v1/*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => [
                    {
                        ttl: config.get('THROTTLE_TTL', 60000),
                        limit: config.get('THROTTLE_LIMIT', 100),
                    },
                ],
            }),
            jwt_1.JwtModule.registerAsync({
                global: true,
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET'),
                    signOptions: { expiresIn: '15m' },
                }),
            }),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            leads_module_1.LeadsModule,
            quiz_module_1.QuizModule,
            funnels_module_1.FunnelsModule,
            messaging_module_1.MessagingModule,
            webhooks_module_1.WebhooksModule,
            analytics_module_1.AnalyticsModule,
            settings_module_1.SettingsModule,
            queue_module_1.QueueModule,
            conversations_module_1.ConversationsModule,
            ad_spend_module_1.AdSpendModule,
            sequences_module_1.SequencesModule,
            appointments_module_1.AppointmentsModule,
            ad_campaigns_module_1.AdCampaignsModule,
            ad_accounts_module_1.AdAccountsModule,
            google_ads_module_1.GoogleAdsModule,
            audience_exports_module_1.AudienceExportsModule,
            chat_module_1.ChatModule,
            instagram_module_1.InstagramModule,
            realtime_module_1.RealtimeModule,
            deals_module_1.DealsModule,
            widget_module_1.WidgetModule,
            billing_module_1.BillingModule,
            tiktok_ads_module_1.TikTokAdsModule,
            automation_flows_module_1.AutomationFlowsModule,
            sms_module_1.SmsModule,
            api_keys_module_1.ApiKeysModule,
            notifications_module_1.NotificationsModule,
            messenger_module_1.MessengerModule,
            budget_optimizer_module_1.BudgetOptimizerModule,
            audit_module_1.AuditModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map