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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeService = void 0;
const common_1 = require("@nestjs/common");
const realtime_gateway_1 = require("./realtime.gateway");
let RealtimeService = class RealtimeService {
    constructor(gateway) {
        this.gateway = gateway;
    }
    notifyLeadScored(tenantId, payload) {
        this.gateway.emitLeadScored(tenantId, payload);
    }
    notifyHotAlert(tenantId, payload) {
        this.gateway.emitHotAlert(tenantId, payload);
    }
    notifyStageChanged(tenantId, payload) {
        this.gateway.emitStageChanged(tenantId, payload);
    }
    notifyNewMessage(tenantId, payload) {
        this.gateway.emitNewMessage(tenantId, payload);
    }
};
exports.RealtimeService = RealtimeService;
exports.RealtimeService = RealtimeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [realtime_gateway_1.RealtimeGateway])
], RealtimeService);
//# sourceMappingURL=realtime.service.js.map