import { BadRequestException, Body, CanActivate, ConflictException, Controller, ExecutionContext, Get, Global, HttpCode, Inject, Injectable, Module, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, Matches, MaxLength, ValidateBy, ValidateIf, isEmail } from 'class-validator';
import { Request, Response } from 'express';
import { compare, hash, hashSync } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { sign, verify } from 'jsonwebtoken';
import { DataSource, EntityManager, IsNull, MoreThan } from 'typeorm';
import { AppConfig, CONFIG } from './config';
import { normalizeEmail, trim } from './catalog';
import { Session, User } from './database/entities';
import { demoAccount, isDemoEmail } from './demo';
import { cookieOptions, Limit, RateService, requestCookie, SESSION_COOKIE } from './security';

export class RegisterDto {
  @ApiProperty({ minLength: 2, maxLength: 100 }) @Transform(trim) @IsString() @Length(2, 100) name!: string;
  @ApiProperty({ maxLength: 254 }) @Transform(normalizeEmail) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({ minLength: 8, maxLength: 72, description: 'Máximo 72 bytes UTF-8 (bcrypt).' }) @IsString() @Length(8, 72)
  @ValidateBy({ name: 'passwordBytes', validator: { validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72, defaultMessage: () => 'La contraseña no debe superar 72 bytes UTF-8.' } }) password!: string;
}
export class LoginDto {
  @ApiProperty({ description: 'Correo electrónico; en modo demo también admite admin o cliente.' }) @Transform(normalizeEmail) @IsString() @Length(1, 254)
  @ValidateBy({ name: 'emailOrDemoAlias', validator: { validate: (value: unknown) => typeof value === 'string' && (isEmail(value) || demoAccount(value) !== undefined), defaultMessage: () => 'Ingresa un correo válido o un alias demo habilitado.' } }) email!: string;
  @ApiProperty() @IsString() @Length(1, 72)
  @ValidateBy({ name: 'passwordBytes', validator: { validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72 } }) password!: string;
}
export class ProfileDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 100 }) @ValidateIf((_object, value) => value !== undefined) @Transform(trim) @IsString() @Length(2, 100) name?: string;
  @ApiPropertyOptional({ nullable: true, minLength: 7, maxLength: 25 }) @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value)
  @IsString() @Length(7, 25) @Matches(/^[+0-9 ()-]+$/) phone?: string | null;
}
export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'phone' | 'role'>;
export function publicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role };
}
export interface AuthRequest extends Request { principal?: { user: User; session: Session } }
export function authenticated(request: AuthRequest) {
  if (!request.principal) throw new UnauthorizedException('Inicia sesión para continuar.');
  return request.principal;
}
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'driverError' in error && typeof error.driverError === 'object' && error.driverError !== null && 'code' in error.driverError && error.driverError.code === '23505';
}
@Injectable()
export class AuthService {
  private readonly dummyHash = hashSync('dummy-password-never-accepted', 12);
  constructor(@Inject(DataSource) private readonly db: DataSource, @Inject(CONFIG) private readonly config: AppConfig, private readonly rates: RateService) {}
  private async session(manager: EntityManager, user: User) {
    const session = manager.getRepository(Session).create({ id: randomUUID(), userId: user.id, expiresAt: new Date(Date.now() + this.config.sessionMinutes * 60000), revokedAt: null });
    await manager.getRepository(Session).save(session);
    const token = sign({ sid: session.id }, this.config.jwtSecret, { algorithm: 'HS256', subject: user.id, issuer: 'mr-little-coffee', audience: 'mr-little-coffee-web', expiresIn: this.config.sessionMinutes * 60 });
    return { user, token };
  }
  async register(dto: RegisterDto) {
    if (isDemoEmail(dto.email)) throw new BadRequestException('Ese correo está reservado para una cuenta de demostración.');
    const passwordHash = await hash(dto.password, 12);
    try {
      return await this.db.transaction(async manager => {
        const user = await manager.getRepository(User).save(manager.getRepository(User).create({ name: dto.name, email: dto.email, passwordHash, role: 'customer', phone: null }));
        return this.session(manager, user);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Ya existe una cuenta con ese correo.');
      throw error;
    }
  }
  async login(dto: LoginDto) {
    const identifier = dto.email.trim().toLowerCase();
    const alias = demoAccount(identifier);
    const email = alias?.email ?? identifier;
    await this.rates.consume('login-email', email, 10, 900);
    const demoDisabled = isDemoEmail(email) && !this.config.demoAccountsEnabled;
    const user = demoDisabled ? null : await this.db.getRepository(User).createQueryBuilder('user').addSelect('user.passwordHash').where('user.email = :email', { email }).getOne();
    const matches = await compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !matches) throw new UnauthorizedException('Correo o contraseña incorrectos.');
    return this.db.transaction(manager => this.session(manager, user));
  }
  async authenticate(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Inicia sesión para continuar.');
    let userId: string; let sessionId: string;
    try {
      const claims = verify(token, this.config.jwtSecret, { algorithms: ['HS256'], issuer: 'mr-little-coffee', audience: 'mr-little-coffee-web' });
      if (typeof claims === 'string' || typeof claims.sub !== 'string' || typeof claims.sid !== 'string' || !/^[0-9a-f-]{36}$/i.test(claims.sub) || !/^[0-9a-f-]{36}$/i.test(claims.sid)) throw new Error();
      userId = claims.sub; sessionId = claims.sid;
    } catch { throw new UnauthorizedException('Tu sesión venció. Inicia sesión nuevamente.'); }
    const session = await this.db.getRepository(Session).findOne({ where: { id: sessionId, userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) }, relations: { user: true } });
    if (!session) throw new UnauthorizedException('Tu sesión venció o fue cerrada.');
    if (isDemoEmail(session.user.email) && !this.config.demoAccountsEnabled) throw new UnauthorizedException('Las cuentas de demostración están deshabilitadas.');
    return { session, user: session.user };
  }
  async logout(request: Request) {
    try {
      const { session } = await this.authenticate(requestCookie(request, SESSION_COOKIE));
      await this.db.getRepository(Session).update({ id: session.id, revokedAt: IsNull() }, { revokedAt: new Date() });
    } catch (error) { if (!(error instanceof UnauthorizedException)) throw error; }
  }
  setCookie(response: Response, token: string) { response.cookie(SESSION_COOKIE, token, { ...cookieOptions(this.config), maxAge: this.config.sessionMinutes * 60000 }); }
  clearCookie(response: Response) { response.clearCookie(SESSION_COOKIE, cookieOptions(this.config)); }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store');
    request.principal = await this.auth.authenticate(requestCookie(request, SESSION_COOKIE));
    return true;
  }
}
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @Limit('register', 10, 3600)
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(dto); this.auth.setCookie(response, result.token); return { user: publicUser(result.user) };
  }
  @Post('login') @HttpCode(200) @Limit('login', 20, 900)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(dto); this.auth.setCookie(response, result.token); return { user: publicUser(result.user) };
  }
  @Get('me') @ApiCookieAuth() @UseGuards(SessionGuard)
  me(@Req() request: AuthRequest) { return { user: publicUser(authenticated(request).user) }; }
  @Post('logout') @HttpCode(200)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request); this.auth.clearCookie(response); return { message: 'Sesión cerrada.' };
  }
}
@ApiTags('Perfil') @ApiCookieAuth()
@Controller('profile') @UseGuards(SessionGuard)
export class ProfileController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  @Get() profile(@Req() request: AuthRequest) { return { user: publicUser(authenticated(request).user) }; }
  @Patch() @Limit('profile', 30, 3600)
  async update(@Req() request: AuthRequest, @Body() dto: ProfileDto) {
    if (dto.name === undefined && dto.phone === undefined) throw new BadRequestException('Indica el nombre o teléfono que deseas actualizar.');
    const user = authenticated(request).user;
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    await this.db.getRepository(User).save(user);
    return { user: publicUser(user) };
  }
}
@Global()
@Module({ controllers: [AuthController], providers: [AuthService, SessionGuard], exports: [AuthService, SessionGuard] })
export class AuthModule {}
@Module({ controllers: [ProfileController] })
export class ProfileModule {}
