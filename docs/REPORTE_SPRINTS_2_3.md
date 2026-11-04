# Mr. Little Coffee — reporte de implementación de Sprints 2 y 3

Este documento describe código implementado en el repositorio y separa implementación de verificación. Las referencias S2-Fxx, S3-Fxx y CP-xxx son identificadores locales para preparar documentación posterior: **no son IDs de Azure DevOps**. No se creó ni modificó contenido en Azure, no se hizo push ni despliegue y no se asignan responsables, horas ni estados históricos.

**Integración anterior al seguimiento de navegación:** los flujos S2/S3 tienen implementación frontend y backend. En esa entrega aprobaron 23 pruebas unitarias frontend, seis unitarias backend, 16 pruebas de integración HTTP/PostgreSQL (15 subpruebas y su contenedor), 14 comprobaciones HTTP de demostración y 17 comprobaciones HTTP/SSR de páginas, además de typecheck, lint y build de ambos proyectos. PostgreSQL 18 local utiliza el puerto 55432 y bases de desarrollo/pruebas distintas; también se verificó persistencia después de reiniciar API y PostgreSQL. Los resultados del seguimiento de sesión/reservas se registran por separado en los apartados 2 y 9. La reorganización posterior en `frontend/`, `backend/` y `erp/` se describe en el apartado 12, con su propia verificación; la comparación visual y las pruebas interactivas de navegador siguen pendientes.

**Ampliación autorizada posteriormente por el usuario:** recuperar el acceso al panel denominado ERP mediante `admin/1234` y el acceso cliente mediante `cliente/1234`, y mostrar el funcionamiento real de Menú, Eventos y Reservas. Esta instrucción posterior modifica la exclusión administrativa del pedido original. La ampliación se limita a cuentas locales de demostración y consultas administrativas sobre datos persistidos; no constituye un ERP completo ni agrega ventas, facturación, inventario, pedidos o pagos. Las contraseñas de ejemplo aquí publicadas son exclusivamente las dos solicitadas para la demostración; no se incluye ningún secreto de `.env`.

## 1. Estado inicial y diagnóstico

La base Git era el commit `323b79a` (`Initial commit Sprint1 frontend`). Ya existían cambios locales del usuario en `package.json`, Inicio, `globals.css`, layout, `PublicHeader`, `PublicFooter`, `Logo` y `tsconfig.tsbuildinfo`. Se conservaron; no hubo reset, limpieza destructiva ni sustitución de esos cambios. No se encontraron instrucciones `AGENTS.md` en el repositorio ni en Desktop.

El frontend existente utilizaba Next.js 14.2.5 App Router, React 18.3.1, TypeScript 5.5.3, Tailwind 3.4.4, PostCSS, CSS global, pnpm y recursos locales. Tailwind sí estaba incluido mediante las tres directivas `@tailwind` en `globals.css`. No existía backend NestJS/PostgreSQL, migraciones ni persistencia de los flujos solicitados.

| Área preexistente | Qué había | Qué faltaba o estaba simulado |
| --- | --- | --- |
| Inicio | Hero, cuatro destacados, mascota, franjas, header/footer y diseño responsivo | «Conocer más» era un botón sin acción; algunos enlaces necesitaban destino funcional. Se protegió la interfaz existente. |
| Menú | Doce productos locales, ocho filtros incluyendo Todo/Novedades, opciones Destacados y Nombre A–Z, contador, cuadrícula | No había API, paginación, selección en URL, estado de red ni detalle. Todo incluía un producto `available:false`. |
| Eventos | Cinco tarjetas con textos, día/mes/hora y CTA | Sin año ni persistencia; todas visibles; «Consultar evento» dirigía a reservas de mesas. |
| Nosotros | Historia, mascota, valores y enlace a Contacto | Contenido útil conservado; mejora de semántica e imagen. No requiere API. |
| Contacto | Nombre, correo, mensaje e información de ubicación | `preventDefault` mostraba «Mensaje simulado enviado correctamente.» sin guardar ni enviar nada. |
| Autenticación/perfil | Login, registro, perfil y `DemoAuthContext` con datos de demostración | Sin cuenta, hash, sesión revocable o perfil persistidos; controles de cliente no constituían autorización real. |
| Reservas | Interfaz de selección y datos de demostración | Sin cupos transaccionales, propiedad de reservas, idempotencia, cancelación consistente ni disponibilidad persistida. |
| Rutas excluidas inicialmente | Demo administrativo y favoritos | Se retiró la autorización simulada y Favoritos. Por instrucción posterior se recupera el panel administrativo con autorización de servidor y lecturas reales. |

### Causa comprobada del listado «Todo»

El `MenuCatalog` inicial ejecutaba `products.filter(...).sort(...)` y renderizaba `visible.map(...)`. El archivo ahora ubicado en `frontend/src/data/index.ts` contenía doce IDs distintos, del 1 al 12. No había `fetch`, efectos de carga, concatenación de estado ni generador de productos. **La causa identificada en código era renderizar toda la lista finita sin paginar**; en una columna móvil resultaba larga. No se encontraron duplicados ni un bucle infinito en esa implementación. No se declara reproducido visualmente un scroll infinito: la herramienta de navegador no estuvo disponible.

La corrección lleva el filtrado/ordenamiento al conjunto completo en PostgreSQL, obtiene `total` y devuelve una página explícita. El frontend reemplaza resultados y pide nueve tarjetas; no concatena ni rellena espacios. El seed conserva doce productos, once activos: el resultado esperado es nueve y dos, con un final real.

## 2. Resultado por sprint

### Sprint 2

- Catálogo conectado a categorías y productos persistidos; Todo incluye solo activos; Novedades usa la etiqueta original «Nuevo». Orden Destacados y A–Z, desempate estable, validación de parámetros, nueve elementos por página y total del filtro.
- Selección en `category`, `sort`, `page`; al cambiar categoría/orden se vuelve a página 1. Solicitudes abortadas y comprobación de la clave de selección impiden que una respuesta antigua reemplace el filtro actual. Hay carga, reintento, error, parámetros inválidos, vacío y última página.
- Detalle `/menu/[slug]`, acceso directo y desde tarjetas. Nombre, categoría, descripción e ilustración original; precio del catálogo o «Precio no disponible». Un producto inexistente/inactivo usa `notFound()` a partir del 404 de la API. No se añadieron ingredientes, alérgenos, compras o favoritos.
- Agenda con eventos publicados, orden fecha/ID y separación próximos/pasados en hora de El Salvador. Se retiró el CTA incorrecto hacia reservas. No hay inscripción ni venta.
- Nosotros conserva contenido útil y navegación; incorpora imagen dimensionada con `next/image` y semántica de la sección de valores.
- Contacto RHF/Zod, validación equivalente al servidor, CSRF, límite de envíos y almacenamiento en `contact_messages`. Solo muestra recepción tras resolverse el POST; no afirma envío de correo.

### Sprint 3

- Registro y login reales; correo normalizado y único, bcrypt, rol público fijo `customer`, JWT limitado en cookie HttpOnly y sesión revocable en PostgreSQL.
- Consulta de sesión después de recargar, expiración, logout con revocación y borrado de cookie. No se guardan tokens en localStorage. Retorno tras login limitado a rutas internas admitidas.
- Perfil privado con nombre y teléfono opcional editables; correo de solo lectura. Opciones de cuenta y salida en las pantallas S3, sin introducir un diseño nuevo en Inicio.
- Consulta pública de disponibilidad; confirmación autenticada. La URL conserva fecha/personas/hora al pasar por login, sin crear automáticamente una reserva.
- Reserva confirmada, futuras e historial propios, detalle y cancelación anterior al inicio. El backend deriva el usuario de la sesión; rechaza consultar/cancelar reservas ajenas.
- Cupo por franja, transacción, bloqueo de fila e índices únicos; idempotencia por usuario/UUID y cancelación que libera una sola vez. No se asignan mesas físicas ni se implementa reprogramación.

