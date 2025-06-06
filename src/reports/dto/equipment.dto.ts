import { IsString, IsNumber, IsOptional, IsBoolean, IsDate } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @IsOptional()
  device_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsNumber()
  station_id: number;

  @IsNumber()
  equipment_type_id: number;

  @IsString()
  @IsOptional()
  qr?: string;

  @IsString()
  @IsOptional()
  model_type?: string;

  @IsString()
  @IsOptional()
  direction_type?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  subnet_address?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  ssid?: string;

  @IsString()
  @IsOptional()
  ssid_password?: string;

  @IsString()
  @IsOptional()
  device_serial_no?: string;

  @IsDate()
  @IsOptional()
  last_heartbeat?: Date;

  @IsString()
  @IsOptional()
  created_by?: string;

  @IsBoolean()
  @IsOptional()
  is_qr_active?: boolean;

  @IsString()
  @IsOptional()
  updated_by?: string;
}

export class UpdateEquipmentDto {
  @IsString()
  @IsOptional()
  device_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsNumber()
  @IsOptional()
  station_id?: number;

  @IsNumber()
  @IsOptional()
  equipment_type_id?: number;

  @IsString()
  @IsOptional()
  qr?: string;

  @IsString()
  @IsOptional()
  model_type?: string;

  @IsString()
  @IsOptional()
  direction_type?: string;

  @IsString()
  @IsOptional()
  ip_address?: string;

  @IsString()
  @IsOptional()
  subnet_address?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  ssid?: string;

  @IsString()
  @IsOptional()
  ssid_password?: string;

  @IsString()
  @IsOptional()
  device_serial_no?: string;

  @IsDate()
  @IsOptional()
  last_heartbeat?: Date;

  @IsString()
  @IsOptional()
  created_by?: string;

  @IsBoolean()
  @IsOptional()
  is_qr_active?: boolean;

  @IsString()
  @IsOptional()
  updated_by?: string;
}

export class EquipmentFilterDto {
  @IsNumber()
  @IsOptional()
  station_id?: number;

  @IsNumber()
  @IsOptional()
  equipment_type_id?: number;

  @IsString()
  @IsOptional()
  device_name?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  is_qr_active?: boolean;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
