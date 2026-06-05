import { Module } from '@nestjs/common';
import { GestionClinicaWebhookService } from './gestion-clinica-webhook.service';

@Module({
  providers: [GestionClinicaWebhookService],
  exports: [GestionClinicaWebhookService],
})
export class GestionClinicaModule {}
