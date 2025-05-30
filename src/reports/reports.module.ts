import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TransactionQr, Qr, Station, LoginSession, Equipment, Penalty, Closedloop, Closedloopdetails, Closedlooprechargehistory, Closedlooppenalty, ValidationRecords } from '@spot-demo/shared-entities';
import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
  imports: [TypeOrmModule.forFeature([TransactionQr, Qr, Station, LoginSession, Equipment, Penalty, Closedloop, Closedloopdetails, Closedlooprechargehistory, Closedlooppenalty, ValidationRecords])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
