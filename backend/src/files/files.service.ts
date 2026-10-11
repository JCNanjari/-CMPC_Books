import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { detectImage, MAX_IMAGE_BYTES } from '../common/utils/image';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;

  constructor(config: ConfigService) {
    this.uploadDir = path.resolve(config.get<string>('UPLOAD_DIR') ?? path.join(process.cwd(), 'uploads'));
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  save(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('La imagen del libro es obligatoria');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException('La imagen no puede superar 2 MB');
    }
    const detected = detectImage(file.buffer);
    if (!detected) {
      throw new BadRequestException('La imagen debe ser JPG, PNG o WEBP');
    }
    const filename = `${randomUUID()}${detected.ext}`;
    fs.writeFileSync(path.join(this.uploadDir, filename), file.buffer);
    return `/api/uploads/${filename}`;
  }

  remove(publicPath?: string | null) {
    if (!publicPath) return;
    const name = path.basename(publicPath);
    if (!name || name === '.' || name === '..') return;
    const root = path.resolve(this.uploadDir);
    const full = path.resolve(root, name);
    if (!full.startsWith(`${root}${path.sep}`)) return;
    try {
      if (fs.existsSync(full)) fs.unlinkSync(full);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'error';
      this.logger.warn(`No se pudo eliminar ${name}: ${message}`);
    }
  }
}
