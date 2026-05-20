import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QUEUE_TOKEN } from './inject-queue.decorator';
import { ScoringProcessor } from './scoring.processor';
import { MessagingProcessor } from './messaging.processor';
import { FollowUpScheduler } from './followup.scheduler';
import { MessagingModule } from '../modules/messaging/messaging.module';
import { LeadsModule } from '../modules/leads/leads.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

/**
 * Convenciones de nombres de colas y prioridades:
 *   scoring   → prioridad 2 (alta) — procesa leads recién capturados
 *   messaging → prioridad 3 (normal) — despacha secuencias WhatsApp/email
 *
 * Prioridades BullMQ (menor = más urgente):
 *   1 = crítica (hot lead alerts)
 *   2 = alta (scoring de nuevos leads)
 *   3 = normal (mensajería)
 *   5 = baja (reportes, sincronización CRM)
 */
function createQueueProvider(name: string) {
  return {
    provide: QUEUE_TOKEN(name),
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
      return new Queue(name, {
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD'),
          db: config.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 500 },
        },
      });
    },
  };
}

@Global()
@Module({
  imports: [ConfigModule, MessagingModule, forwardRef(() => LeadsModule), NotificationsModule],
  providers: [
    createQueueProvider('scoring'),
    createQueueProvider('messaging'),
    ScoringProcessor,
    MessagingProcessor,
    FollowUpScheduler,
  ],
  exports: [QUEUE_TOKEN('scoring'), QUEUE_TOKEN('messaging')],
})
export class QueueModule {}