### Ampliación posterior: accesos demo y panel de consulta

- Se incorporan cuentas persistidas `admin` y `cliente`, ambas con la contraseña de demostración `1234`, bajo la opción explícita `DEMO_ACCOUNTS_ENABLED=true` en el entorno local. En producción, activar esta opción impide el arranque; sin ella se rechaza el acceso de las cuentas demo.
- El registro público sigue exigiendo correo válido, contraseña de al menos ocho caracteres y rol `customer` fijado en servidor. La excepción de cuatro caracteres corresponde exclusivamente al seed de las dos cuentas autorizadas, con hash de contraseña.
- El administrador accede a consultas de resumen, productos, reservas, clientes, eventos y mensajes de contacto mediante API protegida. El cliente no puede usar estas rutas cambiando la URL. Las pantallas muestran errores ante una API caída, sin datos ficticios que aparenten una consulta exitosa.
- Rutas de consulta: `/admin`, `/admin/menu`, `/admin/reservas`, `/admin/clientes`, `/admin/eventos`, `/admin/contactos`. Las rutas originales `/admin/inventario`, `/admin/reportes` y `/admin/configuracion` identifican módulos pendientes; no muestran métricas comerciales inventadas ni confirman guardados simulados.

### Seguimiento autorizado: sesión y reservas sin controles repetidos

El usuario pidió que «Registro» desaparezca al iniciar sesión y revisar login/reservas para eliminar redundancias. El header ahora muestra un estado neutral mientras verifica la sesión, «Registro» al invitado (excepto en login/registro), «Mi cuenta» al cliente y «ERP» al administrador. Esta instrucción amplía expresamente la excepción de `PublicHeader`; los demás archivos protegidos de Inicio y sus hashes se conservan.

Se retiró la barra `AccountNavigation` repetida. El perfil concentra editar datos, consultar reservas y cerrar sesión; salir vuelve a Inicio. Las pantallas de edición, historial y detalle tienen enlaces contextuales de retorno. Reservas conserva una sola acción de confirmación y presenta después un comprobante separado, con «Ver mi reserva» y «Hacer otra reserva» explícito. Login/registro ocultan el formulario durante comprobación/redirección, usan una única redirección y conservan un `next` interno válido, incluida la selección de reserva de un administrador; sin `next`, admin va al ERP y cliente al perfil.

Verificación de este seguimiento: **36/36 pruebas frontend de renderizado y helpers aprobadas**, typecheck aprobado y lint aprobado con el aviso preexistente de imagen en Inicio. El build de esta revisión terminó con exit 0: compilación y 24 páginas estáticas generadas. No hubo verificación visual: el host del navegador no estuvo disponible y se detuvo Windows Computer Use al no poder verificar la URL, sin enviar más entradas a la interfaz.

## 3. Matriz de funcionalidades y aceptación observable

El estado «Implementado» indica presencia de código integrado; la columna QA distingue los resultados ejecutados de los pendientes.

| ID / sprint | Actor y necesidad | Comportamiento y aceptación observable | Origen | Archivos/rutas principales | API/datos | QA y estado real |
| --- | --- | --- | --- | --- | --- | --- |
| S2-F01 / 2 | Visitante: explorar todo el catálogo sin lista interminable | Hasta 9 tarjetas por página; total del filtro; sin IDs repetidos; A–Z/Destacados antes de paginar; filtros/URL reinician página; última página sin Siguiente | Corregida sobre UI existente | `MenuCatalog.tsx`, `frontend/src/lib/catalog.ts`, `/menu` | `GET categories/products`; categorías/productos | Helpers URL y API PostgreSQL aprobados: 9+2, total11, sin repetidos, filtro/orden/vacío/400; navegador pendiente |
| S2-F02 / 2 | Visitante: conocer una selección | Cada destacado abre un slug distinto; detalle directo/recarga; precio real o indisponible; inexistente/inactivo 404; regreso al menú | Nueva ruta, enlace existente corregido | `ProductCard.tsx`, `CatalogProductCard.tsx`, `/menu/[slug]` y `not-found/error` | `GET products/:slug`; producto/categoría | API y SSR aprobados: cuatro productos distintos/200, enlaces en HTML de Inicio y desconocido/inactivo404; navegador/visual pendientes |
| S2-F03 / 2 | Visitante: consultar agenda | Solo publicados, orden fecha/ID, próximos/pasados, zona del negocio, estado vacío/error; sin inscripción | Corregida | `EditorialPage.tsx`, `/eventos` y error | `GET events`; eventos | API PostgreSQL aprobada: cuatro publicados ordenados, borrador omitido; visual pendiente |
| S2-F04 / 2 | Visitante: conocer la marca | Historia y valores preservados, mascota con alt/dimensiones, enlace a Contacto | Preexistente mejorada | `/nosotros` | Contenido estático | Verificación visual/teclado pendiente |
| S2-F05 / 2 | Visitante: dejar un mensaje | Nombre 2–100, correo válido ≤254, mensaje 10–3000; trims/normalización; error no muestra éxito; éxito después de INSERT; sin listado público | Formulario corregido | `ContactForm.tsx`, `contact.schema.ts`, `/contacto` | `POST contact`; mensajes | Cliente y persistencia PostgreSQL aprobados; 400/403/429 y fallo real BD500 comprobados; navegador pendiente |
| S3-F01 / 3 | Visitante/cliente: crear cuenta e iniciar sesión | Confirmación de contraseña cliente; email único normalizado incluso concurrente; hash; login inválido 401; sesión tras recarga, expiración/logout reales | Simulación sustituida | AuthContext, useAuth, LoginForm, RegisterForm, `frontend/src/lib/auth*`, `/login`, `/registro` | `auth/*`; usuarios/sesiones | Trece pruebas frontend S3 y API PostgreSQL aprobadas: registro simultáneo201/409, login/me/expiración/logout; recarga navegador pendiente |
| S3-F02 / 3 | Cliente: mantener sus datos | Sin sesión 401/retorno login; ver nombre/correo/teléfono; editar nombre/teléfono; correo/rol no admitidos en PATCH | Simulación sustituida | RequireAuth, ProfileShell, ProfileEditor, CustomerProfile; `/perfil`, `/perfil/configuracion` | `GET/PATCH profile`; usuario autenticado | Schemas y persistencia PostgreSQL aprobados; PATCH y reinicio API conservan datos; navegador pendiente |
| S3-F03 / 3 | Visitante: consultar cupo | Config del backend; fecha/personas válidas; franjas alineadas; cupo actual; carga/error/vacío; login conserva selección y no confirma solo | Nueva lógica sobre UI previa | ReservationForm, `frontend/src/lib/reservations.ts`, `/reservas` | `reservations/config/availability`; franjas | Helpers TZ, reglas backend y disponibilidad HTTP aprobados; retorno mediante navegador pendiente |
| S3-F04 / 3 | Cliente: confirmar sin duplicados/sobreaforo | Server valida instante/grupo; Idempotency-Key reutilizable; una activa usuario/franja; último cupo protegido con bloqueo/tx; éxito tras commit | Nueva | ReservationForm; `backend/src/reservations.ts` | `POST reservations`; franja/reserva/sesión | PostgreSQL real aprobado: idempotencia concurrente, duplicado409 y competencia último cupo201/409 sin superar20; navegador pendiente |
| S3-F05 / 3 | Cliente: consultar/cancelar sus visitas | Futuras/historial; detalle propio; ajena 404; cancelada libera una vez; pasada no cancelable; sin reprogramación | Nueva | `customer/Reservations.tsx`, `/perfil/reservas`, `/perfil/reservas/[id]` | `GET reservations`, `GET :id`, `POST :id/cancel` | PostgreSQL aprobado: propiedad, cancelación concurrente, cupo liberado una vez, repetición/persistencia; cancelación pasada409 sin alterar cupo/estado; navegador pendiente |
| S3-F06 / 3, ampliación posterior | Administrador: consultar datos; cliente: probar su cuenta | `admin/1234` y `cliente/1234` con demo local; seis consultas admin de PostgreSQL; cliente403 en API admin; producción rechaza flag demo; inventario/reportes/configuración se identifican pendientes | Demo anterior sustituida por persistencia y autorización reales | `erp/src/**`, adaptadores `frontend/src/app/admin/**`, LoginForm, `backend/src/admin.ts`, `demo.ts`, seed y migración AdminRole | `auth/login`, `GET admin/*`; roles admin/customer y datos existentes | Unitarias frontend/backend e integración PostgreSQL aprobadas antes de separar ERP: demo opt-in, hash/no sobrescritura, 401/403/200, rol vigente en BD y bloqueo sin flag; revisión posterior al traslado en apartado 12 |

