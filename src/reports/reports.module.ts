import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TransactionQr, Qr, Station, LoginSession} from '@spot-demo/shared-entities';
import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
  imports: [TypeOrmModule.forFeature([TransactionQr, Qr, Station, LoginSession])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
