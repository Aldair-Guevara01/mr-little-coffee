import { createApplication } from './app';
import { AppConfig, CONFIG } from './config';

async function bootstrap() {
  const app = await createApplication();
  const config = app.get<AppConfig>(CONFIG);
  await app.listen(config.port, '127.0.0.1');
  console.log(`API: http://localhost:${config.port}/api | OpenAPI: http://localhost:${config.port}/api/docs`);
}
bootstrap().catch(error => { console.error(error instanceof Error ? error.message : 'No se pudo iniciar la API.'); process.exitCode = 1; });
