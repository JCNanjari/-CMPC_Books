import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ip?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const passwordMatches = user ? await bcrypt.compare(dto.password, user.password) : false;

    if (!user || !passwordMatches) {
      await this.audit.log(this.prisma, {
        action: 'LOGIN_FAILED',
        entity: 'User',
        userId: user?.id,
        ip,
        metadata: { email },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    await this.audit.log(this.prisma, {
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      userId: user.id,
      ip,
      metadata: { email: user.email },
    });

    return {
      accessToken,
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '8h',
      user: { id: user.id, email: user.email, name: user.name },
    };
  }
}
