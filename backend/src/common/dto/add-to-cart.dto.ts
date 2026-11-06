import { IsNotEmpty, IsString, IsInt, Min, IsOptional } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsString()
  bookId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number = 1;
}

export class UpdateCartItemDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;
}
