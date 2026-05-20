import { NotificationsService, PushSubscriptionDto } from './notifications.service';
import { CurrentUserPayload } from '../../common/decorators/tenant.decorator';
export declare class NotificationsController {
    private readonly service;
    constructor(service: NotificationsService);
    subscribe(tenantId: string, user: CurrentUserPayload, dto: PushSubscriptionDto): Promise<{
        ok: boolean;
    }>;
}
