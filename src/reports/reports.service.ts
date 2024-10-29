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

    // transaction data for the current date 
    const transactionData = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.station', 'station')
      .select('station.id', 'station_id')
      .addSelect('station.station_name', 'station_name')
      .addSelect('SUM(transaction.amount)', 'total_amount')
      .addSelect('SUM(transaction.no_of_tickets)', 'total_no_of_tickets')
      .addSelect('SUM(CASE WHEN transaction.payment_mode = \'cash\' THEN transaction.amount ELSE 0 END)', 'total_cash')
      .addSelect('SUM(CASE WHEN transaction.payment_mode IN (\'online\', \'credit_card\', \'upi\') THEN transaction.amount ELSE 0 END)', 'total_online')
      .where('transaction.created_at::date = :currentDate', { currentDate })
      .groupBy('station.id')
      .getRawMany();

    // entry and exit counts for all stations on the current date
    const qrData = await this.qrRepository
      .createQueryBuilder('qr')
      .select('qr.source_id', 'station_id')
      .addSelect('COALESCE(SUM(qr.entry_count), 0)', 'total_entry_count')
      .addSelect('COALESCE(SUM(qr.exit_count), 0)', 'total_exit_count')
      .where('qr.qr_date_time::date = :currentDate', { currentDate })
      .groupBy('qr.source_id')
      .getRawMany();

    const dashboardAnalytics = stations.map(station => {
      const transaction = transactionData.find(
        txn => txn.station_id === station.id
      );

      const entryExitCounts = qrData.find(
        qr => parseInt(qr.station_id, 10) === station.id
      );

      return {
        station_id: station.id,
        station_name: station.station_name,
        total_amount: transaction ? Number(transaction.total_amount) : 0,
        total_no_of_tickets: transaction ? Number(transaction.total_no_of_tickets) : 0,
        total_cash: transaction ? Number(transaction.total_cash) : 0,
        total_online: transaction ? Number(transaction.total_online) : 0,
        total_entry_count: entryExitCounts ? parseInt(entryExitCounts.total_entry_count, 10) : 0,
        total_exit_count: entryExitCounts ? parseInt(entryExitCounts.total_exit_count, 10) : 0,
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
      return `${day}${day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'} ${month}`;
    };

    const past7Days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(sevenDaysAgo);
      day.setDate(sevenDaysAgo.getDate() + i);
      day.setHours(0, 0, 0, 0);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      nextDay.setHours(0, 0, 0, -1);

      // Transaction query for total amount
      const { total_amount, total_no_of_tickets, total_cash, total_online } = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('COALESCE(SUM(transaction.amount), 0)', 'total_amount')
        .addSelect('COALESCE(SUM(CASE WHEN transaction.payment_mode = \'cash\' THEN transaction.amount ELSE 0 END), 0)', 'total_cash')
        .addSelect('COALESCE(SUM(CASE WHEN transaction.payment_mode IN (\'credit_card\', \'upi\') THEN transaction.amount ELSE 0 END), 0)', 'total_online')
        .addSelect('COALESCE(SUM(transaction.no_of_tickets), 0)', 'total_no_of_tickets')
        .where('transaction.created_at BETWEEN :day AND :nextDay', {
          day: day.toISOString(),
          nextDay: nextDay.toISOString(),
        })
        .andWhere('transaction.station = :stationId', { stationId })
        .getRawOne();

      // Qr query for entry and exit counts
      const qrData = await this.qrRepository
        .createQueryBuilder('qr')
        .select('COALESCE(SUM(qr.entry_count), 0)', 'total_entry_count')
        .addSelect('COALESCE(SUM(qr.exit_count), 0)', 'total_exit_count')
        .where('qr.qr_date_time BETWEEN :day AND :nextDay', {
          day: day.toISOString(),
          nextDay: nextDay.toISOString(),
        })
        .andWhere('(qr.source_id = :stationId OR qr.source_id = :stationId)', { stationId })
        .getRawOne();

      past7Days.push({
        date: formatDate(day),
        total_cash: total_cash ? Number(total_cash) : 0,
        total_online: total_online ? Number(total_online) : 0,
        total_amount: total_amount ? Number(total_amount) : 0,
        total_no_of_tickets: total_no_of_tickets ? Number(total_no_of_tickets) : 0,
        total_entry_count: parseInt(qrData.total_entry_count, 10),
        total_exit_count: parseInt(qrData.total_exit_count, 10),
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
