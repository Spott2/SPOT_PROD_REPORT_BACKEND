import { IsDate, IsOptional, IsArray, IsNumber } from 'class-validator';

export class EntryExitCountDto {
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

export interface EntryExitCountResponse {
  total_entry_count: number;
  total_exit_count: number;
  station_wise_data?: StationEntryExitCount[];
}

export interface StationEntryExitCount {
  station_id: number;
  station_name: string;
  entry_count: number;
  exit_count: number;
}
