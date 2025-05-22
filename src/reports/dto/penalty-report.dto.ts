import { IsDate, IsOptional, IsArray, IsNumber } from 'class-validator';

export class PenaltyReportDto {
  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  toDate?: Date;

  @IsArray()
  @IsOptional()
  stations?: number[];
}

export interface StationPenaltyReport {
  station_id: number;
  station_name: string;
  total_amount: number;
  cash_amount: number;
  upi_amount: number;
  card_amount: number;
}
