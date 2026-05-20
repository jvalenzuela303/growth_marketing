"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const inject_queue_decorator_1 = require("./inject-queue.decorator");
const scoring_processor_1 = require("./scoring.processor");
const messaging_processor_1 = require("./messaging.processor");
const followup_scheduler_1 = require("./followup.scheduler");
const messaging_module_1 = require("../modules/messaging/messaging.module");
const leads_module_1 = require("../modules/leads/leads.module");
const notifications_module_1 = require("../modules/notifications/notifications.module");
function createQueueProvider(name) {
    return {
        provide: (0, inject_queue_decorator_1.QUEUE_TOKEN)(name),
        inject: [config_1.ConfigService],
        useFactory: (config) => {
            return new bullmq_1.Queue(name, {
                connection: {
                    host: config.get('REDIS_HOST', 'localhost'),
                    port: config.get('REDIS_PORT', 6379),
                    password: config.get('REDIS_PASSWORD'),
                    db: config.get('REDIS_DB', 0),
                },
                defaultJobOptions: {
                    removeOnComplete: { count: 100 },
                    removeOnFail: { count: 500 },
                },
            });
        },
    };
}
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, messaging_module_1.MessagingModule, (0, common_1.forwardRef)(() => leads_module_1.LeadsModule), notifications_module_1.NotificationsModule],
        providers: [
            createQueueProvider('scoring'),
            createQueueProvider('messaging'),
            scoring_processor_1.ScoringProcessor,
            messaging_processor_1.MessagingProcessor,
            followup_scheduler_1.FollowUpScheduler,
        ],
        exports: [(0, inject_queue_decorator_1.QUEUE_TOKEN)('scoring'), (0, inject_queue_decorator_1.QUEUE_TOKEN)('messaging')],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map