import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { MqttModule } from './mqtt/mqtt.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [MqttModule, AuthModule],
  controllers: [AppController],
  providers: [AppService, PrismaService], // Registramos el servicio para que pueda inyectarse
})
export class AppModule {}
