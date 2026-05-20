import { SmsService } from './sms.service';
import { SendSmsDto } from './dto/send-sms.dto';
export declare class SmsController {
    private readonly smsService;
    constructor(smsService: SmsService);
    status(): {
        available: boolean;
    };
    send(tenantId: string, dto: SendSmsDto): Promise<import("@growth-engine/shared-types").MessageResult>;
    sendWithFallback(tenantId: string, dto: SendSmsDto): Promise<{
        channel: string;
        result: import("@growth-engine/shared-types").MessageResult;
    }>;
}
