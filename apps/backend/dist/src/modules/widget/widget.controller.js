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
const chat_service_1 = require("../chat/chat.service");
const appointments_service_1 = require("../appointments/appointments.service");
const widget_chat_dto_1 = require("./dto/widget-chat.dto");
const reschedule_appointment_dto_1 = require("./dto/reschedule-appointment.dto");
let WidgetController = class WidgetController {
    constructor(prisma, config, chat, appointments) {
        this.prisma = prisma;
        this.config = config;
        this.chat = chat;
        this.appointments = appointments;
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
    async publicChat(slug, body) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
            select: { id: true, name: true },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado.');
        const response = await this.chat.respondPublic(tenant.id, tenant.name, body.message.trim(), body.leadId, body.history);
        return { response };
    }
    async rescheduleAppointment(slug, appointmentId, body) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
            select: { id: true },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado.');
        return this.appointments.reschedule(tenant.id, appointmentId, body.email, body.newDate);
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
        const configUrl = `/api/v1/widget/${slug}/config`;
        const chatUrl = `/api/v1/widget/${slug}/chat`;
        const script = `
(function() {
  'use strict';

  var GE_SLUG    = '${slug}';
  var GE_CONFIG  = '${configUrl}';
  var GE_CHAT    = '${chatUrl}';

  // ── Session state ──────────────────────────────────────────────────────
  var state = { open: false, mode: 'quiz', leadId: null, history: [] };

  // ── Load config then bootstrap ─────────────────────────────────────────
  function loadConfig(cb) {
    fetch(GE_CONFIG)
      .then(function(r){ return r.json(); })
      .then(cb)
      .catch(function(e){ console.warn('[GE Widget] config error', e); });
  }

  // ── Build widget DOM ───────────────────────────────────────────────────
  function inject(cfg) {
    var color = cfg.primaryColor || '#7C3AED';
    var title = cfg.widgetTitle  || 'Chat';

    var style = document.createElement('style');
    style.textContent = [
      '#ge-btn{position:fixed;bottom:24px;right:24px;z-index:99999;',
        'width:56px;height:56px;border-radius:50%;background:' + color + ';',
        'border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.25);',
        'display:flex;align-items:center;justify-content:center;',
        'transition:transform .2s;}',
      '#ge-btn:hover{transform:scale(1.08);}',
      '#ge-btn svg{width:26px;height:26px;fill:white;}',
      '#ge-panel{position:fixed;bottom:96px;right:24px;z-index:99998;',
        'width:380px;height:600px;max-height:80vh;border-radius:20px;',
        'box-shadow:0 8px 40px rgba(0,0,0,.2);border:none;',
        'background:#fff;display:none;overflow:hidden;flex-direction:column;}',
      '#ge-panel.open{display:flex;}',
      /* quiz iframe */
      '#ge-quiz-frame{width:100%;height:100%;border:none;}',
      /* chat UI */
      '#ge-chat{display:none;flex-direction:column;height:100%;font-family:system-ui,sans-serif;}',
      '#ge-chat.active{display:flex;}',
      '#ge-chat-header{padding:14px 16px;background:' + color + ';color:#fff;',
        'font-weight:600;font-size:14px;border-radius:20px 20px 0 0;flex-shrink:0;}',
      '#ge-chat-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;}',
      '.ge-msg{max-width:80%;padding:9px 12px;border-radius:14px;font-size:13px;line-height:1.45;}',
      '.ge-msg.user{align-self:flex-end;background:' + color + ';color:#fff;}',
      '.ge-msg.bot{align-self:flex-start;background:#f0f0f0;color:#222;}',
      '.ge-msg.typing{color:#888;font-style:italic;}',
      '#ge-chat-form{display:flex;gap:6px;padding:10px;border-top:1px solid #eee;flex-shrink:0;}',
      '#ge-chat-input{flex:1;border:1px solid #ddd;border-radius:20px;padding:8px 14px;',
        'font-size:13px;outline:none;}',
      '#ge-chat-send{background:' + color + ';color:#fff;border:none;border-radius:20px;',
        'padding:8px 16px;cursor:pointer;font-size:13px;}',
    ].join('');
    document.head.appendChild(style);

    // Floating button
    var btn = document.createElement('button');
    btn.id = 'ge-btn';
    btn.setAttribute('aria-label', title);
    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
    document.body.appendChild(btn);

    // Panel container
    var panel = document.createElement('div');
    panel.id = 'ge-panel';
    document.body.appendChild(panel);

    // Quiz iframe (initial mode)
    var frame = document.createElement('iframe');
    frame.id  = 'ge-quiz-frame';
    if (cfg.quizUrl) frame.src = cfg.quizUrl;
    frame.setAttribute('allow', 'camera;microphone');
    panel.appendChild(frame);

    // Chat UI (hidden until quiz complete)
    var chatEl = document.createElement('div');
    chatEl.id  = 'ge-chat';
    chatEl.innerHTML = [
      '<div id="ge-chat-header">' + title + '</div>',
      '<div id="ge-chat-msgs"></div>',
      '<form id="ge-chat-form">',
        '<input id="ge-chat-input" type="text" placeholder="Escribe tu pregunta…" autocomplete="off"/>',
        '<button id="ge-chat-send" type="submit">Enviar</button>',
      '</form>',
    ].join('');
    panel.appendChild(chatEl);

    // ── Toggle open/close ────────────────────────────────────────────────
    btn.addEventListener('click', function() {
      state.open = !state.open;
      panel.className = state.open ? 'open' : '';
      btn.setAttribute('aria-expanded', String(state.open));
    });

    // ── Quiz → Chat transition ───────────────────────────────────────────
    window.addEventListener('message', function(e) {
      if (!e.data || e.data.type !== 'ge:quiz_complete') return;
      if (e.data.leadId) state.leadId = e.data.leadId;
      activateChat(title);
    });

    // ── Chat form submit ─────────────────────────────────────────────────
    var chatForm  = chatEl.querySelector('#ge-chat-form');
    var chatInput = chatEl.querySelector('#ge-chat-input');
    var chatMsgs  = chatEl.querySelector('#ge-chat-msgs');

    chatForm.addEventListener('submit', function(ev) {
      ev.preventDefault();
      var msg = chatInput.value.trim();
      if (!msg) return;
      chatInput.value = '';
      appendMsg(chatMsgs, msg, 'user');
      sendChat(msg, chatMsgs);
    });

    function activateChat(widgetTitle) {
      frame.style.display = 'none';
      chatEl.classList.add('active');
      state.mode = 'chat';
      var greeting = '\\u00a1Gracias por completar el formulario! \\u00bfEn qu\\u00e9 m\\u00e1s puedo ayudarte?';
      appendMsg(chatMsgs, greeting, 'bot');
    }

    function appendMsg(container, text, role) {
      var div = document.createElement('div');
      div.className = 'ge-msg ' + role;
      div.textContent = text;
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
      return div;
    }

    function sendChat(message, container) {
      var typingDiv = appendMsg(container, '…', 'bot typing');

      var payload = { message: message, history: state.history.slice(-10) };
      if (state.leadId) payload.leadId = state.leadId;

      fetch(GE_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          typingDiv.remove();
          var reply = (data && data.response) ? data.response : 'Un momento, te conectamos con un asesor.';
          appendMsg(container, reply, 'bot');
          state.history.push({ role: 'user',      content: message });
          state.history.push({ role: 'assistant', content: reply });
          if (state.history.length > 20) state.history = state.history.slice(-20);
        })
        .catch(function() {
          typingDiv.remove();
          appendMsg(container, 'Error de conexión. Intenta nuevamente.', 'bot typing');
        });
    }
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
    (0, common_1.Post)(':slug/chat'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, widget_chat_dto_1.WidgetChatDto]),
    __metadata("design:returntype", Promise)
], WidgetController.prototype, "publicChat", null);
__decorate([
    (0, common_1.Patch)(':slug/appointments/:appointmentId/reschedule'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Param)('appointmentId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, reschedule_appointment_dto_1.RescheduleAppointmentDto]),
    __metadata("design:returntype", Promise)
], WidgetController.prototype, "rescheduleAppointment", null);
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
        config_1.ConfigService,
        chat_service_1.ChatService,
        appointments_service_1.AppointmentsService])
], WidgetController);
//# sourceMappingURL=widget.controller.js.map