# Guía de ejecución local — Mr. Little Coffee

Los comandos están escritos para PowerShell. La raíz del repositorio es `C:\Users\RTX\Desktop\Cafeteria`. El workspace pnpm 9.4.0 agrupa `frontend`, `backend` y `erp`, con una sola instalación y un único `pnpm-lock.yaml` en la raíz. Cada paquete declara sus dependencias en su propio `package.json`.

Abre `Cafeteria.code-workspace` en Visual Studio Code para ver las tres áreas, con dependencias y archivos generados ocultos. `frontend/` contiene Next, recursos en `frontend/public/` y pruebas del cliente; `backend/` contiene API, base de datos y pruebas del servidor; `erp/` contiene el paquete de interfaz `@mr-little-coffee/erp`. Next monta ese paquete mediante las rutas adaptadoras de `frontend/src/app/admin`. Se conserva `/admin`, la sesión común y la API en 4000; ERP no requiere otro proceso ni puerto. Los scripts y la documentación compartidos permanecen en la raíz.

## 0. Arranque local para la demostración

Desde la raíz, ejecuta el lanzador de los tres servicios:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1
```

El atajo equivalente desde la raíz es `pnpm demo`. Para instalar explícitamente todo el workspace antes del arranque, ejecuta `pnpm install --frozen-lockfile` una sola vez en la raíz.

El entorno de demostración usa PostgreSQL aislado en `.local/pg-sprints`, puerto 55432, y bases `coffee_sprints_dev`/`coffee_sprints_test`. El sitio usa http://localhost:3000 y la API http://localhost:4000/api. Necesita Node.js 20+, pnpm 9.4.0 y los binarios de PostgreSQL instalados. Detecta PostgreSQL en Program Files o PATH; puedes indicar su directorio explícitamente:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1 -PostgresBin 'C:\Program Files\PostgreSQL\18\bin'
```

El lanzador instala dependencias si faltan, ejecuta migraciones/seed y compila el backend. `-Install` fuerza la instalación del workspace con su lockfile raíz; `-SkipBuild` solo sirve si `backend/dist` ya corresponde al código actual. Inicia Next desde `frontend/`. Genera credenciales de PostgreSQL y secretos de sesión dentro de `.local`, los pasa a los procesos y conserva los archivos `.env` existentes. No publiques ni elimines `.local`: contiene datos persistidos. Las secciones siguientes explican la instalación y ejecución manual cuando uses tu propio PostgreSQL. El comando con `powershell -ExecutionPolicy Bypass` limita esa opción a ese proceso; no cambia de forma persistente la política de Windows. En esta máquina, invocar directamente `.\scripts\start-demo.ps1` fue bloqueado por la política de ejecución.

Reutiliza los procesos que ya ocupan 3000/4000 y comprueba que la API sea saludable y tenga demo habilitada. Si 4000 corresponde a una API anterior sin demo, el lanzador informa el conflicto; detén esa API desde su terminal y vuelve a ejecutarlo. No detiene procesos ajenos. Los procesos nuevos se ejecutan en segundo plano y sus registros están en `.local/api.stdout.log`, `.local/api.stderr.log`, `.local/frontend.stdout.log` y `.local/frontend.stderr.log`.

Para detener los procesos que el lanzador creó:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-demo.ps1
```

El atajo equivalente es `pnpm demo:stop`.

Para detener también la instancia PostgreSQL aislada:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-demo.ps1 -StopDatabase
```

`stop-demo.ps1` verifica PID y fecha de inicio guardados en `.local/demo-processes.json`. Si el frontend ya estaba abierto antes del lanzador, se conserva y debes detenerlo desde su terminal cuando termines. Los datos permanecen al detener o reiniciar los servicios.

Para comprobar la conexión real con PostgreSQL:

```powershell
Invoke-RestMethod -Uri 'http://localhost:4000/api/health'
Invoke-RestMethod -Uri 'http://localhost:4000/api/products?page=1&pageSize=9&sort=featured'
Invoke-RestMethod -Uri 'http://localhost:4000/api/events'
```

