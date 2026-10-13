import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Permite peticiones desde el frontend en puerto 3000
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();
