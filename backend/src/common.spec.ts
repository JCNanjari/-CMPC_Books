import ExcelJS from 'exceljs';
import { BadRequestException, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { of, throwError, lastValueFrom } from 'rxjs';
import { MulterError } from 'multer';
import { currentUserFactory } from './common/decorators/current-user.decorator';
import { Public } from './common/decorators/public.decorator';
import { SkipTransform } from './common/decorators/skip-transform.decorator';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { booksToWorkbook } from './common/utils/excel';
import { detectImage } from './common/utils/image';
import { emptyToUndefined, parseStringList, toOptionalNumber } from './common/utils/parse';
import { parseSort } from './common/utils/parse-sort';

jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class MockAuthGuard {
      canActivate() {
        return 'passport';
      }
    },
}));

describe('decoradores', () => {
  it('marca rutas públicas y respuestas sin transformar', () => {
    expect(Public()).toEqual(expect.any(Function));
    expect(SkipTransform()).toEqual(expect.any(Function));
  });

  it('lee el usuario autenticado de la petición', () => {
    const user = { id: '1', email: 'a@b.c' };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
    expect(currentUserFactory(undefined, ctx)).toEqual(user);
  });
});

describe('JwtAuthGuard', () => {
  const context = {
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as unknown as ExecutionContext;

  it('deja pasar las rutas públicas', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(true) } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('delega en passport cuando la ruta es privada', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(context)).toBe('passport');
  });
});

describe('TransformInterceptor', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const interceptor = new TransformInterceptor(reflector as unknown as Reflector);
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  it('envuelve la carga útil', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const result = (await lastValueFrom(
      interceptor.intercept(context, { handle: () => of({ id: 1 }) }),
    )) as { data: { id: number }; timestamp: string };
    expect(result.data).toEqual({ id: 1 });
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('conserva data y meta de los listados', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const result = (await lastValueFrom(
      interceptor.intercept(context, { handle: () => of({ data: [], meta: { page: 1 } }) }),
    )) as { data: unknown[]; meta: { page: number } };
    expect(result.meta).toEqual({ page: 1 });
    expect(result.data).toEqual([]);
  });

  it('no transforma las respuestas marcadas', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(
      lastValueFrom(interceptor.intercept(context, { handle: () => of('archivo') })),
    ).resolves.toBe('archivo');
  });
});

describe('LoggingInterceptor', () => {
  it('registra éxito y error', async () => {
    const interceptor = new LoggingInterceptor();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ method: 'GET', url: '/api/books' }) }),
    } as unknown as ExecutionContext;

    await expect(
      lastValueFrom(interceptor.intercept(context, { handle: () => of({ ok: true }) })),
    ).resolves.toEqual({ ok: true });

    await expect(
      lastValueFrom(
        interceptor.intercept(context, { handle: () => throwError(() => new Error('boom')) }),
      ),
    ).rejects.toThrow('boom');
  });
});

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  function host() {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    return {
      host: {
        switchToHttp: () => ({
          getResponse: () => ({ status }),
          getRequest: () => ({ url: '/api/books' }),
        }),
      },
      status,
      json,
    };
  }

  it('formatea HttpException de texto, objeto y arreglo', () => {
    const stringCase = host();
    filter.catch(new NotFoundException('Libro no encontrado'), stringCase.host as never);
    expect(stringCase.status).toHaveBeenCalledWith(404);

    const objectCase = host();
    filter.catch(new BadRequestException('dato inválido'), objectCase.host as never);
    expect(objectCase.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));

    const listCase = host();
    filter.catch(new BadRequestException(['a', 'b']), listCase.host as never);
    expect(listCase.json).toHaveBeenCalledWith(expect.objectContaining({ message: ['a', 'b'] }));
  });

  it('traduce errores de carga y de Prisma', () => {
    const big = host();
    filter.catch(new MulterError('LIMIT_FILE_SIZE'), big.host as never);
    expect(big.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'La imagen no puede superar 2 MB' }),
    );

    const otherFile = host();
    filter.catch(new MulterError('LIMIT_UNEXPECTED_FILE'), otherFile.host as never);
    expect(otherFile.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No se pudo procesar la imagen' }),
    );

    const unique = host();
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '6' }),
      unique.host as never,
    );
    expect(unique.status).toHaveBeenCalledWith(409);

    const missing = host();
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('miss', { code: 'P2025', clientVersion: '6' }),
      missing.host as never,
    );
    expect(missing.status).toHaveBeenCalledWith(404);

    const other = host();
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('other', { code: 'P2003', clientVersion: '6' }),
      other.host as never,
    );
    expect(other.status).toHaveBeenCalledWith(500);
  });

  it('oculta errores genéricos y valores desconocidos', () => {
    const generic = host();
    filter.catch(new Error('secret'), generic.host as never);
    expect(generic.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Error interno del servidor' }),
    );

    const unknown = host();
    filter.catch('raro', unknown.host as never);
    expect(unknown.status).toHaveBeenCalledWith(500);
  });
});

