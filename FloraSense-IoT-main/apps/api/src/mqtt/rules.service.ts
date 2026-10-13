import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import * as mqtt from 'mqtt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RulesService {
  private readonly logger = new Logger(RulesService.name);
  private mqttClient: mqtt.MqttClient;

  constructor(private prisma: PrismaService) {}

  setMqttClient(client: mqtt.MqttClient) {
    this.mqttClient = client;
  }

  getMqttStatus() {
    return this.mqttClient ? this.mqttClient.connected : false;
  }

  async evaluateRules(deviceId: string, currentMoisturePct: number) {
    if (currentMoisturePct === null || currentMoisturePct === undefined) return;

    // Buscar las reglas activas para este dispositivo
    const rules = await this.prisma.irrigationRule.findMany({
      where: { deviceId, enabled: true },
    });

    if (rules.length === 0) return;

    // Tomaremos la primera regla (asumiendo 1 regla principal por dispositivo)
    const rule = rules[0];

    // Verificar cooldown
    const lastEvent = await this.prisma.irrigationEvent.findFirst({
      where: { deviceId },
      orderBy: { startedAt: 'desc' },
    });

    if (lastEvent) {
      const secondsSinceLastRiego = (Date.now() - lastEvent.startedAt.getTime()) / 1000;
      if (secondsSinceLastRiego < rule.cooldownSeconds) {
        // En cooldown, no regar todava
        return;
      }
    }

    // Comprobar si requiere riego
    if (currentMoisturePct <= rule.startBelowPct) {
      this.logger.log(`Humedad ${currentMoisturePct}% < umbral ${rule.startBelowPct}%. Activando riego.`);
      await this.triggerPump(deviceId, rule.maxRuntimeSeconds, 'AUTO_RULE');
    }
  }

  
  async triggerFan(deviceId: string, action: string, origin: string, triggeredBy: string = 'Admin') {
    if (!this.mqttClient) return;
    const { v4: uuidv4 } = require('uuid');
    const commandId = uuidv4();
    
    // Hack: guardamos el evento de ventilador en la tabla de riego para que aparezca en el historial
    await this.prisma.irrigationEvent.create({
      data: {
        id: commandId,
        deviceId,
        origin,
        triggeredBy: triggeredBy + ' (Ventilador)',
        startedAt: new Date(),
        stoppedAt: action === 'OFF' ? new Date() : null,
        stopReason: action === 'OFF' ? 'MANUAL' : null
      }
    });
    
    const topic = `iot/v1/devices/${deviceId}/commands`;
    this.mqttClient.publish(topic, JSON.stringify({ commandId, action: action.toLowerCase(), target: 'fan' }));
  }

  async triggerPump(deviceId: string, durationSeconds: number, origin: string, triggeredBy: string = 'Sistema Automático') {
    if (!this.mqttClient) {
      this.logger.error('MQTT client not connected');
      return;
    }

    const commandId = uuidv4();

    // 1. Crear el comando en base de datos
    await this.prisma.pumpCommand.create({
      data: {
        id: commandId,
        deviceId: deviceId,
        origin: origin,
        action: 'ON',
        durationSeconds: durationSeconds,
        status: 'SENT',
      }
    });

    // 2. Registrar el evento (started)
    await this.prisma.irrigationEvent.create({
      data: {
        id: commandId, // usaremos el mismo ID para trazar
        deviceId: deviceId,
        commandId: commandId,
        origin: origin,
        triggeredBy: triggeredBy
      }
    });

    // 3. Enviar por MQTT
    const payload = {
      version: 1,
      commandId: commandId,
      action: 'ON',
      maxDurationSeconds: durationSeconds,
      issuedAt: new Date().toISOString()
    };

    const topic = `iot/v1/devices/${deviceId}/commands`;
    this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 });
    
    this.logger.log(`Comando ON enviado al topic ${topic}`);
  }

  async stopPump(deviceId: string, origin: string) {
    if (!this.mqttClient) {
      this.logger.error('MQTT client not connected');
      return;
    }

    const commandId = uuidv4();

    await this.prisma.pumpCommand.create({
      data: {
        id: commandId,
        deviceId: deviceId,
        origin: origin,
        action: 'OFF',
        status: 'SENT',
      }
    });

    const payload = {
      version: 1,
      commandId: commandId,
      action: 'OFF',
      issuedAt: new Date().toISOString()
    };

    const topic = `iot/v1/devices/${deviceId}/commands`;
    this.mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 });
    
    this.logger.log(`Comando OFF enviado al topic ${topic}`);
  }
}
