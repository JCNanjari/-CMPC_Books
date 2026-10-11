import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { emptyToUndefined, parseStringList, toOptionalNumber } from '../../common/utils/parse';

export class UpdateBookDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price?: number;

  @ApiPropertyOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  stock?: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? emptyToUndefined(value.trim()) : emptyToUndefined(value)))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  authorName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsUUID('4')
  publisherId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? emptyToUndefined(value.trim()) : emptyToUndefined(value)))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  publisherName?: string;

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => parseStringList(value))
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => parseStringList(value))
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  genreNames?: string[];
}
