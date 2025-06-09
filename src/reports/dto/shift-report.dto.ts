import { IsNumber, IsString, IsOptional, IsDate } from 'class-validator';

export class ShiftReportDto {
  @IsNumber()
  station: number;

  @IsNumber()
  user: number;

  @IsString()
  @IsOptional()
  device_id?: string;

  @IsString()
  shift_id: string;

  @IsNumber()
  @IsOptional()
  qr_total_amount?: number;

  @IsNumber()
  @IsOptional()
  qr_cash_amount?: number;

  @IsNumber()
  @IsOptional()
  qr_upi_amount?: number;

  @IsNumber()
  @IsOptional()
  qr_no_of_tickets?: number;

  @IsNumber()
  @IsOptional()
  qr_no_of_tickets_cash?: number;

  @IsNumber()
  @IsOptional()
  qr_no_of_tickets_upi?: number;

  @IsNumber()
  @IsOptional()
  penalty_total_amount?: number;

  @IsNumber()
  @IsOptional()
  penalty_cash_amount?: number;

  @IsNumber()
  @IsOptional()
  penalty_upi_amount?: number;

  @IsNumber()
  @IsOptional()
  penalty_no_of_tickets?: number;

  @IsNumber()
  @IsOptional()
  penalty_no_of_tickets_cash?: number;

  @IsNumber()
  @IsOptional()
  penalty_qr_no_of_tickets_upi?: number;

  @IsNumber()
  @IsOptional()
  failed_transaction_amount?: number;

  @IsNumber()
  @IsOptional()
  no_of_failed_transactions?: number;

  @IsNumber()
  @IsOptional()
  failed_transaction_amount_cash?: number;

  @IsNumber()
  @IsOptional()
  failed_transaction_amount_upi?: number;

  @IsNumber()
  @IsOptional()
  no_of_failed_transactions_cash?: number;

  @IsNumber()
  @IsOptional()
  no_of_failed_transactions_upi?: number;

  @IsNumber()
  @IsOptional()
  total_card_entries?: number;

  @IsNumber()
  @IsOptional()
  total_card_exits?: number;

  @IsDate()
  @IsOptional()
  login_time?: Date;

  @IsDate()
  @IsOptional()
  logout_time?: Date;

  @IsNumber()
  @IsOptional()
  total_qr_entries?: number;

  @IsNumber()
  @IsOptional()
  total_qr_exits?: number;

  @IsNumber()
  @IsOptional()
  total_shift_cash_amount?: number;

  @IsNumber()
  @IsOptional()
  total_shift_upi_amount?: number;

  @IsNumber()
  @IsOptional()
  total_shift_amount?: number;
}

export class FindShiftReportDto {
  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  station?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
