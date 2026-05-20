import { Module } from '@nestjs/common';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [LeadsModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}
