import { BadRequestException, NotFoundException, StreamableFile } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { BooksController } from './books.controller';

const authorId = '33333333-3333-4333-8333-333333333333';
const publisherId = '44444444-4444-4444-8444-444444444444';
const genreId = '22222222-2222-4222-8222-222222222222';
const actor = { userId: 'user-1', ip: '127.0.0.1' };

function bookRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Rayuela',
    price: { toString: () => '19990' },
    stock: 6,
    imageUrl: '/api/uploads/a.jpg',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    author: { id: authorId, name: 'Julio Cortázar' },
    publisher: { id: publisherId, name: 'Alfaguara' },
    genres: [{ genre: { id: genreId, name: 'Novela' } }],
    ...overrides,
  };
}

function createMocks() {
  const author = { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() };
  const publisher = { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() };
  const genre = { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn() };
  const book = {
    create: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const auditLog = { create: jest.fn() };
  const tx = { author, publisher, genre, book, auditLog };
  const prisma = {
    author,
    publisher,
    genre,
    book,
    auditLog,
    $transaction: jest.fn((arg: unknown) => {
      if (typeof arg === 'function') return (arg as (client: typeof tx) => unknown)(tx);
      return Promise.all(arg as Promise<unknown>[]);
    }),
  };
  const audit = { log: jest.fn() };
  const files = { save: jest.fn().mockReturnValue('/api/uploads/new.jpg'), remove: jest.fn() };
  const service = new BooksService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    files as unknown as FilesService,
  );
  return { service, prisma, tx, audit, files };
}

const file = { buffer: Buffer.from('img'), size: 3 } as Express.Multer.File;

function createDto(overrides: Partial<CreateBookDto> = {}): CreateBookDto {
  return {
    title: 'Rayuela',
    price: 19990,
    stock: 6,
    authorId,
    publisherId,
    genreIds: [genreId],
    genreNames: [],
    ...overrides,
  };
}

