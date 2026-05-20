import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * RealtimeService — thin façade so other modules can emit WS events
 * without importing the gateway directly.
 *
 * Usage:
 *   constructor(private readonly realtime: RealtimeService) {}
 *   this.realtime.notifyLeadScored(tenantId, { leadId, score, segment });
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  notifyLeadScored(
    tenantId: string,
    payload: { leadId: string; score: number; segment: string },
  ) {
    this.gateway.emitLeadScored(tenantId, payload);
  }

  notifyHotAlert(
    tenantId: string,
    payload: { leadId: string; name: string; score: number },
  ) {
    this.gateway.emitHotAlert(tenantId, payload);
  }

  notifyStageChanged(
    tenantId: string,
    payload: { leadId: string; stage: string },
  ) {
    this.gateway.emitStageChanged(tenantId, payload);
  }

  notifyNewMessage(
    tenantId: string,
    payload: { conversationId: string; message: string; from: string },
  ) {
    this.gateway.emitNewMessage(tenantId, payload);
  }
}
