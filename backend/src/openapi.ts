import { OpenAPIObject } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

const string = { type: 'string' } as const;
const uuid = { type: 'string', format: 'uuid' } as const;
const date = { type: 'string', format: 'date-time' } as const;
const integer = { type: 'integer' } as const;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const array = (name: string): SchemaObject => ({ type: 'array', items: ref(name) });
const object = (properties: SchemaObject['properties'], required = Object.keys(properties ?? {})): SchemaObject => ({ type: 'object', properties, required });
export function documentResponses(document: OpenAPIObject) {
  const schemas: Record<string, SchemaObject> = {
    Category: object({ id: uuid, slug: string, name: string }),
    Product: object({ id: uuid, slug: string, name: string, description: string, image: string, category: ref('Category'), label: { ...string, nullable: true }, featured: { type: 'boolean' }, priceCents: { ...integer, nullable: true, minimum: 0 } }),
    ProductPage: object({ items: array('Product'), total: integer, page: integer, pageSize: integer, totalPages: integer }),
    Event: object({ id: uuid, title: string, description: string, startsAt: date, image: { ...string, nullable: true } }),
    User: object({ id: uuid, name: string, email: { ...string, format: 'email' }, phone: { ...string, nullable: true }, role: { ...string, enum: ['customer', 'admin'] } }),
    UserEnvelope: object({ user: ref('User') }),
    Message: object({ message: string }),
    Csrf: object({ csrfToken: string }),
    Reservation: object({ id: uuid, startsAt: date, people: integer, status: { ...string, enum: ['confirmed', 'cancelled'] }, createdAt: date }),
    BookingConfig: object({ timezone: string, openingHour: integer, closingHour: integer, slotMinutes: integer, capacity: integer, minPeople: integer, maxPeople: integer, minNoticeMinutes: integer, maxAdvanceDays: integer }),
    AvailabilitySlot: object({ startsAt: date, time: string, available: { type: 'boolean' }, remaining: integer }),
    Availability: object({ date: { ...string, format: 'date' }, timezone: string, slots: array('AvailabilitySlot') }),
    Health: object({ status: { ...string, enum: ['ok'] }, database: { ...string, enum: ['ok'] }, demoAccountsEnabled: { type: 'boolean' } }),
    AdminProduct: { allOf: [ref('Product'), object({ active: { type: 'boolean' }, displayOrder: integer })] },
    AdminReservation: { allOf: [ref('Reservation'), object({ cancelledAt: { ...date, nullable: true }, user: object({ id: uuid, name: string, email: { ...string, format: 'email' } }) })] },
    AdminUser: { allOf: [ref('User'), object({ createdAt: date })] },
    AdminEvent: { allOf: [ref('Event'), object({ published: { type: 'boolean' } })] },
    AdminContact: object({ id: uuid, name: string, email: { ...string, format: 'email' }, subject: { ...string, nullable: true }, message: string, createdAt: date }),
    AdminOverview: object({ products: object({ total: integer, active: integer }), reservations: object({ total: integer, confirmed: integer, cancelled: integer, upcoming: integer }), users: object({ total: integer, customers: integer, admins: integer }), events: object({ total: integer, published: integer }), contacts: object({ total: integer }) }),
    ApiError: object({ statusCode: integer, message: { oneOf: [string, { type: 'array', items: string }] } }),
  };
  document.components ??= {};
  document.components.schemas = { ...document.components.schemas, ...schemas };
  const contracts: [string, 'get' | 'post' | 'patch', string, number, boolean?][] = [
    ['/api/health', 'get', 'Health', 200],
    ['/api/csrf', 'get', 'Csrf', 200], ['/api/categories', 'get', 'Category', 200, true], ['/api/products', 'get', 'ProductPage', 200], ['/api/products/{slug}', 'get', 'Product', 200],
    ['/api/events', 'get', 'Event', 200, true], ['/api/contact', 'post', 'Message', 201],
    ['/api/auth/register', 'post', 'UserEnvelope', 201], ['/api/auth/login', 'post', 'UserEnvelope', 200], ['/api/auth/me', 'get', 'UserEnvelope', 200], ['/api/auth/logout', 'post', 'Message', 200],
    ['/api/profile', 'get', 'UserEnvelope', 200], ['/api/profile', 'patch', 'UserEnvelope', 200],
    ['/api/reservations/config', 'get', 'BookingConfig', 200], ['/api/reservations/availability', 'get', 'Availability', 200],
    ['/api/reservations', 'get', 'Reservation', 200, true], ['/api/reservations', 'post', 'Reservation', 201], ['/api/reservations/{id}', 'get', 'Reservation', 200], ['/api/reservations/{id}/cancel', 'post', 'Reservation', 200],
    ['/api/admin/overview', 'get', 'AdminOverview', 200], ['/api/admin/products', 'get', 'AdminProduct', 200, true], ['/api/admin/reservations', 'get', 'AdminReservation', 200, true], ['/api/admin/users', 'get', 'AdminUser', 200, true], ['/api/admin/events', 'get', 'AdminEvent', 200, true], ['/api/admin/contacts', 'get', 'AdminContact', 200, true],
  ];
  for (const [path, method, response, status, isArray] of contracts) {
    const operation = document.paths[path]?.[method];
    if (!operation) continue;
    operation.responses = { [status]: { description: 'Operación completada; escrituras confirmadas solo tras persistencia.', content: { 'application/json': { schema: isArray ? array(response) : ref(response) } } } };
    for (const [code, description] of [[400, 'Entrada inválida o campo no admitido'], [401, 'Sesión ausente, revocada o vencida'], [403, 'CSRF, origen o rol inválido'], [404, 'Recurso no encontrado o ajeno'], [409, 'Correo duplicado, reserva duplicada, conflicto de idempotencia o cupo agotado'], [429, 'Límite de intentos excedido'], [500, 'Fallo interno sin detalles sensibles']] as const) operation.responses[code] = { description, content: { 'application/json': { schema: ref('ApiError') } } };
    if (method !== 'get') {
      operation.security = [{ ...(operation.security?.[0] ?? {}), csrf: [] }];
      operation.parameters = [...(operation.parameters ?? []), { in: 'header', name: 'Origin', required: true, schema: string, description: 'Uno de los CORS_ORIGINS configurados. El navegador lo envía.' }];
    }
  }
  return document;
}
