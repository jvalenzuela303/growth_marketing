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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const config_1 = require("@nestjs/config");
let WidgetController = class WidgetController {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async getConfig(slug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                funnels: {
                    where: { status: 'active' },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { id: true, name: true },
                },
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado.');
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        const firstFunnel = tenant.funnels[0];
        return {
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            widgetTitle: `Habla con ${tenant.name}`,
            primaryColor: '#7C3AED',
            position: 'bottom-right',
            funnelId: firstFunnel?.id ?? null,
            quizUrl: firstFunnel
                ? `${frontendUrl}/quiz/${firstFunnel.id}`
                : null,
        };
    }
    async getScript(slug, res) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
            select: { id: true, name: true },
        });
        if (!tenant) {
            res.status(404).send('// Tenant not found');
            return;
        }
        const apiBase = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        const configUrl = `/api/v1/widget/${slug}/config`;
        const script = `
(function() {
  'use strict';
  var GE_SLUG = '${slug}';
  var GE_API  = '${configUrl}';

  function loadConfig(cb) {
    fetch(GE_API)
      .then(function(r){ return r.json(); })
      .then(cb)
      .catch(function(e){ console.warn('[GE Widget] config error', e); });
  }

  function inject(cfg) {
    if (!cfg.quizUrl) return;

    var color = cfg.primaryColor || '#7C3AED';
    var title = cfg.widgetTitle  || 'Chat';

    // Styles
    var style = document.createElement('style');
    style.textContent = [
      '#ge-widget-btn{position:fixed;bottom:24px;right:24px;z-index:99999;',
        'width:56px;height:56px;border-radius:50%;background:' + color + ';',
        'border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.25);',
        'display:flex;align-items:center;justify-content:center;',
        'transition:transform .2s;}',
      '#ge-widget-btn:hover{transform:scale(1.08);}',
      '#ge-widget-btn svg{width:26px;height:26px;fill:white;}',
      '#ge-widget-frame{position:fixed;bottom:96px;right:24px;z-index:99998;',
        'width:380px;height:600px;max-height:80vh;border-radius:20px;',
        'box-shadow:0 8px 40px rgba(0,0,0,.2);border:none;',
        'background:#fff;display:none;overflow:hidden;}',
      '#ge-widget-frame.open{display:block;}',
    ].join('');
    document.head.appendChild(style);

    // Button
    var btn = document.createElement('button');
    btn.id = 'ge-widget-btn';
    btn.setAttribute('aria-label', title);
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    document.body.appendChild(btn);

    // Iframe
    var frame = document.createElement('iframe');
    frame.id  = 'ge-widget-frame';
    frame.src = cfg.quizUrl;
    frame.setAttribute('allow', 'camera;microphone');
    document.body.appendChild(frame);

    var open = false;
    btn.addEventListener('click', function() {
      open = !open;
      frame.className = open ? 'open' : '';
      btn.setAttribute('aria-expanded', String(open));
    });

    // Close when quiz sends a completion message
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'ge:quiz_complete') {
        open = false;
        frame.className = '';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ loadConfig(inject); });
  } else {
    loadConfig(inject);
  }
})();
`;
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(script);
    }
};
exports.WidgetController = WidgetController;
__decorate([
    (0, common_1.Get)(':slug/config'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WidgetController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Get)(':slug/widget.js'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WidgetController.prototype, "getScript", null);
exports.WidgetController = WidgetController = __decorate([
    (0, common_1.Controller)('widget'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], WidgetController);
//# sourceMappingURL=widget.controller.js.map