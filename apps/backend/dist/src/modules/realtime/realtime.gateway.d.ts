import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwtService;
    server: Server;
    private readonly logger;
    constructor(jwtService: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handlePing(client: Socket): {
        event: string;
        data: string;
    };
    emitLeadScored(tenantId: string, payload: {
        leadId: string;
        score: number;
        segment: string;
    }): void;
    emitHotAlert(tenantId: string, payload: {
        leadId: string;
        name: string;
        score: number;
    }): void;
    emitStageChanged(tenantId: string, payload: {
        leadId: string;
        stage: string;
    }): void;
    emitNewMessage(tenantId: string, payload: {
        conversationId: string;
        message: string;
        from: string;
    }): void;
}
