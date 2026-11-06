import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { STORE } from './store.config';

@ApiTags('Store')
@Controller('store')
export class StoreController {
  @Get()
  @ApiOperation({ summary: 'Get the store, its catalogue and its policies' })
  getStore() {
    return STORE;
  }
}
