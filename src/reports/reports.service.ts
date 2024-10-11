import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionQr } from '@spot-demo/shared-entities';
import { Qr } from '@spot-demo/shared-entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TransactionQr)
    private transactionRepository: Repository<TransactionQr>,

    @InjectRepository(Qr)
    private qrRepository: Repository<Qr>,
  ) {}
  create(createReportDto: CreateReportDto) {
    return 'This action adds a new report';
  }

  async findAll() {
    try {
      const users = await this.transactionRepository.find({
        relations: {qrs: true, station:true, destination:true}
      });
      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: users,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} report`;
  }

  update(id: number, updateReportDto: UpdateReportDto) {
    return `This action updates a #${id} report`;
  }

  remove(id: number) {
    return `This action removes a #${id} report`;
  }
}