`health` debe devolver `status=ok` y `database=ok`. Menú, Eventos y Reservas necesitan los tres procesos; abrir solo `pnpm dev` no inicia la API ni PostgreSQL. Un estado de error de conexión significa que el flujo todavía no puede consultar sus datos y no representa un catálogo vacío.

El seed contiene once productos activos (9 en la primera página y 2 en la última) y cuatro eventos publicados. Los eventos de ejemplo corresponden a agosto/septiembre de 2026: después de esas fechas aparecerán en «Pasados»; no se inventan próximos eventos para llenar la pantalla. La Exposición de arte permanece como borrador y solo es visible para administración.

Accesos de demostración autorizados por el usuario, en http://localhost:3000/login:

| Acceso | Usuario o correo | Contraseña demo | Destino |
| --- | --- | --- | --- |
| Administrador | `admin` o `admin@demo.mrlittlecoffee.invalid` | `1234` | `/admin`, consultas de datos persistidos |
| Cliente | `cliente` o `cliente@demo.mrlittlecoffee.invalid` | `1234` | `/perfil`, `/reservas` y `/perfil/reservas` |

En el panel se pueden abrir `/admin/menu`, `/admin/reservas`, `/admin/clientes`, `/admin/eventos` y `/admin/contactos`. Inventario, Reportes y Configuración se identifican como módulos pendientes y no realizan guardados. Sin `next`, un administrador entra a `/admin` y un cliente a `/perfil`. Un `next` interno permitido conserva el destino, incluida una reserva iniciada por un administrador; un cliente nunca se redirige al ERP.

Tras el seguimiento solicitado, el header muestra «Comprobando…» durante la verificación, «Registro» para invitados fuera de login/registro, «Mi cuenta» para cliente y «ERP» para administrador. Se retiró la barra de cuenta duplicada: usa las acciones del perfil y los enlaces contextuales de historial/detalle. Cerrar sesión desde el perfil vuelve a Inicio. Al confirmar una reserva se muestra un comprobante separado; «Hacer otra reserva» abre una nueva selección explícitamente.

Estas cuentas requieren `NODE_ENV=development` y `DEMO_ACCOUNTS_ENABLED=true` en el backend local, más migración y seed. El flag también puede usarse en pruebas y se rechaza en producción. Desactivarlo bloquea alias, correos y sesiones demo. El registro público conserva correo válido, contraseña mínima de ocho caracteres y rol cliente; la contraseña corta es una excepción únicamente para estas dos cuentas de ejemplo. El panel de consulta no agrega operaciones de ventas, inventario, facturación ni pagos.

## 1. Requisitos para instalación y ejecución manual

- Node.js 20 o superior, compatible con NestJS 11.
- pnpm 9.4.0 (packageManager del proyecto).
- PostgreSQL disponible localmente, con sus herramientas psql, createuser y createdb en PATH. Si no están en PATH, añade para esta terminal el directorio bin de tu instalación PostgreSQL.
- Dos bases distintas: los ejemplos manuales usan mr_little_coffee para desarrollo y mr_little_coffee_test exclusivamente para pruebas. Nunca apuntes las pruebas a datos de uso real.
- La alternativa manual usa 3000 (Next), 4000 (API) y 5432 (tu PostgreSQL). El lanzador del apartado 0 usa 55432 para PostgreSQL aislado. Ajusta las URLs a la opción elegida; no detengas servicios ajenos para liberar un puerto.

Comprueba herramientas:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
node --version
pnpm --version
psql --version
```

Si pnpm no está disponible y tu instalación de Node incluye Corepack:

```powershell
corepack enable
corepack prepare pnpm@9.4.0 --activate
```

## 2. Instalar y preparar archivos locales

Desde la raíz:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
pnpm install --frozen-lockfile
if (-not (Test-Path -LiteralPath 'frontend/.env.local')) {
  Copy-Item -LiteralPath 'frontend/.env.example' -Destination 'frontend/.env.local'
}
if (-not (Test-Path -LiteralPath 'backend/.env')) {
  Copy-Item -LiteralPath 'backend/.env.example' -Destination 'backend/.env'
}
```

