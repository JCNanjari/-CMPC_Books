import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';

@ApiTags('Catálogo')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('authors')
  @ApiOperation({ summary: 'Lista autores para filtros y formularios' })
  authors() {
    return this.catalog.findAuthors();
  }

  @Get('publishers')
  @ApiOperation({ summary: 'Lista editoriales para filtros y formularios' })
  publishers() {
    return this.catalog.findPublishers();
  }

  @Get('genres')
  @ApiOperation({ summary: 'Lista géneros para filtros y formularios' })
  genres() {
    return this.catalog.findGenres();
  }
}
