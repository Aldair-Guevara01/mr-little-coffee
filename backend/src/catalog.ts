import { BadRequestException, Body, Controller, Get, Inject, Injectable, Module, Param, Post, Query } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { DataSource } from 'typeorm';
import { Category, CoffeeEvent, ContactMessage, Product } from './database/entities';
import { Limit } from './security';
import { NotFoundException } from '@nestjs/common';

export const trim = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim() : value;
export const normalizeEmail = ({ value }: { value: unknown }): unknown => typeof value === 'string' ? value.trim().toLowerCase() : value;
export class CatalogQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @ApiPropertyOptional({ default: 9, maximum: 50 }) @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 9;
  @ApiPropertyOptional({ enum: ['featured', 'az'], default: 'featured' }) @IsIn(['featured', 'az']) sort: 'featured' | 'az' = 'featured';
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(80) category?: string;
}
class SlugParam {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MaxLength(120) slug!: string;
}
export class ContactDto {
  @ApiProperty({ minLength: 2, maxLength: 100 }) @Transform(trim) @IsString() @Length(2, 100) name!: string;
  @ApiProperty({ maxLength: 254 }) @Transform(normalizeEmail) @IsEmail() @MaxLength(254) email!: string;
  @ApiPropertyOptional({ maxLength: 150 }) @IsOptional() @Transform(trim) @IsString() @Length(2, 150) subject?: string;
  @ApiProperty({ minLength: 10, maxLength: 3000 }) @Transform(trim) @IsString() @Length(10, 3000) message!: string;
}
export function productView(product: Product) {
  const { id, slug, name, description, image, category, label, featured, priceCents } = product;
  return { id, slug, name, description, image, category, label, featured, priceCents };
}
@Injectable()
export class CatalogService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async list(query: CatalogQuery) {
    const builder = this.db.getRepository(Product).createQueryBuilder('product').innerJoinAndSelect('product.category', 'category').where('product.active = true');
    if (query.category === 'novedades') builder.andWhere('product.label = :label', { label: 'Nuevo' });
    else if (query.category) builder.andWhere('category.slug = :category', { category: query.category });
    if (query.sort === 'az') builder.orderBy('LOWER(product.name)', 'ASC').addOrderBy('product.id', 'ASC');
    else builder.orderBy('product.featured', 'DESC').addOrderBy('product.displayOrder', 'ASC').addOrderBy('product.id', 'ASC');
    // Use LIMIT/OFFSET: the join is many-to-one, so no row duplication is possible.
    // skip/take with a computed order and join generates an invalid DISTINCT alias in TypeORM.
    const total = await builder.getCount();
    const items = await builder.offset((query.page - 1) * query.pageSize).limit(query.pageSize).getMany();
    return { items: items.map(productView), total, page: query.page, pageSize: query.pageSize, totalPages: Math.ceil(total / query.pageSize) };
  }
  async detail(slug: string) {
    const product = await this.db.getRepository(Product).findOne({ where: { slug, active: true }, relations: { category: true } });
    if (!product) throw new NotFoundException('Producto no encontrado.');
    return productView(product);
  }
}
@ApiTags('Catálogo')
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService, @Inject(DataSource) private readonly db: DataSource) {}
  @Get('categories') categories() { return this.db.getRepository(Category).find({ order: { name: 'ASC', id: 'ASC' } }); }
  @Get('products') products(@Query() query: CatalogQuery) { return this.catalog.list(query); }
  @Get('products/:slug') product(@Param() params: SlugParam) { return this.catalog.detail(params.slug); }
}
@Module({ controllers: [CatalogController], providers: [CatalogService] })
export class CatalogModule {}

@ApiTags('Eventos')
@Controller('events')
export class EventsController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  @Get() async list() {
    const events = await this.db.getRepository(CoffeeEvent).find({ where: { published: true }, order: { startsAt: 'ASC', id: 'ASC' } });
    return events.map(({ id, title, description, startsAt, image }) => ({ id, title, description, startsAt, image }));
  }
}
@Module({ controllers: [EventsController] })
export class EventsModule {}

@ApiTags('Contacto')
@Controller('contact')
export class ContactController {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  @Post() @Limit('contact', 5, 3600)
  async create(@Body() dto: ContactDto) {
    if (!dto.name || !dto.message) throw new BadRequestException('Completa los campos requeridos.');
    await this.db.getRepository(ContactMessage).insert({ ...dto, subject: dto.subject ?? null });
    return { message: 'Recibimos tu mensaje. Gracias por escribirnos.' };
  }
}
@Module({ controllers: [ContactController] })
export class ContactModule {}
