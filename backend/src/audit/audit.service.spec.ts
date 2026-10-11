import { AuditService } from './audit.service';
import { presentAudit } from './audit.presenter';
import { AuditController } from './audit.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('presentAudit', () => {
  it('serializa la fecha y conserva el usuario o su ausencia', () => {
    const withUser = presentAudit({
      id: '1',
      action: 'CREATE',
      entity: 'Book',
      entityId: '2',
      ip: '127.0.0.1',
      metadata: { title: 'Rayuela' },
      createdAt: new Date('2026-03-01T12:00:00.000Z'),
      user: { id: 'u', email: 'a@b.c', name: 'Ana' },
    });
    expect(withUser.createdAt).toBe('2026-03-01T12:00:00.000Z');
    expect(withUser.user?.name).toBe('Ana');

    const anonymous = presentAudit({
      id: '1',
      action: 'LOGIN_FAILED',
      entity: 'User',
      entityId: null,
      ip: null,
      metadata: null,
      createdAt: new Date('2026-03-01T12:00:00.000Z'),
      user: null,
    });
    expect(anonymous.user).toBeNull();
  });
});

describe('AuditService', () => {
  const prisma = {
    auditLog: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const service = new AuditService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('persiste una entrada de auditoría', async () => {
    await service.log(prisma, {
      action: 'CREATE',
      entity: 'Book',
      entityId: null,
      userId: null,
      ip: null,
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CREATE', entity: 'Book' }),
    });
  });

  it('pagina la bitácora', async () => {
    prisma.auditLog.count.mockResolvedValue(0);
    prisma.auditLog.findMany.mockResolvedValue([]);
    const page = await service.findAll();
    expect(page.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 1 });

    prisma.auditLog.count.mockResolvedValue(25);
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: '1',
        action: 'LOGIN',
        entity: 'User',
        entityId: 'u',
        ip: null,
        metadata: null,
        createdAt: new Date('2026-03-01T12:00:00.000Z'),
        user: { id: 'u', email: 'a@b.c', name: 'Ana' },
      },
    ]);
    const second = await service.findAll(2, 10);
    expect(second.meta.totalPages).toBe(3);
    expect(second.data[0].action).toBe('LOGIN');
  });
});

describe('AuditController', () => {
  it('aplica los valores por defecto de paginación', async () => {
    const audit = { findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }) };
    const controller = new AuditController(audit as unknown as AuditService);
    await controller.findAll({});
    expect(audit.findAll).toHaveBeenCalledWith(1, 20);
    await controller.findAll({ page: 3, limit: 5 });
    expect(audit.findAll).toHaveBeenCalledWith(3, 5);
  });
});
