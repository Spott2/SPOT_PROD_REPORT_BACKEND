import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateValidationRecordDto {
  @IsNumber()
  @IsNotEmpty()
  source: number; // ID of the source station

  @IsNumber()
  @IsOptional()
  dest?: number; // ID of the destination station

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsNotEmpty()
  validity: string;

  @IsString()
  @IsNotEmpty()
  serialno: string;

  @IsString()
  @IsNotEmpty()
  type: string; // entry, exit

  @IsString()
  @IsNotEmpty()
  media: string; // card, qr

  @IsString()
  @IsNotEmpty()
  deviceid: string;

  @IsNumber()
  @IsNotEmpty()
  station_id: number;
}

export class UpdateValidationRecordDto {
  @IsNumber()
  @IsOptional()
  source?: number; // ID of the source station

  @IsNumber()
  @IsOptional()
  dest?: number; // ID of the destination station

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  validity?: string;

  @IsString()
  @IsOptional()
  serialno?: string;

  @IsString()
  @IsOptional()
  type?: string; // entry, exit

  @IsString()
  @IsOptional()
  media?: string; // card, qr

  @IsString()
  @IsOptional()
  deviceid?: string;

  @IsNumber()
  @IsOptional()
  station_id?: number;
}

export class ValidationRecordFilterDto {
  @IsDate()
  @IsOptional()
  fromDate?: Date;

  @IsDate()
  @IsOptional()
  toDate?: Date;

  @IsString()
  @IsOptional()
  serialno?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  media?: string;

  @IsNumber()
  @IsOptional()
  station_id?: number;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
