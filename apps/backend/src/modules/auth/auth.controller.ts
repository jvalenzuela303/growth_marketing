import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Crea tenant + usuario owner en una transacción atómica.
   * Rate limit estricto: 5 intentos / 60s por IP (previene spam de cuentas).
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return {
      message: 'Cuenta creada exitosamente.',
      userId: result.userId,
      tenantId: result.tenantId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * POST /api/v1/auth/login
   * Rate limit estricto: 10 intentos / 60s (previene fuerza bruta).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn:    result.expiresIn,
      userId:       result.userId,
      tenantId:     result.tenantId,
      email:        result.email,
      name:         result.name,
      role:         result.role,
      plan:         result.plan,
      tenantSlug:   result.tenantSlug,
      tenantName:   result.tenantName,
    };
  }

  /**
   * POST /api/v1/auth/refresh
   * Emite nuevos tokens y revoca el refresh token anterior (rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.authService.refresh(dto.userId, dto.refreshToken);
    return tokens;
  }

  /**
   * POST /api/v1/auth/logout
   * Revoca el refresh token del usuario autenticado.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { refreshToken?: string },
  ) {
    await this.authService.logout(user.id, body.refreshToken);
    return { message: 'Sesión cerrada.' };
  }
}
