export declare class CreateSequenceDto {
    name: string;
    trigger: string;
    triggerSegments: string[];
    minScore?: number;
    maxScore?: number;
    steps?: object[];
    funnelId?: string;
    isActive?: boolean;
}
