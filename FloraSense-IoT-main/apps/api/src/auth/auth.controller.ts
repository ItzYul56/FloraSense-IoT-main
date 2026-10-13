import { Controller, Post, Body, UnauthorizedException, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifyPassword(@Request() req: any, @Body() body: any) {
    const isValid = await this.authService.verifyPassword(req.user.userId, body.password);
    if (!isValid) throw new UnauthorizedException('Contraseña incorrecta');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Put('password')
  async changePassword(@Request() req: any, @Body() body: any) {
    return this.authService.changePassword(req.user.userId, body.currentPassword, body.newPassword);
  }
}
