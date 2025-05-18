import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CardDetailsDto {
  @IsNotEmpty()
  @IsString()
  cardNumber: string;

  @IsNotEmpty()
  @IsString()
  cvv: string;

  @IsNotEmpty()
  @IsString()
  expiry: string;

  @IsNotEmpty()
  @IsString()
  name: string;
}

export class DonationDto {
  @IsNotEmpty()
  @IsString()
  amount: string;

  @ValidateNested()
  @Type(() => CardDetailsDto)
  cardDetails: CardDetailsDto;

  @IsNotEmpty()
  @IsString()
  @IsIn(['card']) // Puedes expandir esto si tienes más métodos de pago
  paymentMethod: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['monthly', 'quarterly', 'annually', '']) // Frecuencias permitidas
  frequency?: string;

  @IsOptional()
  @IsString()
  identify?: string; // Cédula - Si existe, consideramos que es donación recurrente
}
