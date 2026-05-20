import { Module } from '@nestjs/common';
import { AudienceExportsController } from './audience-exports.controller';
import { AudienceExportsService } from './audience-exports.service';

@Module({
  controllers: [AudienceExportsController],
  providers: [AudienceExportsService],
  exports: [AudienceExportsService],
})
export class AudienceExportsModule {}
