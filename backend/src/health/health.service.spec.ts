import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  it('consulta la base y responde ok', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([1]) };
    const service = new HealthService(prisma as unknown as PrismaService);
    await expect(service.check()).resolves.toEqual({ status: 'ok' });
  });
});

describe('HealthController', () => {
  it('delega el chequeo', async () => {
    const health = { check: jest.fn().mockResolvedValue({ status: 'ok' }) };
    const controller = new HealthController(health as unknown as HealthService);
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
  });
});
