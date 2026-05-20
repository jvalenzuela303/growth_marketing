import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
export declare class SequencesController {
    private readonly sequencesService;
    constructor(sequencesService: SequencesService);
    findAll(tenantId: string): Promise<{
        steps: import("@prisma/client/runtime/library").JsonValue;
        stepCount: number;
        enrolledCount: number;
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        minScore: number | null;
        maxScore: number | null;
        trigger: string;
        triggerSegments: string[];
    }[]>;
    create(tenantId: string, dto: CreateSequenceDto): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        minScore: number | null;
        maxScore: number | null;
        steps: import("@prisma/client/runtime/library").JsonValue;
        trigger: string;
        triggerSegments: string[];
    }>;
    update(tenantId: string, id: string, dto: UpdateSequenceDto): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        minScore: number | null;
        maxScore: number | null;
        steps: import("@prisma/client/runtime/library").JsonValue;
        trigger: string;
        triggerSegments: string[];
    }>;
    remove(tenantId: string, id: string): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        minScore: number | null;
        maxScore: number | null;
        steps: import("@prisma/client/runtime/library").JsonValue;
        trigger: string;
        triggerSegments: string[];
    }>;
    toggle(tenantId: string, id: string): Promise<{
        name: string;
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        minScore: number | null;
        maxScore: number | null;
        steps: import("@prisma/client/runtime/library").JsonValue;
        trigger: string;
        triggerSegments: string[];
    }>;
}
