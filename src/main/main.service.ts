import { Injectable } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
// import { PdfService } from '../documents/pdf.service';
// import { EmailService } from '../documents/email.service';
import { CrmService } from '../crm/crm.service';
import { DonationDto } from '../dto/donation.dto';

@Injectable()
export class MainService {
  constructor(
    private readonly paymentService: PaymentService,
    // private readonly pdfService: PdfService,
    // private readonly emailService: EmailService,
    private readonly crmService: CrmService,
  ) {}

  async processDonation(donationData: DonationDto): Promise<any> {
    // Determinar si es una donación recurrente basado en la presencia de la cédula
    const isRecurring =
      !!donationData.identify && donationData.identify.trim() !== '';

    try {
      if (isRecurring) {
        // return await this.processRecurringDonation(donationData);
      } else {
        return await this.processSingleDonation(donationData);
      }
    } catch (error) {
      console.error(
        `Error al procesar donación ${isRecurring ? 'recurrente' : 'única'}:`,
        error,
      );
      throw error;
    }
  }

  private async processSingleDonation(donationData: DonationDto): Promise<any> {
    // 1. Procesar el pago de la donación única
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paymentResult =
      await this.paymentService.processSingleDonation(donationData);

    // Verificar si la transacción fue exitosa
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!paymentResult.success) {
      return {
        success: false,
        message: 'Falló la transacción de pago',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        details: paymentResult,
      };
    }

    // 2. Registrar la donación en el CRM
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const crmResult = await this.crmService.registerSingleDonation(
      donationData,
      paymentResult,
    );

    // 3. Generar recibo de donación
    // const receiptResult = await this.pdfService.generateDonationReceipt(
    //   donationData,
    //   paymentResult,
    // );

    // // 4. Intentar enviar recibo por email (si tenemos email)
    // const emailResult = await this.emailService.sendDonationReceipt(
    //   donationData,
    //   receiptResult,
    // );

    // 5. Devolver resultado completo
    return {
      success: true,
      donationType: 'single',
      //   donation: {
      //     amount: donationData.amount,
      //     transactionId: paymentResult.transactionId,
      //     date: paymentResult.date,
      //   },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      crm: crmResult,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      //   receipt: receiptResult,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      //   email: emailResult,
    };
  }

  //   private async processRecurringDonation(
  //     donationData: DonationDto,
  //   ): Promise<any> {
  //     // Verificar que tenemos la información mínima necesaria para donación recurrente
  //     if (!donationData.frequency || !donationData.fullName) {
  //       return {
  //         success: false,
  //         message:
  //           'Faltan datos requeridos para procesar una donación recurrente',
  //       };
  //     }

  //     // 1. Procesar el pago inicial de la donación recurrente
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //     const paymentResult =
  //       await this.paymentService.processRecurringDonation(donationData);

  //     // Verificar si la transacción fue exitosa
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     if (!paymentResult.success) {
  //       return {
  //         success: false,
  //         message: 'Falló la transacción de pago',
  //         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //         details: paymentResult,
  //       };
  //     }

  //     // 2. Registrar la suscripción en el CRM
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //     const crmResult = await this.crmService.registerRecurringDonation(
  //       donationData,
  //       paymentResult,
  //     );

  //     // 3. Generar factura de suscripción
  //     // const invoiceResult = await this.pdfService.generateSubscriptionInvoice(
  //     //   donationData,
  //     //   paymentResult,
  //     // );

  //     // 4. Enviar confirmación de suscripción y factura por email
  //     // const emailResult = await this.emailService.sendSubscriptionConfirmation(
  //     //   donationData,
  //     //   invoiceResult,
  //     // );

  //     // 5. Devolver resultado completo
  //     return {
  //       success: true,
  //       donationType: 'recurring',
  //       donation: {
  //         amount: donationData.amount,
  //         frequency: donationData.frequency,
  //         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //         subscriptionId: paymentResult.subscriptionId,
  //         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  //         transactionId: paymentResult.transactionId,
  //         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  //         startDate: paymentResult.date,
  //         // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  //         nextBillingDate: paymentResult.nextBillingDate,
  //       },
  //       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //       crm: crmResult,
  //       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  //       //   invoice: invoiceResult,
  //       //   email: emailResult,
  //     };
  //   }
}
