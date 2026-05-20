import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../modules/audit/audit.service';
export declare class AuditMiddleware implements NestMiddleware {
    private readonly audit;
    private readonly logger;
    constructor(audit: AuditService);
    use(req: Request, res: Response, next: NextFunction): void;
}
