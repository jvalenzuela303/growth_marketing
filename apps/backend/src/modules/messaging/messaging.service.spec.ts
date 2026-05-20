/**
 * Unit tests — MessagingService
 *
 * Cubre el Channel Abstraction Layer:
 *   1. send(): enruta al canal correcto y persiste conversación
 *   2. sendTemplate(): enruta template y persiste
 *   3. Canal no soportado → BadRequestException
 *   4. Canal no disponible → MessageResult con error (sin excepción)
 *   5. Sin leadId → no persiste conversación
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { EmailChannel } from './channels/email.channel';
import { InstagramChannel } from './channels/instagram.channel';
import { PrismaService } from '../../database/prisma.service';
import type { MessageResult } from '@growth-engine/shared-types';

// ─── Factories ────────────────────────────────────────────────────────────────

const successResult: MessageResult = { success: true, externalMessageId: 'msg-ext-001' };
const failResult: MessageResult = { success: false, error: 'Canal no disponible.' };

const makeChannel = (available: boolean, result: MessageResult = successResult) => ({
  channel: 'whatsapp' as const,
  isAvailable: jest.fn().mockReturnValue(available),
  sendMessage: jest.fn().mockResolvedValue(result),
  sendTemplate: jest.fn().mockResolvedValue(result),
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('MessagingService', () => {
  let service: MessagingService;

  const mockWhatsApp = makeChannel(true);
  const mockEmail = makeChannel(true);
  const mockInstagram = makeChannel(false); // no disponible por defecto

  const mockPrismaConversation = { create: jest.fn().mockResolvedValue({}) };
  const mockWithTenant = jest.fn().mockImplementation((_tid, fn) => fn());

  beforeEach(async () => {
    // Reset mocks entre tests
    jest.clearAllMocks();
    mockWhatsApp.isAvailable.mockReturnValue(true);
    mockWhatsApp.sendMessage.mockResolvedValue(successResult);
    mockWhatsApp.sendTemplate.mockResolvedValue(successResult);
    mockEmail.isAvailable.mockReturnValue(true);
    mockInstagram.isAvailable.mockReturnValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: WhatsAppChannel,   useValue: mockWhatsApp },
        { provide: EmailChannel,      useValue: mockEmail },
        { provide: InstagramChannel,  useValue: mockInstagram },
        {
          provide: PrismaService,
          useValue: {
            withTenant: mockWithTenant,
            conversation: mockPrismaConversation,
          },
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
  });

  // ─── send() ─────────────────────────────────────────────────────────────────

  describe('send()', () => {
    it('enruta al canal WhatsApp y retorna resultado exitoso', async () => {
      const result = await service.send({
        tenantId: 'tenant-001',
        leadId: 'lead-001',
        channel: 'whatsapp',
        to: '+521234567890',
        content: 'Hola!',
      });

      expect(mockWhatsApp.sendMessage).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('persiste conversación en DB cuando hay leadId y tenantId', async () => {
      await service.send({
        tenantId: 'tenant-001',
        leadId: 'lead-001',
        channel: 'whatsapp',
        to: '+521234567890',
        content: 'Mensaje de prueba',
      });

      expect(mockPrismaConversation.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-001',
            leadId: 'lead-001',
            channel: 'whatsapp',
            role: 'assistant',
            status: 'sent',
          }),
        }),
      );
    });

    it('sin leadId: no persiste conversación', async () => {
      await service.send({
        tenantId: 'tenant-001',
        channel: 'whatsapp',
        to: '+521234567890',
        content: 'Broadcast',
      });

      expect(mockPrismaConversation.create).not.toHaveBeenCalled();
    });

    it('canal no soportado → BadRequestException', async () => {
      await expect(
        service.send({
          tenantId: 'tenant-001',
          channel: 'telegram' as any,
          to: 'user123',
          content: 'Hi',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('canal no disponible → retorna error sin lanzar excepción', async () => {
      const result = await service.send({
        tenantId: 'tenant-001',
        leadId: 'lead-001',
        channel: 'instagram',
        to: 'insta_user',
        content: 'Story reply',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('instagram');
      expect(mockInstagram.sendMessage).not.toHaveBeenCalled();
    });

    it('canal falla → persiste conversación con status=failed', async () => {
      mockWhatsApp.sendMessage.mockResolvedValue(failResult);

      await service.send({
        tenantId: 'tenant-001',
        leadId: 'lead-001',
        channel: 'whatsapp',
        to: '+521234567890',
        content: 'Mensaje fallido',
      });

      expect(mockPrismaConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        }),
      );
    });
  });

  // ─── sendTemplate() ──────────────────────────────────────────────────────────

  describe('sendTemplate()', () => {
    it('llama a sendTemplate del canal con nombre y parámetros correctos', async () => {
      await service.sendTemplate(
        'tenant-001',
        'lead-001',
        'whatsapp',
        '+521234567890',
        'bienvenida_v1',
        { name: 'Ana', segment: 'caliente' },
      );

      expect(mockWhatsApp.sendTemplate).toHaveBeenCalledWith(
        '+521234567890',
        'bienvenida_v1',
        { name: 'Ana', segment: 'caliente' },
      );
    });

    it('persiste conversación con templateName en metadata', async () => {
      await service.sendTemplate(
        'tenant-001',
        'lead-001',
        'whatsapp',
        '+521234567890',
        'hot_lead_1',
        { name: 'Juan' },
      );

      expect(mockPrismaConversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'hot_lead_1',
            metadata: expect.objectContaining({ templateName: 'hot_lead_1' }),
          }),
        }),
      );
    });

    it('canal no soportado → BadRequestException', async () => {
      await expect(
        service.sendTemplate('t-001', 'l-001', 'fax' as any, '+1', 'tmpl', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('canal no disponible → retorna error sin lanzar', async () => {
      const result = await service.sendTemplate(
        'tenant-001',
        'lead-001',
        'instagram',
        'user_insta',
        'welcome',
        {},
      );

      expect(result.success).toBe(false);
      expect(mockInstagram.sendTemplate).not.toHaveBeenCalled();
    });
  });
});
