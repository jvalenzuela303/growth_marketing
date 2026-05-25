"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RealtimeGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
let RealtimeGateway = RealtimeGateway_1 = class RealtimeGateway {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.logger = new common_1.Logger(RealtimeGateway_1.name);
    }
    async handleConnection(client) {
        const token = client.handshake.auth?.token ||
            client.handshake.query?.token;
        if (!token) {
            this.logger.warn(`WS client ${client.id} connected without token — disconnecting`);
            client.disconnect(true);
            return;
        }
        try {
            const payload = this.jwtService.verify(token);
            const tenantId = payload.tenantId;
            if (!tenantId) {
                client.disconnect(true);
                return;
            }
            client.data.tenantId = tenantId;
            client.data.userId = payload.sub;
            await client.join(tenantId);
            this.logger.debug(`Client ${client.id} joined room ${tenantId}`);
        }
        catch {
            this.logger.warn(`WS client ${client.id} invalid token — disconnecting`);
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.debug(`Client ${client.id} disconnected`);
    }
    handlePing(client) {
        return { event: 'pong', data: 'pong' };
    }
    emitLeadScored(tenantId, payload) {
        this.server.to(tenantId).emit('lead:scored', { ...payload, tenantId });
    }
    emitHotAlert(tenantId, payload) {
        this.server.to(tenantId).emit('lead:hot_alert', { ...payload, tenantId });
    }
    emitStageChanged(tenantId, payload) {
        this.server.to(tenantId).emit('lead:stage_changed', { ...payload, tenantId });
    }
    emitNewMessage(tenantId, payload) {
        this.server.to(tenantId).emit('conversation:new_message', { ...payload, tenantId });
    }
};
exports.RealtimeGateway = RealtimeGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], RealtimeGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], RealtimeGateway.prototype, "handlePing", null);
exports.RealtimeGateway = RealtimeGateway = RealtimeGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL ?? 'http://localhost:4000',
            credentials: true,
        },
        namespace: '/realtime',
        transports: ['polling', 'websocket'],
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], RealtimeGateway);
//# sourceMappingURL=realtime.gateway.js.map