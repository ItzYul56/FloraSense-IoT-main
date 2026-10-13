import { Delete, Query, Controller, Get, Post, Put, Param, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { AppService } from './app.service.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello(): Promise<any> {
    return this.appService.getHello();
  }

  @Get('api/devices')
  async getAllDevices() {
    return this.appService.getAllDevices();
  }

  @Delete('api/devices/:id')
  async deleteDevice(@Param('id') id: string) {
    return this.appService.deleteDevice(id);
  }

  @Post('api/devices')
  async createDevice(@Body('name') name: string) {
    return this.appService.createDevice(name);
  }

  @Get('api/system/mqtt-status')
  async getMqttStatus() {
    return this.appService.getMqttStatus();
  }

  @Get('api/devices/demo')
  async getDemoDevice(@Query('id') id?: string): Promise<any> {
    return this.appService.getDemoDevice(id);
  }

  @Post('api/devices/:id/pump/:action')
  async controlPump(
    @Param('id') deviceId: string,
    @Param('action') action: string,
    @Body('duration') duration?: number,
    @Body('userName') userName?: string
  ) {
    if (action !== 'on' && action !== 'off') {
      throw new BadRequestException('Action must be "on" or "off"');
    }
    return this.appService.sendPumpCommand(deviceId, action.toUpperCase(), duration || 30, userName || 'Víctor (Admin)');
  }

  @Post('api/devices/:id/fan/:action')
  async controlFan(
    @Param('id') deviceId: string,
    @Param('action') action: string,
    @Body('userName') userName?: string
  ) {
    if (action !== 'on' && action !== 'off') {
      throw new BadRequestException('Action must be "on" or "off"');
    }
    return this.appService.sendFanCommand(deviceId, action.toUpperCase(), userName || 'Víctor (Admin)');
  }

  @Get('api/devices/:id/rules')
  async getDeviceRule(@Param('id') deviceId: string) {
    return this.appService.getDeviceRule(deviceId);
  }

  @Put('api/devices/:id/rules/:ruleId')
  async updateDeviceRule(
    @Param('id') deviceId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: any
  ) {
    return this.appService.updateDeviceRule(ruleId, body);
  }

  @Get('api/devices/:id/events')
  async getDeviceEvents(@Param('id') deviceId: string) {
    return this.appService.getDeviceEvents(deviceId);
  }

  @Get('api/devices/:id/telemetry')
  async getDeviceTelemetry(@Param('id') deviceId: string) {
    return this.appService.getDeviceTelemetry(deviceId);
  }
}