No reemplaces archivos `.env` existentes. `frontend/.env.local` contiene solamente:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Las variables NEXT_PUBLIC se incorporan al bundle de navegador: nunca pongas secretos allí. Cambiar NEXT_PUBLIC_API_URL requiere reiniciar Next; en producción requiere reconstruir.

## 3. Crear bases PostgreSQL

Con PostgreSQL ya iniciado y un administrador local autorizado, ejecuta solo si este rol y estas bases todavía no existen. Las herramientas solicitarán contraseña cuando corresponda:

```powershell
createuser -h localhost -p 5432 -U postgres --pwprompt mlc_app
createdb -h localhost -p 5432 -U postgres -O mlc_app mr_little_coffee
createdb -h localhost -p 5432 -U postgres -O mlc_app mr_little_coffee_test
```

Si tu administrador no se llama postgres, sustituye únicamente ese argumento. No se crea un superusuario para la aplicación. La cuenta debe poder crear tablas/índices en desarrollo y esquemas aislados en la base de pruebas de su propiedad.

Configura las credenciales que acabas de elegir sin imprimirlas ni ponerlas en el historial de comandos. Este bloque sustituye únicamente los marcadores del .env.example recién copiado; conserva valores de un .env ya configurado:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria\backend'
$databaseCredential = Get-Credential -UserName 'mlc_app' -Message 'Credenciales PostgreSQL de la aplicación local'
$databaseUser = [Uri]::EscapeDataString($databaseCredential.UserName)
$databasePassword = [Uri]::EscapeDataString($databaseCredential.GetNetworkCredential().Password)
$databaseConnection = "postgresql://${databaseUser}:${databasePassword}@localhost:5432/mr_little_coffee"
$jwtSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
$csrfSecret = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
$environmentText = [System.IO.File]::ReadAllText((Join-Path $PWD '.env'))
$environmentText = $environmentText.Replace('postgresql://REPLACE_USER:REPLACE_PASSWORD@localhost:5432/mr_little_coffee', $databaseConnection)
$environmentText = $environmentText.Replace('REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS', $jwtSecret)
$environmentText = $environmentText.Replace('REPLACE_WITH_A_DIFFERENT_32_CHARACTER_SECRET', $csrfSecret)
[System.IO.File]::WriteAllText((Join-Path $PWD '.env'), $environmentText, [System.Text.UTF8Encoding]::new($false))
Remove-Variable databaseCredential, databaseUser, databasePassword, databaseConnection, jwtSecret, csrfSecret, environmentText
```

Si necesitas cambiar host/puerto/usuario de una configuración ya existente, edita backend/.env localmente. No copies su contenido en tickets, capturas ni reportes. .env.example solo contiene marcadores, nunca credenciales válidas.

## 4. Configuración del backend

backend/.env centraliza:

| Variable | Uso y valor inicial |
| --- | --- |
| NODE_ENV | development local; production activa cookie Secure |
| DEMO_ACCOUNTS_ENABLED | false por defecto; true local habilita seed/login de las dos cuentas de demostración; production+true se rechaza |
| PORT | 4000 |
| DATABASE_URL | URL PostgreSQL local privada |
| JWT_SECRET / CSRF_SECRET | Dos secretos distintos de al menos 32 caracteres |
| CORS_ORIGINS | http://localhost:3000; varios orígenes exactos separados por coma |
| SESSION_TTL_MINUTES | 120; JWT y sesión revocable con caducidad |
| COOKIE_SAME_SITE | lax en desarrollo |
| BUSINESS_TIMEZONE | America/El_Salvador |
| OPENING_HOUR / CLOSING_HOUR | 7 / 21 |
| SLOT_MINUTES / SLOT_CAPACITY | 60 / 20 |
| MIN_PEOPLE / MAX_PEOPLE | 1 / 6 |
| MIN_NOTICE_MINUTES / MAX_ADVANCE_DAYS | 30 / 30 |

Las reglas de horario, aforo, anticipación y grupo son **provisionales y requieren validación del negocio**. La API valida variables y combinaciones al iniciar y expone al formulario únicamente la configuración de reservas.

El frontend debe abrirse con http://localhost:3000 para coincidir con CORS_ORIGINS. localhost y 127.0.0.1 no son el mismo origen: no los intercambies en navegador/API sin actualizar la configuración de forma coherente.

La sesión viaja en cookie HttpOnly; cada escritura usa Origin permitido, cookie CSRF y cabecera X-CSRF-Token obtenida de GET /api/csrf. CORS y SameSite no sustituyen esta comprobación. En producción se necesita HTTPS para cookies Secure; SameSite=None se rechaza fuera de producción. No hay refresh tokens; una sesión vencida vuelve a iniciar sesión.

## 5. Migrar y cargar catálogo existente

Desde backend:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria\backend'
pnpm migration:run
pnpm seed
```

