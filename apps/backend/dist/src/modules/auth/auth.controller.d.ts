import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CurrentUserPayload } from '../../common/decorators/tenant.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    logout(user: CurrentUserPayload, body: {
        refreshToken?: string;
    }): Promise<{
        message: string;
    }>;
}
