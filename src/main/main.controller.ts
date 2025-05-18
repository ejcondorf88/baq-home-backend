import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MainService } from './main.service';
import { DonationDto } from '../dto/donation.dto';

@Controller('api/donations')
export class MainController {
  constructor(private readonly mainService: MainService) {}

  @Post()
  @UsePipes(new ValidationPipe())
  async processDonation(@Body() donationData: DonationDto) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = await this.mainService.processDonation(donationData);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    } catch (error) {
      console.error('Error al procesar donación:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al procesar la donación',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