Equivalentes desde raíz:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
pnpm db:migrate
pnpm db:seed
```

Las migraciones crean el esquema; synchronize no está habilitado. El seed reutiliza catálogo e imágenes existentes, es repetible y conserva filas ya presentes/editadas. Ejecutar seed una segunda vez permite comprobar ausencia de duplicados. Con `DEMO_ACCOUNTS_ENABLED=true`, también incorpora las dos cuentas del apartado 0 con hash de contraseña; sin el flag, usa `/registro` para crear una cuenta cliente con las validaciones normales. No reemplaza los datos de una cuenta existente.

## 6. Levantar los dos servicios

Terminal 1, backend:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria\backend'
pnpm dev
```

Terminal 2, frontend:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
pnpm --dir frontend dev
```

Desde la raíz puedes usar los atajos `pnpm dev:api` y `pnpm dev`, respectivamente. El paquete ERP se compila con el frontend y recibe de este la sesión compartida; la autorización de sus consultas permanece en el backend.

Abre:

- Sitio: http://localhost:3000
- Menú: http://localhost:3000/menu
- Reservas: http://localhost:3000/reservas
- Registro/perfil: http://localhost:3000/registro y /perfil
- Panel de consulta del administrador: http://localhost:3000/admin
- Salud de API y PostgreSQL: http://localhost:4000/api/health
- OpenAPI/Swagger: http://localhost:4000/api/docs

Para detener un servicio iniciado en esa terminal, usa Ctrl+C. Inicio conserva datos locales; catálogo, eventos, contacto, sesión y reservas requieren API/DB. Una caída se muestra como error, nunca como éxito simulado.

## 7. Comprobaciones automatizadas

Desde raíz, los comandos coordinan los paquetes:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
pnpm typecheck
pnpm lint
$env:NEXT_VERIFY = '1'
try {
  pnpm build
} finally {
  Remove-Item Env:NEXT_VERIFY -ErrorAction SilentlyContinue
}
pnpm test
pnpm verify:home
```

`typecheck` y `lint` revisan frontend, backend y ERP; `build` comprueba ERP y compila frontend/backend; `test` ejecuta pruebas frontend y unitarias backend. Para comprobar únicamente un paquete, usa `pnpm --dir frontend <comando>`, `pnpm --dir backend <comando>` o `pnpm --dir erp typecheck`.

También puedes entrar al backend:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria\backend'
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

`NEXT_VERIFY=1` genera el build de comprobación en `frontend/.next-verify`, para conservar `frontend/.next` del servidor de desarrollo que puede estar abierto. La compilación Next usa las fuentes Google ya presentes en el proyecto; necesita acceso para descargarlas si no están en caché.

