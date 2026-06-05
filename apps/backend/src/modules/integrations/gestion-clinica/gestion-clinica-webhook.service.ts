import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LeadScoreUpdatePayload {
  event: 'lead_scored';
  leadId: string;
  externalId: string;
  totalScore: number;
  segment: string;
  quizScore: number;
  behaviorScore: number;
  engagementScore: number;
  demographicScore: number;
  conversionProbability?: number;
}

/**
 * Servicio de integración saliente: Growth Marketing → Gestión Clínica.
 *
 * Cuando el AI Engine puntúa un lead originado en Gestión Clínica (identificado
 * por la tag `ext:<gcLeadCaptureId>` o por el campo `source = 'gestion_clinica'`),
 * este servicio envía la actualización de score al webhook de GC.
 *
 * Auth: incluye el header `X-Service-Token` con el valor de `GESTION_CLINICA_WEBHOOK_SECRET`.
 * GC valida este token contra `gm.webhook-secret` en su entorno.
 *
 * Si las variables de entorno no están configuradas, las llamadas se omiten
 * silenciosamente (fail-safe) para no interrumpir el flujo principal de scoring.
 */
@Injectable()
export class GestionClinicaWebhookService {
  private readonly logger = new Logger(GestionClinicaWebhookService.name);

  private readonly baseUrl: string;
  private readonly webhookSecret: string;
  private readonly webhookPath = '/api/v1/integrations/growth-marketing/webhook';

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>('GESTION_CLINICA_URL', '');
    this.webhookSecret = config.get<string>('GESTION_CLINICA_WEBHOOK_SECRET', '');
  }

  /**
   * Envía el score calculado al webhook de Gestión Clínica.
   *
   * @param lead       objeto lead de Prisma (debe tener `id` y `tags`)
   * @param scores     componentes del score calculado
   * @param segment    segmento asignado (fuego, caliente, tibio, frio)
   */
  async notifyLeadScored(
    lead: {
      id: string;
      tags: string[];
      quizScore?: number | null;
      behaviorScore?: number | null;
      engagementScore?: number | null;
      demographicScore?: number | null;
    },
    scores: {
      quizScore: number;
      behaviorScore: number;
      engagementScore: number;
      demographicScore: number;
    },
    segment: string,
  ): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    // Extraer externalId de las tags (formato: "ext:<gcLeadCaptureId>")
    const externalId = this.extractExternalId(lead.tags);
    if (!externalId) {
      // Lead no originado en GC — no enviar webhook
      return;
    }

    const totalScore =
      scores.quizScore + scores.behaviorScore + scores.engagementScore + scores.demographicScore;

    const payload: LeadScoreUpdatePayload = {
      event: 'lead_scored',
      leadId: lead.id,
      externalId,
      totalScore,
      segment,
      quizScore: scores.quizScore,
      behaviorScore: scores.behaviorScore,
      engagementScore: scores.engagementScore,
      demographicScore: scores.demographicScore,
    };

    const url = `${this.baseUrl}${this.webhookPath}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Token': this.webhookSecret,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      if (!response.ok) {
        this.logger.error(
          `Webhook GC falló. leadId=${lead.id}, externalId=${externalId}, status=${response.status}`,
        );
      } else {
        this.logger.log(
          `Score enviado a GC. leadId=${lead.id}, externalId=${externalId}, score=${totalScore}, segment=${segment}`,
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Error al enviar webhook a GC. leadId=${lead.id}, causa=${message}`,
      );
    }
  }

  private isConfigured(): boolean {
    return this.baseUrl.length > 0 && this.webhookSecret.length > 0;
  }

  private extractExternalId(tags: string[]): string | null {
    const tag = tags.find((t) => t.startsWith('ext:'));
    return tag ? tag.slice(4) : null;
  }
}
