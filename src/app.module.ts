import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentModule } from './payment/payment.module';
import { DocumentsModule } from './documents/documents.module';
import { CrmModule } from './crm/crm.module';
import { MainModule } from './main/main.module';

@Module({
  imports: [PaymentModule, DocumentsModule, CrmModule, MainModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
