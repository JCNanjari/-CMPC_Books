import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  findAuthors() {
    return this.prisma.author.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  findPublishers() {
    return this.prisma.publisher.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  findGenres() {
    return this.prisma.genre.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }
}