## 4. Trabajo técnico efectivamente realizado

| Función | Frontend | Backend y datos | QA incorporado |
| --- | --- | --- | --- |
| Catálogo/detalle | Separación del componente de Home, página cliente con URL/abort, tarjetas API, detalle servidor/404/error, precios ausentes explícitos | DTO de consulta; filtros/order/count antes de limit/offset; relación categoría; slugs únicos; seed preservado | Parser URL y contratos puros; casos integración de paginación/activos/404 |
| Agenda | Agrupación temporal, `time`, estado vacío/error, retirada CTA | Módulo eventos de solo lectura; filtro published; índice publicado/fecha/ID; seed identificado como ejemplo | Casos API publicación/orden; visual pendiente |
| Nosotros | Imagen accesible dimensionada y valores identificados | Sin API ni tabla artificial | Revisión código; visual pendiente |
| Contacto | RHF/Zod, errores asociados, espera/bloqueo, éxito después del POST | DTO, CSRF, rate limit PostgreSQL, INSERT; sin lectura pública | Normalización/longitudes cliente; DTO e integración de persistencia |
| Auth/perfil | AuthContext real, formularios, guards de UI, navegación S3, retorno seguro | Módulos Auth/Profile; bcrypt con coste 12; JWT+sid; SessionGuard consulta PostgreSQL; cookies; email único y rol fijo | Validación/retorno/API helper frontend; sesiones/duplicados/privacidad en integración |
| Disponibilidad/reservas | Selección URL, config del backend, estado de carga/error, retorno login, idempotencia de intención, listas/detalle/cancelación | Reglas centralizadas Luxon; slots `timestamptz`; transacción y locks; índices parciales/unicidad; aislamiento por propietario | Reglas/zonas unitarias; último cupo, doble envío, retry/cancelación/ajena con PostgreSQL |
| Integración | Cliente HTTP único, sin datos falsos ante caída; retiro de autenticación simulada y exclusiones; preservación Inicio | Bootstrap env validado, DTO whitelist, OpenAPI, errores seguros, CORS explícito, esquema migrado, seeds no destructivos | Lint/typecheck/build; datos test separados; evidencia de Inicio; comandos documentados |
| Ampliación demo/admin | Login admite los alias autorizados; panel protegido con estado de carga/error y navegación a consultas | Seed optativo de cuentas con hash; migración de rol admin; guard de servidor; endpoints GET sobre datos reales; demo bloqueada en producción | Casos de alias, flag, roles y lecturas administrativas; resultado final en apartado 9 |

## 5. Defectos y corrección

| Defecto | Reproducción/causa comprobada | Corrección | Comprobación posterior |
| --- | --- | --- | --- |
| «Todo» demasiado largo | Abrir Menú/Todo; código renderizaba doce objetos únicos de una vez, sin paginación. No había solicitudes repetidas ni acumulación | Consulta paginada (9), contador `total`, reemplazo de items y fin real | PostgreSQL/HTTP aprobado: 9+2, total11, IDs únicos, tercera página vacía; navegador pendiente |
| Inactivo visible | `available:false` no intervenía en filtro original | `WHERE active=true` también en detalle | Integración aprobada: Mocha ausente de listado y detalle404 |
| Conocer más inerte | `<button>` sin onClick/href | Link a slug estable; nueva ruta detalle | Mapa de cuatro slugs y GET API de cuatro IDs distintos aprobados; navegación real pendiente |
| Selección perdida al recargar | Estado local exclusivo useState | URL fuente de selección; navegación conserva filtros; cambio selección a página 1 | Roundtrip unitario aprobado; Atrás real no ejecutado |
| Evento remite a reserva de mesas | CTA común de EditorialPage apuntaba `/reservas` | Retirado; contenido completo en agenda, sin nuevo flujo de eventos | Revisión código; navegador no ejecutado |
| Falso éxito Contacto | `setMsg` inmediato sin red/BD | POST validado; mensaje de recepción tras respuesta exitosa; error conserva valores | Schema e integración aprobados: fila normalizada persistida, fallos400/403 y fallo real tabla500, abuso429; formulario navegador pendiente |
| Login/perfil/reservas simulados | Datos/contexto de demostración no vinculados a PostgreSQL | Sustitución por API y autorización del servidor; el acceso demo posterior usa usuarios persistidos y flag explícito | Helpers e integración PostgreSQL aprobados; persistencia, permisos, revocación y concurrencia comprobados por HTTP |
| Menú/Eventos/Reservas con error de conexión | Las capturas posteriores aportadas por el usuario muestran errores al consultar la API; Inicio puede seguir visible porque conserva contenido local | Arranque coordinado de PostgreSQL, API y frontend; health comprueba la base; estados de error reales conservados | Lanzador exit0, health200 con database=ok/demo=true; smoke HTTP real consulta catálogo/eventos y crea/cancela reserva. Esas capturas no son referencia visual de Inicio |

## 6. Contratos finales de la API

Base local `http://localhost:4000/api`; frontend `http://localhost:3000`. Swagger/OpenAPI en `/api/docs` y `/api/docs-json`. Todas las escrituras requieren `Origin` incluido en `CORS_ORIGINS`, cookie CSRF y header `X-CSRF-Token` obtenido de `GET /csrf`; CORS/SameSite no sustituyen este control. Respuestas `Cache-Control: no-store`; body JSON ≤16 KB. Campos no admitidos, tipos/formato/longitudes inválidos producen 400. Los errores no exponen stack/query/secretos.

