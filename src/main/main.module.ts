import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { DocumentsModule } from '../documents/documents.module';
import { CrmModule } from '../crm/crm.module';
import { MainService } from './main.service';
import { MainController } from './main.controller';

@Module({
  imports: [PaymentModule, DocumentsModule, CrmModule],
  controllers: [MainController],
  providers: [MainService],
})
export class MainModule {}