describe('utilidades', () => {
  it('interpreta el orden múltiple y rechaza campos inválidos', () => {
    expect(parseSort(undefined).orderBy).toEqual([{ createdAt: 'desc' }]);
    expect(parseSort('   ').orderBy).toEqual([{ createdAt: 'desc' }]);
    expect(parseSort(',').orderBy).toEqual([{ createdAt: 'desc' }]);
    expect(parseSort('title:asc, price:desc').orderBy).toEqual([{ title: 'asc' }, { price: 'desc' }]);
    expect(parseSort('author:asc').orderBy).toEqual([{ author: { name: 'asc' } }]);
    expect(parseSort('publisher:desc').orderBy).toEqual([{ publisher: { name: 'desc' } }]);
    expect(parseSort('stock:asc').orderBy).toEqual([{ stock: 'asc' }]);
    expect(parseSort('nope:asc').error).toContain('nope:asc');
    expect(parseSort('title:sideways').error).toContain('title:sideways');
  });

  it('arma la planilla de libros con título y encabezados', async () => {
    const file = await booksToWorkbook(
      [
        {
          title: 'Rayuela',
          price: 19990,
          stock: 0,
          available: false,
          author: { name: 'Cortázar' },
          publisher: { name: 'Alfaguara' },
          genres: [{ name: 'Novela' }, { name: 'Ensayo' }],
        },
        {
          title: 'Altazor',
          price: 12990.5,
          stock: 3,
          available: true,
          author: { name: 'Huidobro' },
          publisher: { name: 'Universitaria' },
          genres: [],
        },
      ],
      new Date('2026-10-10T15:00:00.000Z'),
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
    const sheet = workbook.getWorksheet('Inventario');
    expect(sheet?.getCell('A1').value).toBe('CMPC Libros');
    expect(String(sheet?.getCell('A2').value)).toContain('2 libros');
    expect(sheet?.getCell('A4').value).toBe('Título');
    expect(sheet?.getCell('E4').value).toBe('Precio (CLP)');
    expect(sheet?.getCell('A4').font?.bold).toBe(true);
    expect(sheet?.getCell('A5').value).toBe('Rayuela');
    expect(sheet?.getCell('D5').value).toBe('Novela · Ensayo');
    expect(sheet?.getCell('G5').value).toBe('Agotado');
    expect(sheet?.getCell('E5').numFmt).toBe('"$"#,##0');
    expect(sheet?.getCell('D6').value).toBe('Sin género');
    expect(sheet?.getCell('G6').value).toBe('Disponible');
    expect(sheet?.getCell('E6').numFmt).toBe('"$"#,##0.00');

    const single = await booksToWorkbook(
      [
        {
          title: 'Uno',
          price: 1,
          stock: 1,
          available: true,
          author: { name: 'A' },
          publisher: { name: 'E' },
          genres: [{ name: 'Novela' }],
        },
      ],
      new Date('2026-10-10T15:00:00.000Z'),
    );
    const one = new ExcelJS.Workbook();
    await one.xlsx.load(single as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
    expect(String(one.getWorksheet('Inventario')?.getCell('A2').value)).toContain('1 libro');
  });

  it('normaliza listas, vacíos y números', () => {
    expect(emptyToUndefined('')).toBeUndefined();
    expect(emptyToUndefined(null)).toBeUndefined();
    expect(emptyToUndefined('hola')).toBe('hola');
    expect(toOptionalNumber('')).toBeUndefined();
    expect(toOptionalNumber(null)).toBeUndefined();
    expect(toOptionalNumber(undefined)).toBeUndefined();
    expect(toOptionalNumber('12.5')).toBe(12.5);
    expect(toOptionalNumber(3)).toBe(3);
    expect(parseStringList(undefined)).toBeUndefined();
    expect(parseStringList('')).toBeUndefined();
    expect(parseStringList('   ')).toBeUndefined();
    expect(parseStringList(4)).toBeUndefined();
    expect(parseStringList([' a ', ''])).toEqual(['a']);
    expect(parseStringList('["uno","dos"]')).toEqual(['uno', 'dos']);
    expect(parseStringList('{"a":1}')).toEqual(['{"a":1}']);
    expect(parseStringList('[')).toBeUndefined();
    expect(parseStringList('uno, dos')).toEqual(['uno', 'dos']);
  });

  it('reconoce firmas de imagen', () => {
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0x00]))?.ext).toBe('.jpg');
    expect(detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))?.ext).toBe('.png');
    const webp = Buffer.alloc(12);
    webp.write('RIFF', 0, 'ascii');
    webp.write('WEBP', 8, 'ascii');
    expect(detectImage(webp)?.ext).toBe('.webp');
    expect(detectImage(Buffer.from('hola'))).toBeNull();
    expect(detectImage(Buffer.from([0xff]))).toBeNull();
  });
});
