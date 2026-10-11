import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { MAX_IMAGE_BYTES } from '../common/utils/image';
import { BooksService } from './books.service';
import { BookQueryDto } from './dto/book-query.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const imageBody = {
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      price: { type: 'number' },
      stock: { type: 'integer' },
      authorId: { type: 'string', format: 'uuid' },
      authorName: { type: 'string' },
      publisherId: { type: 'string', format: 'uuid' },
      publisherName: { type: 'string' },
      genreIds: { type: 'string', description: 'JSON array o lista separada por comas' },
      genreNames: { type: 'string', description: 'JSON array o lista separada por comas' },
      image: { type: 'string', format: 'binary' },
    },
  },
};

@ApiTags('Libros')
@ApiBearerAuth()
@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Lista libros con filtros, orden múltiple y paginación' })
  findAll(@Query() query: BookQueryDto) {
    return this.books.findAll(query);
  }

  @SkipTransform()
  @Get('export')
  @ApiOperation({ summary: 'Exporta a Excel los libros que coinciden con los filtros, sin paginar' })
  async export(@Query() query: BookQueryDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
    const file = await this.books.exportExcel(query, { userId: user.id, ip: request.ip });
    const filename = `libros-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new StreamableFile(file, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${filename}"`,
      length: file.length,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un libro' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.books.findOne(id);
  }

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody(imageBody)
  @ApiOperation({ summary: 'Crea un libro. La imagen es obligatoria.' })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES } }))
  create(
    @Body() dto: CreateBookDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
  ) {
    return this.books.create(dto, file, { userId: user.id, ip: request.ip });
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody(imageBody)
  @ApiOperation({ summary: 'Actualiza un libro. La imagen es opcional.' })
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage(), limits: { fileSize: MAX_IMAGE_BYTES } }))
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateBookDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
  ) {
    return this.books.update(id, dto, file, { userId: user.id, ip: request.ip });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un libro de forma lógica (soft delete)' })
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
  ) {
    return this.books.remove(id, { userId: user.id, ip: request.ip });
  }
}
