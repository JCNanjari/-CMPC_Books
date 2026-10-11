import { Prisma } from '@prisma/client';
import { BookQueryDto } from './dto/book-query.dto';

export const bookInclude = {
  author: true,
  publisher: true,
  genres: {
    include: { genre: true },
    orderBy: { genre: { name: 'asc' as const } },
  },
} satisfies Prisma.BookInclude;

export type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

export function buildBookWhere(query: Pick<BookQueryDto, 'search' | 'genreId' | 'authorId' | 'publisherId' | 'available'>): Prisma.BookWhereInput {
  const where: Prisma.BookWhereInput = { deletedAt: null };
  const search = query.search?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { author: { name: { contains: search, mode: 'insensitive' } } },
      { publisher: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (query.authorId) where.authorId = query.authorId;
  if (query.publisherId) where.publisherId = query.publisherId;
  if (query.genreId) where.genres = { some: { genreId: query.genreId } };
  if (query.available === 'true') where.stock = { gt: 0 };
  if (query.available === 'false') where.stock = { equals: 0 };
  return where;
}