describe('BooksService', () => {
  it('lista con paginación y orden por defecto', async () => {
    const { service, tx } = createMocks();
    tx.book.count.mockResolvedValue(0);
    tx.book.findMany.mockResolvedValue([]);
    const page = await service.findAll({});
    expect(page.meta).toEqual({ page: 1, limit: 10, total: 0, totalPages: 1 });

    tx.book.count.mockResolvedValue(25);
    tx.book.findMany.mockResolvedValue([bookRecord()]);
    const next = await service.findAll({ page: 2, limit: 10, sort: 'title:asc' });
    expect(next.meta.totalPages).toBe(3);
    expect(next.data[0].title).toBe('Rayuela');
    expect(tx.book.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 10, take: 10, orderBy: [{ title: 'asc' }] }),
    );
  });

  it('rechaza un orden inválido', async () => {
    const { service } = createMocks();
    await expect(service.findAll({ sort: 'isbn:asc' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('obtiene un libro y responde 404 si no está', async () => {
    const { service, tx } = createMocks();
    tx.book.findFirst.mockResolvedValueOnce(bookRecord());
    await expect(service.findOne('11111111-1111-4111-8111-111111111111')).resolves.toMatchObject({
      title: 'Rayuela',
    });
    tx.book.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOne('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crea un libro con identificadores existentes', async () => {
    const { service, tx, audit, files } = createMocks();
    tx.author.findUnique.mockResolvedValue({ id: authorId });
    tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    tx.genre.findMany.mockResolvedValue([{ id: genreId }]);
    tx.book.create.mockResolvedValue(bookRecord());
    const created = await service.create(createDto(), file, actor);
    expect(created.available).toBe(true);
    expect(files.save).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'CREATE' }));
  });

  it('exige imagen y limpia el archivo si la transacción falla', async () => {
    const { service, files } = createMocks();
    await expect(service.create(createDto(), undefined, actor)).rejects.toThrow('obligatoria');

    files.save.mockReturnValue('/api/uploads/new.jpg');
    const failing = createMocks();
    failing.tx.author.findUnique.mockResolvedValue(null);
    await expect(failing.service.create(createDto(), file, actor)).rejects.toThrow('El autor no existe');
    expect(failing.files.remove).toHaveBeenCalledWith('/api/uploads/new.jpg');
  });

  it('crea autor, editorial y género por nombre, reutilizando los que ya existen', async () => {
    const { service, tx } = createMocks();
    tx.author.findFirst.mockResolvedValue({ id: authorId });
    tx.publisher.findFirst.mockResolvedValue(null);
    tx.publisher.create.mockResolvedValue({ id: publisherId });
    tx.genre.findFirst.mockResolvedValue(null);
    tx.genre.create.mockResolvedValue({ id: genreId });
    tx.book.create.mockResolvedValue(bookRecord());
    await service.create(
      createDto({
        authorId: undefined,
        authorName: 'Julio Cortázar',
        publisherId: undefined,
        publisherName: 'Alfaguara',
        genreIds: [],
        genreNames: ['Novela', '  '],
      }),
      file,
      actor,
    );
    expect(tx.publisher.create).toHaveBeenCalled();
    expect(tx.genre.create).toHaveBeenCalledWith({ data: { name: 'Novela' } });
  });

  it('recupera un nombre duplicado en carrera y vuelve a fallar si no aparece', async () => {
    const race = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' });
    const { service, tx } = createMocks();
    tx.author.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: authorId });
    tx.author.create.mockRejectedValueOnce(race);
    tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    tx.genre.findMany.mockResolvedValue([{ id: genreId }]);
    tx.book.create.mockResolvedValue(bookRecord());
    await service.create(createDto({ authorId: undefined, authorName: 'Cortázar' }), file, actor);

    const missing = createMocks();
    missing.tx.author.findFirst.mockResolvedValue(null);
    missing.tx.author.create.mockRejectedValue(race);
    await expect(
      missing.service.create(createDto({ authorId: undefined, authorName: 'Cortázar' }), file, actor),
    ).rejects.toBe(race);

    const other = createMocks();
    other.tx.author.findUnique.mockResolvedValue({ id: authorId });
    other.tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    other.tx.author.create.mockRejectedValue(new Error('caida'));
    other.tx.genre.findFirst.mockResolvedValue(null);
    other.tx.genre.create.mockRejectedValue(new Error('caida'));
    await expect(
      other.service.create(
        createDto({ genreIds: [], genreNames: ['Novela'] }),
        file,
        actor,
      ),
    ).rejects.toThrow('caida');
  });

  it('valida autor, editorial, género y largos', async () => {
    const { service, tx } = createMocks();
    tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    tx.genre.findMany.mockResolvedValue([{ id: genreId }]);
    await expect(service.create(createDto({ authorId: undefined }), file, actor)).rejects.toThrow(
      'Debe indicar un autor',
    );

    tx.author.findUnique.mockResolvedValue({ id: authorId });
    tx.publisher.findUnique.mockResolvedValue(null);
    await expect(service.create(createDto(), file, actor)).rejects.toThrow('La editorial no existe');

    const noPublisher = createMocks();
    noPublisher.tx.author.findUnique.mockResolvedValue({ id: authorId });
    await expect(
      noPublisher.service.create(createDto({ publisherId: undefined }), file, actor),
    ).rejects.toThrow('Debe indicar una editorial');

    const longAuthor = createMocks();
    await expect(
      longAuthor.service.create(
        createDto({ authorId: undefined, authorName: 'a'.repeat(121) }),
        file,
        actor,
      ),
    ).rejects.toThrow('demasiado largo');

    const badGenre = createMocks();
    badGenre.tx.author.findUnique.mockResolvedValue({ id: authorId });
    badGenre.tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    badGenre.tx.genre.findMany.mockResolvedValue([]);
    await expect(badGenre.service.create(createDto(), file, actor)).rejects.toThrow('no existen');

    const emptyGenre = createMocks();
    emptyGenre.tx.author.findUnique.mockResolvedValue({ id: authorId });
    emptyGenre.tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    await expect(
      emptyGenre.service.create(createDto({ genreIds: [], genreNames: ['   '] }), file, actor),
    ).rejects.toThrow('al menos un género');

    const longGenre = createMocks();
    longGenre.tx.author.findUnique.mockResolvedValue({ id: authorId });
    longGenre.tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    await expect(
      longGenre.service.create(createDto({ genreIds: [], genreNames: ['g'.repeat(61)] }), file, actor),
    ).rejects.toThrow('género');
  });

  it('reutiliza un género existente y resuelve una carrera al crearlo', async () => {
    const { service, tx } = createMocks();
    tx.author.findUnique.mockResolvedValue({ id: authorId });
    tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    tx.genre.findFirst.mockResolvedValue({ id: genreId });
    tx.book.create.mockResolvedValue(bookRecord());
    await service.create(createDto({ genreIds: [], genreNames: ['Novela'] }), file, actor);
    expect(tx.genre.create).not.toHaveBeenCalled();

    const race = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' });
    const racing = createMocks();
    racing.tx.author.findUnique.mockResolvedValue({ id: authorId });
    racing.tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    racing.tx.genre.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: genreId });
    racing.tx.genre.create.mockRejectedValue(race);
    racing.tx.book.create.mockResolvedValue(bookRecord());
    await racing.service.create(createDto({ genreIds: [], genreNames: ['Novela'] }), file, actor);

    const lost = createMocks();
    lost.tx.author.findUnique.mockResolvedValue({ id: authorId });
    lost.tx.publisher.findUnique.mockResolvedValue({ id: publisherId });
    lost.tx.genre.findFirst.mockResolvedValue(null);
    lost.tx.genre.create.mockRejectedValue(race);
    await expect(
      lost.service.create(createDto({ genreIds: [], genreNames: ['Novela'] }), file, actor),
    ).rejects.toBe(race);
  });

  it('actualiza campos, géneros e imagen, y borra la imagen anterior', async () => {
    const { service, tx, files } = createMocks();
    tx.book.findFirst.mockResolvedValue({ ...bookRecord(), imageUrl: '/api/uploads/old.jpg' });
    tx.author.findUnique.mockResolvedValue({ id: authorId });
    tx.publisher.findFirst.mockResolvedValue({ id: publisherId });
    tx.genre.findMany.mockResolvedValue([{ id: genreId }]);
    tx.book.update.mockResolvedValue(bookRecord({ title: 'Nuevo' }));
    const updated = await service.update(
      bookRecord().id,
      {
        title: 'Nuevo',
        price: 10,
        stock: 1,
        authorId,
        publisherName: 'Planeta',
        genreIds: [genreId, genreId],
      },
      file,
      actor,
    );
    expect(updated.title).toBe('Nuevo');
    expect(files.remove).toHaveBeenCalledWith('/api/uploads/old.jpg');
  });

  it('no toca relaciones si el parche no las incluye y limpia la imagen nueva si falla', async () => {
    const { service, tx, files } = createMocks();
    tx.book.findFirst.mockResolvedValue(bookRecord());
    tx.book.update.mockResolvedValue(bookRecord());
    await service.update(bookRecord().id, { title: 'Solo título' }, undefined, actor);
    expect(tx.author.findUnique).not.toHaveBeenCalled();
    expect(files.save).not.toHaveBeenCalled();

    const missing = createMocks();
    missing.tx.book.findFirst.mockResolvedValue(null);
    await expect(missing.service.update(bookRecord().id, {}, file, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(missing.files.remove).toHaveBeenCalledWith('/api/uploads/new.jpg');
  });

  it('hace soft delete y rechaza un libro que ya no está', async () => {
    const { service, tx, audit } = createMocks();
    tx.book.findFirst.mockResolvedValue(bookRecord());
    await expect(service.remove(bookRecord().id, actor)).resolves.toEqual({
      id: bookRecord().id,
      deleted: true,
    });
    expect(tx.book.update).toHaveBeenCalledWith({
      where: { id: bookRecord().id },
      data: { deletedAt: expect.any(Date) },
    });
    expect(audit.log).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'DELETE' }));

    tx.book.findFirst.mockResolvedValue(null);
    await expect(service.remove(bookRecord().id, actor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exporta la planilla de los libros filtrados y audita la operación', async () => {
    const { service, tx, audit } = createMocks();
    tx.book.findMany.mockResolvedValue([bookRecord({ stock: 0 })]);
    const file = await service.exportExcel({ search: 'rayuela' }, actor);
    expect(Buffer.isBuffer(file)).toBe(true);
    expect(file.subarray(0, 2).toString()).toBe('PK');
    expect(audit.log).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'EXPORT' }));
    await expect(service.exportExcel({ sort: 'malo' }, actor)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BooksController', () => {
  const user = { id: 'user-1', email: 'a@b.c' };
  const request = { ip: '10.0.0.8' } as never;

  it('delega cada operación', async () => {
    const books = {
      findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
      findOne: jest.fn().mockResolvedValue({ id: '1' }),
      create: jest.fn().mockResolvedValue({ id: '1' }),
      update: jest.fn().mockResolvedValue({ id: '1' }),
      remove: jest.fn().mockResolvedValue({ deleted: true }),
      exportExcel: jest.fn().mockResolvedValue(Buffer.from('xlsx')),
    };
    const controller = new BooksController(books as never);
    await controller.findAll({ page: 1 });
    await controller.findOne('11111111-1111-4111-8111-111111111111');
    await controller.create(createDto(), file, user, request);
    await controller.update('11111111-1111-4111-8111-111111111111', { title: 'A' }, undefined, user, request);
    await controller.remove('11111111-1111-4111-8111-111111111111', user, request);
    const exported = await controller.export({}, user, request);
    expect(exported).toBeInstanceOf(StreamableFile);
    expect(exported.getHeaders().type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(exported.getHeaders().disposition).toContain('.xlsx');
    expect(books.create).toHaveBeenCalledWith(expect.anything(), file, {
      userId: 'user-1',
      ip: '10.0.0.8',
    });
  });
});
