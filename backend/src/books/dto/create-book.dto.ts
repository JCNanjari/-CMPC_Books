import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateBookDto {
  @ApiProperty({ example: 'Cien años de soledad', maxLength: 200 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 18990, description: 'Precio en pesos chilenos' })
  @Transform(({ value }) => toOptionalNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99999999.99)
  price!: number;

  @ApiProperty({ example: 12, description: 'Unidades disponibles. Cero significa agotado.' })
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(0)
  @Max(1000000)
  stock!: number;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(({ value }) => emptyToUndefined(value))
  @IsOptional()
  @IsUUID('4')
  authorId?: string;

  @ApiPropertyOptional({ example: 'Gabriela Mistral', description: 'Se crea el autor si no existe' })
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

  @ApiPropertyOptional({ example: 'Alfaguara', description: 'Se crea la editorial si no existe' })
  @Transform(({ value }) => (typeof value === 'string' ? emptyToUndefined(value.trim()) : emptyToUndefined(value)))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  publisherName?: string;

  @ApiPropertyOptional({ type: [String], description: 'UUID de géneros existentes. Acepta JSON o lista separada por comas.' })
  @Transform(({ value }) => parseStringList(value) ?? [])
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds!: string[];

  @ApiPropertyOptional({ type: [String], description: 'Nombres de géneros nuevos o existentes' })
  @Transform(({ value }) => parseStringList(value) ?? [])
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  genreNames!: string[];
}
