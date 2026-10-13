import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service.js';
import { RulesService } from './rules.service.js';
import { PrismaService } from '../prisma.service.js';

@Module({
  providers: [MqttService, RulesService, PrismaService],
  exports: [MqttService, RulesService],
})
export class MqttModule {}