| Método y ruta relativa | Autenticación | Entrada/validaciones | Respuesta y errores relevantes |
| --- | --- | --- | --- |
| GET `/csrf` | Pública | Sin cuerpo | 200 `{csrfToken}` y cookie firmada HttpOnly con vigencia 2h |
| GET `/health` | Pública | Sin cuerpo | 200 `{status:"ok",database:"ok",demoAccountsEnabled:boolean}` después de consulta `SELECT 1` a PostgreSQL; no expone credenciales |
| GET `/categories` | Pública | Sin escritura | 200 `[{id,slug,name}]`, nombre/ID ascendente |
| GET `/products` | Pública | `page` entero1–100000, `pageSize`1–50 (default9), `sort=featured` o `sort=az`, `category` slug≤80; `novedades` es filtro etiqueta Nuevo | `{items,total,page,pageSize,totalPages}`. Desconocida válida→vacío; página posterior→items vacíos y total conservado; inválido, 400 |
| GET `/products/:slug` | Pública | Slug normalizado≤120 | Producto activo `{id,slug,name,description,image,category,label,featured,priceCents}`; inexistente/inactivo404 |
| GET `/events` | Pública | Sin cuerpo | Array publicado `{id,title,description,startsAt,image}`, fecha/ID ascendente |
| POST `/contact` | Pública + CSRF | `name` trim2–100; `email` trim/lower válido≤254; `message` trim10–3000; `subject?`2–150 | 201 mensaje recibido tras INSERT; 400/403/429; cinco intentos/IP/hora |
| POST `/auth/register` | Pública + CSRF | Nombre2–100; email normalizado≤254; contraseña8–72 caracteres y ≤72 bytes UTF-8; no userId/role ni correos reservados para demo | 201 `{user}` + cookie sesión; duplicado409; inválido/reservado400; límite10/IP/hora |
| POST `/auth/login` | Pública + CSRF | Campo `email`: correo normalizado o alias exacto `admin`/`cliente` con demo habilitada; contraseña1–72 y ≤72 bytes UTF-8 | 200 `{user}` + cookie; credenciales401; 20/IP/15min y 10/email/15min; cuentas demo rechazadas sin flag |
| GET `/auth/me` | Cookie+sesión vigente | Sin IDs cliente | 200 `{user}`; ausente/expirada/revocada401 |
| POST `/auth/logout` | Cookie opcional + CSRF | Sin cuerpo | 200; revoca sesión existente y borra cookie con mismos atributos; tolera ya cerrada |
| GET `/profile` | Sesión vigente | Usuario derivado de sesión | 200 `{user}`; 401 |
| PATCH `/profile` | Sesión + CSRF | `name?`2–100; `phone?`null/vacío o7–25 caracteres `[+0-9 ()-]`; al menos un campo; correo/rol no admitidos | 200 `{user}` tras guardar; 400/401/403/429; 30/IP/hora |
| GET `/reservations/config` | Pública | Sin cuerpo | Configuración de reserva sin secretos: timezone, horas, duración, aforo, grupo, anticipación |
| GET `/reservations/availability` | Pública | `date=YYYY-MM-DD` real entre hoy/límite; `people` entero dentro config | `{date,timezone,slots:[{startsAt,time,available,remaining}]}`; inválido, 400 |
| POST `/reservations` | Sesión + CSRF | `{startsAt,people}`; ISO con zona, horario/franja/anticipación/grupo; header `Idempotency-Key` UUIDv4 | 201 reserva tras commit; misma intención devuelve misma; 409 cupo/duplicado/clave distinta carga; 400/401/403/429; 60/IP/hora |
| GET `/reservations` | Sesión | Sin userId cliente | Array propio `{id,startsAt,people,status,createdAt}`; fecha descendente, ID ascendente |
| GET `/reservations/:id` | Sesión | UUIDv4 | Reserva propia; ajena/inexistente404; inválido, 400 |
| POST `/reservations/:id/cancel` | Sesión + CSRF | UUIDv4; futura confirmada | 200 cancelada; repetición no libera más; pasada409; ajena404; 60/IP/hora |
| GET `/admin/overview` | Sesión vigente, rol admin | Sin identidad/rol elegidos por cliente | Contadores de productos total/activos, reservas total/confirmadas/canceladas/futuras, usuarios total/clientes/admin, eventos total/publicados y contactos; 401/403 |
| GET `/admin/products` | Sesión vigente, rol admin | Consulta de solo lectura | Array de productos con categoría, `active`, `displayOrder`; orden visual/ID; 401/403 |
| GET `/admin/reservations` | Sesión vigente, rol admin | Consulta de solo lectura | Array de reservas con `cancelledAt` y usuario `{id,name,email}`; fecha descendente/ID; 401/403 |
| GET `/admin/users` | Sesión vigente, rol admin | Consulta de solo lectura | Array de usuarios públicos y `createdAt`, sin hashes ni secretos de sesión; fecha creación descendente/ID; 401/403 |
| GET `/admin/events` | Sesión vigente, rol admin | Consulta de solo lectura | Array `{id,title,description,startsAt,image,published}`; incluye borradores, fecha/ID; 401/403 |
| GET `/admin/contacts` | Sesión vigente, rol admin | Consulta de solo lectura | Array `{id,name,email,subject,message,createdAt}`, fecha creación descendente/ID, sin exposición pública; 401/403 |

El usuario público incluye únicamente `id`, `name`, `email`, `phone`, `role`; no passwordHash, JWT, secretos ni sesiones internas. No existen endpoints administrativos de escritura de catálogo/eventos ni listado público de mensajes. Los GET administrativos son la ampliación posterior autorizada y requieren rol admin en servidor.

## 7. Datos, migración, seed y reglas

| Tabla | Necesidad y relaciones | Integridad/índices relevantes |
| --- | --- | --- |
| `categories` | Taxonomía persistida; 1:N productos | UUID PK, slug único |
| `products` | Catálogo activo con datos/ilustraciones originales | FK category; slug único; `price_cents` entero nullable ≥0; índice active/category/featured/order/ID |
| `events` | Agenda publicable de solo lectura | `starts_at timestamptz`; seed_key único; índice published/date/ID |
| `contact_messages` | Recepción persistida sin correo externo | UUID; created_at; CHECK longitud mensaje 10–3000 |
| `users` | Cuenta y perfil | Email único + CHECK trim/lower; password_hash; rol con CHECK `customer`/`admin`; registro público solo customer |
| `sessions` | Expiración/revocación verificadas en cada petición privada | FK user ON DELETE CASCADE; expires_at/revoked_at; índices usuario/expiración |
| `reservation_slots` | Cupos por instante, sin inventar mesas | `starts_at timestamptz` PK; capacidad>0; CHECK booked entre 0 y capacity |
| `reservations` | Reserva propia y trazabilidad de intención | FK user/slot; estado confirmed/cancelled; coherencia cancelled_at; unique user/idempotency; índice único parcial user/slot confirmado; índices usuario/fecha y slot/estado |
| `request_limits` | Límite persistido/atómico de abuso | Identidad hash por ámbito, count>0, resets_at; UPSERT evita contador en memoria por proceso |

`backend/src/database/migrations/1730000000000-InitialSchema.ts` crea el esquema y `1730000001000-AdminRole.ts` amplía la restricción de roles mediante otra migración, sin reescribir la inicial. TypeORM utiliza `synchronize:false`; no se sustituye migración por sincronización automática. `migration:run` y `seed` son comandos separados. Las relaciones y DTOs están en los módulos Auth/Profile, Catalog, Events, Contact, Reservations y la ampliación Admin, con infraestructura/configuración/seguridad comunes.

El seed usa transacción e INSERT con conflicto ignorado: incorpora solo filas faltantes, no borra ni sobreescribe datos existentes. Conserva seis categorías y doce productos del repositorio, incluyendo Mocha inactivo. No agrega precios inexistentes: todos los iniciales quedan `null`. Conserva los cinco textos de eventos; el año **2026 es un dato de ejemplo añadido**, porque la página anterior no tenía año. La Exposición de arte queda no publicada, coherente con el estado de borrador del demo anterior. No se presenta el seed como agenda comercial verificada.

