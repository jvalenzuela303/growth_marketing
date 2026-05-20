import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { Throttle } from '@nestjs/throttler';

/**
 * Rutas públicas del quiz — sin autenticación JWT.
 * El tenantSlug y funnelSlug en la URL identifican el funnel de forma inequívoca.
 */
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  /**
   * GET /api/v1/quiz/result/:leadId
   * Public polling endpoint — no auth required.
   * Returns the scoring result for a lead once async processing completes.
   * The response intentionally contains no PII; only segment label, score,
   * and the public result content block from the funnel's resultsConfig.
   *
   * Frontend polls this until status === 'ready', then renders personalised content.
   *
   * curl http://localhost:3001/api/v1/quiz/result/550e8400-e29b-41d4-a716-446655440000
   */
  @Get('result/:leadId')
  async getPublicResult(@Param('leadId', ParseUUIDPipe) leadId: string) {
    return this.quizService.getPublicResult(leadId);
  }

  /**
   * GET /api/v1/quiz/:tenantSlug/:funnelSlug
   * Devuelve la configuración pública del quiz para renderizar el frontend.
   *
   * curl http://localhost:3001/api/v1/quiz/acme-corp/diagnostico-gratuito
   */
  @Get(':tenantSlug/:funnelSlug')
  async getPublicConfig(
    @Param('tenantSlug') tenantSlug: string,
    @Param('funnelSlug') funnelSlug: string,
  ) {
    return this.quizService.getPublicQuizConfig(tenantSlug, funnelSlug);
  }

  /**
   * POST /api/v1/quiz/:tenantSlug/:funnelSlug/submit
   * Evento central del producto: captura el lead y lo encola para scoring.
   * Rate limit: 5 submits / 60s por IP (previene spam de leads falsos).
   *
   * curl -X POST http://localhost:3001/api/v1/quiz/acme-corp/diagnostico-gratuito/submit \
   *   -H "Content-Type: application/json" \
   *   -d '{"answers":[...],"leadData":{"firstName":"Juan","email":"juan@example.com"},"completionPercentage":100,"sessionId":"abc123"}'
   */
  @Post(':tenantSlug/:funnelSlug/submit')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async submit(
    @Param('tenantSlug') tenantSlug: string,
    @Param('funnelSlug') funnelSlug: string,
    @Body() dto: SubmitQuizDto,
    @Req() req: Request,
  ) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;

    return this.quizService.submitQuiz(tenantSlug, funnelSlug, dto, ipAddress);
  }
}
