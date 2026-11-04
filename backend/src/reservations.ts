import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpCode, Inject, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsString, Matches, Max, Min, isUUID } from 'class-validator';
import { DateTime } from 'luxon';
import { DataSource } from 'typeorm';
import { AuthRequest, authenticated, SessionGuard } from './auth';
import { AppConfig, CONFIG } from './config';
import { Reservation, ReservationSlot } from './database/entities';
import { Limit } from './security';

export class AvailabilityQuery {
  @ApiProperty({ example: '2026-11-10' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @ApiProperty({ default: 2, minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(1000) people = 2;
}
export class ReservationDto {
  @ApiProperty({ example: '2026-11-10T15:00:00.000Z' }) @IsISO8601({ strict: true }) @Matches(/(?:Z|[+-]\d{2}:\d{2})$/) startsAt!: string;
  @ApiProperty({ minimum: 1, maximum: 6 }) @IsInt() @Min(1) @Max(1000) people!: number;
}
export function reservationView({ id, startsAt, people, status, createdAt }: Reservation) { return { id, startsAt, people, status, createdAt }; }
export class BookingRules {
  constructor(readonly config: AppConfig['booking']) {}
  people(people: number) {
    if (!Number.isInteger(people) || people < this.config.minPeople || people > this.config.maxPeople) throw new BadRequestException(`El grupo debe tener entre ${this.config.minPeople} y ${this.config.maxPeople} personas.`);
  }
  parse(value: string) {
    if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new BadRequestException('La fecha debe incluir zona horaria.');
    const date = DateTime.fromISO(value, { setZone: true }).setZone(this.config.timezone);
    if (!date.isValid) throw new BadRequestException('Fecha inválida.');
    return date;
  }
  isBookable(date: DateTime, now = DateTime.now().setZone(this.config.timezone)) {
    const minute = date.hour * 60 + date.minute;
    return date.isValid && date.second === 0 && date.millisecond === 0 && minute >= this.config.openingHour * 60 && minute + this.config.slotMinutes <= this.config.closingHour * 60 && (minute - this.config.openingHour * 60) % this.config.slotMinutes === 0 && date.toMillis() >= now.plus({ minutes: this.config.minNoticeMinutes }).toMillis() && date.toMillis() <= now.plus({ days: this.config.maxAdvanceDays }).toMillis();
  }
  validate(date: DateTime, people: number) {
    this.people(people);
    if (!this.isBookable(date)) throw new BadRequestException('Selecciona una franja dentro del horario y los límites de anticipación.');
  }
  day(value: string) {
    const date = DateTime.fromISO(value, { zone: this.config.timezone }).startOf('day');
    const today = DateTime.now().setZone(this.config.timezone).startOf('day');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !date.isValid || date.toISODate() !== value || date < today || date > today.plus({ days: this.config.maxAdvanceDays })) throw new BadRequestException('La fecha debe estar entre hoy y el límite de anticipación.');
    return date;
  }
}
@Injectable()
export class ReservationsService {
  readonly rules: BookingRules;
  constructor(@Inject(DataSource) private readonly db: DataSource, @Inject(CONFIG) readonly config: AppConfig) { this.rules = new BookingRules(config.booking); }
  async availability(query: AvailabilityQuery) {
    this.rules.people(query.people);
    const day = this.rules.day(query.date);
    const existing = await this.db.getRepository(ReservationSlot).createQueryBuilder('slot').where('slot.startsAt >= :start AND slot.startsAt < :end', { start: day.toJSDate(), end: day.plus({ days: 1 }).toJSDate() }).getMany();
    const indexed = new Map(existing.map(slot => [slot.startsAt.getTime(), slot]));
    const slots = [];
    const now = DateTime.now().setZone(this.config.booking.timezone);
    for (let minute = this.config.booking.openingHour * 60; minute + this.config.booking.slotMinutes <= this.config.booking.closingHour * 60; minute += this.config.booking.slotMinutes) {
      const date = day.plus({ minutes: minute });
      const saved = indexed.get(date.toMillis());
      const remaining = saved ? saved.capacity - saved.booked : this.config.booking.capacity;
      slots.push({ startsAt: date.toJSDate().toISOString(), time: date.toFormat('HH:mm'), available: this.rules.isBookable(date, now) && remaining >= query.people, remaining });
    }
    return { date: query.date, timezone: this.config.booking.timezone, slots };
  }
  async create(userId: string, dto: ReservationDto, key: string | undefined) {
    if (!key || !isUUID(key, '4')) throw new BadRequestException('Envía Idempotency-Key con un UUID v4.');
    const date = this.rules.parse(dto.startsAt);
    return this.db.transaction(async manager => {
      // Serializes reuse of the same user/key, including requests for different slots.
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`${userId}:${key}`]);
      const repo = manager.getRepository(Reservation);
      const existing = await repo.findOneBy({ userId, idempotencyKey: key });
      if (existing) {
        if (existing.startsAt.getTime() !== date.toMillis() || existing.people !== dto.people) throw new ConflictException('La clave de idempotencia ya se usó con otros datos.');
        return reservationView(existing);
      }
      this.rules.validate(date, dto.people);
      await manager.query('INSERT INTO reservation_slots(starts_at, capacity, booked) VALUES ($1, $2, 0) ON CONFLICT (starts_at) DO NOTHING', [date.toJSDate(), this.config.booking.capacity]);
      const slot = await manager.getRepository(ReservationSlot).findOneOrFail({ where: { startsAt: date.toJSDate() }, lock: { mode: 'pessimistic_write' } });
      if (await repo.existsBy({ userId, startsAt: date.toJSDate(), status: 'confirmed' })) throw new ConflictException('Ya tienes una reserva confirmada en esta franja.');
      if (slot.booked + dto.people > slot.capacity) throw new ConflictException('No hay cupo suficiente. Elige otra franja.');
      slot.booked += dto.people;
      await manager.getRepository(ReservationSlot).save(slot);
      const reservation = await repo.save(repo.create({ userId, startsAt: date.toJSDate(), people: dto.people, status: 'confirmed', idempotencyKey: key, cancelledAt: null }));
      return reservationView(reservation);
    });
  }
  async list(userId: string) {
    return (await this.db.getRepository(Reservation).find({ where: { userId }, order: { startsAt: 'DESC', id: 'ASC' } })).map(reservationView);
  }
  async detail(userId: string, id: string) {
    const row = await this.db.getRepository(Reservation).findOneBy({ userId, id });
    if (!row) throw new NotFoundException('Reserva no encontrada.');
    return reservationView(row);
  }
  async cancel(userId: string, id: string) {
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(Reservation);
      const initial = await repo.findOneBy({ userId, id });
      if (!initial) throw new NotFoundException('Reserva no encontrada.');
      // Every mutation locks slot first, then reservation: consistent lock order.
      const slot = await manager.getRepository(ReservationSlot).findOneOrFail({ where: { startsAt: initial.startsAt }, lock: { mode: 'pessimistic_write' } });
      const reservation = await repo.findOneOrFail({ where: { userId, id }, lock: { mode: 'pessimistic_write' } });
      if (reservation.status === 'cancelled') return reservationView(reservation);
      if (reservation.startsAt.getTime() <= Date.now()) throw new ConflictException('Solo puedes cancelar una reserva antes de su inicio.');
      reservation.status = 'cancelled'; reservation.cancelledAt = new Date();
      slot.booked -= reservation.people;
      await manager.getRepository(ReservationSlot).save(slot);
      return reservationView(await repo.save(reservation));
    });
  }
}
@ApiTags('Reservas')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}
  @Get('config') config() { return this.reservations.config.booking; }
  @Get('availability') availability(@Query() query: AvailabilityQuery) { return this.reservations.availability(query); }
  @Get() @ApiCookieAuth() @UseGuards(SessionGuard)
  list(@Req() request: AuthRequest) { return this.reservations.list(authenticated(request).user.id); }
  @Post() @ApiCookieAuth() @UseGuards(SessionGuard) @Limit('reserve', 60, 3600)
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'UUID v4 nuevo por intención; reutilizar al reintentar la misma solicitud.' })
  create(@Req() request: AuthRequest, @Body() dto: ReservationDto, @Headers('idempotency-key') key?: string) { return this.reservations.create(authenticated(request).user.id, dto, key); }
  @Get(':id') @ApiCookieAuth() @UseGuards(SessionGuard)
  detail(@Req() request: AuthRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.reservations.detail(authenticated(request).user.id, id); }
  @Post(':id/cancel') @HttpCode(200) @ApiCookieAuth() @UseGuards(SessionGuard) @Limit('cancel', 60, 3600)
  cancel(@Req() request: AuthRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) { return this.reservations.cancel(authenticated(request).user.id, id); }
}
@Module({ controllers: [ReservationsController], providers: [ReservationsService] })
export class ReservationsModule {}
