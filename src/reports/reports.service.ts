import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Repository, Between } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Station, TransactionQr } from '@spot-demo/shared-entities';
import { Qr, LoginSession } from '@spot-demo/shared-entities';
import axios from 'axios';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(TransactionQr)
    private transactionRepository: Repository<TransactionQr>,

    @InjectRepository(Qr)
    private qrRepository: Repository<Qr>,

    @InjectRepository(Station)
    private stationRepository: Repository<Station>,

    @InjectRepository(LoginSession)
    private loginSessionRepository: Repository<LoginSession>,
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
      const { fromDate, toDate, orderId, paymentMode, transactionType } =
        queryParams;

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
      const { fromDate, toDate, orderId, paymentMode, transactionType } =
        queryParams;

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
      const { fromDate, toDate, orderId, paymentMode, transactionType } =
        queryParams;

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
      const { fromDate, toDate, orderId, paymentMode, transactionType } =
        queryParams;

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
      const stations = await this.stationRepository.find({
        where: { is_active: true },
        order: { id: 'ASC' },
      });

      const stationData = await Promise.all(
        stations.map(async (station) => {
          const entryCount = await this.qrRepository
            .createQueryBuilder('qr')
            .where('qr.source_id = :sourceId', { sourceId: station.id })
            .andWhere('qr.created_at BETWEEN :fromDate AND :toDate', {
              fromDate,
              toDate,
            })
            .select('SUM(qr.entry_count)', 'totalEntryCount')
            .getRawOne();

          const exitCount = await this.qrRepository
            .createQueryBuilder('qr')
            .where('qr.destination_id = :destinationId', {
              destinationId: station.id,
            })
            .andWhere('qr.created_at BETWEEN :fromDate AND :toDate', {
              fromDate,
              toDate,
            })
            .select('SUM(qr.exit_count)', 'totalExitCount')
            .getRawOne();

          return {
            ...station,
            entryCount: entryCount.totalEntryCount || 0,
            exitCount: exitCount.totalExitCount || 0,
          };
        }),
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

  async getCollectionReportByDate(date, station_id) {
    const deviceTypes = [
      'RCTM-01',
      'RCTM-02',
      'TOM/EFO-01',
      'TOM/EFO-02',
      'TOM/EFO-03',
      'TOM/EFO-11',
      'TOM/EFO-12',
      'TOM/EFO-22',
      'TOM/EFO-41',
      'TOM/EFO-42',
      'TOM/EFO-43',
      'TOM/EFO-44',
      'TVM-01',
      'TVM-02',
      'TVM-03',
      'TVM-04',
      'TVM-11',
      'TVM-12',
      'TVM-13',
      'TVM-14',
      'TVM-15',
      'TVM-16',
    ];
    const paymentTypes = ['cash', 'upi'];
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
    const stations = await this.stationRepository.find({
      select: ['id', 'station_name'],
      order: { id: 'ASC' },
    });

    const stationsArr = [];

    for (const station of stations) {
      if (station_id && station.id !== station_id) {
        continue;
      }

      let stationObj = {
        station_name: station.station_name,
        // cash_total: 0,
        // upi_total: 0,
        date: date,
        device: [],
      };
      const configRes = await axios.get(
        // `${process.env.STATION_BASE_URL}/config-list/find-by-station/${station.station_id}`,
        'http://localhost:8990/inventory/station-devices',
      );

      const stations = configRes.data.data;
      let devices = [];

      for (const station of stations) {
        if (station.equipments && Array.isArray(station.equipments)) {
          const filteredDevices = station.equipments.filter(
            (item) => item.device_name && !item.device_name.includes('AG'),
          );

          devices = [...devices, ...filteredDevices];
        }
      }
      console.log('Filtered devices:', devices);

      for (const el of deviceTypes) {
        let deviceTotal = {
          device_name: el,
          cash: 0,
          upi: 0,
        };
        const device = devices?.find((ele) => ele.device_name == el);

        if (device) {
          const result = await this.transactionRepository
            .createQueryBuilder('transaction')
            .leftJoinAndSelect('transaction.qrs', 'qr')
            .select(
              `SUM(
        CASE
          WHEN transaction.payment_mode = :cash
          THEN ROUND(CAST(transaction.amount AS NUMERIC) / 
            (SELECT COUNT(*) FROM unnest(string_to_array(transaction.status, ',')) AS s) * 
            (SELECT COUNT(*) FROM unnest(string_to_array(transaction.status, ',')) AS s WHERE s IN ('active', 'entry', 'exit')),2)
          ELSE 0
        END
      ) AS cash`,
            )
            .addSelect(
              `SUM(
        CASE
          WHEN transaction.payment_mode = :upi
          THEN ROUND(CAST(transaction.amount AS NUMERIC) / 
            (SELECT COUNT(*) FROM unnest(string_to_array(transaction.status, ',')) AS s) * 
            (SELECT COUNT(*) FROM unnest(string_to_array(transaction.status, ',')) AS s WHERE s IN ('active', 'entry', 'exit')),2)
          ELSE 0
        END
      ) AS upi`,
            )
            .addSelect(
              `SUM(
                CASE
                  WHEN transaction.payment_mode = :cash
                  THEN (
                    SELECT SUM(CAST(COALESCE(NULLIF(qr.admin_fee, ''), '0') AS NUMERIC))
                    FROM qr
                    WHERE qr.transactionId = transaction.id
                  )
                  ELSE 0
                END
              ) AS admin_fee_cash_revenue`,
            )
            .addSelect(
              `SUM(
                CASE
                  WHEN transaction.payment_mode = :upi
                  THEN (
                    SELECT SUM(CAST(COALESCE(NULLIF(qr.admin_fee, ''), '0') AS NUMERIC))
                    FROM qr
                    WHERE qr.transactionId = transaction.id
                  )
                  ELSE 0
                END
              ) AS admin_fee_upi_revenue`,
            )
            .addSelect(
              'SUM(CAST(transaction.no_of_ticket AS NUMERIC))',
              'total_passengers',
            )
            .addSelect(
              'SUM(CAST(transaction.exit_count AS NUMERIC))',
              'total_exit',
            )
            .addSelect(
              'SUM(CAST(transaction.entry_count AS NUMERIC))',
              'total_entry',
            )
            .where('transaction.created_at BETWEEN :start AND :end', {
              start: startDate,
              end: endDate,
              
            })
            // .andWhere('transaction.source_id IS NOT NULL')
            .andWhere('(transaction.source_id = :stationId)', {
              stationId: station.id,
            })
            .andWhere('transaction.station_device_id = :device_id', {
              device_id: device?.device_id,
            })
            .setParameters({
              cash: 'cash',
              upi: 'upi',
            })
            .getRawOne();

          console.log('result', result);

          // const penaltyTransactions = await this.transactionRepository
          //   .createQueryBuilder('ts1')
          //   .innerJoin(
          //     'transaction_station',
          //     'ts2',
          //     'ts1.ref_ticket_no = ts2.order_id',
          //   )
          //   .select(
          //     `ROUND(SUM(CAST(ts2.amount AS NUMERIC) / CAST(ts2.no_of_ticket AS NUMERIC)),2)`,
          //     'penalty_amount',
          //   )
          //   .addSelect(
          //     `ROUND(SUM(CASE WHEN ts2.payment_type = 'upi' THEN CAST(ts2.amount AS NUMERIC) / CAST(ts2.no_of_ticket AS NUMERIC) ELSE 0 END),2)`,
          //     'penalty_upi',
          //   )
          //   .addSelect(
          //     `ROUND(SUM(CASE WHEN ts2.payment_type = 'cash' THEN CAST(ts2.amount AS NUMERIC) / CAST(ts2.no_of_ticket AS NUMERIC) ELSE 0 END),2)`,
          //     'penalty_cash',
          //   )
          //   .where('ts1.order_id ILIKE ANY (:patterns)', {
          //     patterns: ['%FR%', '%PN%'],
          //   })
          //   .andWhere('ts2.created_at BETWEEN :start AND :end', {
          //     start: startDate,
          //     end: endDate,
          //   })
          //   .andWhere('(ts2.source_id = :stationId)', {
          //     stationId: station.id,
          //   })
          //   .andWhere('ts2.station_device_id = :device_id', {
          //     device_id: device?.device_id,
          //   })
          //   .getRawOne();

          deviceTotal.upi =
            parseInt(result.upi || 0) ;
            // parseInt(result?.admin_fee_upi_revenue || 0) +
            // parseInt(penaltyTransactions?.penalty_upi || 0);
          deviceTotal.cash =
            parseInt(result.cash || 0) ;
            // parseInt(result?.admin_fee_cash_revenue || 0) +
            // parseInt(penaltyTransactions?.penalty_cash || 0);
        }
        // stationObj.cash_total = stationObj.cash_total + deviceTotal.cash;
        // stationObj.upi_total = stationObj.upi_total + deviceTotal.upi;

        stationObj.device?.push(deviceTotal);
      }
      stationsArr.push(stationObj);
    }
    return stationsArr;
  }

  async tomShiftReport(date, station_id) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
    const stations = await this.stationRepository.find({
      select: ['id', 'station_name'],
      order: {
        id: 'ASC',
      },
    });

    const stationArr = [];
    for (const station of stations) {
      if (station_id) {
        if (station.id != station_id) {
          continue;
        }
      }

      const stationObj = {
        station_name: station.station_name,
        date: date,
        device: [],
      };

      const shift = await this.loginSessionRepository
        .createQueryBuilder('session')
        .where('session.station_id = :station_id', {
          station_id: station.id,
        })
        .andWhere('session.created_at BETWEEN :start_date AND :end_date', {
          start_date: startDate,
          end_date: endDate,
        })
        .leftJoin('session.user', 'user')
        .select([
          'user.id as operator_id',
          `user.first_name AS first_name`,
          `user.last_name AS last_name`,
          'session.cash_amount as cash_amount',
          'session.upi_amount as upi_amount',
          'session.no_of_tickets as no_of_tickets',
          'session.no_of_tickets_cash as no_of_tickets_cash',
          'session.no_of_tickets_upi as no_of_tickets_upi',
          'session.no_of_refund as no_of_refund',
          'session.total_refund_amount as refund_amount',
          'session.no_of_cancelled as no_of_cancelled',
          'session.total_cancelled_amount as cancelled_amount',
          'session.total_amount as total_amount',
        ])
        .orderBy('session.created_at', 'ASC')
        .getRawMany();

      stationObj.device?.push(...shift);

      stationArr.push(stationObj);
    }

    return stationArr;
  }

  // async getCollectionReportByStationOperator(date, station_id) {
  //   const startDate = new Date(date);
  //   const endDate = new Date(date);
  //   console.log(startDate,"start");
  //   startDate.setUTCHours(0, 0, 0, 0);
  //   endDate.setUTCHours(23, 59, 59, 999);
  //   const stations = await this.stationRepository.find({
  //     select: ['id', 'station_name'],
  //     order: {
  //       id: 'ASC',
  //     },
  //   });

  //   const stationArr = [];
  //   for (const station of stations) {
  //     if (station_id) {
  //       if (station.id != station_id) {
  //         continue;
  //       }
  //     }

  //     const stationObj = {
  //       station_name: station.station_name,
  //       date: date,
  //       devices: [],
  //     };
  //     const shift = await this.loginSessionRepository
  //       .createQueryBuilder('session')
  //       .where('session.station_id = :station_id', {
  //         station_id: station.id,
  //       })
  //       .andWhere('session.created_at BETWEEN :start_date AND :end_date', {
  //         start_date: startDate,
  //         end_date: endDate,
  //       })
  //       .leftJoin('session.user', 'user')
  //       .select([
  //         'user.id as operator_id',
  //         `user.first_name AS first_name`,
  //         `user.last_name AS last_name`,
  //         'CAST(session.cash_amount AS INTEGER)  as cash_amount',
  //         'CAST(session.upi_amount as INTEGER) as upi_amount',
  //         'CAST(session.no_of_tickets AS INTEGER) as no_of_tickets',
  //         'CAST(session.device_id AS INTEGER) as device_id',
  //         'CAST(session.no_of_tickets_cash AS INTEGER) as no_of_tickets_cash',
  //         'CAST(session.no_of_tickets_upi AS INTEGER) as no_of_tickets_upi',
  //         'CAST(session.no_of_refund AS INTEGER) as no_of_refund',
  //         'CAST(session.total_refund_amount AS INTEGER) as refund_amount',
  //         'CAST(session.no_of_cancelled AS INTEGER) as no_of_cancelled',
  //         'CAST(session.total_cancelled_amount AS INTEGER) as cancelled_amount',
  //         'CAST(session.total_amount AS INTEGER) as total_amount',
  //       ])
  //       .orderBy('session.created_at', 'ASC')
  //       .getRawMany();

  //     const shiftsArr = shift.reduce((acc, curr) => {
  //       console.log(acc, curr.device_id);
  //       let index = acc.findIndex((el) => el.device_name === curr.device_id);

  //       if (index !== -1) {
  //         curr.name = `${date} - ${curr.name} - (${curr.operator_id})`;
  //         delete curr.device_id;
  //         delete curr.operator_id;
  //         acc[index].user.push(curr);
  //       } else {
  //         let device_id = curr.device_id;
  //         curr.name = `${date} - ${curr.name} - (${curr.operator_id})`;
  //         delete curr.device_id;
  //         delete curr.operator_id;
  //         acc.push({ device_name: device_id, user: [curr] });
  //       }

  //       return acc;
  //     }, []);

  //     stationObj.devices.push(...shiftsArr);
  //     stationArr.push(stationObj);
  //   }

  //   return stationArr;
  // }

  async getCollectionReportByStationOperator(date, station_id) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const stations = await this.stationRepository.find({
      select: ['id', 'station_name'],
      order: {
        id: 'ASC',
      },
    });

    const stationArr = [];
    for (const station of stations) {
      if (station_id && station.id !== station_id) {
        continue;
      }

      const stationObj = {
        station: station.station_name,
        date: date,
        devices: [],
      };

      const shifts = await this.loginSessionRepository
        .createQueryBuilder('session')
        .where('session.station_id = :station_id', {
          station_id: station.id,
        })
        .andWhere('session.created_at BETWEEN :start_date AND :end_date', {
          start_date: startDate,
          end_date: endDate,
        })
        .leftJoin('session.user', 'user')
        .select([
          'user.id as operator_id',
          `user.first_name AS first_name`,
          `user.last_name AS last_name`,
          'CAST(session.cash_amount AS INTEGER) as cash_amount',
          'CAST(session.upi_amount as INTEGER) as upi_amount',
          'CAST(session.no_of_tickets AS INTEGER) as no_of_tickets',
          'CAST(session.device_id AS INTEGER) as device_id',
          'CAST(session.no_of_tickets_cash AS INTEGER) as no_of_tickets_cash',
          'CAST(session.no_of_tickets_upi AS INTEGER) as no_of_tickets_upi',
          'CAST(session.no_of_refund AS INTEGER) as no_of_refund',
          'CAST(session.total_refund_amount AS INTEGER) as refund_amount',
          'CAST(session.no_of_cancelled AS INTEGER) as no_of_cancelled',
          'CAST(session.total_cancelled_amount AS INTEGER) as cancelled_amount',
          'CAST(session.total_amount AS INTEGER) as total_amount',
        ])
        .orderBy('session.created_at', 'ASC')
        .getRawMany();

      // Map the shifts to individual device entries
      shifts.forEach((shift) => {
        const deviceEntry = {
          device: shift.device_id,
          cash_amount: shift.cash_amount,
          upi_amount: shift.upi_amount,
          no_of_tickets: shift.no_of_tickets,
          no_of_tickets_cash: shift.no_of_tickets_cash,
          no_of_tickets_upi: shift.no_of_tickets_upi,
          no_of_refund: shift.no_of_refund,
          refund_amount: shift.refund_amount,
          no_of_cancelled: shift.no_of_cancelled,
          cancelled_amount: shift.cancelled_amount,
          total_amount: shift.total_amount,
          name: `${date} - ${shift.first_name} ${shift.last_name}`,
        };

        stationObj.devices.push(deviceEntry);
      });

      stationArr.push(stationObj);
    }

    return stationArr.map((station) => ({
      station: station.station,
      date: station.date,
      devices: station.devices,
    }));
  }

  // async getCollectionReportByStation(date, station_id) {
  //   const deviceTypes = [
  //     'RCTM-01',
  //     'RCTM-02',
  //     'TOM/EFO-01',
  //     'TOM/EFO-02',
  //     'TOM/EFO-03',
  //     'TOM/EFO-11',
  //     'TOM/EFO-12',
  //     'TOM/EFO-22',
  //     'TOM/EFO-41',
  //     'TOM/EFO-42',
  //     'TOM/EFO-43',
  //     'TOM/EFO-44',
  //     'TVM-01',
  //     'TVM-02',
  //     'TVM-03',
  //     'TVM-04',
  //     'TVM-11',
  //     'TVM-12',
  //     'TVM-13',
  //     'TVM-14',
  //     'TVM-15',
  //     'TVM-16',
  //   ];
  //   const paymentTypes = ['cash', 'upi'];

  //   const startDate = new Date(date);
  //   const endDate = new Date(date);
  //   startDate.setUTCHours(0, 0, 0, 0);
  //   endDate.setUTCHours(23, 59, 59, 999);

  //   const stations = await this.stationRepository.find({
  //     select: ['id', 'station_name'],
  //     order: { id: 'ASC' },
  //   });

  //   const stationsArr = [];

  //   for (const station of stations) {
  //     if (station_id && station.id !== station_id) {
  //       continue;
  //     }

  //     let stationObj = {
  //       station_name: station.station_name,
  //       date: date,
  //       shifts: [],
  //     };

  //     const configRes = await axios.get(
  //       'http://localhost:8990/inventory/station-devices',
  //     );

  //     const stationsWithFilteredDevices = configRes.data?.data.map(
  //       (station) => {
  //         const filteredEquipments = station.equipments?.filter(
  //           (equipment) => !equipment?.device_name?.includes('AG'),
  //         );
  //         return {
  //           ...station,
  //           equipments: filteredEquipments || [],
  //         };
  //       },
  //     );

  //     const stationDevices = stationsWithFilteredDevices.find(
  //       (s) => s.station_name === station.station_name,
  //     );

  //     for (const deviceType of deviceTypes) {
  //       let deviceTotal = {
  //         device_name: deviceType,
  //         cash: 0,
  //         upi: 0,
  //       };

  //       const device = stationDevices?.equipments.find(
  //         (equipment) => equipment.device_name === deviceType,
  //       );

  //       if (device) {
  //         const sessions = await this.loginSessionRepository.find({
  //           where: {
  //             device_id: device.device_id,
  //             created_at: Between(startDate, endDate),
  //           },
  //           select: [
  //             'device_id',
  //             'user',
  //             'no_of_cancelled',
  //             'no_of_refund',
  //             'total_amount',
  //             'login_time',
  //             'logout_time',
  //             'cash_amount',
  //             'upi_amount',
  //             'no_of_tickets',
  //             'no_of_tickets_cash',
  //             'no_of_tickets_upi',
  //           ],
  //         });

  //         sessions.forEach(
  //           (session) => (session.device_id = device.device_name),
  //         );

  //         sessions.forEach((session, index) => {
  //           let shiftIndex = stationObj.shifts.findIndex(
  //             (shift) => shift.shift_name === `shift ${index + 1}`,
  //           );

  //           if (shiftIndex !== -1) {
  //             stationObj.shifts[shiftIndex].device.push(session);
  //           } else {
  //             stationObj.shifts.push({
  //               shift_name: `shift ${index + 1}`,
  //               device: [session],
  //             });
  //           }
  //         });
  //       }
  //     }

  //     stationsArr.push(stationObj);
  //   }

  //   return stationsArr;
  // }

  async getCollectionReportByStation(date, station_id) {
    const deviceTypes = [
      'RCTM-01',
      'RCTM-02',
      'TOM/EFO-01',
      'TOM/EFO-02',
      'TOM/EFO-03',
      'TOM/EFO-11',
      'TOM/EFO-12',
      'TOM/EFO-22',
      'TOM/EFO-41',
      'TOM/EFO-42',
      'TOM/EFO-43',
      'TOM/EFO-44',
      'TVM-01',
      'TVM-02',
      'TVM-03',
      'TVM-04',
      'TVM-11',
      'TVM-12',
      'TVM-13',
      'TVM-14',
      'TVM-15',
      'TVM-16',
    ];

    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const stations = await this.stationRepository.find({
      select: ['id', 'station_name'],
      order: { id: 'ASC' },
    });

    const stationsArr = [];

    for (const station of stations) {
      if (station_id && station.id !== station_id) {
        continue;
      }

      let stationObj = {
        station_name: station.station_name,
        date: date,
        shifts: [],
      };

      const configRes = await axios.get(
        'http://localhost:8990/inventory/station-devices',
      );
      const stationDevices = configRes.data?.data.find(
        (s) => s.station_name === station.station_name,
      );

      for (const deviceType of deviceTypes) {
        const device = stationDevices?.equipments.find(
          (equipment) => equipment.device_name === deviceType,
        );

        if (device) {
          const sessions = await this.loginSessionRepository.find({
            where: {
              device_id: device.device_id,
              created_at: Between(startDate, endDate),
            },
            select: [
              'device_id',
              'shift_id',
              'user',
              'no_of_cancelled',
              'no_of_refund',
              'total_amount',
              'login_time',
              'logout_time',
              'cash_amount',
              'upi_amount',
              'no_of_tickets',
              'no_of_tickets_cash',
              'no_of_tickets_upi',
            ],
          });

          sessions.forEach((session, index) => {
            let shift = {
              name: `Shift ${index + 1}`,
              shift_id: session.shift_id,
              device_id: device.device_name,
              total_amount: session.total_amount,
              cash_amount: session.cash_amount,
              upi_amount: session.upi_amount,
              no_of_tickets: session.no_of_tickets,
              no_of_tickets_cash: session.no_of_tickets_cash,
              no_of_tickets_upi: session.no_of_tickets_upi,
              no_of_refund: session.no_of_refund,
              no_of_cancelled: session.no_of_cancelled,
              login_time: session.login_time,
              logout_time: session.logout_time,
            };

            stationObj.shifts.push(shift);
          });
        }
      }

      stationsArr.push(stationObj);
    }

    return stationsArr;
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
