import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { presentAudit } from './audit.presenter';

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  userId?: string | null;
  ip?: string | null;
  metadata?: Prisma.InputJsonValue;
}

type AuditDb = {
  auditLog: {
    create: (args: { data: Prisma.AuditLogUncheckedCreateInput }) => Promise<unknown>;
  };
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(db: AuditDb, entry: AuditEntry) {
    this.logger.log(
      `${entry.action} ${entry.entity} ${entry.entityId ?? '-'} user=${entry.userId ?? 'anonymous'}`,
    );
    const data: Prisma.AuditLogUncheckedCreateInput = {
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? undefined,
      userId: entry.userId ?? undefined,
      ip: entry.ip ?? undefined,
      metadata: entry.metadata,
    };
    await db.auditLog.create({ data });
  }

  async findAll(page = 1, limit = 20) {
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
    ]);

    return {
      data: rows.map(presentAudit),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
