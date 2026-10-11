import { PrismaClient } from '@prisma/client';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('abre y cierra la conexión en el ciclo de vida del módulo', async () => {
    const connect = jest.spyOn(PrismaClient.prototype, '$connect').mockResolvedValue();
    const disconnect = jest.spyOn(PrismaClient.prototype, '$disconnect').mockResolvedValue();
    const service = new PrismaService();
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(connect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    connect.mockRestore();
    disconnect.mockRestore();
  });
});
