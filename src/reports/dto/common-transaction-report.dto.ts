import { IsDate, IsOptional, IsArray, IsNumber, IsString } from 'class-validator';

export class CommonTransactionReportDto {
  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  toDate?: Date;

  @IsArray()
  @IsOptional()
  stations?: number[];

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  type?: string; // 'QR', 'PENALTY', 'VALIDATION' or 'ALL'

}

export interface CommonTransactionItem {
  order_id?: string;
  amount?: number;
  transaction_id?: string;
  bank_transaction_id?: string;
  shift_id?: string;
  device_id?: string;
  created_at?: Date;
  qr_ticket_no?: string;
  station_name?: string;
  type: 'QR' | 'PENALTY' | 'VALIDATION';
  serialno?: string;
  operator_id?: string;
}