Si usaste el lanzador del apartado 0, ejecuta la integración contra su base de pruebas aislada sin mostrar la contraseña:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
$testLocalPassword = (Get-Content -LiteralPath '.local/pg-password' -Raw).Trim()
$env:TEST_DATABASE_URL = 'postgresql://coffee_test:' + [Uri]::EscapeDataString($testLocalPassword) + '@127.0.0.1:55432/coffee_sprints_test'
Remove-Variable testLocalPassword
try {
  pnpm test:integration
} finally {
  Remove-Item Env:TEST_DATABASE_URL -ErrorAction SilentlyContinue
}
```

Las pruebas de `frontend/tests/` verifican renderizado según sesión, ausencia de controles repetidos, comprobante de reserva, lógica de URL, validación y transporte; los mocks de fetch no demuestran persistencia o transacciones. Antes de reorganizar las carpetas, el seguimiento de sesión/reservas aprobó 36/36 pruebas, typecheck, lint y build; la entrega previa había aprobado 23 pruebas frontend. Esos resultados históricos están separados de la comprobación posterior a la reorganización en el reporte. La revisión visual sigue pendiente: no estuvo disponible el host del navegador y Windows Computer Use se detuvo al no poder verificar la URL. Si elegiste la instalación manual del apartado 3, ejecuta en cambio la integración con sus credenciales y puerto:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria\backend'
$testCredential = Get-Credential -UserName 'mlc_app' -Message 'Credenciales de la base PostgreSQL de pruebas'
$testUser = [Uri]::EscapeDataString($testCredential.UserName)
$testPassword = [Uri]::EscapeDataString($testCredential.GetNetworkCredential().Password)
$env:TEST_DATABASE_URL = "postgresql://${testUser}:${testPassword}@localhost:5432/mr_little_coffee_test"
Remove-Variable testCredential, testUser, testPassword
pnpm test:integration
Remove-Item Env:TEST_DATABASE_URL
```

El runner rechaza una base sin test en el nombre o la misma URL de desarrollo. Crea un esquema aleatorio aislado, ejecuta migraciones/seed, prueba HTTP contra PostgreSQL real y retira ese esquema al finalizar. No requiere levantar una segunda API manualmente. Sin TEST_DATABASE_URL, la suite aparece omitida: **omitida no significa aprobada**.

Consulta REPORTE_SPRINTS_2_3.md para los resultados realmente ejecutados en esta intervención, incluidos bloqueos. No uses esta lista de comandos como prueba de que ya se ejecutaron.

### 7.1. Repetir el recorrido HTTP de demostración y el reinicio

Este recorrido usa exclusivamente el entorno local demo habilitado. Guarda un mensaje de prueba y una reserva que deja cancelada en el historial; modifica temporalmente el nombre del cliente y lo restaura. Conserva las cookies solo en `.local/demo-smoke.json`, que no se publica. Con el backend ya compilado y el lanzador iniciado:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
node scripts/verify-demo.cjs prepare
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop-demo.ps1 -StopDatabase
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1 -SkipBuild
node scripts/verify-demo.cjs resume
```

`prepare` comprueba diez resultados: las dos cuentas, catálogo9+2, agenda, permisos, perfil, contacto, reserva idempotente, lectura administrativa y cancelación doble. `resume` comprueba cuatro resultados después del reinicio real: sesión/perfil, reserva, contacto y logout. El archivo `docs/evidence/demo-functional.json` registra los resultados sin incluir credenciales de sesión. Esto verifica HTTP y PostgreSQL; no sustituye la interacción en navegador.

### 7.2. Repetir la comprobación HTTP/SSR de páginas

Con la API activa y el build `frontend/.next-verify` del apartado 7 ya generado, abre un servidor temporal en otra terminal:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
$env:NEXT_VERIFY = '1'
pnpm --dir frontend exec next start -p 3001 -H 127.0.0.1
```

