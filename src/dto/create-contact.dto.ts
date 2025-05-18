import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}