Los eventos publicados de ejemplo están fechados entre agosto y septiembre de 2026; al ejecutar después de esas fechas aparecen en «Pasados» y la sección «Próximos» puede estar vacía. Esto es un resultado válido de la clasificación temporal, distinto de una API que no responde.

Con `DEMO_ACCOUNTS_ENABLED=true`, el seed incorpora las cuentas solicitadas `admin@demo.mrlittlecoffee.invalid` (alias `admin`, rol admin) y `cliente@demo.mrlittlecoffee.invalid` (alias `cliente`, rol customer), ambas con contraseña demo `1234` almacenada como hash. El dominio `.invalid` identifica correos de ejemplo; no se afirma que reciban correo. El seed sigue siendo repetible y no debe utilizarse como mecanismo para reemplazar cuentas del usuario. El flag está desactivado por defecto, se permite en development/test y se rechaza en production. Al desactivarlo se bloquean los alias, correos y sesiones demo ya persistidas. Las cuentas demo no eliminan las validaciones del registro público.

### Requisitos confirmados frente a configuración provisional

Confirmado por alcance: reservas de usuario autenticado; disponibilidad pública; éxito tras persistir; propiedad y autorización en servidor; cancelación antes del inicio; transacción contra sobreaforo; idempotencia; sin mesas físicas, pagos, pedidos, reprogramación ni inscripción a eventos.

**Provisional, pendiente de validar con el negocio:** America/El_Salvador, apertura diaria 07:00–21:00, franjas de 60 minutos alineadas, última entrada 20:00, 20 personas/franja, grupos de 1–6, aviso mínimo 30 minutos y máximo 30 días, confirmación automática. Se centraliza en `backend/src/config.ts` con variables `BUSINESS_TIMEZONE`, `OPENING_HOUR`, `CLOSING_HOUR`, `SLOT_MINUTES`, `SLOT_CAPACITY`, `MIN_PEOPLE`, `MAX_PEOPLE`, `MIN_NOTICE_MINUTES`, `MAX_ADVANCE_DAYS`; arranque rechaza valores incompatibles. El formulario obtiene la configuración pública del backend. Cambiar capacidad no reescribe automáticamente franjas ya creadas: cada fila conserva su capacidad registrada.

La creación bloquea una clave transaccional usuario/idempotencia y después la franja con `FOR UPDATE`; revalida cupo y existencia antes de incrementar/insertar. La cancelación bloquea franja y reserva en orden consistente, devuelve la ya cancelada sin descontar nuevamente y rechaza ajenas/pasadas. Los índices/CHECKs son una segunda barrera. Estos mecanismos implementados solo se consideran verificados frente a concurrencia cuando pasan las pruebas PostgreSQL del apartado siguiente.

## 8. Casos de prueba trazables

Los casos automatizados puros se ejecutan sin PostgreSQL; **no demuestran persistencia, navegación real ni ausencia de carreras en la base**. Los de integración requieren una BD aislada; nunca usar una base del usuario. Datos de prueba creados por la suite no son el catálogo comercial.

La suite PostgreSQL es `backend/test/integration.test.ts`; sus subpruebas trazan los casos CP-S2-101–105 y CP-S3-101–108/110. `backend/test/unit.test.ts` verifica DTOs, reglas horarias, configuración y CSRF sin reemplazar las comprobaciones con PostgreSQL. Un resultado aprobado en un nivel no implica aprobación en el otro.

