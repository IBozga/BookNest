import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsEnum, ValidateNested, IsEmail, MaxLength, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  PAYPAL = 'PAYPAL',
  APPLE_PAY = 'APPLE_PAY',
  GOOGLE_PAY = 'GOOGLE_PAY',
  SEPA_DIRECT_DEBIT = 'SEPA_DIRECT_DEBIT',
  IDEAL = 'IDEAL',
  SOFORT = 'SOFORT',
  BANCONTACT = 'BANCONTACT',
  GIFT_POINTS_FULL = 'GIFT_POINTS_FULL',
}

export class PaymentDetailsDto {
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardHolder?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  cvv?: string;

  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  bic?: string;

  @IsOptional()
  @IsString()
  bankName?: string;
}

export class ProcessOrderDto {
  @IsNotEmpty()
  @IsString()
  addressId: string;

  @IsNotEmpty()
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  redeemPoints?: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  couponCode?: string;

  @IsOptional()
  @IsBoolean()
  useWallet?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  paymentDetails?: PaymentDetailsDto;
}
