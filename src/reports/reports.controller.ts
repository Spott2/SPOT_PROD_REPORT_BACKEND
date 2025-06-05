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
import { CreateValidationRecordDto, UpdateValidationRecordDto, ValidationRecordFilterDto } from './dto/validation-records.dto';
import { PenaltyReportDto } from './dto/penalty-report.dto';
import { CommonTransactionReportDto } from './dto/common-transaction-report.dto';
import { ShiftReportDto } from './dto/shift-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GRAPH STARTS
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

  @Post('penalties-pagination')
  getAllPenaltiesPagination(
    @Body()
    filter: {
      fromDate?: Date | string;
      toDate?: Date | string;
      stationId: string;
      page: number;
      limit: number;
    },
  ) {
    const { fromDate, toDate, stationId, page, limit } = filter;
    return this.reportsService.getAllPenaltiesPagination(
      fromDate,
      toDate,
      stationId,
      page,
      limit,
    );
  }

  @Post('penalties')
  getAllPenalties(
    @Body()
    filter: {
      fromDate?: Date | string;
      toDate?: Date | string;
      stationId: string;
    },
  ) {
    const { fromDate, toDate, stationId } = filter;
    return this.reportsService.getAllPenalties(fromDate, toDate, stationId);
  }

  @Post('closedloop-pagination')
  getAllClosedloopPagination(
    @Body()
    filter: {
      fromDate?: Date | string;
      toDate?: Date | string;

      page: number;
      limit: number;
    },
  ) {
    const { fromDate, toDate, page, limit } = filter;
    return this.reportsService.getAllClosedloopPagination(
      fromDate,
      toDate,
      page,
      limit,
    );
  }

  @Post('closedloop')
  getAllClosedloop(
    @Body()
    filter: {
      fromDate?: Date | string;
      toDate?: Date | string;
    },
  ) {
    const { fromDate, toDate } = filter;
    return this.reportsService.getAllClosedloop(fromDate, toDate);
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
      stationId?: number;
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
      stationId: body.stationId,
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
      stationId?: number;
    },
  ) {
    return this.reportsService.findAllMonthly({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId,
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
      stationId?: number;
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
      stationId: body.stationId,
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
      stationId?: number;
    },
  ) {
    return this.reportsService.findAllDaily({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId,
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
      stationId?: number;
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
      stationId: body.stationId,
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
      stationId?: number;
    },
  ) {
    return this.reportsService.findAllHourly({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId,
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
      stationId?: number;
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
      stationId: body.stationId,
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
      stationId?: number;
    },
  ) {
    return this.reportsService.findAll({
      fromDate: body.fromDate,
      toDate: body.toDate,
      orderId: body.orderId,
      transactionType: body.transactionType,
      paymentMode: body.paymentMode,
      stationId: body.stationId,
    });
  }

  @Post('find-station')
  async getStations(
    @Body()
    body: {
      fromDate: Date | string;
      toDate: Date | string;
      stationId: number;
    },
  ) {
    try {
      const fromDate = body.fromDate ? new Date(body.fromDate) : null;
      const toDate = body.toDate ? new Date(body.toDate) : null;

      const result = await this.reportsService.Ridership(
        fromDate,
        toDate,
        body.stationId,
      );
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
  @Post('card-data-pagination')
  async getCardPagination(
    @Body() body: { card_number?: string; page?: number; limit?: number },
  ) {
    const { card_number, page = 1, limit = 100 } = body;

    return this.reportsService.getCardPagination(card_number, page, limit);
  }

  @Post('card-data')
  getCard(@Body() body: { card_number?: string }) {
    return this.reportsService.getCard(body.card_number);
  }

  @Post('card-recharge-pagination')
  async getCardRechargePagination(
    @Body()
    body: {
      card_number?: string;
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const { card_number, page = 1, limit = 100, fromDate, toDate } = body;

    try {
      const result = await this.reportsService.getCardRechargePagination({
        card_number,
        page,
        limit,
        fromDate,
        toDate,
      });

      return {
        success: true,
        message: 'Successfully retrieved card recharge data',
        data: result.data,
        total: result.total,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve card recharge data',
        error: error.message,
      };
    }
  }

  @Post('card-recharge')
  async getCardRecharge(
    @Body()
    body: {
      card_number?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const { card_number, fromDate, toDate } = body;

    try {
      const result = await this.reportsService.getCardRecharge({
        card_number,
        fromDate,
        toDate,
      });

      return {
        success: true,
        message: 'Successfully retrieved card recharge data',
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve card recharge data',
        error: error.message,
      };
    }
  }

  @Post('card-penalty-pagination')
  async getCardPenaltyPagination(
    @Body()
    body: {
      card_number?: string;
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const { card_number, page = 1, limit = 100, fromDate, toDate } = body;

    try {
      const result = await this.reportsService.getCardPenaltyPagination({
        card_number,
        page,
        limit,
        fromDate,
        toDate,
      });

      return {
        success: true,
        message: 'Successfully retrieved card recharge data',
        data: result.data,
        total: result.total,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve card recharge data',
        error: error.message,
      };
    }
  }

  @Post('card-penalty')
  async getCardPenalty(
    @Body()
    body: {
      card_number?: string;
      fromDate?: string;
      toDate?: string;
    },
  ) {
    const { card_number, fromDate, toDate } = body;

    try {
      const result = await this.reportsService.getCardPenalty({
        card_number,
        fromDate,
        toDate,
      });

      return {
        success: true,
        message: 'Successfully retrieved card recharge data',
        data: result.data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve card recharge data',
        error: error.message,
      };
    }
  }

  @Post('validation-records')
  createValidationRecord(@Body() createValidationRecordDto: CreateValidationRecordDto | CreateValidationRecordDto[]) {
    if (Array.isArray(createValidationRecordDto)) {
      return this.reportsService.createValidationRecords(createValidationRecordDto);
    } else {
      return this.reportsService.createValidationRecord(createValidationRecordDto);
    }
  }

  @Post('validation-records/find')
  findAllValidationRecords(@Body() filterDto: ValidationRecordFilterDto) {
    return this.reportsService.findAllValidationRecords(filterDto);
  }

   @Get('validation-records/entry-exit-count')
  getValidationRecordsEntryExitCount() {
    return this.reportsService.getValidationRecordsEntryExitCount();
  }

  @Post('common-transaction-report')
  getCommonTransactionReport(@Body() reportDto: CommonTransactionReportDto) {
    return this.reportsService.commonTransactionReport(reportDto);
  }

  @Get('validation-records/:id')
  findOneValidationRecord(@Param('id') id: string) {
    return this.reportsService.findOneValidationRecord(+id);
  }

  @Patch('validation-records/:id')
  updateValidationRecord(
    @Param('id') id: string,
    @Body() updateValidationRecordDto: UpdateValidationRecordDto,
  ) {
    return this.reportsService.updateValidationRecord(+id, updateValidationRecordDto);
  }

  @Delete('validation-records/:id')
  removeValidationRecord(@Param('id') id: string) {
    return this.reportsService.removeValidationRecord(+id);
  }

  @Post('station-penalty-report')
  getStationPenaltyReport(@Body() reportDto: PenaltyReportDto) {
    return this.reportsService.getStationPenaltyReport(reportDto);
  }

  @Post('common-transaction-report')
  commonTransactionReport(@Body() reportDto: PenaltyReportDto) {
    return this.reportsService.commonTransactionReport(reportDto);
  }

  @Post('shift-report')
  shiftReport(@Body() body: ShiftReportDto) {
    return this.reportsService.shipReport(body);
  }

  @Post('find-shift-report')
  findShiftReport(
    @Body() body: { fromDate: Date; endDate: Date; station: string },
  ) {
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

  // ValidationRecords endpoints
  

 
}