En una segunda terminal, ejecuta:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
node scripts/verify-http.cjs http://localhost:3001
```

Comprueba diecisiete respuestas: Inicio y cuatro enlaces de productos, páginas públicas y shells de perfil/admin con200; producto inexistente, inactivo y Favoritos con404. Guarda `docs/evidence/frontend-http.json`. Un HTML200 de `/admin` no autoriza a leer datos: la API protegida se prueba con los roles en integración y en el recorrido del apartado 7.1. Detén este servidor temporal con Ctrl+C y ejecuta `Remove-Item Env:NEXT_VERIFY -ErrorAction SilentlyContinue` en su terminal.

## 8. Recorrido manual reproducible

1. Menú: Todo con 9 tarjetas iniciales y total 11 del seed existente; segunda página con 2; cambiar categoría/orden y comprobar página 1, recargar/Atrás, cambios rápidos y error al apagar API. El total puede variar si ya hay datos del usuario. Eventos debe mostrar los cuatro publicados en orden y omitir el borrador; la clasificación próximos/pasados depende de la fecha actual.
2. Inicio: comparar escritorio y móvil con referencia previa; conservar orden, textos, imágenes y fuentes. Abrir los cuatro Conocer más y comprobar productos distintos. Explorar menú, reservar, historia y navegación.
3. Detalle: abrir directamente /menu/latte-signature, recargar y probar slug inexistente (404).
4. Contacto: enviar nombre/correo/mensaje válido; consultar persistencia en base privada mediante herramientas locales, no API pública. Probar datos inválidos y API apagada sin falso éxito.
5. Registro/login: crear usuario nuevo, intentar correo duplicado y contraseña incorrecta; recargar con sesión y comprobar que «Registro» se sustituye por «Mi cuenta» o «ERP». Abrir login/registro con sesión: debe redirigir sin mostrar el formulario. Editar nombre/teléfono y comprobar valores al recargar. Cerrar sesión desde el perfil, comprobar retorno a Inicio y tratar de abrir `/perfil`.
6. Reservas como visitante: seleccionar día futuro, grupo y hora; pasar entre login/registro y comprobar que se conserva la selección sin confirmación automática, también al entrar como admin. Confirmar una sola vez y comprobar que el formulario se sustituye por el comprobante. Abrir detalle/historial o usar «Hacer otra reserva» para una nueva selección; cancelar antes del inicio desde el detalle. Verificar que no aparece una segunda barra con Reservar/Perfil/Editar perfil.
7. Reservas negativas y concurrencia: usa la suite de integración para fechas pasadas, horario/grupos, último cupo, reintentos, doble envío, cancelación idempotente y acceso a reserva de otro cliente. Una sola prueba manual no demuestra seguridad concurrente.
8. Reiniciar servicios, volver a iniciar sesión si corresponde y comprobar datos anteriores; repetir seed sin duplicados. La suite integra reinicio de aplicación/conexión; si se necesita comprobar reinicio del proceso de PostgreSQL, hacerlo por separado en entorno de pruebas y registrarlo.
9. Panel: iniciar sesión como admin/1234, abrir `/admin` y sus consultas; verificar que reflejan productos, eventos y reservas persistidos. Cerrar sesión; iniciar como cliente/1234 e intentar una ruta admin: el servidor debe negar la consulta. No se habilitan botones CRUD que aparenten guardar.
10. Teclado/móvil: tabular controles, verificar nombres de campos, foco visible, mensajes de error y ausencia de desbordamientos. Registrar evidencia real o marcar No ejecutado.

## 9. Producción local de prueba

Solo tras configurar correctamente entorno, URLs y HTTPS cuando NODE_ENV=production:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria\backend'
pnpm build
pnpm start
```

En otra terminal:

```powershell
Set-Location 'C:\Users\RTX\Desktop\Cafeteria'
pnpm --dir frontend build
pnpm --dir frontend start
```

Estos comandos arrancan procesos locales; no publican el sitio ni exponen PostgreSQL. Nunca publiques el archivo .env ni las bases.

## 10. Verificación de la reorganización

La estructura de tres paquetes y los comandos de esta guía corresponden a la reorganización solicitada. Después del traslado aprobaron la instalación con lockfile único, TypeScript/lint de los tres paquetes, la compilación integrada, 36 pruebas frontend y seis backend. `pnpm demo` arrancó correctamente; pasaron 25 comprobaciones HTTP/SSR y 18 comprobaciones de API sobre accesos, consultas y permisos. El apartado 12 del reporte y `docs/evidence/reorganization-verification.json` registran esta ejecución. La comprobación visual/interactiva sigue pendiente por la limitación de navegador documentada. Se conservaron los hashes originales y la base local. La extracción de estilos administrativos hacia ERP preservó 332 selectores públicos y trasladó 165 administrativos, con declaraciones y orden responsivo comprobados; las otras seis referencias protegidas de Inicio mantienen su comparación original.
