import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * WidgetController — serves the embeddable chat widget assets.
 *
 * Two public endpoints (no JWT required):
 *
 * GET /api/v1/widget/:tenantSlug/config
 *   Returns JSON config for the widget (funnel URL, colors, title).
 *   Called by the widget script on load.
 *
 * GET /api/v1/widget/:tenantSlug/widget.js
 *   Serves the widget bootstrap script that injects the floating button + iframe.
 *   Clients embed: <script src="https://app.example.com/api/v1/widget/acme/widget.js"></script>
 */
@Controller('widget')
export class WidgetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
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
      primaryColor: '#7C3AED',   // brand-600 purple — override in settings later
      position:     'bottom-right',
      funnelId:     firstFunnel?.id ?? null,
      quizUrl:      firstFunnel
        ? `${frontendUrl}/quiz/${firstFunnel.id}`
        : null,
    };
  }

  @Get(':slug/widget.js')
  async getScript(@Param('slug') slug: string, @Res() res: Response) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      res.status(404).send('// Tenant not found');
      return;
    }

    const apiBase    = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    const configUrl  = `/api/v1/widget/${slug}/config`;

    // Minified inline script — no external dependencies
    const script = /* js */`
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
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5min cache
    res.send(script);
  }
}
