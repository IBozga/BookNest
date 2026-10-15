import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  street: string;

  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsString()
  zipCode: string;

  @IsOptional()
  @IsString()
  country?: string = 'United States';

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}
