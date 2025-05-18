import { Module } from '@nestjs/common';
import { CrmService } from './crm.service';

@Module({
  imports: [],
  providers: [CrmService],
  exports: [CrmService], // Exportamos el servicio
})
export class CrmModule {}
