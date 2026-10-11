import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { emptyToUndefined } from '../../common/utils/parse';

export class BookQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Busca en título, autor y editorial' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsUUID('4')
  genreId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsUUID('4')
  publisherId?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'true = stock mayor a cero' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsIn(['true', 'false'])
  available?: 'true' | 'false';

  @ApiPropertyOptional({
    example: 'price:desc,title:asc',
    description: 'Campos: title, price, stock, createdAt, author, publisher. Dirección asc o desc.',
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
