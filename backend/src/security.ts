import { CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Global, HttpException, Inject, Injectable, Module, Req, Res, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response, CookieOptions } from 'express';
import { DataSource } from 'typeorm';
import { AppConfig, CONFIG } from './config';

export const SESSION_COOKIE = 'mlc_session';
export const CSRF_COOKIE = 'mlc_csrf';
export interface RatePolicy { scope: string; limit: number; seconds: number }
export const Limit = (scope: string, limit: number, seconds: number) => SetMetadata('limit', { scope, limit, seconds } satisfies RatePolicy);
export function cookieOptions(config: AppConfig): CookieOptions {
  return { httpOnly: true, secure: config.production, sameSite: config.sameSite, path: '/api' };
}
function equals(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function requestCookie(request: Request, name: string): string | undefined {
  const cookies: unknown = request.cookies;
  if (!cookies || typeof cookies !== 'object' || !(name in cookies)) return undefined;
  const value: unknown = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}
@Injectable()
export class CsrfService {
  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}
  private signature(payload: string) { return createHmac('sha256', this.config.csrfSecret).update(payload).digest('base64url'); }
  valid(token: string | undefined): token is string {
    if (!token || token.length > 200) return false;
    const [nonce, timestamp, signature, extra] = token.split('.');
    if (extra !== undefined || !nonce || !timestamp || !signature) return false;
    const age = Date.now() - Number(timestamp);
    return Number.isFinite(age) && age >= 0 && age < 2 * 60 * 60 * 1000 && equals(signature, this.signature(`${nonce}.${timestamp}`));
  }
  issue(request: Request, response: Response) {
    const existing = requestCookie(request, CSRF_COOKIE);
    if (this.valid(existing)) return existing;
    const payload = `${randomBytes(32).toString('base64url')}.${Date.now()}`;
    const token = `${payload}.${this.signature(payload)}`;
    response.cookie(CSRF_COOKIE, token, { ...cookieOptions(this.config), maxAge: 2 * 60 * 60 * 1000 });
    return token;
  }
  verify(request: Request) {
    const origin = request.get('origin');
    if (!origin || !this.config.origins.includes(origin)) throw new ForbiddenException('Origen no permitido.');
    const cookie = requestCookie(request, CSRF_COOKIE);
    const header = request.get('X-CSRF-Token');
    if (!this.valid(cookie) || !header || !equals(cookie, header)) throw new ForbiddenException('Token CSRF inválido o vencido. Actualiza la página e inténtalo de nuevo.');
  }
}
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly csrf: CsrfService) {}
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) this.csrf.verify(request);
    return true;
  }
}
@Injectable()
export class RateService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async consume(scope: string, identity: string, limit: number, seconds: number) {
    const key = `${scope}:${createHash('sha256').update(identity).digest('hex')}`;
    const rows: { count: number }[] = await this.db.query(`INSERT INTO request_limits(key, count, resets_at) VALUES ($1, 1, now() + $2 * interval '1 second') ON CONFLICT (key) DO UPDATE SET count = CASE WHEN request_limits.resets_at <= now() THEN 1 ELSE request_limits.count + 1 END, resets_at = CASE WHEN request_limits.resets_at <= now() THEN now() + $2 * interval '1 second' ELSE request_limits.resets_at END RETURNING count`, [key, seconds]);
    if (rows[0].count > limit) throw new HttpException('Demasiados intentos. Espera antes de volver a intentarlo.', 429);
  }
}
@Injectable()
export class RateGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rates: RateService) {}
  async canActivate(context: ExecutionContext) {
    const policy = this.reflector.getAllAndOverride<RatePolicy | undefined>('limit', [context.getHandler(), context.getClass()]);
    if (policy) {
      const request = context.switchToHttp().getRequest<Request>();
      await this.rates.consume(policy.scope, request.ip ?? request.socket.remoteAddress ?? 'unknown', policy.limit, policy.seconds);
    }
    return true;
  }
}
@ApiTags('Seguridad')
@Controller('csrf')
class CsrfController {
  constructor(private readonly csrf: CsrfService) {}
  @Get() token(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return { csrfToken: this.csrf.issue(request, response) };
  }
}
@Global()
@Module({ controllers: [CsrfController], providers: [CsrfService, CsrfGuard, RateService, RateGuard], exports: [CsrfService, CsrfGuard, RateService, RateGuard] })
export class SecurityModule {}
