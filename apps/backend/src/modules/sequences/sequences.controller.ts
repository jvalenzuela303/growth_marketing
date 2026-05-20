import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SequencesService } from './sequences.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('sequences')
@UseGuards(JwtAuthGuard)
export class SequencesController {
  constructor(private readonly sequencesService: SequencesService) {}

  /**
   * GET /api/v1/sequences
   */
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.sequencesService.findAll(tenantId);
  }

  /**
   * POST /api/v1/sequences
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateSequenceDto,
  ) {
    return this.sequencesService.create(tenantId, dto);
  }

  /**
   * PUT /api/v1/sequences/:id
   */
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSequenceDto,
  ) {
    return this.sequencesService.update(tenantId, id, dto);
  }

  /**
   * DELETE /api/v1/sequences/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sequencesService.remove(tenantId, id);
  }

  /**
   * PATCH /api/v1/sequences/:id/toggle
   */
  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  toggle(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sequencesService.toggle(tenantId, id);
  }
}
