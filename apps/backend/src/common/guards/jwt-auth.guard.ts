import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token expirado. Usa /auth/refresh para renovarlo.');
    }

    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('Token inválido.');
    }

    if (err || !user) {
      throw new UnauthorizedException('Autenticación requerida.');
    }

    return user;
  }
}
