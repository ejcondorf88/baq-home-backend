import { Injectable } from '@nestjs/common';
import { DonationDto } from '../dto/donation.dto';

@Injectable()
export class CrmService {
  // eslint-disable-next-line @typescript-eslint/require-await
  async registerSingleDonation(
    donationData: DonationDto,
    paymentResult: any,
  ): Promise<any> {
    // Aquí implementarías la lógica de integración con el CRM
    // Por ejemplo, Salesforce, HubSpot, etc.

    console.log('Registrando donación única en CRM:', {
      amount: donationData.amount,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      transactionId: paymentResult.transactionId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      date: paymentResult.date,
    });

    // Creamos un perfil básico para donación única
    const donorProfile = {
      name: donationData.cardDetails.name,
      email: donationData.email || 'No proporcionado',
      donationType: 'single',
      lastDonation: {
        amount: donationData.amount,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        date: paymentResult.date,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        transactionId: paymentResult.transactionId,
      },
    };

    // Simulación de respuesta del CRM
    return {
      success: true,
      donorId: `donor-${Date.now()}`,
      profile: donorProfile,
      status: 'registered',
      timestamp: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async registerRecurringDonation(
    donationData: DonationDto,
    paymentResult: any,
  ): Promise<any> {
    // Aquí implementarías la lógica de integración con el CRM para donantes recurrentes

    console.log('Registrando donación recurrente en CRM:', {
      donor: donationData.fullName,
      email: donationData.email,
      identify: donationData.identify, // Cédula
      amount: donationData.amount,
      frequency: donationData.frequency,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      subscriptionId: paymentResult.subscriptionId,
    });

    // Creamos un perfil más detallado para donante recurrente
    const donorProfile = {
      name: donationData.fullName || donationData.cardDetails.name,
      email: donationData.email || 'No proporcionado',
      identify: donationData.identify || 'No proporcionado',
      donationType: 'recurring',
      recurringDetails: {
        amount: donationData.amount,
        frequency: donationData.frequency,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        subscriptionId: paymentResult.subscriptionId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        startDate: paymentResult.date,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        nextBillingDate: paymentResult.nextBillingDate,
      },
      lastDonation: {
        amount: donationData.amount,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        date: paymentResult.date,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        transactionId: paymentResult.transactionId,
      },
    };

    // Simulación de respuesta del CRM
    return {
      success: true,
      donorId: `donor-rec-${Date.now()}`,
      profile: donorProfile,
      status: 'registered',
      timestamp: new Date().toISOString(),
    };
  }
}
