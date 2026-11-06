import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class ValidateCouponDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'code may only contain letters, digits, "-" and "_"' })
  code: string;
}
