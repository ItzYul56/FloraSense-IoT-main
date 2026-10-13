import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { RulesService } from './mqtt/rules.service.js';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private rulesService: RulesService
  ) {}

  async getHello(): Promise<any> {
    const deviceCount = await this.prisma.device.count();
    return {
      message: 'Hello World from IoT API!',
      status: 'online',
      database: { devicesRegistered: deviceCount }
    };
  }

  async getAllDevices() {
    return this.prisma.device.findMany({
      orderBy: { lastSeenAt: 'desc' }
    });
  }

  async deleteDevice(id: string) {
    return this.prisma.device.delete({ where: { id } });
  }

  async createDevice(name: string) {
    const crypto = await import('crypto');
    const id = crypto.randomUUID();
    return this.prisma.device.create({
      data: {
        id,
        deviceKey: `key-${id}`,
        name: name || 'Nuevo Dispositivo ESP32',
        status: 'OFFLINE'
      }
    });
  }

  async getMqttStatus() {
    return {
      connected: this.rulesService.getMqttStatus()
    };
  }

  async getDemoDevice(requestedId?: string): Promise<any> {
    const device = requestedId 
      ? await this.prisma.device.findUnique({ where: { id: requestedId } })
      : await this.prisma.device.findFirst({ orderBy: { lastSeenAt: 'desc' } });

    if (!device) return null;

    const lastTelemetry = await this.prisma.telemetry.findFirst({
      where: { deviceId: device.id },
      orderBy: { recordedAt: 'desc' }
    });

    return {
      id: device.id,
      name: device.name,
      status: device.status,
      lastTelemetry: lastTelemetry ? {
        ...lastTelemetry,
        timestamp: lastTelemetry.recordedAt,
        id: lastTelemetry.id.toString(),
      } : null
    };
  }

  async sendPumpCommand(deviceId: string, action: string, durationSeconds: number, userName: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Device not found');

    if (action === 'ON') {
      await this.rulesService.triggerPump(deviceId, durationSeconds, 'MANUAL', userName);
    } else {
      // Necesitamos una funciÃ³n para enviar OFF
      await this.rulesService.stopPump(deviceId, 'MANUAL');
    }

    return { success: true, action, deviceId };
  }

  async sendFanCommand(deviceId: string, action: string, userName: string) {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) throw new NotFoundException('Device not found');
    
    // We can just ask rulesService to publish
    await this.rulesService.triggerFan(deviceId, action, 'MANUAL', userName);
    return { success: true, action, deviceId };
  }

  async getDeviceRule(deviceId: string) {
    const rules = await this.prisma.irrigationRule.findMany({
      where: { deviceId }
    });
    if (rules.length === 0) throw new NotFoundException('No rules found');
    return rules[0];
  }

  async updateDeviceRule(ruleId: string, data: any) {
    return this.prisma.irrigationRule.update({
      where: { id: ruleId },
      data: {
        startBelowPct: data.startBelowPct,
        stopAbovePct: data.stopAbovePct,
        maxRuntimeSeconds: data.maxRuntimeSeconds,
        cooldownSeconds: data.cooldownSeconds
      }
    });
  }

  async getDeviceEvents(deviceId: string) {
    return this.prisma.irrigationEvent.findMany({
      where: { deviceId },
      orderBy: { startedAt: 'desc' },
      take: 50
    });
  }

  async getDeviceTelemetry(deviceId: string) {
    const data = await this.prisma.telemetry.findMany({
      where: { deviceId },
      orderBy: { recordedAt: 'asc' },
      take: 100
    });
    return data.map(t => ({
      ...t,
      id: t.id.toString()
    }));
  }
}

