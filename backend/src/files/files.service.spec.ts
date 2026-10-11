import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs, { mkdtempSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { FilesService } from './files.service';

describe('FilesService', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cmpc-uploads-'));
  const config = { get: () => dir } as unknown as ConfigService;
  const service = new FilesService(config);

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it('guarda una imagen válida y luego la elimina', () => {
    const url = service.save({ buffer: png, size: png.length } as Express.Multer.File);
    expect(url).toMatch(/\/api\/uploads\/.+\.png$/);
    expect(existsSync(path.join(dir, path.basename(url)))).toBe(true);
    service.remove(url);
    expect(existsSync(path.join(dir, path.basename(url)))).toBe(false);
    service.remove(url);
    service.remove(undefined);
    service.remove('..');
  });

  it('rechaza archivos vacíos, grandes o que no son imagen', () => {
    expect(() => service.save(undefined as never)).toThrow(BadRequestException);
    expect(() => service.save({ buffer: Buffer.alloc(0), size: 0 } as Express.Multer.File)).toThrow(
      'obligatoria',
    );
    expect(() =>
      service.save({ buffer: png, size: 3 * 1024 * 1024 } as Express.Multer.File),
    ).toThrow('2 MB');
    expect(() =>
      service.save({ buffer: Buffer.from('no-image-xx'), size: 11 } as Express.Multer.File),
    ).toThrow('JPG');
  });

  it('no propaga un fallo al borrar el archivo', () => {
    const url = service.save({ buffer: png, size: png.length } as Express.Multer.File);
    jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {
      throw new Error('ocupado');
    });
    expect(() => service.remove(url)).not.toThrow();
    jest.restoreAllMocks();
  });
});