| Caso / sprint / función | Precondiciones y datos | Pasos y resultado esperado | Observado / estado | Evidencia y tipo |
| --- | --- | --- | --- | --- |
| CP-S2-URL-01–05 /2/F01 | TypeScript instalado; URL vacía, categoría/az/página2, página inválida/duplicada y slug inseguro | Parsear/serializar; defaults 9/1; conservar filtros; reset página 1; rechazar inválidos | 5 casos aprobados; repetición tras ajuste de regex también aprobada | `frontend/tests/frontend-s2.test.cjs`; automatizado unitario |
| CP-S2-HOME-01 /2/F02 | Mapa de IDs1–4 | Comparar cuatro slugs exactos y distintos | Aprobado | Mismo archivo; automatizado unitario |
| CP-S2-PRICE-01 /2/F02 | `null`,450, 0 centavos | Indisponible para null; importes 4.50/0.00 | Aprobado | Mismo archivo; automatizado unitario |
| CP-S2-CONTACT-01–03 /2/F05 | Nombre/email con espacios; mensaje válido; límites/errores | Normalizar; rechazar vacío/formato/mínimos/máximos; aceptar 100/3000 | 3 casos aprobados | Mismo archivo; automatizado unitario |
| CP-S2-101 /2/F01 | API/BD test migrada; seed con 11 activos | Pedir páginas 1/2 de 9 y unir IDs; esperar 9+2, total 11, totalPages 2, sin repetidos | Aprobado: 9+2, total11, totalPages2, once IDs únicos y página3 vacía | `backend/test/integration.test.ts`; automatizado integración PostgreSQL |
| CP-S2-102 /2/F01 | Mismo seed; café clásico/Novedades; sort=az | Filtrar/ordenar antes de paginar; pedir página posterior, categoría desconocida, page0/pageSize51/orden inválido; desactivar catálogo | Aprobado: café clásico total3 y Cappuccino primero, A–Z empieza Affogato; Novedades2; categoría desconocida/catálogo desactivado vacíos; inválidos400 | Misma suite; integración PostgreSQL |
| CP-S2-103 /2/F02 | API activa con seed y build frontend | GET de cuatro slugs; desconocido e inactivo; esperar productos correctos distintos y 404 | Aprobado: API con cuatro IDs/slugs correctos; cuatro páginas SSR200; desconocido/Mocha404 en API y frontend. Navegación real pendiente | Suite PostgreSQL y `docs/evidence/frontend-http.json`; HTTP/API/SSR |
| CP-S2-104 /2/F03 | Eventos publicados y uno borrador | GET events; esperar orden y ausencia de borrador | Aprobado: cuatro publicados ordenados; Exposición de arte omitida | Misma suite; integración PostgreSQL |
| CP-S2-105 /2/F05 | CSRF/origen válido; mensaje nuevo | POST válido y consultar fila; inválido400, sin CSRF/origen ajeno403; simular fallo real tabla; sexto intento429 | Aprobado: fila normalizada; rechazos400/403; tabla no disponible500; cinco POST válidos201 y sexto429; GET público404 | Misma suite; integración PostgreSQL |
| CP-S2-106 /2/F01–05 | Navegador y API | Cambiar filtros rápidamente; recargar/Atrás; simular API caída; validar cero falso éxito; teclado/móvil | No ejecutado: navegador no disponible | Manual/automatización navegador pendiente |
| CP-S3-U01–U11 /3/F01–03 | Runner Node, fetch simulado y schemas reales | Retorno interno; CSRF/credentials/no-store; abort/red/500/401; falloCSRF; TZ; contraseña/phone | 11/11 aprobados; incluye timeout recuperable | `frontend/tests/frontend-auth.test.cjs`; unitario |
| CP-S3-U12 /3/F06, ampliación | Roles admin/customer, next admin válido y rutas maliciosas | Calcular destino tras login; admin sin next→`/admin`; customer nunca→admin; rechazar normalización insegura | Aprobado, dentro de suite final 13/13 | `frontend/tests/frontend-auth.test.cjs`; unitario |
| CP-S3-U13 /3/F06, ampliación | Schemas de login y registro; alias admin/cliente, contraseña1234 | Login admite alias y contraseña corta demo; registro continúa rechazando contraseña menor de ocho | Aprobado, dentro de suite final 13/13 | Mismos archivos; unitario; el flag se comprueba además en backend |
| CP-S3-101 /3/F01 | BD test; dos registros mismo email normalizado | Registrar concurrentemente; esperar un usuario y conflicto; nunca admin/hash en respuesta | Aprobado: respuestas201/409, una fila; cliente sin hash; campos de privilegio400 | `backend/test/integration.test.ts`; integración PostgreSQL |
| CP-S3-102 /3/F01 | Usuario/sesión persistidos | Login inválido401; válido cookie HttpOnly; me; expirar JWT/sesión, logout y reutilizar cookie antigua | Aprobado: identidad correcta/no-store; inválido/expirado/revocado401; cookie previa no revive sesión | Misma suite; integración PostgreSQL |
| CP-S3-103 /3/F02 | Sesión válida y sin sesión | PATCH nombre/teléfono; GET refleja; email, role y name=null rechazados; sin cookie401 | Aprobado: nombre/teléfono persistidos; email/role/name=null400 y anónimo401; rol no modificable por cliente | Misma suite; integración PostgreSQL, repetición final con caso role |
| CP-S3-104 /3/F03 | Config provisional; fecha pasada/desalineada/fuera horario | Validar TZ,30 minutos/30 días, 1–6 personas, cierre/alineación; consultar día futuro | Aprobado: límites unitarios y HTTP400 para pasado, 06:00/21:00, 7 personas y día31; disponibilidad14 franjas hasta20:00 | `backend/test/unit.test.ts` + integración PostgreSQL |
| CP-S3-105 /3/F04 | Sesión; franja futura | Enviar misma clave/datos simultáneamente; repetir con otra carga o segunda clave misma franja | Aprobado: dos201 con mismo ID, cupo2; carga distinta409, segunda activa409; clave faltante/userId400 | Suite PostgreSQL; integración concurrente |
| CP-S3-106 /3/F04 | Tres reservas de6 ocupan18; dos clientes piden2 simultáneamente | Competir por últimos2 cupos; consultar booked y suma de confirmadas; intentar booked21 | Aprobado: una201 y otra409; booked=suma=capacity20; CHECK rechaza21 | Suite PostgreSQL real; concurrencia |
| CP-S3-107 /3/F05 | Reserva propia futura, ajena y fixture pasada en BD test | Leer/cancelar ajena; cancelar propia dos veces simultáneamente; repetir intención cancelada y crear nueva; intentar cancelar pasada | Aprobado: ajena404; ambas cancelaciones200, booked0; replay conserva ID/cancelada y nueva clave permite crear; pasada409 mantiene booked2, confirmed y cancelledAt=null | Suite PostgreSQL; integración concurrente, repetición final con reserva pasada |
| CP-S3-108 /3/F01/F04 | Datos confirmados; aplicación/conexión reiniciable | Cerrar/recrear Nest y conexión; leer usuario/sesión/reserva/contacto; repetir seed y migración | Aprobado en integración: sesión/nombre/reservas/contacto persisten, seed sin duplicados ni sobrescritura y migración repetida0 cambios. Además CP-DEMO-02 comprobó reinicio real de API y proceso PostgreSQL | Suite PostgreSQL + `docs/evidence/demo-functional.json`; integración |
| CP-S3-109 /3/F01–05 | Navegador y API | Recargar sesión/perfil; logout; visitante elige franja→login→retorna sin auto-POST; confirmar/cancelar mediante UI | No ejecutado: navegador no disponible | Manual pendiente |
| CP-S3-110 /3/F06, ampliación | Desarrollo/test, demo habilitada, migraciones/seed aplicados | Seed optativo; login alias/correos; seis GET admin; cliente403/sin sesión401; cambiar rol persistido; logout; desactivar demo; producción+flag | Aprobado: bcrypt12/sin sobrescritura; admin200 y cliente403 en seis rutas; sin sesión401; rol BD vigente; alias/correos/sesiones demo bloqueados sin flag; producción+flag rechazado por prueba unitaria | Suite backend unitaria + PostgreSQL; navegación pendiente |
| CP-DEMO-01 /2–3/F01–06 | Servicios reales activos, PostgreSQL demo local, cuentas demo | `verify-demo.cjs prepare`: login ambas cuentas; catálogo9+2; cuatro eventos; roles admin/customer/visitante; editar/restaurar perfil; guardar contacto y verlo admin; doble creación/cancelación de reserva | Aprobado: diez comprobaciones HTTP reales; reserva única reflejada en panel API y estado final cancelado; perfil restaurado | `docs/evidence/demo-functional.json`, fase prepare; HTTP con PostgreSQL sin navegador |
| CP-DEMO-02 /3/F01/F02/F05 | Fase prepare y estado temporal `.local/demo-smoke.json` | Detener API y PostgreSQL con stop-demo; iniciar con start-demo; `verify-demo.cjs resume`: reutilizar cookies, consultar datos y cerrar sesiones | Aprobado: cuatro comprobaciones; sesión/perfil/reserva/contacto sobreviven al reinicio real API+PostgreSQL; logout de ambas cuentas seguido de me401 | Mismo JSON, fase resume; HTTP con PostgreSQL sin navegador |
| CP-HTTP-01 /2–3/F01–06 | Build frontend en servidor temporal3001, servidor del usuario3000 y API real4000 | `verify-http.cjs`: Inicio y enlaces de cuatro destacados; páginas públicas/perfil/admin; desconocido/inactivo/favoritos | Aprobado17/17 en ambos servidores: catorce200 y tres404. HTML admin200 contiene pantalla con guard de cliente; permisos de datos se verifican por separado en API, no se deducen del200 HTML | `docs/evidence/frontend-http.json`, última ejecución3000; HTTP/SSR sin navegador |
| CP-HOME-01 /1 protegido | Referencia inicial en `.local/baseline`, hashes de evidencia | Comparar archivos, cuatro tarjetas/enlaces, header/footer/assets; después escritorio/móvil | Siete archivos protegidos idénticos; enlace ProductCard y control de sesión Header autorizados por las instrucciones sucesivas; comparación visual no ejecutada | `docs/evidence/inicio-baseline-hashes.json`, `inicio-enlaces-revision.json`, `pnpm verify:home`; revisión estática + visual pendiente |

## 9. Comandos y resultados reales

La ejecución completa y alternativa PowerShell están en `docs/GUIA_EJECUCION.md`. No se incluyen valores reales de `.env` ni credenciales de PostgreSQL o secretos de sesión. Solo se publican las contraseñas demo solicitadas por el usuario.

**Seguimiento de sesión/reservas, anterior a reorganizar carpetas:** 36/36 pruebas frontend de renderizado y helpers; typecheck y lint aprobados (único aviso preexistente de imagen de Inicio). Build de esa revisión aprobado con exit 0 (NEXT_VERIFY=1, 24 páginas estáticas). La tabla siguiente conserva los resultados y comandos de la entrega anterior, cuando Next estaba en la raíz: sus 23 pruebas y su build aprobado no se presentan como ejecución de la reorganización. Para ejecutar hoy las pruebas frontend directamente, usa `pnpm --dir frontend test` o entra a `frontend/`. La comprobación visual permanece no ejecutada por indisponibilidad del host de navegador; Windows Computer Use se detuvo al no poder verificar la URL y no se enviaron más entradas.

