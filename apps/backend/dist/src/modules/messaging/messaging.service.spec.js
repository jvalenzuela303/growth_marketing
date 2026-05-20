"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const messaging_service_1 = require("./messaging.service");
const whatsapp_channel_1 = require("./channels/whatsapp.channel");
const email_channel_1 = require("./channels/email.channel");
const instagram_channel_1 = require("./channels/instagram.channel");
const prisma_service_1 = require("../../database/prisma.service");
const successResult = { success: true, externalMessageId: 'msg-ext-001' };
const failResult = { success: false, error: 'Canal no disponible.' };
const makeChannel = (available, result = successResult) => ({
    channel: 'whatsapp',
    isAvailable: jest.fn().mockReturnValue(available),
    sendMessage: jest.fn().mockResolvedValue(result),
    sendTemplate: jest.fn().mockResolvedValue(result),
});
describe('MessagingService', () => {
    let service;
    const mockWhatsApp = makeChannel(true);
    const mockEmail = makeChannel(true);
    const mockInstagram = makeChannel(false);
    const mockPrismaConversation = { create: jest.fn().mockResolvedValue({}) };
    const mockWithTenant = jest.fn().mockImplementation((_tid, fn) => fn());
    beforeEach(async () => {
        jest.clearAllMocks();
        mockWhatsApp.isAvailable.mockReturnValue(true);
        mockWhatsApp.sendMessage.mockResolvedValue(successResult);
        mockWhatsApp.sendTemplate.mockResolvedValue(successResult);
        mockEmail.isAvailable.mockReturnValue(true);
        mockInstagram.isAvailable.mockReturnValue(false);
        const module = await testing_1.Test.createTestingModule({
            providers: [
                messaging_service_1.MessagingService,
                { provide: whatsapp_channel_1.WhatsAppChannel, useValue: mockWhatsApp },
                { provide: email_channel_1.EmailChannel, useValue: mockEmail },
                { provide: instagram_channel_1.InstagramChannel, useValue: mockInstagram },
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: {
                        withTenant: mockWithTenant,
                        conversation: mockPrismaConversation,
                    },
                },
            ],
        }).compile();
        service = module.get(messaging_service_1.MessagingService);
    });
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
            expect(mockPrismaConversation.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    tenantId: 'tenant-001',
                    leadId: 'lead-001',
                    channel: 'whatsapp',
                    role: 'assistant',
                    status: 'sent',
                }),
            }));
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
            await expect(service.send({
                tenantId: 'tenant-001',
                channel: 'telegram',
                to: 'user123',
                content: 'Hi',
            })).rejects.toThrow(common_1.BadRequestException);
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
            expect(mockPrismaConversation.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'failed' }),
            }));
        });
    });
    describe('sendTemplate()', () => {
        it('llama a sendTemplate del canal con nombre y parámetros correctos', async () => {
            await service.sendTemplate('tenant-001', 'lead-001', 'whatsapp', '+521234567890', 'bienvenida_v1', { name: 'Ana', segment: 'caliente' });
            expect(mockWhatsApp.sendTemplate).toHaveBeenCalledWith('+521234567890', 'bienvenida_v1', { name: 'Ana', segment: 'caliente' });
        });
        it('persiste conversación con templateName en metadata', async () => {
            await service.sendTemplate('tenant-001', 'lead-001', 'whatsapp', '+521234567890', 'hot_lead_1', { name: 'Juan' });
            expect(mockPrismaConversation.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    content: 'hot_lead_1',
                    metadata: expect.objectContaining({ templateName: 'hot_lead_1' }),
                }),
            }));
        });
        it('canal no soportado → BadRequestException', async () => {
            await expect(service.sendTemplate('t-001', 'l-001', 'fax', '+1', 'tmpl', {})).rejects.toThrow(common_1.BadRequestException);
        });
        it('canal no disponible → retorna error sin lanzar', async () => {
            const result = await service.sendTemplate('tenant-001', 'lead-001', 'instagram', 'user_insta', 'welcome', {});
            expect(result.success).toBe(false);
            expect(mockInstagram.sendTemplate).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=messaging.service.spec.js.map