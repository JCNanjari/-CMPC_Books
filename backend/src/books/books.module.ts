import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FilesService } from '../files/files.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [AuditModule],
  controllers: [BooksController],
  providers: [BooksService, FilesService],
})
export class BooksModule {}
