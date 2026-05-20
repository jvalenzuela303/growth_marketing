import { BudgetOptimizerService } from './budget-optimizer.service';
export declare class BudgetOptimizerController {
    private readonly service;
    constructor(service: BudgetOptimizerService);
    getRecommendations(tenantId: string, daysStr?: string): Promise<import("./budget-optimizer.service").BudgetOptimizerResult>;
}
