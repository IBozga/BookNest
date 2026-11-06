import { IsOptional, IsInt, Min, IsString, MaxLength, IsBoolean } from 'class-validator';

export class CalculateCheckoutDto {
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
}
