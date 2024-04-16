import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiNotFoundResponse, ApiResponse } from '@nestjs/swagger';

@Controller()
export class CoreController {
  @Get()
  @HttpCode(200)
  @ApiOperation({ operationId: 'Healthcheck', description: 'Checking the status of the Core Module' })
  @ApiOkResponse({ description: 'The service is working fine' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  healthCheck() {
    return { status: 'OK' };
  }
}
