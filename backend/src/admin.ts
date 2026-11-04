import { CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Inject, Injectable, Module, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { DataSource, MoreThan } from 'typeorm';
import { authenticated, AuthRequest, publicUser, SessionGuard } from './auth';
import { productView } from './catalog';
import { CoffeeEvent, ContactMessage, Product, Reservation, User } from './database/entities';
import { reservationView } from './reservations';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { user } = authenticated(context.switchToHttp().getRequest<AuthRequest>());
    if (user.role !== 'admin') throw new ForbiddenException('Se requiere una cuenta de administración.');
    return true;
  }
}

@ApiTags('Administración') @ApiCookieAuth()
@Controller('admin') @UseGuards(SessionGuard, AdminGuard)
export class AdminController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}

  @Get('overview') async overview() {
    const products = this.db.getRepository(Product);
    const reservations = this.db.getRepository(Reservation);
    const users = this.db.getRepository(User);
    const events = this.db.getRepository(CoffeeEvent);
    const [productTotal, productActive, reservationTotal, confirmed, cancelled, upcoming, userTotal, customers, admins, eventTotal, published, contacts] = await Promise.all([
      products.count(), products.countBy({ active: true }),
      reservations.count(), reservations.countBy({ status: 'confirmed' }), reservations.countBy({ status: 'cancelled' }), reservations.countBy({ status: 'confirmed', startsAt: MoreThan(new Date()) }),
      users.count(), users.countBy({ role: 'customer' }), users.countBy({ role: 'admin' }),
      events.count(), events.countBy({ published: true }), this.db.getRepository(ContactMessage).count(),
    ]);
    return { products: { total: productTotal, active: productActive }, reservations: { total: reservationTotal, confirmed, cancelled, upcoming }, users: { total: userTotal, customers, admins }, events: { total: eventTotal, published }, contacts: { total: contacts } };
  }
  @Get('products') async products() {
    const rows = await this.db.getRepository(Product).find({ relations: { category: true }, order: { displayOrder: 'ASC', id: 'ASC' } });
    return rows.map(row => ({ ...productView(row), active: row.active, displayOrder: row.displayOrder }));
  }
  @Get('reservations') async reservations() {
    const rows = await this.db.getRepository(Reservation).find({ relations: { user: true }, order: { startsAt: 'DESC', id: 'ASC' } });
    return rows.map(row => ({ ...reservationView(row), cancelledAt: row.cancelledAt, user: { id: row.user.id, name: row.user.name, email: row.user.email } }));
  }
  @Get('users') async users() {
    const rows = await this.db.getRepository(User).find({ order: { createdAt: 'DESC', id: 'ASC' } });
    return rows.map(row => ({ ...publicUser(row), createdAt: row.createdAt }));
  }
  @Get('events') async events() {
    const rows = await this.db.getRepository(CoffeeEvent).find({ order: { startsAt: 'ASC', id: 'ASC' } });
    return rows.map(({ id, title, description, startsAt, image, published }) => ({ id, title, description, startsAt, image, published }));
  }
  @Get('contacts') async contacts() {
    const rows = await this.db.getRepository(ContactMessage).find({ order: { createdAt: 'DESC', id: 'ASC' } });
    return rows.map(({ id, name, email, subject, message, createdAt }) => ({ id, name, email, subject, message, createdAt }));
  }
}

@Module({ controllers: [AdminController], providers: [AdminGuard] })
export class AdminModule {}
