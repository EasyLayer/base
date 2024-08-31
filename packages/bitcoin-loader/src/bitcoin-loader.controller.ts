import { Controller, Get, HttpCode, Param, Query, ParseArrayPipe } from '@nestjs/common';
import { Filter } from '@nestjs-query/core';
import { ApiOkResponse, ApiOperation, ApiNotFoundResponse, ApiResponse } from '@nestjs/swagger';
import { ViewsQueryFactoryService } from './application-layer/services';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';

enum SortingDirectionEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class SortingDto {
  @IsString()
  readonly field!: string;

  @IsOptional()
  @IsEnum(SortingDirectionEnum)
  readonly direction?: SortingDirectionEnum;
}

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  readonly limit?: number;

  @IsOptional()
  @IsNumber()
  readonly offset?: number;
}

@Controller()
export class IndexerController {
  constructor(private readonly viewsQueryFactory: ViewsQueryFactoryService) {}

  @Get('/healthcheck')
  @HttpCode(200)
  @ApiOperation({ operationId: 'Healthcheck', description: 'Checking the status of the Bitcoin Indexer module' })
  @ApiOkResponse({ description: 'The service is working fine' })
  @ApiNotFoundResponse({ description: 'Service not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  healthCheck() {
    return { status: 'OK' };
  }

  @Get('/find-many/:entity')
  async findMany(
    @Param('entity') entityName: string,
    @Query('sorting', new ParseArrayPipe({ items: SortingDto, optional: true }))
    sorting?: SortingDto[],
    @Query('paging') paging?: PaginationDto,
    @Query('filter') filter?: Filter<any>,
    @Query('relations') relations?: string
  ) {
    const relationsArray = relations ? relations.split(',') : undefined;
    return this.viewsQueryFactory.getMany({ entityName, filter, sorting, paging, relations: relationsArray });
  }

  @Get('/find-one/:entity')
  async findOne(
    @Param('entity') entityName: string,
    @Query('filter') filter: Filter<any>,
    @Query('relations') relations?: string
  ) {
    const relationsArray = relations ? relations.split(',') : undefined;
    return this.viewsQueryFactory.getOne({ entityName, filter, relations: relationsArray });
  }
}