| Comando / ámbito | Resultado observado | Estado |
| --- | --- | --- |
| `node --test tests/frontend-s2.test.cjs` / raíz | 10 pruebas, 10 aprobadas, 0 fallidas; exit 0, también tras ajustar regex | Aprobado |
| `node --test tests/frontend-auth.test.cjs` / raíz histórica | 13 pruebas aprobadas tras ampliación admin; 0 fallidas; el primer resultado parcial fue 11 y el final de esa entrega, 13 | Aprobado |
| `pnpm test` / raíz, repetición final conjunta | 23/23 aprobadas: diez S2 y trece auth/S3; 0 fallidas y 0 omitidas; exit 0 | Aprobado |
| `pnpm verify:home` / raíz | Siete archivos protegidos idénticos al baseline; diferencias permitidas limitadas a enlaces Header/ProductCard | Aprobado, revisión de archivos; no comparación visual |
| `pnpm install` / backend | Instalación completada exit0, informado por integración | Aprobado |
| `pnpm typecheck` / raíz, ejecución final | exit 0 después de integrar admin | Aprobado |
| `pnpm lint` / raíz, ejecución final | exit 0; un warning preexistente `@next/next/no-img-element` en `src/app/(public)/page.tsx:43`, conservado por protección de Inicio | Aprobado con warning preexistente |
| `$env:NEXT_VERIFY='1'; pnpm build` / raíz | exit 0, Next14.2.35, compilación y 24 páginas estáticas; TypeScript strict=true; único aviso preexistente de imagen Inicio | Aprobado |
| `pnpm typecheck` / backend | Ejecución final exit 0 tras ampliación admin | Aprobado |
| `pnpm lint` / backend | Ejecución final exit 0 | Aprobado |
| `pnpm build` / backend | Ejecución final exit 0 | Aprobado |
| `pnpm test` / backend | Seis pruebas unitarias, seis aprobadas, 0 omitidas; exit 0 | Aprobado |
| `pnpm test:integration` / backend, con `TEST_DATABASE_URL` de coffee_sprints_test | Repetición final con reserva pasada y PATCH role: PostgreSQL real, 15 subpruebas y contenedor, 16/16 aprobadas, 0 fallidas, 0 omitidas, exit 0; esquema efímero creado y retirado | Aprobado |
| `pnpm test:integration` / backend, primer intento sin `TEST_DATABASE_URL` | Runner omitió la prueba por falta de URL; se repitió correctamente con base test | No ejecutado en ese primer intento; no se cuenta como aprobado |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-demo.ps1 -SkipBuild` / raíz | exit 0; migraciones/seed repetidos, health200 con database=ok y demo=true; puertos3000/4000 activos, PostgreSQL55432 | Aprobado |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-demo.ps1` / raíz | Comando completo también ejecutado: exit 0, migración sin pendientes, seed repetible, build backend aprobado y servicios saludables | Aprobado |
| `node scripts/verify-demo.cjs prepare` / raíz | Diez comprobaciones HTTP sobre API y PostgreSQL reales; exit 0 | Aprobado |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/stop-demo.ps1 -StopDatabase` / raíz | exit 0; detuvo API propia y la instancia PostgreSQL aislada; frontend preexistente conservado | Aprobado |
| Repetir `start-demo.ps1 -SkipBuild` y `node scripts/verify-demo.cjs resume` / raíz | Ambos exit 0; cuatro comprobaciones de sesión, perfil, reserva, contacto y logout después de reiniciar API+PostgreSQL | Aprobado |
| `node scripts/verify-http.cjs http://localhost:3001` y repetición sobre `http://localhost:3000` / raíz | Build producción local temporal y servidor utilizado por el usuario:17/17 en cada uno, exit 0; catorce rutas200 y tres404; evidencia frontend-http.json registra la última ejecución3000 | Aprobado HTTP/SSR; no navegador |
| HTTP Inicio inicial `http://localhost:3000` | HTTP 200 antes de cambios | Aprobado solo para disponibilidad inicial |
| Capturas Inicio escritorio/móvil y flujos navegador | No hubo host de navegador disponible; herramienta Windows rechazó inspección al no determinar URL | No ejecutado |

Los primeros intentos de lanzar `pnpm.exe` para ESLint y TypeScript fueron rechazados con «Acceso denegado» antes de iniciar esas herramientas. Eso fue una limitación del shell, no una prueba fallida del código. La tabla registra la vía y el resultado final comprobado cuando se dispone de su salida. No se desactivaron validaciones para obtener resultados verdes.

Evidencia consolidada sin cookies, tokens ni secretos: `docs/evidence/verification-summary.json` contiene comandos y resultados finales de los comprobadores; `docs/evidence/demo-functional.json` registra las catorce comprobaciones HTTP de la demostración; `docs/evidence/frontend-http.json` registra las diecisiete respuestas HTTP/SSR. Se conservó el frontend preexistente del usuario al reiniciar los servicios propios. El recorrido deja en la base nueva de demostración un mensaje de prueba `clase@example.invalid` y una reserva cancelada para mostrar persistencia/historial; el nombre del perfil se restauró. No se borraron datos para limpiar la evidencia.

## 10. Conservación de Inicio y alcance excluido

Se tomó referencia de archivos en `.local/baseline` y hashes en `docs/evidence/inicio-baseline-hashes.json` antes de editar. El servidor original respondía 200. No fue posible tomar capturas de escritorio/móvil: faltaba host de navegador y la herramienta Windows no pudo identificar la URL. **No se afirma equivalencia visual comprobada.**

Inicio continúa con sus datos locales; no depende de la API para renderizar los cuatro destacados. Se conserva orden/nombre: Latte Signature, Croissant de mantequilla, Cold Brew Special, Cheesecake de frutos rojos. `ProductCard` solo cambia «Conocer más» a Link de detalle con contenido/clase iguales. La excepción del header se amplió por instrucción posterior del usuario: el control de cuenta refleja comprobación, invitado, cliente o administrador según se describe en el apartado 2. El resto del header, los estilos de Inicio y los PNG originales se conservan; cerrar sesión está disponible en el perfil.

El trabajo S2/S3 usa Tailwind. Antes de la reorganización, `pnpm verify:home` comprobó siete archivos contra los hashes originales y distinguió las excepciones de ProductCard y PublicHeader. El traslado posterior mueve los archivos a `frontend/` y autoriza extraer las reglas CSS administrativas hacia `erp/`: `globals.css` se revisa como excepción de organización y las otras seis referencias protegidas mantienen sus hashes originales. No se sustituyen los hashes para acomodar diferencias. `docs/evidence/inicio-enlaces-revision.json` conserva la evidencia anterior. La evidencia de archivos no equivale a comparación de píxeles o comportamiento responsivo. El provider usa auth real y sigue mostrando sus hijos ante un error de API. `frontend/next.config.mjs` permite `NEXT_VERIFY=1` para producir `frontend/.next-verify` durante comprobación sin interferir con `frontend/.next` del servidor de desarrollo.

No se encontraron controles de Experiencias/Favoritos visibles en Inicio, header o footer. La palabra «experiencia» en textos de marca se preserva; no es un flujo funcional. Los selectores CSS huérfanos `.favoritesCard` permanecen dentro de `globals.css` protegido, sin ruta/control/lógica en ejecución. Se eliminó Favoritos y se sustituyó la autorización administrativa simulada por la ampliación de consultas autorizada después. No se implementaron carrito, pagos, pedidos, ventas, facturación, inventario, inscripción a eventos, correo externo o recuperación de contraseña simulada. El panel denominado ERP muestra consultas; no es un módulo operativo de ventas o inventario.

## 11. Dependencias, ejecución y límites

