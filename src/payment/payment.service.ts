/* eslint-disable @typescript-eslint/require-await */
import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { DonationDto } from '../dto/donation.dto';
import axios from 'axios';
@Injectable()
export class PaymentService {
  private readonly sandboxUrl =
    'https://apipre.pagoplux.com/intv1/credentials/paymentCardResource';
  private readonly clientId = 'pdMA2SW2XIQUFlKVMCfJtmbr1E';
  private readonly secretKey =
    '95VI8Pi1LRGDIj9rWJdF3rSL46OUmVW5Jtby9aVVkgLuc60z';
  private readonly publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqel/bZWiGXrKwBqWuBF7
Vub2bNulFTTRg5Y0agXKkjur3ZheyPdXRGNhhgpDlILg2EPZ220OFBdPj1GGnbrG
R564J+QHbhqbeE1XA0663ovGji+tGepNGiZ2UPXj5S3wGA/LN6sfOgT2BjMigzlp
rsCAt/QHI84LG6jAYu/DAhKnSx+ihXjcelPyeTfvtAIuH2rEyzPl6qi6hZm5n7YX
83onUwRfevZFWelb797vsQSpYdeSd/dCoeqYq10djszPF2xWPzvD1vefJV2Hmc1C
9BnjtcGuimDvm+adNR1jRVQ2YX0o63wbGDdbKJOECKH172bV5ItwMl37llNjRk4N
+wIDAQAB
-----END PUBLIC KEY-----`;
  private readonly establishmentId = 'MQ==';

  constructor(private readonly httpService: HttpService) {}

  async processSingleDonation(donationData: DonationDto): Promise<any> {
    console.log(
      'Procesando donación única:',
      JSON.stringify(donationData, null, 2),
    );

    // Validar método de pago
    if (donationData.paymentMethod !== 'card') {
      console.error(
        'Error: Método de pago inválido:',
        donationData.paymentMethod,
      );
      throw new BadRequestException(
        'Método de pago no soportado. Debe ser "card".',
      );
    }

    // Validar detalles de la tarjeta
    const { cardDetails } = donationData;
    if (
      !cardDetails.cardNumber ||
      cardDetails.cardNumber.length < 13 ||
      cardDetails.cardNumber.length > 19
    ) {
      console.error(
        'Error: Número de tarjeta inválido:',
        cardDetails.cardNumber,
      );
      throw new BadRequestException(
        'Número de tarjeta inválido. Debe tener entre 13 y 19 dígitos.',
      );
    }
    if (!cardDetails.cvv || !/^\d{3}$/.test(cardDetails.cvv)) {
      console.error('Error: CVV inválido:', cardDetails.cvv);
      throw new BadRequestException('CVV inválido. Debe ser de 3 dígitos.');
    }
    if (!cardDetails.expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.expiry)) {
      console.error('Error: Formato de expiry inválido:', cardDetails.expiry);
      throw new BadRequestException(
        'Formato de fecha de expiración inválido. Debe ser MM/YY.',
      );
    }
    if (!cardDetails.name || cardDetails.name.trim().length < 2) {
      console.error('Error: Nombre inválido:', cardDetails.name);
      throw new BadRequestException('Nombre en la tarjeta inválido.');
    }

    // Validar monto
    const amount = parseFloat(donationData.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('Error: Monto inválido:', donationData.amount);
      throw new BadRequestException(
        'Monto inválido. Debe ser un número mayor a 0.',
      );
    }
    console.log('Monto validado:', amount);

    // Parsear fecha de expiración
    const [month, year] = cardDetails.expiry.split('/');
    const expiryMonth = month.padStart(2, '0');
    const expiryYear = year.length === 2 ? `20${year}` : year;
    if (!/^\d{2}$/.test(month) || !/^\d{2}$/.test(year)) {
      console.error('Error: Mes o año de expiración inválido:', {
        month,
        year,
      });
      throw new BadRequestException('Mes o año de expiración inválido.');
    }
    const currentYear = new Date().getFullYear();
    if (
      parseInt(expiryYear) < currentYear ||
      parseInt(month) < 1 ||
      parseInt(month) > 12
    ) {
      console.error('Error: Fecha de expiración inválida:', {
        expiryMonth,
        expiryYear,
      });
      throw new BadRequestException('Fecha de expiración inválida o vencida.');
    }
    console.log('Parsed Expiry:', { expiryMonth, expiryYear });

    // Enviar solicitud a PagoPlux
    const response = await this.sendPagoPluxRequest(
      donationData,
      expiryMonth,
      expiryYear,
      false,
    );

    // Manejar respuesta
    console.log(
      'Respuesta final procesada:',
      JSON.stringify(response, null, 2),
    );
    if (response.code === 0) {
      const result = {
        success: true,
        transactionId: response.detail?.id_transaccion || `don-${Date.now()}`,
        amount: donationData.amount,
        paymentMethod: donationData.paymentMethod,
        date: new Date().toISOString(),
        type: 'single',
      };
      console.log('Transacción exitosa:', result);
      return result;
    }

    const errorResult = {
      success: false,
      message:
        response.description ||
        'La transacción falló. Verifica los detalles de tu tarjeta.',
      details: response,
    };
    console.error('Error en transacción:', errorResult);
    return errorResult;
  }

  private validateEcuadorianCedula(cedula: string): boolean {
    console.log('Validando cédula:', cedula);
    if (!/^\d{10}$/.test(cedula)) {
      console.error('Cédula inválida: No tiene 10 dígitos');
      return false;
    }
    const digits = cedula.split('').map(Number);
    const province = parseInt(cedula.substring(0, 2));
    if (province < 1 || province > 24) {
      console.error('Cédula inválida: Código de provincia inválido:', province);
      return false;
    }
    const thirdDigit = digits[2];
    if (thirdDigit > 5) {
      console.error('Cédula inválida: Tercer dígito inválido:', thirdDigit);
      return false;
    }
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let value = digits[i] * coefficients[i];
      if (value > 9) value -= 9;
      sum += value;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const isValid = checkDigit === digits[9];
    console.log('Cédula validada:', {
      cedula,
      isValid,
      checkDigit,
      expected: digits[9],
    });
    return isValid;
  }

  private async sendPagoPluxRequest(
    donationData: DonationDto,
    expiryMonth: string,
    expiryYear: string,
    isRecurring: boolean,
  ): Promise<any> {
    console.log('Iniciando sendPagoPluxRequest:', {
      isRecurring,
      expiryMonth,
      expiryYear,
    });
    console.log('Public Key:', this.publicKey);

    // 1. Generar clave simétrica random de 32 caracteres (como indica la documentación)
    // Usando crypto.randomBytes(32) para generar 32 bytes aleatorios
    const symmetricKey = this.getGenerado(32); // Cadena aleatoria de 32 caracteres
    const symmetricKeyBuffer = Buffer.from(symmetricKey, 'utf8'); // Para cifrado AES
    console.log(
      'Symmetric Key (raw buffer length):',
      symmetricKeyBuffer.length,
    );
    console.log(
      'Symmetric Key (base64 for verification):',
      symmetricKeyBuffer.toString('base64'),
    );

    // 2. Cifrar clave simétrica con RSA y la clave pública (como indica la documentación)
    let encryptedSymmetricKey: string;
    try {
      console.log('Cifrando clave simétrica con RSA...');
      encryptedSymmetricKey = this.cifrarRSA(symmetricKey, this.publicKey);
      console.log('Encrypted Symmetric Key:', encryptedSymmetricKey);
      console.log(
        'Encrypted Symmetric Key length:',
        encryptedSymmetricKey.length,
      );
    } catch (error) {
      console.error('RSA Encryption Error:', error.message);
      throw new BadRequestException('Error al encriptar la clave simétrica');
    }

    // 3. Cifrar detalles de la tarjeta con AES-256-ECB (como indica la documentación)
    let card: any;
    try {
      console.log('Cifrando detalles de la tarjeta con AES-256-ECB...');
      // Extraer el año con 2 dígitos como especifica la documentación
      const yearTwoDigits =
        expiryYear.length === 4 ? expiryYear.substring(2) : expiryYear;
      console.log('Año de expiración con 2 dígitos:', yearTwoDigits);

      const card = {
        number: this.cifrarAES_ECB(
          donationData.cardDetails.cardNumber,
          symmetricKey,
        ),
        expirationYear: this.cifrarAES_ECB(yearTwoDigits, symmetricKey),
        expirationMonth: this.cifrarAES_ECB(expiryMonth, symmetricKey),
        cvv: this.cifrarAES_ECB(donationData.cardDetails.cvv, symmetricKey),
      };
      console.log('Encrypted Card Details:', JSON.stringify(card, null, 2));
    } catch (error) {
      console.error('AES Encryption Error:', error.message);
      throw new BadRequestException(
        'Error al encriptar los datos de la tarjeta',
      );
    }

    // 4. Generar cabecera de autorización Basic (como indica la documentación)
    const authHeader = Buffer.from(
      `${this.clientId}:${this.secretKey}`,
    ).toString('base64');
    console.log('Authorization Header:', authHeader);

    // 5. Construir carga de la solicitud según la estructura de la documentación
    const amount = parseFloat(donationData.amount);
    const documentNumber = donationData.identify || '1700000001';
    if (!this.validateEcuadorianCedula(documentNumber)) {
      console.error('Error: Cédula inválida:', documentNumber);
      throw new BadRequestException('Cédula ecuatoriana inválida.');
    }

    // 6. Construir el payload exactamente como lo especifica la documentación
    const payload = {
      card: {
        number: '0TZqWTBbLOzMwimYbmsZES++DAmFcv2qI8sZ6TAGDQ4=',
        expirationYear: 'V4tfZym40aH+63OxqfYkDQ==',
        expirationMonth: 'y4MirSVTxHxp3J2JfSxxZQ==',
        cvv: 'XXCfaHtdkf7z8FmfkJabwQ==',
      },
      buyer: {
        documentNumber: '1710020012',
        firstName: 'Pago',
        lastName: 'Plux',
        phone: '+593987654321',
        email: 'test@domain.com',
      },
      shippingAddress: {
        country: 'Ecuador',
        city: 'Ibarra',
        street: 'Bolivar y Borrero',
        number: '2-80',
      },
      currency: 'USD',
      baseAmount0: 0,
      baseAmount12: 12.0,
      installments: '0',
      interests: '0',
      gracePeriod: 3,
      description: 'Donación desde API',
      clientIp: '192.168.1.1',
      idEstablecimiento: this.establishmentId,
    };

    // 7. Agregar parámetros recurrentes si es necesario
    // if (isRecurring) {
    //   payload.paramsRecurrent = {
    //     permiteCalendarizar: true,
    //     idPlan: '12', // ID del plan de pagos recurrentes
    //   };
    // }

    // 8. Validar tipos de datos según la documentación
    console.log('Validación de campos del Payload:');
    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}:`, JSON.stringify(value, null, 2));
      } else {
        console.log(`  ${key}: ${value} (${typeof value})`);
      }
    });

    // 9. Mostrar el payload completo antes de enviar la solicitud
    console.log('======= PAYLOAD COMPLETO =======');
    console.log(JSON.stringify(payload, null, 2));
    console.log('================================');

    // 10. Preparar headers según la documentación
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
      simetricKey: encryptedSymmetricKey, // Clave simétrica cifrada con RSA
    };

    // 11. Mostrar headers completos
    console.log('======= HEADERS COMPLETOS =======');
    console.log(
      JSON.stringify(
        {
          'Content-Type': headers['Content-Type'],
          Authorization: `Basic ${authHeader}`,
          simetricKey: encryptedSymmetricKey,
        },
        null,
        2,
      ),
    );
    console.log('=================================');

    // 12. Enviar solicitud a PagoPlux según la documentación
    try {
      console.log('Enviando solicitud a PagoPlux URL:', this.sandboxUrl);
      const response = await axios.post(this.sandboxUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
          simetricKey: encryptedSymmetricKey,
        },
      });
      console.log('PagoPlux Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error(
        'PagoPlux API Error:',
        JSON.stringify(error.response?.data || error.message, null, 2),
      );
      return {
        code: 1,
        description:
          error.response?.data?.description ||
          error.response?.data?.message ||
          'Error al procesar el pago',
        status: 'Failed',
        detail: error.response?.data,
      };
    }
  }

  //   private cifrarRSA(texto: string, publicKey: string): string {
  //     try {
  //       console.log(
  //         'Iniciando cifrado RSA para texto:',
  //         texto.substring(0, 10) + '...',
  //       );
  //       // Asegurarse de que la clave pública esté en el formato correcto
  //       // como indica la documentación de PagoPlux
  //       const key = publicKey.includes('BEGIN PUBLIC KEY')
  //         ? publicKey
  //         : `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

  //       // Usar RSA_PKCS1_PADDING según el ejemplo de la documentación
  //       const encryptedData = crypto.publicEncrypt(
  //         {
  //           key,
  //           padding: crypto.constants.RSA_PKCS1_PADDING,
  //         },
  //         Buffer.from(texto, 'utf8'),
  //       );
  //       const result = encryptedData.toString('base64');
  //       console.log('Cifrado RSA exitoso, longitud:', result.length);
  //       return result;
  //     } catch (error) {
  //       console.error('Fallo en cifrado RSA:', error.message);
  //       throw new Error(`Fallo en cifrado RSA: ${error.message}`);
  //     }
  //   }

  //   private cifrarAES_ECB(texto: string, claveSimetrica: Buffer): string {
  //     try {
  //       console.log('Iniciando cifrado AES para texto:', texto);
  //       console.log('Longitud de clave simétrica:', claveSimetrica.length);

  //       // Implementación AES-256-ECB según la documentación de PagoPlux
  //       const cipher = crypto.createCipheriv('aes-256-ecb', claveSimetrica, null);
  //       cipher.setAutoPadding(true);

  //       // Cifrar primero en UTF-8 y luego codificar en base64
  //       let result = cipher.update(texto, 'utf8', 'base64');
  //       result += cipher.final('base64');

  //       console.log('Cifrado AES exitoso:', result);
  //       return result;
  //     } catch (error) {
  //       console.error('Fallo en cifrado AES:', error.message);
  //       throw new Error(`Fallo en cifrado AES: ${error.message}`);
  //     }
  //   }
  // Dentro de tu PaymentService class

  private getGenerado(size = 32): string {
    const caracteres =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codigo = '';
    let length = caracteres.length;
    if (size <= 10) {
      length = 10; // Solo números si el tamaño es pequeño
    }
    while (codigo.length < size) {
      codigo += caracteres[Math.floor(Math.random() * length)];
    }
    return codigo;
  }

  private cifrarRSA(texto: string, publicKey: string): string {
    try {
      let key = publicKey;
      if (!publicKey.includes('BEGIN PUBLIC KEY')) {
        key = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
      }

      const encryptedData = crypto.publicEncrypt(
        {
          key,
          padding: crypto.constants.RSA_PKCS1_PADDING,
        },
        Buffer.from(texto),
      );

      return encryptedData.toString('base64');
    } catch (error) {
      throw new Error(`Fallo en cifrado RSA: ${error.message}`);
    }
  }

  private cifrarAES_ECB(texto: string, claveSimetrica: string): string {
    try {
      const key = Buffer.from(claveSimetrica, 'utf8');
      const src = Buffer.from(texto, 'utf8');

      const cipher = crypto.createCipheriv('aes-256-ecb', key, null);
      cipher.setAutoPadding(true);

      let result = cipher.update(src.toString('utf8'), 'utf8', 'base64');
      result += cipher.final('base64');

      return result;
    } catch (error) {
      throw new Error(`Fallo en cifrado AES: ${error.message}`);
    }
  }
}
