# Mr. Little Coffee

Aplicación de cafetería con catálogo, cuentas, reservas y consultas administrativas. El proyecto usa Next.js, NestJS y PostgreSQL, organizado en un workspace pnpm.

| Carpeta | Responsabilidad |
| --- | --- |
| `frontend/` | Sitio público, perfil del cliente, autenticación, reservas y recursos de `public/`. |
| `backend/` | API, permisos, reglas de negocio, base de datos, migraciones y seed. |
| `erp/` | Interfaz del administrador: pantallas, componentes y estilos del paquete `@mr-little-coffee/erp`. |

El ERP se integra en el sitio mediante `/admin`; comparte la sesión y utiliza la misma API. Las rutas de Next en `frontend/src/app/admin` son adaptadores del paquete ERP.

## Abrir en Visual Studio Code

Abre `Cafeteria.code-workspace` para ver las tres áreas como carpetas del proyecto. La configuración oculta dependencias y archivos generados del explorador. Los comandos siguientes se ejecutan desde la raíz `C:\Users\RTX\Desktop\Cafeteria`.

## Iniciar la demostración

Requisitos: Node.js 20 o superior, pnpm 9.4.0 y PostgreSQL instalado.

```powershell
pnpm install --frozen-lockfile
pnpm demo
```

El lanzador prepara la base local, aplica migraciones y seed e inicia los servicios. Abre [el sitio](http://localhost:3000) o [inicia sesión](http://localhost:3000/login).

| Usuario demo | Contraseña | Acceso |
| --- | --- | --- |
| `admin` | `1234` | Panel `/admin` |
| `cliente` | `1234` | Perfil y reservas |

Estas cuentas están habilitadas por el lanzador local. El panel permite consultar productos, reservas, clientes, eventos y contactos; Inventario, Reportes y Configuración siguen pendientes de integración.

Para detener los procesos creados por el lanzador: `pnpm demo:stop`. Las opciones para indicar PostgreSQL o detener también su instancia están en la [guía de ejecución](docs/GUIA_EJECUCION.md).

## Comandos de desarrollo

| Desde la raíz | Acción |
| --- | --- |
| `pnpm dev` | Iniciar frontend en el puerto 3000. |
| `pnpm dev:api` | Iniciar API en el puerto 4000; requiere PostgreSQL configurado. |
| `pnpm build` | Comprobar ERP y compilar frontend y backend. |
| `pnpm typecheck` / `pnpm lint` | Revisar los tres paquetes. |
| `pnpm test` | Ejecutar pruebas frontend y unitarias backend. |
| `pnpm test:integration` | Probar API contra una base PostgreSQL de pruebas. |
| `pnpm db:migrate` / `pnpm db:seed` | Aplicar migraciones o cargar los datos iniciales. |

La instalación se hace una sola vez desde la raíz, con `pnpm-workspace.yaml` y el único `pnpm-lock.yaml`. La configuración local corresponde a `frontend/.env.local` y `backend/.env`; sus ejemplos están en cada carpeta. `.local/` conserva la base de demostración y secretos locales: no se elimina ni se publica.

`scripts/` contiene los lanzadores y comprobadores compartidos. `docs/` conserva la [guía completa](docs/GUIA_EJECUCION.md), el [reporte de implementación y verificaciones](docs/REPORTE_SPRINTS_2_3.md) y su evidencia.
