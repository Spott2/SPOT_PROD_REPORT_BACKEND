import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Station, TransactionQr } from '@spot-demo/shared-entities';
import { Qr } from '@spot-demo/shared-entities';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TransactionQr)
    private transactionRepository: Repository<TransactionQr>,

    @InjectRepository(Qr)
    private qrRepository: Repository<Qr>,

    @InjectRepository(Station)
    private stationRepository: Repository<Station>,
  ) {}
  create(createReportDto: CreateReportDto) {
    return 'This action adds a new report';
  }

  async findAllMonthlyPagination(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        page,
        limit,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  async findAllMonthly(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }
  async findAllDailyPagination(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        page,
        limit,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  async findAllDaily(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  async findAllHourlyPagination(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        page,
        limit,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  async findAllHourly(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }
  async findAllPagination(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        page,
        limit,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const offset = (page - 1) * limit;
      queryBuilder.skip(offset).take(limit);

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  async findAll(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id = :orderId', { orderId });
      } else {
        if (fromDate) {
          queryBuilder.andWhere('transaction.created_at >= :fromDate', {
            fromDate,
          });
        }
        if (toDate) {
          queryBuilder.andWhere('transaction.created_at <= :toDate', {
            toDate,
          });
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode = :paymentMode', {
            paymentMode,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type = :transactionType', {
            transactionType,
          });
        }
      }

      const [transactions, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        message: 'Successfully retrieved all transactions',
        data: transactions,
        total,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message,
      };
    }
  }

  // async Ridership() {
  //   try {
  //     const stations = await this.stationRepository.find();
  
  //     const stationData = await Promise.all(
  //       stations.map(async (station) => {
  //         const entryCount = await this.qrRepository
  //           .createQueryBuilder('qr')
  //           .where('qr.source_id = :sourceId', { sourceId: station.id })
  //           .select('SUM(qr.entry_count)', 'totalEntryCount')
  //           .getRawOne();
  
  //         const exitCount = await this.qrRepository
  //           .createQueryBuilder('qr')
  //           .where('qr.destination_id = :destinationId', { destinationId: station.id })
  //           .select('SUM(qr.exit_count)', 'totalExitCount')
  //           .getRawOne();
  
  //         return {
  //           ...station,
  //           entryCount: entryCount.totalEntryCount || 0, 
  //           exitCount: exitCount.totalExitCount || 0,    
  //         };
  //       })
  //     );
  
  //     return {
  //       success: true,
  //       data: stationData,
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: 'Failed to retrieve stations and counts',
  //       error: error.message,
  //     };
  //   }
  // }

  async Ridership(fromDate: Date, toDate: Date) {
    try {
      const stations = await this.stationRepository.find({where: {is_active: true}, order: { id: "ASC" }});
    
      const stationData = await Promise.all(
        stations.map(async (station) => {
          const entryCount = await this.qrRepository
            .createQueryBuilder('qr')
            .where('qr.source_id = :sourceId', { sourceId: station.id })
            .andWhere('qr.created_at BETWEEN :fromDate AND :toDate', { fromDate, toDate })
            .select('SUM(qr.entry_count)', 'totalEntryCount')
            .getRawOne();
    
          const exitCount = await this.qrRepository
            .createQueryBuilder('qr')
            .where('qr.destination_id = :destinationId', { destinationId: station.id })
            .andWhere('qr.created_at BETWEEN :fromDate AND :toDate', { fromDate, toDate })
            .select('SUM(qr.exit_count)', 'totalExitCount')
            .getRawOne();
    
          return {
            ...station,
            entryCount: entryCount.totalEntryCount || 0,
            exitCount: exitCount.totalExitCount || 0,
          };
        })
      );
    
      return {
        success: true,
        data: stationData,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to retrieve stations and counts',
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
