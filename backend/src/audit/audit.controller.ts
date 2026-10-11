import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Lista la bitácora de operaciones, de la más reciente a la más antigua' })
  findAll(@Query() query: AuditQueryDto) {
    return this.audit.findAll(query.page ?? 1, query.limit ?? 20);
  }
}
