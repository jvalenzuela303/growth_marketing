import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { WidgetChatDto } from './dto/widget-chat.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

/**
 * WidgetController — serves the embeddable chat widget assets.
 *
 * Public endpoints (no JWT required):
 *
 * GET  /api/v1/widget/:slug/config
 *   Returns JSON config (funnel URL, colors, title).
 *
 * GET  /api/v1/widget/:slug/widget.js
 *   Serves the widget bootstrap script.
 *   After quiz completion it transitions to an inline chat mode.
 *
 * POST /api/v1/widget/:slug/chat
 *   Gap 3 — 24/7 chatbot for anonymous visitors.
 *   Body: { message, leadId?, history? }
 *   Returns: { response }
 */
@Controller('widget')
export class WidgetController {
  constructor(
    private readonly prisma:        PrismaService,
    private readonly config:        ConfigService,
    private readonly chat:          ChatService,
    private readonly appointments:  AppointmentsService,
  ) {}

  @Get(':slug/config')
  async getConfig(@Param('slug') slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id:   true,
        name: true,
        slug: true,
        funnels: {
          where:   { status: 'active' },
          orderBy: { createdAt: 'asc' },
          take:    1,
          select:  { id: true, name: true },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    const firstFunnel = tenant.funnels[0];

    return {
      tenantSlug:  tenant.slug,
      tenantName:  tenant.name,
      widgetTitle: `Habla con ${tenant.name}`,
      primaryColor: '#7C3AED',
      position:     'bottom-right',
      funnelId:     firstFunnel?.id ?? null,
      quizUrl:      firstFunnel
        ? `${frontendUrl}/quiz/${firstFunnel.id}`
        : null,
    };
  }

  // ── Gap 3: 24/7 public chatbot ────────────────────────────────────────────

  @Post(':slug/chat')
  async publicChat(
    @Param('slug') slug: string,
    @Body() body: WidgetChatDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where:  { slug },
      select: { id: true, name: true },
    });

    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const response = await this.chat.respondPublic(
      tenant.id,
      tenant.name,
      body.message.trim(),
      body.leadId,
      body.history,
    );

    return { response };
  }

  // ── Servicios: self-service rescheduling ──────────────────────────────────

  /**
   * PATCH /api/v1/widget/:slug/appointments/:appointmentId/reschedule
   * Public — no JWT. Lead verifies ownership via email.
   * Allows patients/clients to move their appointment without contacting support.
   */
  @Patch(':slug/appointments/:appointmentId/reschedule')
  async rescheduleAppointment(
    @Param('slug') slug: string,
    @Param('appointmentId') appointmentId: string,
    @Body() body: RescheduleAppointmentDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where:  { slug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    return this.appointments.reschedule(tenant.id, appointmentId, body.email, body.newDate);
  }

  // ── Widget script ─────────────────────────────────────────────────────────

  @Get(':slug/widget.js')
  async getScript(@Param('slug') slug: string, @Res() res: Response) {
    const tenant = await this.prisma.tenant.findUnique({
      where:  { slug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      res.status(404).send('// Tenant not found');
      return;
    }

    const configUrl = `/api/v1/widget/${slug}/config`;
    const chatUrl   = `/api/v1/widget/${slug}/chat`;

    // Self-contained widget script — no external dependencies.
    // Flow:
    //   1. Load on any page via <script src="…/widget.js"></script>
    //   2. Floating button opens the quiz iframe
    //   3. On ge:quiz_complete → iframe hides, inline chat panel activates
    //   4. Chat POSTs to /api/v1/widget/:slug/chat (public, no JWT)
    const script = /* js */`
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
}
