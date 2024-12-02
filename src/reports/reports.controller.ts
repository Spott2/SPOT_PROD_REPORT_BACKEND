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
import { LoginSessionInput } from './commonTypes';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}


  @Get('get-dashboard-analytics')
  async getDashboardAnalytics() {
    return this.reportsService.getDashboardAnalytics();
  }

  @Get('get-dashboard-analytics-by-station/:stationId')
  async getDashboardAnalyticsByStation(@Param('stationId') stationId: number) {
    return this.reportsService.getDashboardAnalyticsByStation(stationId);
  }

  @Get('get-dashboard-analytics-daily')
  async getDashboardAnalyticsForToday() {
    return this.reportsService.getDashboardAnalyticsForToday();
  }
  // GRAPH ENDS

  @Post('get-dashboard-analytics-by-station-daily')
  getDashboardAnalyticsByStationDaily(
    @Body()
    body: {
      fromDate?: Date | string;
      toDate?: Date | string;
      stationId?: number | null;
    },
  ) {
    return this.reportsService.getDashboardAnalyticsByStationDaily({
      fromDate: body.fromDate,
      toDate: body.toDate,
      stationId: body.stationId ?? null,
    });
  }

  @Get('get-dashboard-analytics-all-station')
  getDashboardAnalyticsAllStation() {
    return this.reportsService.getDashboardAnalyticsAllStation();
  }

  @Get('get-dashboard-analytics-monthly')
  getDashboardAnalyticsMonthly() {
    return this.reportsService.getDashboardAnalyticsMonthly();
  }
  
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
    },
  ) {
    return this.reportsService.findAllMonthly({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
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
    },
  ) {
    return this.reportsService.findAllDaily({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
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
    },
  ) {
    return this.reportsService.findAllHourly({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
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
    },
  ) {
    return this.reportsService.findAll({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
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

  @Post('tom-shift-report')
  tomShiftReport(@Body() body: { date: string; station: string }) {
    return this.reportsService.tomShiftReport(body.date, body.station);
  }

  @Post('report-by-station-operator')
  getCollectionReportByStationOperator(
    @Body() body: { date: string; station: string },
  ) {
    return this.reportsService.getCollectionReportByStationOperator(
      body.date,
      body?.station,
    );
  }

  @Post('report-by-station')
  getCollectionReportByStation(
    @Body() body: { date: string; station: string },
  ) {
    return this.reportsService.getCollectionReportByStation(
      body.date,
      body.station,
    );
  }

  @Post('report-by-date')
  getCollectionReportByDate(@Body() body: { date: string; station: string }) {
    return this.reportsService.getCollectionReportByDate(
      body.date,
      body.station,
    );
  }


  @Post('shift-report')
  shiftReport(@Body() body: LoginSessionInput) {
    return this.reportsService.shiftReport(body);
  }

  @Post('find-shift-report')
  findShiftReport(@Body() body: { fromDate: Date, endDate: Date, station: string }) {
    return this.reportsService.findShiftReport(body);
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
