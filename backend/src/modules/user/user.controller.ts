import { Controller, Get, Post, Patch, Param, ParseUUIDPipe, Body, HttpCode, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateAddressDto } from '../../common/dto/create-address.dto';
import { UpdateAddressDto } from '../../common/dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@ApiTags('User & Addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users/profile')
  @ApiOperation({ summary: 'Get active user profile and reward points' })
  async getProfile(@CurrentUserId() userId: string) {
    return this.userService.getUserById(userId);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get user delivery addresses' })
  async getAddresses(@CurrentUserId() userId: string) {
    return this.userService.getAddresses(userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new delivery address' })
  async createAddress(@Body() dto: CreateAddressDto, @CurrentUserId() userId: string) {
    return this.userService.createAddress(dto, userId);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Edit one of the user\'s saved delivery addresses' })
  async updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUserId() userId: string,
  ) {
    return this.userService.updateAddress(id, dto, userId);
  }

  @Post('users/wallet/topup')
  @HttpCode(200)
  @ApiOperation({ summary: 'Top up wallet balance with a fixed mock credit' })
  async topUpWallet(@CurrentUserId() userId: string) {
    return this.userService.topUpWallet(userId);
  }
}
