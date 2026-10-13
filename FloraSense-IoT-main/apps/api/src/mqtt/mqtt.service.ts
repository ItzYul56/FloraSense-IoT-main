import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { PrismaService } from '../prisma.service.js';
import { RulesService } from './rules.service.js';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService
  ) {}

  onModuleInit() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    this.client = mqtt.connect(brokerUrl);

    this.rulesService.setMqttClient(this.client);

    this.client.on('connect', () => {
      console.log(`🔌 Conectado al broker MQTT en ${brokerUrl}`);
      
      this.client.subscribe('iot/v1/devices/+/telemetry', (err) => {
        if (!err) console.log('📡 Suscrito exitosamente a iot/v1/devices/+/telemetry');
      });

      this.client.subscribe('iot/v1/devices/+/acks', (err) => {
        if (!err) console.log('📡 Suscrito exitosamente a iot/v1/devices/+/acks');
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        await this.handleIncomingMessage(topic, message);
      } catch (error) {
        console.error('❌ Error procesando mensaje MQTT:', error);
      }
    });
  }

  onModuleDestroy() {
    this.client.end();
  }

  private async handleIncomingMessage(topic: string, message: Buffer) {
    const topicParts = topic.split('/');
    const deviceId = topicParts[3];
    const messageType = topicParts[4]; // telemetry o acks

    const payload = JSON.parse(message.toString());

    if (messageType === 'telemetry') {
      await this.handleTelemetry(deviceId, payload);
    } else if (messageType === 'acks') {
      await this.handleAck(deviceId, payload);
    }
  }

  private async handleTelemetry(deviceId: string, payload: any) {
    console.log(`[TELEMETRY] Received for ${deviceId}:`, payload);
    let device = await this.prisma.device.findUnique({ where: { id: deviceId } }).catch(() => null);
    
    if (!device) {
       try {
         device = await this.prisma.device.create({
           data: {
             id: deviceId,
             deviceKey: `key-${deviceId}`,
             name: `Dispositivo Simulado ${deviceId.substring(0, 4)}`,
             status: 'ONLINE',
             mode: 'AUTO'
           }
         });
         
         // Generar regla por defecto
         await this.prisma.irrigationRule.create({
           data: {
             deviceId: device.id,
             enabled: true,
             startBelowPct: 40.0,
             stopAbovePct: 70.0,
             maxRuntimeSeconds: 30, // 30 segundos
             cooldownSeconds: 60, // 1 min de cooldown para probar rapido
           }
         });
         
       } catch (e) {
         return; 
       }
    } else {
       await this.prisma.device.update({
         where: { id: deviceId },
         data: { status: 'ONLINE', lastSeenAt: new Date() }
       });
    }

    await this.prisma.telemetry.create({
      data: {
        deviceId: device.id,
        temperatureC: payload.temperatureC,
        airHumidityPct: payload.airHumidityPct,
        soilMoistureRaw: payload.soilMoistureRaw,
        soilMoisturePct: payload.soilMoisturePct,
        pumpOn: payload.pumpOn || false,
        fanOn: payload.fanOn || false,
        rssi: payload.rssi,
        payloadVersion: payload.version || 1,
      }
    });

    if (payload.pumpOn) {
      // Si la bomba reporta estar encendida desde el Arduino, crear un evento si no existe
      const openEvent = await this.prisma.irrigationEvent.findFirst({
        where: { deviceId: device.id, stoppedAt: null }
      });
      if (!openEvent) {
        await this.prisma.irrigationEvent.create({
          data: {
            deviceId: device.id,
            origin: 'LOCAL_AUTO',
            triggeredBy: 'Sistema Autónomo (Nodo)'
          }
        });
      }
    } else {
      // Si la bomba reporta estar apagada, cerrar cualquier evento de riego abierto
      const openEvents = await this.prisma.irrigationEvent.findMany({
        where: { deviceId: device.id, stoppedAt: null }
      });
      for (const evt of openEvents) {
        const duration = Math.round((Date.now() - evt.startedAt.getTime()) / 1000);
        await this.prisma.irrigationEvent.update({
          where: { id: evt.id },
          data: {
            stoppedAt: new Date(),
            durationSeconds: duration,
            stopReason: 'TELEMETRY_REPORTED_OFF'
          }
        });
      }
    }

    if (device.mode === 'AUTO') {
      await this.rulesService.evaluateRules(device.id, payload.soilMoisturePct);
    }
  }

  private async handleAck(deviceId: string, payload: any) {
    console.log(`✅ ACK recibido de ${deviceId}:`, payload);
    
    // Si la bomba se acaba de apagar en este ACK, actualizamos el evento
    if (payload.status === 'ACKNOWLEDGED' && !payload.pumpOn) {
      const commandId = payload.commandId;
      if (commandId) {
        const evt = await this.prisma.irrigationEvent.findUnique({ where: { id: commandId } }).catch(() => null);
        if (evt && !evt.stoppedAt) {
           const duration = Math.round((Date.now() - evt.startedAt.getTime()) / 1000);
           await this.prisma.irrigationEvent.update({
             where: { id: commandId },
             data: {
               stoppedAt: new Date(),
               durationSeconds: duration,
               stopReason: 'AUTO_REACHED_OR_TIMEOUT'
             }
           });
           console.log(`💧 Evento de riego finalizado. Duración: ${duration}s`);
        }
      }
    }
  }
}
