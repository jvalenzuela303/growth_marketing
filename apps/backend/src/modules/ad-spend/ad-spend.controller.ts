import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdSpendService } from './ad-spend.service';
import { CreateAdSpendDto } from './ad-spend.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('ad-spend')
@UseGuards(JwtAuthGuard)
export class AdSpendController {
  constructor(private readonly adSpendService: AdSpendService) {}

  /**
   * GET /api/v1/ad-spend?page=1&limit=20
   */
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.adSpendService.findAll(
      tenantId,
      Math.max(1, Number(page)),
      Math.min(100, Math.max(1, Number(limit))),
    );
  }

  /**
   * POST /api/v1/ad-spend
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAdSpendDto,
  ) {
    return this.adSpendService.create(tenantId, dto);
  }
}
