import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
export declare class TenantMiddleware implements NestMiddleware {
    private readonly jwtService;
    constructor(jwtService: JwtService);
    use(req: Request, res: Response, next: NextFunction): void;
}
