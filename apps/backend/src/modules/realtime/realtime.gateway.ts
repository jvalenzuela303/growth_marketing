import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

/**
 * RealtimeGateway — WebSocket server with tenant isolation via Socket.IO rooms.
 *
 * Auth: clients must pass the Bearer JWT as a query param `?token=<jwt>` or
 * via `auth: { token }` in the socket.io handshake.  Invalid tokens are
 * disconnected immediately.
 *
 * Rooms: each tenant gets its own room keyed by tenantId. Events emitted to
 * that room are received only by that tenant's connected clients.
 *
 * Events emitted by server:
 *   lead:scored        { leadId, score, segment, tenantId }
 *   lead:hot_alert     { leadId, name, score, tenantId }
 *   lead:stage_changed { leadId, stage, tenantId }
 *   conversation:new_message { conversationId, message, tenantId }
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:4000',
    credentials: true,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // ── Connection lifecycle ───────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.query?.token as string);

    if (!token) {
      this.logger.warn(`WS client ${client.id} connected without token — disconnecting`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      const tenantId: string = payload.tenantId;

      if (!tenantId) {
        client.disconnect(true);
        return;
      }

      // Store tenantId on socket for later use
      client.data.tenantId = tenantId;
      client.data.userId   = payload.sub;

      // Join tenant-scoped room
      await client.join(tenantId);
      this.logger.debug(`Client ${client.id} joined room ${tenantId}`);
    } catch {
      this.logger.warn(`WS client ${client.id} invalid token — disconnecting`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  // ── Ping / pong keep-alive ─────────────────────────────────────────────────

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): { event: string; data: string } {
    return { event: 'pong', data: 'pong' };
  }

  // ── Emit helpers (called by services) ─────────────────────────────────────

  emitLeadScored(tenantId: string, payload: {
    leadId: string;
    score: number;
    segment: string;
  }) {
    this.server.to(tenantId).emit('lead:scored', { ...payload, tenantId });
  }

  emitHotAlert(tenantId: string, payload: {
    leadId: string;
    name: string;
    score: number;
  }) {
    this.server.to(tenantId).emit('lead:hot_alert', { ...payload, tenantId });
  }

  emitStageChanged(tenantId: string, payload: {
    leadId: string;
    stage: string;
  }) {
    this.server.to(tenantId).emit('lead:stage_changed', { ...payload, tenantId });
  }

  emitNewMessage(tenantId: string, payload: {
    conversationId: string;
    message: string;
    from: string;
  }) {
    this.server.to(tenantId).emit('conversation:new_message', { ...payload, tenantId });
  }
}
