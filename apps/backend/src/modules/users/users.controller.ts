import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users
   * Retorna todos los usuarios del tenant. Accesible desde viewer en adelante.
   */
  @Get()
  @Roles('viewer')
  listUsers(@TenantId() tenantId: string) {
    return this.usersService.listUsers(tenantId);
  }

  /**
   * POST /api/v1/users/invite
   * Crea un nuevo usuario y envía invitación por email.
   * Requiere rol admin u owner. Rate limit: 10 invitaciones / 60s.
   */
  @Post('invite')
  @Roles('admin')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  inviteUser(
    @TenantId() tenantId: string,
    @CurrentUser() requester: CurrentUserPayload,
    @Body() dto: InviteUserDto,
  ) {
    return this.usersService.inviteUser(tenantId, requester.id, dto);
  }

  /**
   * PATCH /api/v1/users/:id
   * Actualiza nombre, rol o estado activo de un usuario del tenant.
   * Requiere rol admin u owner.
   */
  @Patch(':id')
  @Roles('admin')
  updateUser(
    @TenantId() tenantId: string,
    @CurrentUser() requester: CurrentUserPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(
      tenantId,
      requester.id,
      requester.role,
      userId,
      dto,
    );
  }

  /**
   * DELETE /api/v1/users/:id
   * Soft-delete: desactiva al usuario (isActive = false).
   * Requiere rol admin u owner.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  removeUser(
    @TenantId() tenantId: string,
    @CurrentUser() requester: CurrentUserPayload,
    @Param('id') userId: string,
  ) {
    return this.usersService.removeUser(
      tenantId,
      requester.id,
      requester.role,
      userId,
    );
  }
}
