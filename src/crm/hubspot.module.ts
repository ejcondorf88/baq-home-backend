import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HubSpotService } from './hubspot.service';
import { HubSpotController } from './hubspot.controller';

@Module({
  imports: [ConfigModule],
  providers: [HubSpotService, ConfigService],
  controllers: [HubSpotController],
})
export class HubSpotModule {}
