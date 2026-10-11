import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogService', () => {
  const prisma = {
    author: { findMany: jest.fn().mockResolvedValue([{ id: 'a', name: 'Ana' }]) },
    publisher: { findMany: jest.fn().mockResolvedValue([{ id: 'p', name: 'Planeta' }]) },
    genre: { findMany: jest.fn().mockResolvedValue([{ id: 'g', name: 'Novela' }]) },
  };
  const service = new CatalogService(prisma as unknown as PrismaService);

  it('lista autores, editoriales y géneros ordenados', async () => {
    await expect(service.findAuthors()).resolves.toEqual([{ id: 'a', name: 'Ana' }]);
    await expect(service.findPublishers()).resolves.toEqual([{ id: 'p', name: 'Planeta' }]);
    await expect(service.findGenres()).resolves.toEqual([{ id: 'g', name: 'Novela' }]);
    expect(prisma.author.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  });
});

describe('CatalogController', () => {
  it('delega cada listado', async () => {
    const catalog = {
      findAuthors: jest.fn().mockResolvedValue([]),
      findPublishers: jest.fn().mockResolvedValue([]),
      findGenres: jest.fn().mockResolvedValue([]),
    };
    const controller = new CatalogController(catalog as unknown as CatalogService);
    await controller.authors();
    await controller.publishers();
    await controller.genres();
    expect(catalog.findAuthors).toHaveBeenCalled();
    expect(catalog.findPublishers).toHaveBeenCalled();
    expect(catalog.findGenres).toHaveBeenCalled();
  });
});