- Frontend: React Hook Form 7.54.2, Zod 3.24.2 y resolvers 3.10.0 para formularios/validación; Context basta para sesión. No se añadió Zustand ni un runner de pruebas distinto: Node test runner transpila helpers con TypeScript ya existente.
- Next y eslint-config-next se actualizan de 14.2.5 a 14.2.35, conservando React 18.3.1 y la organización App Router. Motivo: parche publicado en el [aviso oficial de seguridad de Next.js del 11 de diciembre de 2025](https://nextjs.org/blog/security-update-2025-12-11). Compatibilidad se acredita mediante build/typecheck finales, no por asumir que un parche siempre es compatible.
- Backend separado en `backend/`: NestJS 11.1.8 y Swagger 11.2.1; TypeORM 0.3.27/pg 8.16.3; class-validator 0.14.2/class-transformer 0.5.1; bcryptjs 3.0.2 para evitar dependencia binaria nativa; jsonwebtoken 9.0.2; Luxon 3.7.2 para fechas/zonas; cookie-parser, helmet, dotenv; TypeScript/ts-node y Supertest para prueba HTTP. Los `package.json` de cada paquete y el único `pnpm-lock.yaml` raíz contienen las versiones exactas.
- Archivos backend principales, bajo `backend/src/`: `app.ts`, `config.ts`, `security.ts`, `auth.ts`, `catalog.ts`, `reservations.ts`, `admin.ts`, `demo.ts`, `database/entities.ts`, migraciones y seed. Por instrucción posterior del usuario se organiza el workspace en `frontend/`, `backend/` y `erp/`, según apartado 12.
- Configuración de inicio comprueba URL PostgreSQL, secretos distintos y ≥32 caracteres, orígenes explícitos, zona IANA, TTL y reglas compatibles. `Secure` en producción, SameSite configurable y `None` requiere producción/HTTPS; cookie path `/api` coincide al borrar. Para local usar host consistente `localhost`.
- Integración prepara PostgreSQL 18 aislado en `.local/pg-sprints`, puerto 55432, bases `coffee_sprints_dev`/`coffee_sprints_test`; no se expone la base públicamente ni se publica contraseña. La guía explica cómo configurar otra instalación PostgreSQL disponible. La base test es distinta de desarrollo y datos de usuario.
- `scripts/start-demo.ps1` instala dependencias faltantes, prepara la instancia aislada, ejecuta migraciones/seed/build backend, inicia o reutiliza servicios y comprueba health/catálogo. `scripts/stop-demo.ps1` detiene solo procesos identificados por PID y fecha de inicio; `-StopDatabase` incluye PostgreSQL aislado. Los secretos se generan en `.local` y no se sobrescriben `.env` existentes.

Pendientes concretos: recorrido de usuario en navegador —filtros rápidos, Atrás/recarga, transición login/reserva, formularios, teclado y móvil—, comparación visual de Inicio y validación comercial del aforo/horario/límites y agenda de ejemplo. La entrega inicial aprobó los controles frontend/backend, integración PostgreSQL, demostración HTTP, lanzador y reinicio real registrados en el apartado 9; el seguimiento de sesión/reservas aprobó 36 pruebas frontend, typecheck, lint y build (exit 0). Inventario, Reportes y Configuración permanecen fuera del alcance funcional. Este reporte conserva los resultados relevantes de las notas parciales; la reorganización retira esas notas redundantes para mantener una guía de ejecución y un reporte consolidados.

## 12. Reorganización autorizada del proyecto

El usuario pidió separar el sitio, el servidor y el administrador en tres carpetas y retirar archivos innecesarios. La estructura actual distingue responsabilidades y conserva las URLs públicas:

| Ubicación | Contenido |
| --- | --- |
| `frontend/` | Next.js, rutas públicas y del cliente, sesión compartida, recursos en `public/`, configuración y pruebas en `tests/`. |
| `backend/` | NestJS, autorización de servidor, reglas de reservas, PostgreSQL, migraciones, seed y pruebas. Su `.env` conserva ubicación. |
| `erp/` | Paquete de interfaz `@mr-little-coffee/erp`: pantallas, componentes, estilos y contrato de integración administrativa. |
| Raíz | `pnpm-workspace.yaml`, lockfile único, comandos coordinadores, `README.md`, `Cafeteria.code-workspace`, scripts y documentación compartidos. |

Las rutas de `frontend/src/app/admin/` adaptan las pantallas ERP a Next. El paquete recibe la sesión compartida desde el frontend y usa la misma API protegida; no se duplica el login ni se añade un segundo sitio o puerto administrativo. `/admin` y sus subsecciones, las cookies con path `/api` y los accesos demo solicitados mantienen su contrato. Los estilos administrativos se trasladan a ERP y Tailwind incluye sus archivos en la generación de estilos.

La instalación se hace desde la raíz con `pnpm install --frozen-lockfile`. Los comandos raíz `dev`, `dev:api`, `typecheck`, `lint`, `build`, `test`, `test:integration`, `db:migrate`, `db:seed`, `demo` y `demo:stop` coordinan las tareas de cada paquete. La guía documenta sus equivalentes directos. El workspace de VS Code muestra las tres carpetas y oculta dependencias, cachés y compilados.

La limpieza consolida la documentación en README, guía, reporte y evidencia. Se conservan `.local/` y `docs/evidence/`: la primera contiene la base persistida y secretos locales; la segunda, comprobaciones históricas sin credenciales. Las referencias originales de Inicio mantienen su valor aunque los archivos cambien de carpeta. La extracción de estilos administrativos es una excepción explícita al hash de `globals.css`; los otros seis archivos protegidos se comparan sin alterar sus hashes.

### Verificación posterior al traslado

La reorganización se comprobó después del traslado. Los resultados siguientes corresponden a la nueva estructura; los apartados 8 y 9 conservan el historial anterior.

| Comprobación | Estado de esta reorganización |
| --- | --- |
| Instalación única con lockfile raíz | Aprobada: `pnpm install --frozen-lockfile --offline`, exit 0. Versiones directas conservadas; resoluciones transitivas comunes unificadas desde los lockfiles existentes. |
| TypeScript y lint de frontend, backend y ERP | Aprobados en los tres paquetes; exit 0. Solo permanece el aviso preexistente de imagen en Inicio. |
| Compilación integrada de frontend/backend y comprobación ERP | Aprobada: `NEXT_VERIFY=1 pnpm build`, exit 0; ERP comprobado, 24 páginas estáticas generadas y backend compilado. |
| Pruebas frontend y unitarias backend | Aprobadas: 36 frontend y 6 backend; cero fallos u omisiones. |
| Referencias protegidas de Inicio y extracción de estilos ERP | Aprobadas: seis archivos idénticos y tres excepciones autorizadas; comparación AST confirma 332 selectores públicos preservados, 165 administrativos trasladados y declaraciones/orden responsivo conservados. |
| Lanzador, salud de API y rutas públicas/administrativas después del traslado | Aprobados: `pnpm demo`, exit 0; API/PostgreSQL disponibles; 25 comprobaciones HTTP/SSR aprobadas, incluidas las nueve rutas ERP y los tres 404 esperados. |
| Accesos demo y permisos de consulta administrativa | Aprobados: 18 comprobaciones API; login/sesión de ambas cuentas, seis consultas ERP con admin200/cliente403, visitante401 y revocación al salir. Sin modificar perfiles, contactos ni reservas. |
| Revisión visual de escritorio/móvil | Pendiente; limitación de navegador ya registrada |

Evidencia: `docs/evidence/reorganization-verification.json`, `reorganization-functional.json` y `frontend-http.json`. Las respuestas HTTP de rutas privadas acreditan que sirven sus adaptadores y guardas, no sustituyen una sesión interactiva en navegador. La demo queda iniciada en `http://localhost:3000` para revisión local.
