import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentModule } from './payment/payment.module';
import { DocumentsModule } from './documents/documents.module';
import { CrmModule } from './crm/crm.module';
import { MainModule } from './main/main.module';
import { HubSpotModule } from './crm/hubspot.module';

@Module({
  imports: [PaymentModule, DocumentsModule, CrmModule, MainModule, ConfigModule.forRoot({ isGlobal: true }),HubSpotModule, ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
