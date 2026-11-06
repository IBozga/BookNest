import { IsBoolean, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

/** Only a field that was not sent (undefined) is skipped; null or an empty string is rejected. */
const sent = (_: unknown, value: unknown) => value !== undefined;

/** Partial update of a saved address. Omitted fields keep their current value. */
export class UpdateAddressDto {
  @ValidateIf(sent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @ValidateIf(sent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street?: string;

  @ValidateIf(sent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city?: string;

  @ValidateIf(sent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state?: string;

  @ValidateIf(sent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  zipCode?: string;

  @ValidateIf(sent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country?: string;

  @ValidateIf(sent)
  @IsBoolean()
  isDefault?: boolean;
}
