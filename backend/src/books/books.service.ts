import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Actor } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { booksToWorkbook } from '../common/utils/excel';
import { parseSort } from '../common/utils/parse-sort';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { presentBook } from './book.presenter';
import { bookInclude, buildBookWhere } from './book.query';
import { CreateBookDto } from './dto/create-book.dto';
import { BookQueryDto } from './dto/book-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

type Tx = Prisma.TransactionClient;

interface NameDelegate {
  findFirst: (args: {
    where: { name: { equals: string; mode: 'insensitive' } };
  }) => Promise<{ id: string } | null>;
  create: (args: { data: { name: string } }) => Promise<{ id: string }>;
}

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
  ) {}

  async findAll(query: BookQueryDto) {
    const orderBy = this.orderBy(query.sort);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where = buildBookWhere(query);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.book.count({ where }),
      this.prisma.book.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: bookInclude,
      }),
    ]);

    return {
      data: rows.map(presentBook),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findFirst({
      where: { id, deletedAt: null },
      include: bookInclude,
    });
    if (!book) throw new NotFoundException('Libro no encontrado');
    return presentBook(book);
  }

  async create(dto: CreateBookDto, file: Express.Multer.File | undefined, actor: Actor) {
    if (!file) throw new BadRequestException('La imagen del libro es obligatoria');
    const imageUrl = this.files.save(file);
    try {
      const book = await this.prisma.$transaction(async (tx) => {
        const authorId = await this.resolveAuthor(tx, dto.authorId, dto.authorName);
        const publisherId = await this.resolvePublisher(tx, dto.publisherId, dto.publisherName);
        const genreIds = await this.resolveGenreIds(tx, dto.genreIds, dto.genreNames);
        const created = await tx.book.create({
          data: {
            title: dto.title,
            price: new Prisma.Decimal(dto.price),
            stock: dto.stock,
            imageUrl,
            authorId,
            publisherId,
            genres: { create: genreIds.map((genreId) => ({ genreId })) },
          },
          include: bookInclude,
        });
        await this.audit.log(tx, {
          action: 'CREATE',
          entity: 'Book',
          entityId: created.id,
          userId: actor.userId,
          ip: actor.ip,
          metadata: { title: created.title },
        });
        return created;
      });
      return presentBook(book);
    } catch (error) {
      this.files.remove(imageUrl);
      throw error;
    }
  }

  async update(id: string, dto: UpdateBookDto, file: Express.Multer.File | undefined, actor: Actor) {
    const imageUrl = file ? this.files.save(file) : undefined;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const current = await tx.book.findFirst({ where: { id, deletedAt: null } });
        if (!current) throw new NotFoundException('Libro no encontrado');

        const data: Prisma.BookUpdateInput = {};
        if (dto.title !== undefined) data.title = dto.title;
        if (dto.price !== undefined) data.price = new Prisma.Decimal(dto.price);
        if (dto.stock !== undefined) data.stock = dto.stock;
        if (imageUrl) data.imageUrl = imageUrl;
        if (dto.authorId !== undefined || dto.authorName !== undefined) {
          data.author = { connect: { id: await this.resolveAuthor(tx, dto.authorId, dto.authorName) } };
        }
        if (dto.publisherId !== undefined || dto.publisherName !== undefined) {
          data.publisher = {
            connect: { id: await this.resolvePublisher(tx, dto.publisherId, dto.publisherName) },
          };
        }
        if (dto.genreIds !== undefined || dto.genreNames !== undefined) {
          const genreIds = await this.resolveGenreIds(tx, dto.genreIds ?? [], dto.genreNames ?? []);
          data.genres = {
            deleteMany: {},
            create: genreIds.map((genreId) => ({ genreId })),
          };
        }

        const updated = await tx.book.update({ where: { id }, data, include: bookInclude });
        await this.audit.log(tx, {
          action: 'UPDATE',
          entity: 'Book',
          entityId: id,
          userId: actor.userId,
          ip: actor.ip,
          metadata: { title: updated.title },
        });
        return { updated, previousImage: current.imageUrl };
      });

      if (imageUrl && result.previousImage && result.previousImage !== imageUrl) {
        this.files.remove(result.previousImage);
      }
      return presentBook(result.updated);
    } catch (error) {
      if (imageUrl) this.files.remove(imageUrl);
      throw error;
    }
  }

  async remove(id: string, actor: Actor) {
    await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.findFirst({ where: { id, deletedAt: null } });
      if (!book) throw new NotFoundException('Libro no encontrado');
      await tx.book.update({ where: { id }, data: { deletedAt: new Date() } });
      await this.audit.log(tx, {
        action: 'DELETE',
        entity: 'Book',
        entityId: id,
        userId: actor.userId,
        ip: actor.ip,
        metadata: { soft: true, title: book.title },
      });
    });
    return { id, deleted: true };
  }

  async exportExcel(query: BookQueryDto, actor: Actor) {
    const orderBy = this.orderBy(query.sort);
    const where = buildBookWhere(query);
    const rows = await this.prisma.$transaction(async (tx) => {
      const books = await tx.book.findMany({ where, orderBy, include: bookInclude });
      await this.audit.log(tx, {
        action: 'EXPORT',
        entity: 'Book',
        userId: actor.userId,
        ip: actor.ip,
        metadata: { total: books.length },
      });
      return books;
    });
    return booksToWorkbook(rows.map(presentBook));
  }

  private orderBy(sort?: string) {
    const parsed = parseSort(sort);
    if (parsed.error || !parsed.orderBy) {
      throw new BadRequestException(parsed.error ?? 'Ordenamiento inválido');
    }
    return parsed.orderBy as Prisma.BookOrderByWithRelationInput[];
  }

  private async resolveAuthor(tx: Tx, authorId?: string, authorName?: string) {
    if (authorId) {
      const author = await tx.author.findUnique({ where: { id: authorId } });
      if (!author) throw new BadRequestException('El autor no existe');
      return author.id;
    }
    return this.resolveByName(tx.author as unknown as NameDelegate, authorName, {
      required: 'Debe indicar un autor',
      tooLong: 'El nombre del autor es demasiado largo',
    }, 120);
  }

  private async resolvePublisher(tx: Tx, publisherId?: string, publisherName?: string) {
    if (publisherId) {
      const publisher = await tx.publisher.findUnique({ where: { id: publisherId } });
      if (!publisher) throw new BadRequestException('La editorial no existe');
      return publisher.id;
    }
    return this.resolveByName(tx.publisher as unknown as NameDelegate, publisherName, {
      required: 'Debe indicar una editorial',
      tooLong: 'El nombre de la editorial es demasiado largo',
    }, 120);
  }

  private async resolveByName(
    delegate: NameDelegate,
    raw: string | undefined,
    messages: { required: string; tooLong: string },
    max: number,
  ) {
    const name = raw?.trim();
    if (!name) throw new BadRequestException(messages.required);
    if (name.length > max) throw new BadRequestException(messages.tooLong);
    const existing = await delegate.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing.id;
    try {
      const created = await delegate.create({ data: { name } });
      return created.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const again = await delegate.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (again) return again.id;
      }
      throw error;
    }
  }

  private async resolveGenreIds(tx: Tx, genreIds: string[] = [], genreNames: string[] = []) {
    const ids = new Set<string>();
    const uniqueIds = [...new Set(genreIds.filter(Boolean))];
    if (uniqueIds.length) {
      const found = await tx.genre.findMany({ where: { id: { in: uniqueIds } } });
      if (found.length !== uniqueIds.length) {
        throw new BadRequestException('Uno o más géneros no existen');
      }
      found.forEach((genre) => ids.add(genre.id));
    }

    for (const raw of genreNames) {
      const name = raw.trim();
      if (!name) continue;
      if (name.length > 60) throw new BadRequestException('El nombre del género es demasiado largo');
      const existing = await tx.genre.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
      });
      if (existing) {
        ids.add(existing.id);
        continue;
      }
      try {
        const created = await tx.genre.create({ data: { name } });
        ids.add(created.id);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const again = await tx.genre.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
          });
          if (again) {
            ids.add(again.id);
            continue;
          }
        }
        throw error;
      }
    }

    if (ids.size === 0) throw new BadRequestException('Debe indicar al menos un género');
    return [...ids];
  }
}
