import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class ModifyOrderItemDto {
  @IsUUID()
  bookId: string;

  /** New desired quantity for the line; 0 removes it. Can only be lower than the current quantity. */
  @IsInt()
  @Min(0)
  @Max(99)
  quantity: number;
}

export class ModifyOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ModifyOrderItemDto)
  items: ModifyOrderItemDto[];
}
