import { AutomationFlowsService } from './automation-flows.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { CurrentUserPayload } from '../../common/decorators/tenant.decorator';
export declare class AutomationFlowsController {
    private readonly service;
    constructor(service: AutomationFlowsService);
    findAll(tenantId: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        status: string;
        trigger: string;
        lastRunAt: Date;
        runCount: number;
    }[]>;
    create(tenantId: string, user: CurrentUserPayload, dto: CreateFlowDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        deletedAt: Date | null;
        status: string;
        createdBy: string | null;
        trigger: string;
        graph: import("@prisma/client/runtime/library").JsonValue;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    findOne(tenantId: string, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        deletedAt: Date | null;
        status: string;
        createdBy: string | null;
        trigger: string;
        graph: import("@prisma/client/runtime/library").JsonValue;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    update(tenantId: string, id: string, dto: UpdateFlowDto): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        deletedAt: Date | null;
        status: string;
        createdBy: string | null;
        trigger: string;
        graph: import("@prisma/client/runtime/library").JsonValue;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    remove(tenantId: string, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        deletedAt: Date | null;
        status: string;
        createdBy: string | null;
        trigger: string;
        graph: import("@prisma/client/runtime/library").JsonValue;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    activate(tenantId: string, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        deletedAt: Date | null;
        status: string;
        createdBy: string | null;
        trigger: string;
        graph: import("@prisma/client/runtime/library").JsonValue;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    pause(tenantId: string, id: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        description: string | null;
        deletedAt: Date | null;
        status: string;
        createdBy: string | null;
        trigger: string;
        graph: import("@prisma/client/runtime/library").JsonValue;
        lastRunAt: Date | null;
        runCount: number;
    }>;
    run(tenantId: string, id: string, leadId?: string): Promise<{
        runId: string;
        log: {
            nodeId: string;
            type: string;
            status: string;
            ts: string;
        }[];
    }>;
    getRuns(tenantId: string, id: string): Promise<{
        log: import("@prisma/client/runtime/library").JsonValue;
        id: string;
        tenantId: string;
        leadId: string | null;
        status: string;
        flowId: string;
        startedAt: Date;
        finishedAt: Date | null;
    }[]>;
}
