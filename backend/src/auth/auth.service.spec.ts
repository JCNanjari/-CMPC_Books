import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwt = { sign: jest.fn().mockReturnValue('token') };
  const config = { get: jest.fn().mockReturnValue('8h') };
  const audit = { log: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    config as unknown as ConfigService,
    audit as unknown as AuditService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('entrega el token cuando las credenciales son válidas', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@cmpc-libros.cl',
      name: 'Admin',
      password: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.sign.mockReturnValue('token');

    const result = await service.login(
      { email: ' Admin@CMPC-libros.cl ', password: 'Admin123!' },
      '10.0.0.1',
    );

    expect(result).toEqual({
      accessToken: 'token',
      expiresIn: '8h',
      user: { id: 'user-1', email: 'admin@cmpc-libros.cl', name: 'Admin' },
    });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 'user-1', email: 'admin@cmpc-libros.cl' });
    expect(audit.log).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'LOGIN', userId: 'user-1' }),
    );
  });

  it('usa 8h si no hay expiración configurada', async () => {
    config.get.mockReturnValueOnce(undefined);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@cmpc-libros.cl',
      name: 'Admin',
      password: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    const result = await service.login({ email: 'admin@cmpc-libros.cl', password: 'Admin123!' });
    expect(result.expiresIn).toBe('8h');
  });

  it('rechaza usuario inexistente o contraseña incorrecta con el mismo mensaje', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'no@cmpc.cl', password: 'Admin123!' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(audit.log).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'LOGIN_FAILED', userId: undefined }),
    );

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@cmpc-libros.cl',
      password: 'hash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: 'admin@cmpc-libros.cl', password: 'mala' }),
    ).rejects.toThrow('Credenciales inválidas');
    expect(audit.log).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ action: 'LOGIN_FAILED', userId: 'user-1' }),
    );
  });
});

describe('AuthController', () => {
  it('delega el login con la IP de la petición', async () => {
    const auth = { login: jest.fn().mockResolvedValue({ accessToken: 't' }) };
    const controller = new AuthController(auth as never);
    const dto = { email: 'a@b.c', password: 'Admin123!' };
    await expect(controller.login(dto, { ip: '1.1.1.1' } as never)).resolves.toEqual({ accessToken: 't' });
    expect(auth.login).toHaveBeenCalledWith(dto, '1.1.1.1');
  });
});

describe('JwtStrategy', () => {
  it('proyecta el payload al usuario de la petición', () => {
    const strategy = new JwtStrategy({ getOrThrow: () => 'secret' } as unknown as ConfigService);
    expect(strategy.validate({ sub: 'user-1', email: 'a@b.c' })).toEqual({
      id: 'user-1',
      email: 'a@b.c',
    });
  });

  it('no arranca sin secreto', () => {
    expect(
      () => new JwtStrategy({ getOrThrow: () => { throw new Error('falta'); } } as unknown as ConfigService),
    ).toThrow('falta');
  });
});
