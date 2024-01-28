import { Controller, Get, Param, Post, Body, Query, HttpCode } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiOkResponse,
  ApiBody,
  ApiOperation,
  ApiNotFoundResponse,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProperty,
  ApiHeader,
} from '@nestjs/swagger';

class AddWalletDto {
  @ApiProperty({
    required: true,
    description: 'Wallet Name',
    example: 'My own wallet',
  })
  name!: string;

  @ApiProperty({
    required: true,
    description: 'Wallet type',
    example: 'bep',
  })
  type!: string;
}

class WalletResponseDto {
  @ApiProperty({
    required: true,
    description: 'Record Id',
    example: '1',
  })
  id!: string;

  @ApiProperty({
    required: true,
    description: 'Wallet Name',
    example: 'My own wallet',
  })
  name!: string;

  @ApiProperty({
    required: true,
    description: 'Wallet type',
    example: 'bep',
  })
  type!: string;

  @ApiProperty({
    required: true,
    description: 'Record status',
    example: 'active',
  })
  status!: string;
}

@Controller('bitcoin-parser')
export class BitcoinParserController {
  @Get('/healthcheck')
  @HttpCode(200)
  @ApiOperation({ operationId: 'Healthcheck', description: 'Checking the status of the Bitcoin Parser module' })
  @ApiOkResponse({ description: 'The service is working fine' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  healthCheck() {
    return { status: 'OK' };
  }

  @Post()
  @ApiOperation({ operationId: 'Add wallet', description: 'Add a new wallet to parser monitoring' })
  @ApiBody({ description: 'DTO for adding a wallet', type: AddWalletDto })
  @ApiOkResponse({ description: 'Added wallet', type: WalletResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid data for adding a wallet' })
  @ApiConsumes('application/json')
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer YOUR_JWT_TOKEN',
  })
  addWallet(@Body() wallet: AddWalletDto): WalletResponseDto {
    return {
      ...wallet,
      id: '1',
      status: 'active',
    };
  }

  @Get(':id')
  @ApiOperation({ operationId: 'Get One Wallet', description: 'Get information about a wallet by Id' })
  @ApiParam({ name: 'id', description: 'ID парсера', required: true, type: String })
  @ApiOkResponse({ description: 'Wallet information', type: WalletResponseDto })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer YOUR_JWT_TOKEN',
  })
  getOneWallet(@Param('id') id: string): WalletResponseDto {
    return {
      id,
      name: 'Example name',
      type: 'Example type',
      status: 'active',
    };
  }

  @Get()
  @ApiOperation({ operationId: 'Get All Wallets', description: 'Get a list of all wallets' })
  @ApiQuery({ name: 'type', description: 'Wallet type', required: false, type: String })
  @ApiOkResponse({ description: 'Wallets List', type: [WalletResponseDto] })
  @ApiHeader({
    name: 'Authorization',
    description: 'Bearer token for authentication',
    required: true,
    example: 'Bearer YOUR_JWT_TOKEN',
  })
  getAllWallets(@Query('type') type?: string): WalletResponseDto[] {
    return [
      { id: '1', name: 'Example name1', type: type || 'bep', status: 'active' },
      { id: '2', name: 'Example name2', type: type || 'bep', status: 'inactive' },
    ];
  }
}
