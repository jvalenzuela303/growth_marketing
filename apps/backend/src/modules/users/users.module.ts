import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * UsersModule — gestión de usuarios del equipo por tenant.
 *
 * MailNotifierService no se importa aquí porque su módulo (MailModule)
 * está declarado como @Global() en AppModule, por lo que está disponible
 * para inyección en cualquier provider del árbol de módulos.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
