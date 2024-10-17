import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  create(@Body() createReportDto: CreateReportDto) {
    return this.reportsService.create(createReportDto);
  }

  @Post('find-monthly-pagination')
  findAllMonthlyPagination(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      page?: number;
      limit?: number;
      paymentMode?: string;
      stationId?: number
    },
  ) {
    return this.reportsService.findAllMonthlyPagination({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      page: body.page,
      limit: body.limit,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-monthly')
  findAllMonthly(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      paymentMode?: string;
      stationId?:number
    },
  ) {
    return this.reportsService.findAllMonthly({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-daily-pagination')
  findAllDailyPagination(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      page?: number;
      limit?: number;
      paymentMode?: string;
      stationId?:number
    },
  ) {
    return this.reportsService.findAllDailyPagination({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      page: body.page,
      limit: body.limit,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-daily')
  findAllDaily(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      paymentMode?: string;
      stationId?: number
    },
  ) {
    return this.reportsService.findAllDaily({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-hourly-pagination')
  findAllHourlyPagination(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      page?: number;
      limit?: number;
      paymentMode?: string;
      stationId?: number
    },
  ) {
    return this.reportsService.findAllHourlyPagination({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      page: body.page,
      limit: body.limit,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-hourly')
  findAllHourly(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      paymentMode?: string;
      stationId?: number
    },
  ) {
    return this.reportsService.findAllHourly({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }
  @Post('find-all-pagination')
  findAllPagination(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      page?: number;
      limit?: number;
      paymentMode?: string;
      stationId?: number
    },
  ) {
    return this.reportsService.findAllPagination({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      page: body.page,
      limit: body.limit,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-all')
  findAll(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      orderId?: string;
      transactionType?: string;
      paymentMode?: string;
      stationId?: number
    },
  ) {
    return this.reportsService.findAll({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId
    });
  }

  @Post('find-station')
  async getStations(
    @Body() 
    body: { 
      fromDate: Date | string; 
      toDate: Date | string;
    },
  ) {
    try {
      const fromDate = body.fromDate ? new Date(body.fromDate) : null;
      const toDate = body.toDate ? new Date(body.toDate) : null;

      const result = await this.reportsService.Ridership(fromDate, toDate);
      return result;
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve station data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReportDto: UpdateReportDto) {
    return this.reportsService.update(+id, updateReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportsService.remove(+id);
  }
}
