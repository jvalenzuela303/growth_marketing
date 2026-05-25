import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { SupportRequestDto } from './dto/support-request.dto';
import { CurrentUserPayload } from '../../common/decorators/tenant.decorator';
import { MailNotifierService } from '../../common/mail/mail-notifier.service';
export declare class AuthController {
    private readonly authService;
    private readonly mail;
    private readonly logger;
    constructor(authService: AuthService, mail: MailNotifierService);
    register(dto: RegisterDto): Promise<{
        message: string;
        userId: string;
        tenantId: string;
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        userId: string;
        tenantId: string;
        email: string;
        name: string;
        role: string;
        plan: string;
        tenantSlug: string;
        tenantName: string;
    }>;
    refresh(dto: RefreshDto): Promise<import("@growth-engine/shared-types").AuthTokens>;
    requestAccess(dto: RequestAccessDto): Promise<{
        message: string;
        received: boolean;
    }>;
    support(dto: SupportRequestDto): Promise<{
        message: string;
        received: boolean;
    }>;
    logout(user: CurrentUserPayload, body: {
        refreshToken?: string;
    }): Promise<{
        message: string;
    }>;
}
