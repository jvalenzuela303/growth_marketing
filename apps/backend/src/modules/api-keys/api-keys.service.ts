import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

const KEY_PREFIX = 'ge_';  // Growth Engine prefix
const KEY_BYTES  = 32;     // 256-bit entropy

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** List all non-revoked API keys for a tenant (no raw key in response). */
  async findAll(tenantId: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.apiKey.findMany({
        where: { tenantId, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          isActive: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
    );
  }

  /**
   * Generate a new API key. Returns the raw key ONCE — it is not stored.
   * Subsequent calls to findAll() show only the prefix (e.g. "ge_a1b2c3d4").
   */
  async create(tenantId: string, userId: string, dto: CreateApiKeyDto) {
    const rawKey   = KEY_PREFIX + randomBytes(KEY_BYTES).toString('hex');
    const keyHash  = this.hash(rawKey);
    const keyPrefix = rawKey.slice(0, 11); // "ge_" + 8 chars

    const record = await this.prisma.withTenant(tenantId, () =>
      this.prisma.apiKey.create({
        data: {
          tenantId,
          name:      dto.name,
          keyHash,
          keyPrefix,
          scopes:    dto.scopes ?? [],
          createdBy: userId,
          isActive:  true,
        },
      }),
    );

    this.logger.log(`API key creada: ${record.id} (${dto.name}) para tenant ${tenantId}`);

    // Return raw key ONCE
    return {
      id:     record.id,
      name:   record.name,
      key:    rawKey,          // shown only at creation
      prefix: record.keyPrefix,
      scopes: record.scopes,
      createdAt: record.createdAt,
    };
  }

  /** Revoke (soft-delete) an API key. */
  async revoke(tenantId: string, keyId: string) {
    const key = await this.prisma.withTenant(tenantId, () =>
      this.prisma.apiKey.findFirst({ where: { id: keyId, tenantId, revokedAt: null } }),
    );
    if (!key) throw new NotFoundException('API key no encontrada.');

    await this.prisma.withTenant(tenantId, () =>
      this.prisma.apiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date(), isActive: false },
      }),
    );
    return { revoked: true, id: keyId };
  }

  /**
   * Validate an incoming API key. Called by ApiKeyGuard.
   * Updates lastUsedAt on success.
   */
  async validate(rawKey: string): Promise<{ tenantId: string; scopes: string[] } | null> {
    const keyHash = this.hash(rawKey);

    const record = await this.prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!record) return null;

    // Update lastUsedAt asynchronously (don't await to not block the request)
    this.prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return { tenantId: record.tenantId, scopes: record.scopes };
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
