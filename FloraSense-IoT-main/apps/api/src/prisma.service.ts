import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Servicio inyectable que extiende PrismaClient.
 * Implementa OnModuleInit para conectarse automáticamente a la base de datos
 * cuando el backend de NestJS arranca.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Cuando el módulo se inicializa, conectamos a PostgreSQL
  async onModuleInit() {
    await this.$connect();
    console.log('📦 Conectado a la base de datos de PostgreSQL vía Prisma.');
  }

  // Opcional: Permite cerrar la conexión elegantemente si la app se apaga
  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit' as never, async () => {
      await app.close();
    });
  }
}
