import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Station, TransactionQr } from '@spot-demo/shared-entities';
import { Qr } from '@spot-demo/shared-entities';
import { subDays, format } from 'date-fns';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TransactionQr)
    private transactionRepository: Repository<TransactionQr>,

    @InjectRepository(Qr)
    private qrRepository: Repository<Qr>,

    @InjectRepository(Station)
    private stationRepository: Repository<Station>,
  ) { }
  create(createReportDto: CreateReportDto) {
    return 'This action adds a new report';
  }

  // GRAPH STARTS HERE
  async getDashboardAnalytics() {
    const stations = await this.stationRepository.find();
    const currentDate = new Date().toISOString().split('T')[0];

    const transactionData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.station', 'station')
      .select('station.id', 'station_id')
      .addSelect('station.station_name', 'station_name')
      .addSelect('SUM(transaction.amount)', 'total_amount')
      .where('transaction.created_at::date = :currentDate', { currentDate })
      .groupBy('station.id')
      .getRawMany();

    const dashboardAnalytics = stations.map(station => {
      const transaction = transactionData.find(
        txn => txn.station_id === station.id
      );

      return {
        station_id: station.id,
        station_name: station.station_name,
        total_amount: transaction ? Number(transaction.total_amount) : 0
      };
    });

    const sortedAnalytics = dashboardAnalytics.sort((a, b) => a.station_id - b.station_id);

    return {
      status: "success",
      status_code: 200,
      message: "Request was successful",
      data: sortedAnalytics
    };
  }

  async getDashboardAnalyticsByStation(stationId: number) {

    const station = await this.stationRepository.findOne({ where: { id: stationId } });
    if (!station) {
      throw new Error(`Station with ID ${stationId} not found`);
    }

    const currentDate = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(currentDate.getDate() - 6);

    currentDate.setHours(23, 59, 59, 999);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      return `${day}${day % 10 === 1 && day !== 11
          ? 'st'
          : day % 10 === 2 && day !== 12
            ? 'nd'
            : day % 10 === 3 && day !== 13
              ? 'rd'
              : 'th'
        } ${month}`;
    };

    const past7Days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(sevenDaysAgo.getDate() + i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      nextDay.setHours(0, 0, 0, -1);

      const { total_amount } = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(CAST(transaction.amount AS NUMERIC)), 0)', 'total_amount')
        .where('transaction.created_at BETWEEN :day AND :nextDay', {
          day: day.toISOString(),
          nextDay: nextDay.toISOString(),
        })
        .andWhere('transaction.station = :stationId', { stationId })
        .getRawOne();

      past7Days.push({
        date: formatDate(day),
        total_amount: total_amount ? Number(total_amount) : 0,
      });
    }

    return {
      station_id: station.id,
      station_name: station.station_name,
      data: past7Days,
    };
  }
  // GRAPH ENDS HERE

  async findAllMonthlyPagination(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    orderId?: string;
    paymentMode?: string;
    transactionType?: string;
    page?: number;
    limit?: number;
    stationId?: number
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
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
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
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
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
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
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
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
    stationId?: number
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        stationId
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId }
        );
      }
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
      const stations = await this.stationRepository.find({ where: { is_active: true }, order: { id: "ASC" } });

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
