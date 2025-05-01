import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Repository, Between, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Equipment,
  Penalty,
  Station,
  TransactionQr,
} from '@spot-demo-v2/shared-entities';
import { Qr, LoginSession } from '@spot-demo-v2/shared-entities';
import axios from 'axios';
import { LoginSessionInput } from './commonTypes';
import {
  subDays,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

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

    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,

    @InjectRepository(Penalty)
    private penaltyRepository: Repository<Penalty>,
  ) {}
  create(createReportDto: CreateReportDto) {
    return 'This action adds a new report';
  }

  async getDashboardAnalytics() {
    const stations = await this.stationRepository.find();
    const currentDate = new Date().toISOString().split('T')[0];

    // const transactionData = await this.transactionRepository
    //   .createQueryBuilder('transaction')
    //   .leftJoin('transaction.station', 'station')
    //   .select('station.id', 'station_id')
    //   .addSelect('station.station_name', 'station_name')
    //   .addSelect('SUM(transaction.amount)', 'total_amount')
    //   .addSelect('SUM(transaction.no_of_tickets)', 'total_no_of_tickets')
    //   .addSelect(
    //     "SUM(CASE WHEN transaction.payment_mode ILIKE 'cash' THEN transaction.amount ELSE 0 END)",
    //     'total_cash',
    //   )
    //   .addSelect(
    //     `
    //     SUM(CASE
    //         WHEN transaction.payment_mode ILIKE 'online' OR
    //              transaction.payment_mode ILIKE 'credit_card' OR
    //              transaction.payment_mode ILIKE 'upi'
    //         THEN transaction.amount
    //         ELSE 0
    //     END)
    //     `,
    //     'total_online',
    //   )
    //   .where(
    //     `(
    //       (transaction.extended_time IS NOT NULL AND transaction.extended_time::date = :currentDate)
    //       OR
    //       (transaction.extended_time IS NULL AND transaction.created_at::date = :currentDate)
    //     )`,
    //     { currentDate },
    //   )

    //   .groupBy('station.id')
    //   .getRawMany();

    const qrData = await this.qrRepository
      .createQueryBuilder('qr')
      .select('qr.source_id', 'station_id')
      .addSelect('COALESCE(SUM(qr.entry_count), 0)', 'total_entry_count')
      .addSelect('COALESCE(SUM(qr.exit_count), 0)', 'total_exit_count')
      .addSelect('COUNT(*)', 'total_no_of_tickets')

      .addSelect(
        `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref
            WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' THEN original.admin_fee
                  ELSE original.amount
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )

            -- PENALTY: current + ref
            WHEN qr.type = 'PENALTY' THEN (
              (CASE
                WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                ELSE qr.amount
              END) +
              (SELECT
                CASE
                  WHEN original.status = 'REFUNDED' THEN original.admin_fee
                  ELSE original.amount
                END
               FROM qr AS original
               WHERE original.id = qr.ref_ticket_no)
            )

            -- REFUNDED: regular ticket
            WHEN qr.status = 'REFUNDED' THEN qr.admin_fee

            ELSE qr.amount
          END
        )
        `,
        'total_amount',
      )

      .addSelect(
        `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref if cash
            WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                  ELSE 0
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )

            -- PENALTY: both current and ref if both are cash
            WHEN qr.type = 'PENALTY' AND qr.payment_mode ILIKE 'cash' THEN (
              (CASE
                WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                ELSE qr.amount
              END) +
              (SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                  ELSE 0
                END
               FROM qr AS original
               WHERE original.id = qr.ref_ticket_no)
            )

            WHEN qr.status = 'REFUNDED' AND qr.payment_mode ILIKE 'cash' THEN qr.admin_fee
            WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount

            ELSE 0
          END
        )
        `,
        'total_cash',
      )
      .addSelect(
        `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref if online
            WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND (
                    original.payment_mode ILIKE 'online' OR
                    original.payment_mode ILIKE 'credit_card' OR
                    original.payment_mode ILIKE 'upi'
                  ) THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'online' OR
                       original.payment_mode ILIKE 'credit_card' OR
                       original.payment_mode ILIKE 'upi' THEN original.amount
                  ELSE 0
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )

            -- PENALTY: add current + ref if both are online-like
            WHEN qr.type = 'PENALTY' AND (
              qr.payment_mode ILIKE 'online' OR qr.payment_mode ILIKE 'credit_card' OR qr.payment_mode ILIKE 'upi'
            ) THEN (
              (CASE
                WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                ELSE qr.amount
              END) +
              (SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND (
                    original.payment_mode ILIKE 'online' OR
                    original.payment_mode ILIKE 'credit_card' OR
                    original.payment_mode ILIKE 'upi'
                  ) THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'online' OR
                       original.payment_mode ILIKE 'credit_card' OR
                       original.payment_mode ILIKE 'upi' THEN original.amount
                  ELSE 0
                END
               FROM qr AS original
               WHERE original.id = qr.ref_ticket_no)
            )

            WHEN qr.status = 'REFUNDED' AND (
              qr.payment_mode ILIKE 'online' OR
              qr.payment_mode ILIKE 'credit_card' OR
              qr.payment_mode ILIKE 'upi'
            ) THEN qr.admin_fee

            WHEN qr.payment_mode ILIKE 'online' OR
                 qr.payment_mode ILIKE 'credit_card' OR
                 qr.payment_mode ILIKE 'upi' THEN qr.amount

            ELSE 0
          END
        )
        `,
        'total_online',
      )

      .where(
        `(
          (qr.extended_time IS NOT NULL AND qr.extended_time::date = :currentDate)
          OR
          (qr.extended_time IS NULL AND qr.qr_date_time::date = :currentDate)
        )`,
        { currentDate },
      )

      .groupBy('qr.source_id')
      .getRawMany();

    console.log(qrData, 'transactionData');

    const dashboardAnalytics = stations.map((station) => {
      const transaction = qrData.find((txn) => txn.station_id === station.id);

      const entryExitCounts = qrData.find(
        (qr) => parseInt(qr.station_id, 10) === station.id,
      );

      return {
        station_id: station.id,
        station_name: station.station_name,
        total_amount: transaction ? Number(transaction.total_amount) : 0,
        total_no_of_tickets: transaction
          ? Number(transaction.total_no_of_tickets)
          : 0,
        total_cash: transaction ? Number(transaction.total_cash) : 0,
        total_online: transaction ? Number(transaction.total_online) : 0,
        total_entry_count: entryExitCounts
          ? parseInt(entryExitCounts.total_entry_count, 10)
          : 0,
        total_exit_count: entryExitCounts
          ? parseInt(entryExitCounts.total_exit_count, 10)
          : 0,
      };
    });

    const sortedAnalytics = dashboardAnalytics.sort(
      (a, b) => a.station_id - b.station_id,
    );

    return {
      status: 'success',
      status_code: 200,
      message: 'Request was successful',
      data: sortedAnalytics,
    };
  }

  async getDashboardAnalyticsByStation(stationId: number) {
    const station = await this.stationRepository.findOne({
      where: { id: stationId },
    });
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
      // console.log(day, nextDay, 'scvsdvcewcv');

      // Transaction query for total amount
      // const { total_amount, total_no_of_tickets, total_cash, total_online } =
      //   await this.transactionRepository
      //     .createQueryBuilder('transaction')
      //     .select('COALESCE(SUM(transaction.amount), 0)', 'total_amount')
      //     .addSelect(
      //       "COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'cash' THEN transaction.amount ELSE 0 END), 0)",
      //       'total_cash',
      //     )
      //     .addSelect(
      //       `
      //       SUM(CASE
      //           WHEN transaction.payment_mode ILIKE 'online' OR
      //                transaction.payment_mode ILIKE 'credit_card' OR
      //                transaction.payment_mode ILIKE 'upi'
      //           THEN transaction.amount
      //           ELSE 0
      //       END)
      //       `,
      //       'total_online',
      //     )

      //     .addSelect(
      //       'COALESCE(SUM(transaction.no_of_tickets), 0)',
      //       'total_no_of_tickets',
      //     )
      //     // .where('transaction.created_at BETWEEN :day AND :nextDay', {
      //     //   day: day.toISOString(),
      //     //   nextDay: nextDay.toISOString(),
      //     // })

      //     .where(
      //       `(
      //         (transaction.extended_time IS NOT NULL AND transaction.extended_time BETWEEN :day AND :nextDay)
      //         OR
      //         (transaction.extended_time IS NULL AND transaction.created_at BETWEEN :day AND :nextDay)
      //       )`,
      //       {
      //         day: day.toISOString(),
      //         nextDay: nextDay.toISOString(),
      //       },
      //     )

      //     .andWhere('transaction.station = :stationId', { stationId })
      //     .getRawOne();

      // Qr query for entry and exit counts
      const qrData = await this.qrRepository
        .createQueryBuilder('qr')
        // .select('COALESCE(SUM(qr.entry_count), 0)', 'total_entry_count')
        // .addSelect('COALESCE(SUM(qr.exit_count), 0)', 'total_exit_count')

        .select('COUNT(*)', 'total_no_of_tickets')

        .addSelect(
          `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

            -- DUPLICATE: only ref
            WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN qr.amount

            -- REFUNDED: regular ticket
            WHEN qr.status = 'REFUNDED' THEN qr.admin_fee

            ELSE qr.amount
          END
        )
        `,
          'total_amount',
        )

        .addSelect(
          `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

            -- DUPLICATE: only ref if cash
            WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN
            CASE
              WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount
              ELSE 0
            END

            WHEN qr.status = 'REFUNDED' AND qr.payment_mode ILIKE 'cash' THEN qr.admin_fee
            WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount

            ELSE 0
          END
        )
        `,
          'total_cash',
        )
        .addSelect(
          `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

            -- DUPLICATE: only ref if online
            WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN
              CASE
                WHEN qr.payment_mode ILIKE 'online'
                  OR qr.payment_mode ILIKE 'credit_card'
                  OR qr.payment_mode ILIKE 'upi' THEN qr.amount
                ELSE 0
              END

            WHEN qr.status = 'REFUNDED' AND (
              qr.payment_mode ILIKE 'online' OR
              qr.payment_mode ILIKE 'credit_card' OR
              qr.payment_mode ILIKE 'upi'
            ) THEN qr.admin_fee

            WHEN qr.payment_mode ILIKE 'online' OR
                 qr.payment_mode ILIKE 'credit_card' OR
                 qr.payment_mode ILIKE 'upi' THEN qr.amount

            ELSE 0
          END
        )
        `,
          'total_online',
        )
        // .where('qr.qr_date_time BETWEEN :day AND :nextDay', {
        //   day: day.toISOString(),
        //   nextDay: nextDay.toISOString(),
        // })

        .where(
          `(
            (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :day AND :nextDay)
            OR
            (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :day AND :nextDay)
          )`,
          {
            day: day.toISOString(),
            nextDay: nextDay.toISOString(),
          },
        )

        .andWhere('(qr.source_id = :stationId OR qr.source_id = :stationId)', {
          stationId,
        })
        .setParameter('stationId', stationId)
        .getRawOne();

      const qrDataForEntryExit = await this.qrRepository
        .createQueryBuilder('qr')
        .select(
          `
          COALESCE(SUM(
            CASE
              WHEN qr.entry_station_id = :stationId THEN qr.entry_count
              ELSE 0
            END
          ), 0)
          `,
          'total_entry_count',
        )
        .addSelect(
          `
          COALESCE(SUM(
            CASE
              WHEN qr.exit_station_id = :stationId THEN qr.exit_count
              ELSE 0
            END
          ), 0)
          `,
          'total_exit_count',
        )
        .where(
          `(
            (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :day AND :nextDay)
            OR
            (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :day AND :nextDay)
          )`,
          {
            day: day.toISOString(),
            nextDay: nextDay.toISOString(),
          },
        )

        .andWhere(
          '(qr.entry_station_id = :stationId OR qr.exit_station_id = :stationId)',
          {
            stationId,
          },
        )
        .setParameter('stationId', stationId)
        .getRawOne();

      console.log(qrDataForEntryExit, 'qrDataForEntryExit');
      past7Days.push({
        date: formatDate(day),
        total_cash: qrData.total_cash ? Number(qrData.total_cash) : 0,
        total_online: qrData.total_online ? Number(qrData.total_online) : 0,
        total_amount: qrData.total_amount ? Number(qrData.total_amount) : 0,
        total_no_of_tickets: qrData.total_no_of_tickets
          ? Number(qrData.total_no_of_tickets)
          : 0,
        total_entry_count:
          parseInt(qrDataForEntryExit.total_entry_count, 10) || 0,
        total_exit_count:
          parseInt(qrDataForEntryExit.total_exit_count, 10) || 0,
      });
    }

    return {
      station_id: station.id,
      station_name: station.station_name,
      data: past7Days,
    };
  }
  // GRAPH ENDS HERE

  async getDashboardAnalyticsForToday() {
    const currentDate = new Date();

    // Adjust for Indian Standard Time (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // Offset in milliseconds
    const istStartOfDay = new Date(currentDate.getTime() + istOffset);
    istStartOfDay.setUTCHours(0, 0, 0, 0); // Start of the day in IST

    const istEndOfDay = new Date(istStartOfDay);
    istEndOfDay.setUTCHours(23, 59, 59, 999); // End of the day in IST

    const formatDate = (date: Date) => {
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      return `${day}${day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th'} ${month}`;
    };

    const stations = await this.stationRepository.find(); // Fetch all stations

    const todayData = await Promise.all(
      stations.map(async (station) => {
        // Transaction query for total amount
        // const { total_amount, total_no_of_tickets, total_cash, total_online } =
        //   await this.transactionRepository
        //     .createQueryBuilder('transaction')
        //     .select('COALESCE(SUM(transaction.amount), 0)', 'total_amount')
        //     .addSelect(
        //       "COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'cash' THEN transaction.amount ELSE 0 END), 0)",
        //       'total_cash',
        //     )
        //     .addSelect(
        //       `
        //       SUM(CASE
        //           WHEN transaction.payment_mode ILIKE 'online' OR
        //                transaction.payment_mode ILIKE 'credit_card' OR
        //                transaction.payment_mode ILIKE 'upi'
        //           THEN transaction.amount
        //           ELSE 0
        //       END)
        //       `,
        //       'total_online',
        //     )
        //     .addSelect(
        //       'COALESCE(SUM(transaction.no_of_tickets), 0)',
        //       'total_no_of_tickets',
        //     )
        //     // .where('transaction.created_at BETWEEN :start AND :end', {
        //     //   start: istStartOfDay.toISOString(),
        //     //   end: istEndOfDay.toISOString(),
        //     // })

        //     .where(
        //       `(
        //         (transaction.extended_time IS NOT NULL AND transaction.extended_time BETWEEN :start AND :end)
        //         OR
        //         (transaction.extended_time IS NULL AND transaction.created_at BETWEEN :start AND :end)
        //       )`,
        //       {
        //         start: istStartOfDay.toISOString(),
        //         end: istEndOfDay.toISOString(),
        //       },
        //     )

        //     .andWhere('transaction.station = :stationId', {
        //       stationId: station.id,
        //     })
        //     .getRawOne();

        // Qr query for entry and exit counts
        const qrData = await this.qrRepository
          .createQueryBuilder('qr')
          .select('COALESCE(SUM(qr.entry_count), 0)', 'total_entry_count')
          .addSelect('COALESCE(SUM(qr.exit_count), 0)', 'total_exit_count')
          .addSelect('COUNT(*)', 'total_no_of_tickets')

          .addSelect(
            `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

            -- DUPLICATE: only ref
            WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' THEN original.admin_fee
                  ELSE original.amount
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )


            -- REFUNDED: regular ticket
            WHEN qr.status = 'REFUNDED' THEN qr.admin_fee

            ELSE qr.amount
          END
        )
        `,
            'total_amount',
          )

          .addSelect(
            `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

            -- DUPLICATE: only ref if cash
            WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                  ELSE 0
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )



            WHEN qr.status = 'REFUNDED' AND qr.payment_mode ILIKE 'cash' THEN qr.admin_fee
            WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount

            ELSE 0
          END
        )
        `,
            'total_cash',
          )
          .addSelect(
            `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref if online
            WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND (
                    original.payment_mode ILIKE 'online' OR
                    original.payment_mode ILIKE 'credit_card' OR
                    original.payment_mode ILIKE 'upi'
                  ) THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'online' OR
                       original.payment_mode ILIKE 'credit_card' OR
                       original.payment_mode ILIKE 'upi' THEN original.amount
                  ELSE 0
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )


            WHEN qr.status = 'REFUNDED' AND (
              qr.payment_mode ILIKE 'online' OR
              qr.payment_mode ILIKE 'credit_card' OR
              qr.payment_mode ILIKE 'upi'
            ) THEN qr.admin_fee

            WHEN qr.payment_mode ILIKE 'online' OR
                 qr.payment_mode ILIKE 'credit_card' OR
                 qr.payment_mode ILIKE 'upi' THEN qr.amount

            ELSE 0
          END
        )
        `,
            'total_online',
          )
          // .where('qr.qr_date_time BETWEEN :start AND :end', {
          //   start: istStartOfDay.toISOString(),
          //   end: istEndOfDay.toISOString(),
          // })

          .where(
            `(
              (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :start AND :end)
              OR
              (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :start AND :end)
            )`,
            {
              start: istStartOfDay.toISOString(),
              end: istEndOfDay.toISOString(),
            },
          )

          .andWhere(
            '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
            {
              stationId: station.id,
            },
          )
          .getRawOne();

        return {
          station_id: station.id,
          station_name: station.station_name,
          date: formatDate(istStartOfDay),
          total_cash: qrData?.total_cash ? Number(qrData.total_cash) : 0,
          total_online: qrData?.total_online ? Number(qrData.total_online) : 0,
          total_amount: qrData?.total_amount ? Number(qrData.total_amount) : 0,
          total_no_of_tickets: qrData?.total_no_of_tickets
            ? Number(qrData?.total_no_of_tickets)
            : 0,
          total_entry_count: parseInt(qrData.total_entry_count, 10),
          total_exit_count: parseInt(qrData.total_exit_count, 10),
        };
      }),
    );

    return todayData;
  }

  async getDashboardAnalyticsMonthly() {
    let stations: any[] = [];

    stations = await this.stationRepository.find({
      select: ['id', 'station_name'],
    });

    const responseData: any[] = [];

    const timezone = 'Asia/Kolkata';
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    for (let month = 0; month < 12; month++) {
      const startOfMonthDate = startOfMonth(new Date(currentYear, month));
      const endOfMonthDate = endOfMonth(new Date(currentYear, month));

      const start = new Date(startOfMonthDate);
      const end = new Date(endOfMonthDate);

      // const { total_amount, total_no_of_tickets, total_cash, total_online } =
      //   await this.transactionRepository
      //     .createQueryBuilder('transaction')
      //     .select('COALESCE(SUM(transaction.amount), 0)', 'total_amount')
      //     .addSelect(
      //       "COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'cash' THEN transaction.amount ELSE 0 END), 0)",
      //       'total_cash',
      //     )
      //     .addSelect(
      //       `
      //       SUM(CASE
      //           WHEN transaction.payment_mode ILIKE 'online' OR
      //                transaction.payment_mode ILIKE 'credit_card' OR
      //                transaction.payment_mode ILIKE 'upi'
      //           THEN transaction.amount
      //           ELSE 0
      //       END)
      //       `,
      //       'total_online',
      //     )
      //     .addSelect(
      //       'COALESCE(SUM(transaction.no_of_tickets), 0)',
      //       'total_no_of_tickets',
      //     )
      //     // .where('transaction.created_at BETWEEN :start AND :end', {
      //     //   start: start.toISOString(),
      //     //   end: end.toISOString(),
      //     // })

      //     .where(
      //       `(
      //         (transaction.extended_time IS NOT NULL AND transaction.extended_time BETWEEN :start AND :end)
      //         OR
      //         (transaction.extended_time IS NULL AND transaction.created_at BETWEEN :start AND :end)
      //       )`,
      //       { start: start.toISOString(), end: end.toISOString() },
      //     )

      //     .getRawOne();

      const qrData = await this.qrRepository
        .createQueryBuilder('qr')
        .select('COALESCE(SUM(qr.entry_count), 0)', 'total_entry_count')
        .addSelect('COALESCE(SUM(qr.exit_count), 0)', 'total_exit_count')
        .addSelect('COUNT(*)', 'total_no_of_tickets')

        .addSelect(
          `
          SUM(
            CASE
              WHEN qr.status = 'CANCELLED' THEN 0

              -- DUPLICATE: only ref
              WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
                SELECT
                  CASE
                    WHEN original.status = 'REFUNDED' THEN original.admin_fee
                    ELSE original.amount
                  END
                FROM qr AS original
                WHERE original.id = qr.ref_ticket_no
              )

              -- PENALTY: current + ref
              WHEN qr.type = 'PENALTY' THEN (
                (CASE
                  WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                  ELSE qr.amount
                END) +
                (SELECT
                  CASE
                    WHEN original.status = 'REFUNDED' THEN original.admin_fee
                    ELSE original.amount
                  END
                 FROM qr AS original
                 WHERE original.id = qr.ref_ticket_no)
              )

              -- REFUNDED: regular ticket
              WHEN qr.status = 'REFUNDED' THEN qr.admin_fee

              ELSE qr.amount
            END
          )
          `,
          'total_amount',
        )

        .addSelect(
          `
          SUM(
            CASE
              WHEN qr.status = 'CANCELLED' THEN 0

              -- DUPLICATE: only ref if cash
              WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
                SELECT
                  CASE
                    WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                    WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                    ELSE 0
                  END
                FROM qr AS original
                WHERE original.id = qr.ref_ticket_no
              )

              -- PENALTY: both current and ref if both are cash
              WHEN qr.type = 'PENALTY' AND qr.payment_mode ILIKE 'cash' THEN (
                (CASE
                  WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                  ELSE qr.amount
                END) +
                (SELECT
                  CASE
                    WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                    WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                    ELSE 0
                  END
                 FROM qr AS original
                 WHERE original.id = qr.ref_ticket_no)
              )

              WHEN qr.status = 'REFUNDED' AND qr.payment_mode ILIKE 'cash' THEN qr.admin_fee
              WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount

              ELSE 0
            END
          )
          `,
          'total_cash',
        )
        .addSelect(
          `
          SUM(
            CASE
              WHEN qr.status = 'CANCELLED' THEN 0

              -- DUPLICATE: only ref if online
              WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
                SELECT
                  CASE
                    WHEN original.status = 'REFUNDED' AND (
                      original.payment_mode ILIKE 'online' OR
                      original.payment_mode ILIKE 'credit_card' OR
                      original.payment_mode ILIKE 'upi'
                    ) THEN original.admin_fee
                    WHEN original.payment_mode ILIKE 'online' OR
                         original.payment_mode ILIKE 'credit_card' OR
                         original.payment_mode ILIKE 'upi' THEN original.amount
                    ELSE 0
                  END
                FROM qr AS original
                WHERE original.id = qr.ref_ticket_no
              )

              -- PENALTY: add current + ref if both are online-like
              WHEN qr.type = 'PENALTY' AND (
                qr.payment_mode ILIKE 'online' OR qr.payment_mode ILIKE 'credit_card' OR qr.payment_mode ILIKE 'upi'
              ) THEN (
                (CASE
                  WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                  ELSE qr.amount
                END) +
                (SELECT
                  CASE
                    WHEN original.status = 'REFUNDED' AND (
                      original.payment_mode ILIKE 'online' OR
                      original.payment_mode ILIKE 'credit_card' OR
                      original.payment_mode ILIKE 'upi'
                    ) THEN original.admin_fee
                    WHEN original.payment_mode ILIKE 'online' OR
                         original.payment_mode ILIKE 'credit_card' OR
                         original.payment_mode ILIKE 'upi' THEN original.amount
                    ELSE 0
                  END
                 FROM qr AS original
                 WHERE original.id = qr.ref_ticket_no)
              )

              WHEN qr.status = 'REFUNDED' AND (
                qr.payment_mode ILIKE 'online' OR
                qr.payment_mode ILIKE 'credit_card' OR
                qr.payment_mode ILIKE 'upi'
              ) THEN qr.admin_fee

              WHEN qr.payment_mode ILIKE 'online' OR
                   qr.payment_mode ILIKE 'credit_card' OR
                   qr.payment_mode ILIKE 'upi' THEN qr.amount

              ELSE 0
            END
          )
          `,
          'total_online',
        )
        .where('qr.qr_date_time BETWEEN :start AND :end', {
          start: start.toISOString(),
          end: end.toISOString(),
        })
        .getRawOne();

      const formattedMonthYear = `${start
        .toLocaleString('default', { month: 'short' })
        .toUpperCase()}-${String(currentYear).slice(2)}`;

      responseData.push({
        month_year: formattedMonthYear,
        total_cash: qrData?.total_cash ? Number(qrData?.total_cash) : 0,
        total_online: qrData?.total_online ? Number(qrData?.total_online) : 0,
        total_amount: qrData?.total_amount ? Number(qrData?.total_amount) : 0,
        total_no_of_tickets: qrData?.total_no_of_tickets
          ? Number(qrData?.total_no_of_tickets)
          : 0,
        // total_entry_count: parseInt(qrData.total_entry_count, 10),
        // total_exit_count: parseInt(qrData.total_exit_count, 10),
      });
    }

    return {
      status: 'success',
      status_code: 200,
      message: 'Request was successful',
      data: responseData,
    };
  }

  async getDashboardAnalyticsByStationDaily(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
    page?: number;
    limit?: number;
  }) {
    const {
      fromDate,
      toDate,
      paymentModes,
      transactionTypes,
      deviceTypes,
      deviceIds,
      stations: stationIds,
      page,
      limit,
    } = queryParams;

    let stations: any[] = [];

    if (stationIds && stationIds.length > 0) {
      stations = await this.stationRepository.find({
        where: { id: In(stationIds) },
        select: ['id', 'station_name'],
        order: {
          id: 'ASC',
        },
      });
    } else {
      stations = await this.stationRepository.find({
        select: ['id', 'station_name'],
        order: {
          id: 'ASC',
        },
      });
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error(
        'Invalid date format. Use ISO format for fromDate and toDate.',
      );
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const responseData = [];

    for (const currentStation of stations) {
      const qrAmountQuery = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .select('COUNT(*)', 'total_no_of_tickets')
        .addSelect(
          `
          SUM(
            CASE
              WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

              -- DUPLICATE: only ref
              WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN qr.amount

              -- REFUNDED: regular ticket
              WHEN qr.status = 'REFUNDED' THEN qr.admin_fee

              ELSE qr.amount
            END
          )
          `,
          'total_amount',
        )

        .addSelect(
          `
          SUM(
            CASE
              WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

              -- DUPLICATE: only ref if cash
              WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN
              CASE
                WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount
                ELSE 0
              END

              WHEN qr.status = 'REFUNDED' AND qr.payment_mode ILIKE 'cash' THEN qr.admin_fee
              WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount

              ELSE 0
            END
          )
          `,
          'total_cash',
        )
        .addSelect(
          `
          SUM(
            CASE
              WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0

              -- DUPLICATE: only ref if online
              WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN
                CASE
                  WHEN qr.payment_mode ILIKE 'online'
                    OR qr.payment_mode ILIKE 'credit_card'
                    OR qr.payment_mode ILIKE 'upi' THEN qr.amount
                  ELSE 0
                END

              WHEN qr.status = 'REFUNDED' AND (
                qr.payment_mode ILIKE 'online' OR
                qr.payment_mode ILIKE 'credit_card' OR
                qr.payment_mode ILIKE 'upi'
              ) THEN qr.admin_fee

              WHEN qr.payment_mode ILIKE 'online' OR
                   qr.payment_mode ILIKE 'credit_card' OR
                   qr.payment_mode ILIKE 'upi' THEN qr.amount

              ELSE 0
            END
          )
          `,
          'total_online',
        )
        .where(
          `(
            (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :start AND :end)
            OR
            (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :start AND :end)
          )`,
          {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        )

        .andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId: currentStation.id },
        );

      if (paymentModes && paymentModes.length > 0) {
        qrAmountQuery.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }
      if (transactionTypes && transactionTypes.length > 0) {
        qrAmountQuery.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        qrAmountQuery.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        qrAmountQuery.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((type) => type.toLowerCase()),
          },
        );
      }

      const qrData = await qrAmountQuery.getRawOne();

      const qrQueryForEntryExit = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .select(
          `
        COALESCE(SUM(
          CASE
            WHEN qr.entry_station_id = :stationId THEN qr.entry_count
            ELSE 0
          END
        ), 0)
        `,
          'total_entry_count',
        )
        .addSelect(
          `
        COALESCE(SUM(
          CASE
            WHEN qr.exit_station_id = :stationId THEN qr.exit_count
            ELSE 0
          END
        ), 0)
        `,
          'total_exit_count',
        )
        .where(
          `(
          (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :start AND :end)
          OR
          (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :start AND :end)
        )`,
          {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        )

        .andWhere(
          '(qr.entry_station_id = :stationId OR qr.exit_station_id = :stationId)',
          {
            stationId: currentStation.id,
          },
        )
        .setParameter('stationId', currentStation.id);

      if (paymentModes && paymentModes.length > 0) {
        qrQueryForEntryExit.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }
      if (transactionTypes && transactionTypes.length > 0) {
        qrQueryForEntryExit.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        qrQueryForEntryExit.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        qrQueryForEntryExit.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((type) => type.toLowerCase()),
          },
        );
      }

      const qrDataForEntryExit = await qrQueryForEntryExit.getRawOne();

      responseData.push({
        station_id: currentStation.id,
        station_name: currentStation.station_name,
        total_cash: qrData?.total_cash ? Number(qrData?.total_cash) : 0,
        total_online: qrData?.total_online ? Number(qrData?.total_online) : 0,
        total_amount: qrData?.total_amount ? Number(qrData?.total_amount) : 0,
        total_no_of_tickets: qrData?.total_no_of_tickets
          ? Number(qrData?.total_no_of_tickets)
          : 0,
        total_entry_count:
          parseInt(qrDataForEntryExit.total_entry_count, 10) || 0,
        total_exit_count:
          parseInt(qrDataForEntryExit.total_exit_count, 10) || 0,
      });
    }

    return responseData;
  }

  async getDashboardAnalyticsAllStation() {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);

    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const startDate = new Date(start.getTime() + IST_OFFSET);
    const endDate = new Date(end.getTime() + IST_OFFSET);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const allDates = eachDayOfInterval({
      start: startOfMonth(today),
      end: endOfMonth(today),
    });

    // const dailyRevenue = await this.transactionRepository
    //   .createQueryBuilder('transaction')
    //   .select([
    //     'DATE(transaction.created_at) AS date',
    //     'COALESCE(SUM(transaction.amount), 0) AS total_amount',
    //     "COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'cash' THEN transaction.amount ELSE 0 END), 0) AS total_cash",
    //     `COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'credit_card'
    //       OR transaction.payment_mode ILIKE 'upi'
    //       OR transaction.payment_mode ILIKE 'online'
    //       THEN transaction.amount
    //       ELSE 0 END), 0) AS total_online`,
    //   ])
    //   // .where('transaction.created_at BETWEEN :start AND :end', {
    //   //   start: startDate.toISOString(),
    //   //   end: endDate.toISOString(),
    //   // })

    //   .where(
    //     `(
    //       (transaction.extended_time IS NOT NULL AND transaction.extended_time BETWEEN :start AND :end)
    //       OR
    //       (transaction.extended_time IS NULL AND transaction.created_at BETWEEN :start AND :end)
    //     )`,
    //     { start: startDate.toISOString(), end: endDate.toISOString() },
    //   )

    //   .groupBy('DATE(transaction.created_at)')
    //   .orderBy('DATE(transaction.created_at)', 'ASC')
    //   .getRawMany();

    // const dailyRevenue = await this.transactionRepository
    //   .createQueryBuilder('transaction')
    //   .select([
    //     `COALESCE(
    //   DATE(transaction.extended_time),
    //   DATE(transaction.created_at)
    // ) AS date`,
    //     'COALESCE(SUM(transaction.amount), 0) AS total_amount',
    //     "COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'cash' THEN transaction.amount ELSE 0 END), 0) AS total_cash",
    //     `COALESCE(SUM(CASE WHEN transaction.payment_mode ILIKE 'credit_card'
    //   OR transaction.payment_mode ILIKE 'upi'
    //   OR transaction.payment_mode ILIKE 'online'
    //   THEN transaction.amount
    //   ELSE 0 END), 0) AS total_online`,
    //   ])
    //   .where(
    //     `(
    //   (transaction.extended_time IS NOT NULL AND transaction.extended_time BETWEEN :start AND :end)
    //   OR
    //   (transaction.extended_time IS NULL AND transaction.created_at BETWEEN :start AND :end)
    // )`,
    //     { start: startDate.toISOString(), end: endDate.toISOString() },
    //   )
    //   .groupBy(
    //     `COALESCE(DATE(transaction.extended_time), DATE(transaction.created_at))`,
    //   )
    //   .orderBy(
    //     `COALESCE(DATE(transaction.extended_time), DATE(transaction.created_at))`,
    //     'ASC',
    //   )
    //   .getRawMany();
    const dailyRevenue = await this.qrRepository
      .createQueryBuilder('qr')
      .select(`COALESCE(DATE(qr.extended_time), DATE(qr.created_at))`, 'date')
      .addSelect(
        `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref
            WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' THEN original.admin_fee
                  ELSE original.amount
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )

            -- PENALTY: current + ref
            WHEN qr.type = 'PENALTY' THEN (
              (CASE
                WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                ELSE qr.amount
              END) +
              (SELECT
                CASE
                  WHEN original.status = 'REFUNDED' THEN original.admin_fee
                  ELSE original.amount
                END
               FROM qr AS original
               WHERE original.id = qr.ref_ticket_no)
            )

            -- REFUNDED: regular ticket
            WHEN qr.status = 'REFUNDED' THEN qr.admin_fee

            ELSE qr.amount
          END
        )
        `,
        'total_amount',
      )

      .addSelect(
        `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref if cash
            WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                  ELSE 0
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )

            -- PENALTY: both current and ref if both are cash
            WHEN qr.type = 'PENALTY' AND qr.payment_mode ILIKE 'cash' THEN (
              (CASE
                WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                ELSE qr.amount
              END) +
              (SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND original.payment_mode ILIKE 'cash' THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'cash' THEN original.amount
                  ELSE 0
                END
               FROM qr AS original
               WHERE original.id = qr.ref_ticket_no)
            )

            WHEN qr.status = 'REFUNDED' AND qr.payment_mode ILIKE 'cash' THEN qr.admin_fee
            WHEN qr.payment_mode ILIKE 'cash' THEN qr.amount

            ELSE 0
          END
        )
        `,
        'total_cash',
      )
      .addSelect(
        `
        SUM(
          CASE
            WHEN qr.status = 'CANCELLED' THEN 0

            -- DUPLICATE: only ref if online
            WHEN qr.type IN ('DUPLICATE', 'FREE') THEN (
              SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND (
                    original.payment_mode ILIKE 'online' OR
                    original.payment_mode ILIKE 'credit_card' OR
                    original.payment_mode ILIKE 'upi'
                  ) THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'online' OR
                       original.payment_mode ILIKE 'credit_card' OR
                       original.payment_mode ILIKE 'upi' THEN original.amount
                  ELSE 0
                END
              FROM qr AS original
              WHERE original.id = qr.ref_ticket_no
            )

            -- PENALTY: add current + ref if both are online-like
            WHEN qr.type = 'PENALTY' AND (
              qr.payment_mode ILIKE 'online' OR qr.payment_mode ILIKE 'credit_card' OR qr.payment_mode ILIKE 'upi'
            ) THEN (
              (CASE
                WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
                ELSE qr.amount
              END) +
              (SELECT
                CASE
                  WHEN original.status = 'REFUNDED' AND (
                    original.payment_mode ILIKE 'online' OR
                    original.payment_mode ILIKE 'credit_card' OR
                    original.payment_mode ILIKE 'upi'
                  ) THEN original.admin_fee
                  WHEN original.payment_mode ILIKE 'online' OR
                       original.payment_mode ILIKE 'credit_card' OR
                       original.payment_mode ILIKE 'upi' THEN original.amount
                  ELSE 0
                END
               FROM qr AS original
               WHERE original.id = qr.ref_ticket_no)
            )

            WHEN qr.status = 'REFUNDED' AND (
              qr.payment_mode ILIKE 'online' OR
              qr.payment_mode ILIKE 'credit_card' OR
              qr.payment_mode ILIKE 'upi'
            ) THEN qr.admin_fee

            WHEN qr.payment_mode ILIKE 'online' OR
                 qr.payment_mode ILIKE 'credit_card' OR
                 qr.payment_mode ILIKE 'upi' THEN qr.amount

            ELSE 0
          END
        )
        `,
        'total_online',
      )

      .where(
        `(
      (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :start AND :end)
      OR
      (qr.extended_time IS NULL AND qr.created_at BETWEEN :start AND :end)
    )`,
        { start: startDate.toISOString(), end: endDate.toISOString() },
      )
      .groupBy(`COALESCE(DATE(qr.extended_time), DATE(qr.created_at))`)
      .orderBy(`COALESCE(DATE(qr.extended_time), DATE(qr.created_at))`, 'ASC')
      .getRawMany();

    console.log('Daily Revenue Data:', dailyRevenue);

    const formattedDailyRevenue = allDates.map((day) => {
      const dayString = format(day, 'yyyy-MM-dd');

      const dayData = dailyRevenue.find(
        (revenue) => format(new Date(revenue.date), 'yyyy-MM-dd') === dayString,
      );

      return {
        date: format(day, 'dd MMM yyyy'),
        total_cash: dayData ? Number(dayData.total_cash) : 0,
        total_online: dayData ? Number(dayData.total_online) : 0,
        total_amount: dayData ? Number(dayData.total_amount) : 0,
      };
    });

    return {
      status: 'success',
      status_code: 200,
      message: 'Request was successful',
      data: formattedDailyRevenue,
    };
  }

  async getAllPenaltiesPagination(
    fromDate?: Date | string,
    toDate?: Date | string,
    stationId?: string,
    page?: number,
    limit?: number,
  ) {
    const query = this.penaltyRepository.createQueryBuilder('penalty');

    if (fromDate) {
      query.andWhere('penalty.created_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('penalty.created_at <= :toDate', { toDate });
    }

    if (stationId) {
      query.andWhere('penalty.station_id = :stationId', { stationId });
    }

    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    const [penalties, total] = await query.getManyAndCount();
    return {
      data: penalties,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllPenalties(
    fromDate?: Date | string,
    toDate?: Date | string,
    stationId?: string,
  ) {
    const query = this.penaltyRepository.createQueryBuilder('penalty');

    if (fromDate) {
      query.andWhere('penalty.created_at >= :fromDate', { fromDate });
    }

    if (toDate) {
      query.andWhere('penalty.created_at <= :toDate', { toDate });
    }

    if (stationId) {
      query.andWhere('penalty.station_id = :stationId', { stationId });
    }

    const penalties = await query.getMany();
    return {
      data: penalties,
      total: penalties.length,
    };
  }

  async findAllMonthlyPagination(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations,
        page,
        limit,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');

      if (stations && stations.length > 0) {
        queryBuilder.andWhere(
          '(qr.source_id IN (:...stations) OR qr.destination_id IN (:...stations))',
          { stations },
        );
      }

      if (fromDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
            )`,
          { fromDate },
        );
      }

      if (toDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
            )`,
          { toDate },
        );
      }

      if (paymentModes && paymentModes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }
      if (transactionTypes && transactionTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((type) => type.toLowerCase()),
          },
        );
      }

      queryBuilder.orderBy('qr.id', 'DESC');

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
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stations && stations.length > 0) {
        queryBuilder.andWhere(
          '(qr.source_id IN (:...stations) OR qr.destination_id IN (:...stations))',
          { stations },
        );
      }

      if (fromDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
            )`,
          { fromDate },
        );
      }

      if (toDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
            )`,
          { toDate },
        );
      }

      if (paymentModes && paymentModes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }
      if (transactionTypes && transactionTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((type) => type.toLowerCase()),
          },
        );
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
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations,
        page,
        limit,
      } = queryParams;
      console.log('a', fromDate);

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stations && stations.length > 0) {
        queryBuilder.andWhere(
          '(qr.source_id IN (:...stations) OR qr.destination_id IN (:...stations))',
          { stations },
        );
      }

      if (fromDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
            )`,
          { fromDate },
        );
      }

      if (toDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
            )`,
          { toDate },
        );
      }

      if (paymentModes && paymentModes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }
      if (transactionTypes && transactionTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((type) => type.toLowerCase()),
          },
        );
      }

      queryBuilder.orderBy('qr.id', 'DESC');

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
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stations && stations.length > 0) {
        queryBuilder.andWhere(
          '(qr.source_id IN (:...stations) OR qr.destination_id IN (:...stations))',
          { stations },
        );
      }

      if (fromDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
            )`,
          { fromDate },
        );
      }

      if (toDate) {
        queryBuilder.andWhere(
          `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
            )`,
          { toDate },
        );
      }

      if (paymentModes && paymentModes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }
      if (transactionTypes && transactionTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((type) => type.toLowerCase()),
          },
        );
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
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations,
        page,
        limit,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');

      if (stations && stations.length > 0) {
        queryBuilder.andWhere(
          '(qr.source_id IN (:...stations) OR qr.destination_id IN (:...stations))',
          { stations },
        );
      }

      if (fromDate) {
        queryBuilder.andWhere(
          `(
            (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
            OR
            (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
          )`,
          { fromDate },
        );
      }

      if (toDate) {
        queryBuilder.andWhere(
          `(
            (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
            OR
            (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
          )`,
          { toDate },
        );
      }

      if (paymentModes && paymentModes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }

      if (transactionTypes && transactionTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((id) => id.toLowerCase()),
          },
        );
      }

      queryBuilder.orderBy('qr.id', 'DESC');

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
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');

      if (stations && stations.length > 0) {
        queryBuilder.andWhere(
          '(qr.source_id IN (:...stations) OR qr.destination_id IN (:...stations))',
          { stations },
        );
      }

      if (fromDate) {
        queryBuilder.andWhere(
          `(
            (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
            OR
            (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
          )`,
          { fromDate },
        );
      }

      if (toDate) {
        queryBuilder.andWhere(
          `(
            (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
            OR
            (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
          )`,
          { toDate },
        );
      }

      if (paymentModes && paymentModes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.payment_mode) IN (:...paymentModes)',
          {
            paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
          },
        );
      }

      if (transactionTypes && transactionTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.support_type) IN (:...transactionTypes)',
          {
            transactionTypes: transactionTypes.map((type) =>
              type.toLowerCase(),
            ),
          },
        );
      }

      if (deviceTypes && deviceTypes.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.txn_type) IN (:...deviceTypes)',
          {
            deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
          },
        );
      }

      if (deviceIds && deviceIds.length > 0) {
        queryBuilder.andWhere(
          'LOWER(transaction.device_id) IN (:...deviceIds)',
          {
            deviceIds: deviceIds.map((id) => id.toLowerCase()),
          },
        );
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
    stationId?: number;
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
        stationId,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId },
        );
      }

      if (orderId) {
        queryBuilder.andWhere('transaction.order_id ILIKE :orderId', {
          orderId: `%${orderId}%`,
        });
      } else {
        // if (fromDate) {
        //   queryBuilder.andWhere('transaction.created_at >= :fromDate', {
        //     fromDate,
        //   });
        // }
        // if (toDate) {
        //   queryBuilder.andWhere('transaction.created_at <= :toDate', {
        //     toDate,
        //   });
        // }

        if (fromDate) {
          queryBuilder.andWhere(
            `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
            )`,
            { fromDate },
          );
        }

        if (toDate) {
          queryBuilder.andWhere(
            `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
            )`,
            { toDate },
          );
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode ILIKE :paymentMode', {
            paymentMode: `%${paymentMode}%`,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type ILIKE :transactionType', {
            transactionType: `%${transactionType}%`,
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
    stationId?: number;
  }) {
    try {
      const {
        fromDate,
        toDate,
        orderId,
        paymentMode,
        transactionType,
        stationId,
      } = queryParams;

      const queryBuilder = this.qrRepository
        .createQueryBuilder('qr')
        .leftJoinAndSelect('qr.transaction', 'transaction')
        .leftJoinAndSelect('transaction.station', 'station')
        .leftJoinAndSelect('transaction.destination', 'destination');
      if (stationId) {
        queryBuilder.andWhere(
          '(qr.source_id = :stationId OR qr.destination_id = :stationId)',
          { stationId },
        );
      }
      if (orderId) {
        queryBuilder.andWhere('transaction.order_id ILIKE :orderId', {
          orderId: `%${orderId}%`,
        });
      } else {
        // if (fromDate) {
        //   queryBuilder.andWhere('transaction.created_at >= :fromDate', {
        //     fromDate,
        //   });
        // }
        // if (toDate) {
        //   queryBuilder.andWhere('transaction.created_at <= :toDate', {
        //     toDate,
        //   });
        // }

        if (fromDate) {
          queryBuilder.andWhere(
            `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time >= :fromDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at >= :fromDate)
            )`,
            { fromDate },
          );
        }

        if (toDate) {
          queryBuilder.andWhere(
            `(
              (transaction.extended_time IS NOT NULL AND transaction.extended_time <= :toDate)
              OR
              (transaction.extended_time IS NULL AND transaction.created_at <= :toDate)
            )`,
            { toDate },
          );
        }

        if (paymentMode) {
          queryBuilder.andWhere('transaction.payment_mode ILIKE :paymentMode', {
            paymentMode: `%${paymentMode}%`,
          });
        }
        if (transactionType) {
          queryBuilder.andWhere('transaction.txn_type ILIKE :transactionType', {
            transactionType: `%${transactionType}%`,
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

  async Ridership(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations: stationIds,
      } = queryParams;
      const stations = stationIds
        ? await this.stationRepository.find({
            where: { is_active: true, id: In(stationIds) },
            order: { id: 'ASC' },
          })
        : await this.stationRepository.find({
            where: { is_active: true },
            order: { id: 'ASC' },
          });

      const stationData = await Promise.all(
        stations.map(async (station) => {
          const qrQuery = this.qrRepository
            .createQueryBuilder('qr')
            .leftJoinAndSelect('qr.transaction', 'transaction')
            .select(
              `
          COALESCE(SUM(
            CASE
              WHEN qr.entry_station_id = :stationId THEN qr.entry_count
              ELSE 0
            END
          ), 0)
          `,
              'total_entry_count',
            )
            .addSelect(
              `
          COALESCE(SUM(
            CASE
              WHEN qr.exit_station_id = :stationId THEN qr.exit_count
              ELSE 0
            END
          ), 0)
          `,
              'total_exit_count',
            )
            .where(
              `(
            (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :fromDate AND :toDate)
            OR
            (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :fromDate AND :toDate)
          )`,
              {
                fromDate,
                toDate,
              },
            )

            .andWhere(
              '(qr.entry_station_id = :stationId OR qr.exit_station_id = :stationId)',
              {
                stationId: station?.id,
              },
            )
            .setParameter('stationId', station?.id);
          // .getRawOne();

          if (paymentModes?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.payment_mode) IN (:...paymentModes)',
              {
                paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
              },
            );
          }

          if (transactionTypes?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.support_type) IN (:...transactionTypes)',
              {
                transactionTypes: transactionTypes.map((type) =>
                  type.toLowerCase(),
                ),
              },
            );
          }

          if (deviceTypes?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.device_type) IN (:...deviceTypes)',
              {
                deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
              },
            );
          }

          if (deviceIds?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.device_id) IN (:...deviceIds)',
              {
                deviceIds: deviceIds.map((id) => id.toLowerCase()),
              },
            );
          }

          const qrDataForEntryExit = await qrQuery.getRawOne();

          return {
            ...station,
            entryCount: qrDataForEntryExit.total_entry_count || 0,
            exitCount: qrDataForEntryExit.total_exit_count || 0,
          };
        }),
      );

      return {
        success: true,
        data: stationData,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: 'Failed to retrieve stations and counts',
        error: error.message,
      };
    }
  }
  async Ridershipv2(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    deviceIds?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        deviceIds,
        stations: stationIds,
      } = queryParams;
      const stations = stationIds
        ? await this.stationRepository.find({
            where: { is_active: true, id: In(stationIds) },
            order: { id: 'ASC' },
          })
        : await this.stationRepository.find({
            where: { is_active: true },
            order: { id: 'ASC' },
          });

      const stationData = await Promise.all(
        stations.map(async (station) => {
          const qrQuery = this.qrRepository
            .createQueryBuilder('qr')
            .leftJoinAndSelect('qr.transaction', 'transaction')
            .select(
              `
          COALESCE(SUM(
            CASE
              WHEN qr.entry_station_id = :stationId THEN qr.entry_count
              ELSE 0
            END
          ), 0)
          `,
              'total_entry_count',
            )
            .addSelect(
              `
          COALESCE(SUM(
            CASE
              WHEN qr.exit_station_id = :stationId THEN qr.exit_count
              ELSE 0
            END
          ), 0)
          `,
              'total_exit_count',
            )
            .where(
              `(
            (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :fromDate AND :toDate)
            OR
            (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :fromDate AND :toDate)
          )`,
              {
                fromDate,
                toDate,
              },
            )

            .andWhere(
              '(qr.entry_station_id = :stationId OR qr.exit_station_id = :stationId)',
              {
                stationId: station?.id,
              },
            )
            .setParameter('stationId', station?.id);
          // .getRawOne();

          if (paymentModes?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.payment_mode) IN (:...paymentModes)',
              {
                paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
              },
            );
          }

          if (transactionTypes?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.support_type) IN (:...transactionTypes)',
              {
                transactionTypes: transactionTypes.map((type) =>
                  type.toLowerCase(),
                ),
              },
            );
          }

          if (deviceTypes?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.txn_type) IN (:...deviceTypes)',
              {
                deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
              },
            );
          }

          if (deviceIds?.length) {
            qrQuery.andWhere(
              'LOWER(transaction.device_id) IN (:...deviceIds)',
              {
                deviceIds: deviceIds.map((id) => id.toLowerCase()),
              },
            );
          }

          const qrDataForEntryExit = await qrQuery.getRawOne();


          const qrDataQuery = this.qrRepository
          .createQueryBuilder('qr')
          .leftJoinAndSelect('qr.transaction', 'transaction')
          .select(
            `
        COALESCE(SUM(
          CASE
            WHEN qr.source_id = :stationId THEN qr.entry_count
            ELSE 0
          END
        ), 0)
        `,
            'total_ticket_count',
          )
          .addSelect('COUNT(*)', 'total_ticket_count')
          .addSelect(
            `COUNT(CASE WHEN qr.type = 'PENALTY' THEN 1 ELSE NULL END)`,
            'total_penalty_count',
          )
          .addSelect(
            `COALESCE(SUM(CASE WHEN qr.type = 'PENALTY' THEN qr.amount ELSE 0 END), 0)`,
            'total_penalty_amount',
          )
          .addSelect(
            `COUNT(CASE WHEN qr.status = 'REFUNDED' THEN 1 ELSE NULL END)`,
            'total_refund_count',
          )
          .addSelect(
            `COALESCE(SUM(CASE 
            WHEN qr.status = 'REFUNDED' 
            THEN qr.amount - COALESCE(qr.admin_fee, 0) 
            ELSE 0 
          END), 0)`,
            'total_refund_amount',
          )
          .addSelect(
            `COUNT(CASE WHEN qr.type = 'FREE' THEN 1 ELSE NULL END)`,
            'total_free_exit_count',
          )
          .addSelect(
            `COUNT(CASE WHEN qr.type = 'PAID_EXIT' THEN 1 ELSE NULL END)`,
            'total_paid_exit_count',
          )
          .addSelect(
            `COUNT(CASE WHEN qr.type = 'DUPLICATE' THEN 1 ELSE NULL END)`,
            'total_duplicate_count',
          )
          .where(
            `(
          (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :fromDate AND :toDate)
          OR
          (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :fromDate AND :toDate)
        )`,
            {
              fromDate,
              toDate,
            },
          )

          .andWhere(
            '(qr.source_id = :stationId)',
            {
              stationId: station?.id,
            },
          )
          .setParameter('stationId', station?.id);

          if (paymentModes?.length) {
            qrDataQuery.andWhere(
              'LOWER(transaction.payment_mode) IN (:...paymentModes)',
              {
                paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
              },
            );
          }

          if (transactionTypes?.length) {
            qrDataQuery.andWhere(
              'LOWER(transaction.support_type) IN (:...transactionTypes)',
              {
                transactionTypes: transactionTypes.map((type) =>
                  type.toLowerCase(),
                ),
              },
            );
          }

          if (deviceTypes?.length) {
            qrDataQuery.andWhere(
              'LOWER(transaction.txn_type) IN (:...deviceTypes)',
              {
                deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
              },
            );
          }

          if (deviceIds?.length) {
            qrDataQuery.andWhere(
              'LOWER(transaction.device_id) IN (:...deviceIds)',
              {
                deviceIds: deviceIds.map((id) => id.toLowerCase()),
              },
            );
          }


          const qrDataRidership = await qrDataQuery.getRawOne();
          

          return {
            ...station,
            entryCount: qrDataForEntryExit.total_entry_count || 0,
            exitCount: qrDataForEntryExit.total_exit_count || 0,
            totalTicketCount: qrDataRidership.total_ticket_count || 0,
            totalPenaltyCount: qrDataRidership.total_penalty_count || 0,
            totalPenaltyAmount: qrDataRidership.total_penalty_amount || 0,
            totalRefundCount: qrDataRidership.total_refund_count || 0,
            totalRefundAmount: qrDataRidership.total_refund_amount || 0,
            totalFreeExitCount: qrDataRidership.total_free_exit_count || 0,
            totalPaidExitCount: qrDataRidership.total_paid_exit_count || 0,
            totalDuplicateCount: qrDataRidership.total_duplicate_count || 0,

          };
        }),
      );

      return {
        success: true,
        data: stationData,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: 'Failed to retrieve stations and counts',
        error: error.message,
      };
    }
  }

  // async matrixReport(queryParams: {
  //   fromDate?: Date | string;
  //   toDate?: Date | string;
  //   paymentModes?: string[];
  //   transactionTypes?: string[];
  //   deviceTypes?: string[];
  //   stations?: number[];
  // }) {
  //   try {
  //     const {
  //       fromDate,
  //       toDate,
  //       paymentModes,
  //       transactionTypes,
  //       deviceTypes,
  //       stations: stationIds,
  //     } = queryParams;
  //     const stations = stationIds
  //       ? await this.stationRepository.find({
  //           where: { is_active: true, id: In(stationIds) },
  //           order: { id: 'ASC' },
  //         })
  //       : await this.stationRepository.find({
  //           where: { is_active: true },
  //           order: { id: 'ASC' },
  //         });

  //     const stationData = await Promise.all(
  //       stations.map(async (station) => {
  //         const qrQuery =  this.qrRepository
  //           .createQueryBuilder('qr')
  //           .leftJoinAndSelect('qr.transaction', 'transaction')
  //           .select(
  //             `
  //         COALESCE(SUM(
  //           CASE
  //             WHEN qr.entry_station_id = :stationId THEN qr.entry_count
  //             ELSE 0
  //           END
  //         ), 0)
  //         `,
  //             'total_entry_count',
  //           )
  //           .addSelect(
  //             `
  //         COALESCE(SUM(
  //           CASE
  //             WHEN qr.exit_station_id = :stationId THEN qr.exit_count
  //             ELSE 0
  //           END
  //         ), 0)
  //         `,
  //             'total_exit_count',
  //           )
  //           .where(
  //             `(
  //           (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :fromDate AND :toDate)
  //           OR
  //           (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :fromDate AND :toDate)
  //         )`,
  //             {
  //               fromDate,
  //               toDate,
  //             },
  //           )

  //           .andWhere(
  //             '(qr.entry_station_id = :stationId OR qr.exit_station_id = :stationId)',
  //             {
  //               stationId: station?.id,
  //             },
  //           )
  //           .setParameter('stationId', station?.id)
  //           // .getRawOne();

  //           if (paymentModes?.length) {
  //             qrQuery.andWhere('LOWER(transaction.payment_mode) IN (:...paymentModes)', {
  //               paymentModes: paymentModes.map((mode) => mode.toLowerCase()),
  //             });
  //           }

  //           if (transactionTypes?.length) {
  //             qrQuery.andWhere('LOWER(transaction.support_type) IN (:...transactionTypes)', {
  //               transactionTypes: transactionTypes.map((type) => type.toLowerCase()),
  //             });
  //           }

  //           if (deviceTypes?.length) {
  //             qrQuery.andWhere('LOWER(transaction.device_type) IN (:...deviceTypes)', {
  //               deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
  //             });
  //           }

  //           const qrDataForEntryExit = await qrQuery.getRawOne();

  //         return {
  //           ...station,
  //           entryCount: qrDataForEntryExit.total_entry_count || 0,
  //           exitCount: qrDataForEntryExit.total_exit_count || 0,
  //         };
  //       }),
  //     );

  //     return {
  //       success: true,
  //       data: stationData,
  //     };
  //   } catch (error) {
  //     console.log(error);
  //     return {
  //       success: false,
  //       message: 'Failed to retrieve stations and counts',
  //       error: error.message,
  //     };
  //   }
  // }
  async matrixReport(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        stations: stationIds,
      } = queryParams;

      // Fetch stations based on provided IDs
      const stations = stationIds
        ? await this.stationRepository.find({
            where: { is_active: true, id: In(stationIds) },
            order: { id: 'ASC' },
          })
        : await this.stationRepository.find({
            where: { is_active: true },
            order: { id: 'ASC' },
          });

      const stationList = await this.stationRepository.find({
        where: { is_active: true },
        order: { id: 'ASC' },
      });

      const stationData = await Promise.all(
        stations.map(async (sourceStation) => {
          const entryExitData = await Promise.all(
            stationList.map(async (destinationStation) => {
              if (sourceStation.id === destinationStation.id) {
                return {
                  sourceStationId: sourceStation.id,
                  destinationStationId: destinationStation.id,
                  totalTickets: 0, // Skip if source and destination are the same
                };
              }

              const qrQuery = this.qrRepository
                .createQueryBuilder('qr')
                .leftJoinAndSelect('qr.transaction', 'transaction')
                .select('COUNT(*)', 'total_tickets') // Count the total tickets for the combination
                .where(
                  `(
                    (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :fromDate AND :toDate)
                    OR
                    (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :fromDate AND :toDate)
                    AND
                    qr.type IN ('RJT', 'SJT', 'PAID_EXIT')
                  )`,
                  {
                    fromDate,
                    toDate,
                  },
                )
                .andWhere(
                  `(
                    (
                      (qr.entry_station_id = :sourceStationId OR (qr.entry_station_id IS NULL AND qr.source_id = :sourceStationId))
                      AND
                      (qr.exit_station_id = :destinationStationId OR (qr.exit_station_id IS NULL AND qr.destination_id = :destinationStationId))
                    )
                  )`,
                  {
                    sourceStationId: sourceStation.id,
                    destinationStationId: destinationStation.id,
                  },
                );

              if (paymentModes && paymentModes.length > 0) {
                qrQuery.andWhere(
                  'LOWER(transaction.payment_mode) IN (:...paymentModes)',
                  {
                    paymentModes: paymentModes.map((mode) =>
                      mode.toLowerCase(),
                    ),
                  },
                );
              }

              if (transactionTypes && transactionTypes.length > 0) {
                qrQuery.andWhere(
                  'LOWER(transaction.support_type) IN (:...transactionTypes)',
                  {
                    transactionTypes: transactionTypes.map((type) =>
                      type.toLowerCase(),
                    ),
                  },
                );
              }

              if (deviceTypes && deviceTypes.length > 0) {
                qrQuery.andWhere(
                  'LOWER(transaction.txn_type) IN (:...deviceTypes)',
                  {
                    deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
                  },
                );
              }

              const qrData = await qrQuery.getRawOne();

              return {
                sourceStationId: sourceStation.id,
                destinationStationId: destinationStation.id,
                destinationStationName: destinationStation.station_name,
                totalTickets: qrData.total_tickets || 0, // Return the total number of tickets
              };
            }),
          );

          return {
            sourceStation: sourceStation,
            data: entryExitData,
          };
        }),
      );

      return {
        success: true,
        data: stationData,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: 'Failed to retrieve station ticket counts',
        error: error.message,
      };
    }
  }

  async matrixReportAmount(queryParams: {
    fromDate?: Date | string;
    toDate?: Date | string;
    paymentModes?: string[];
    transactionTypes?: string[];
    deviceTypes?: string[];
    stations?: number[];
  }) {
    try {
      const {
        fromDate,
        toDate,
        paymentModes,
        transactionTypes,
        deviceTypes,
        stations: stationIds,
      } = queryParams;

      // Fetch stations based on provided IDs
      const stations = stationIds
        ? await this.stationRepository.find({
            where: { is_active: true, id: In(stationIds) },
            order: { id: 'ASC' },
          })
        : await this.stationRepository.find({
            where: { is_active: true },
            order: { id: 'ASC' },
          });

      const stationList = await this.stationRepository.find({
        where: { is_active: true },
        order: { id: 'ASC' },
      });

      const stationData = await Promise.all(
        stations.map(async (sourceStation) => {
          const entryExitData = await Promise.all(
            stationList.map(async (destinationStation) => {
              // if (sourceStation.id === destinationStation.id) {
              //   return {
              //     sourceStationId: sourceStation.id,
              //     destinationStationId: destinationStation.id,
              //     totalAmount: 0, // Skip if source and destination are the same
              //   };
              // }

              const qrQuery = this.qrRepository
                .createQueryBuilder('qr')
                .leftJoinAndSelect('qr.transaction', 'transaction')
                .select(
                  `
                SUM(
                  CASE
                    WHEN qr.status = 'CANCELLED' AND qr.is_cancelled = true THEN 0
        
                    -- DUPLICATE: only ref
                    WHEN qr.type IN ('DUPLICATE', 'FREE', 'PENALTY') THEN qr.amount
        
                    -- REFUNDED: regular ticket
                    WHEN qr.status = 'REFUNDED' THEN qr.admin_fee
        
                    ELSE qr.amount
                  END
                )
                `,
                  'total_amount',
                )
                .where(
                  `(
                    (qr.extended_time IS NOT NULL AND qr.extended_time BETWEEN :fromDate AND :toDate)
                    OR
                    (qr.extended_time IS NULL AND qr.qr_date_time BETWEEN :fromDate AND :toDate)
                  )`,
                  {
                    fromDate,
                    toDate,
                  },
                )
                .andWhere(
                  `(
                    (
                      (qr.entry_station_id = :sourceStationId OR (qr.entry_station_id IS NULL AND qr.source_id = :sourceStationId))
                      AND
                      (qr.exit_station_id = :destinationStationId OR (qr.exit_station_id IS NULL AND qr.destination_id = :destinationStationId))
                    )
                  )`,
                  {
                    sourceStationId: sourceStation.id,
                    destinationStationId: destinationStation.id,
                  },
                );

              if (paymentModes && paymentModes.length > 0) {
                qrQuery.andWhere(
                  'LOWER(transaction.payment_mode) IN (:...paymentModes)',
                  {
                    paymentModes: paymentModes.map((mode) =>
                      mode.toLowerCase(),
                    ),
                  },
                );
              }

              if (transactionTypes && transactionTypes.length > 0) {
                qrQuery.andWhere(
                  'LOWER(transaction.support_type) IN (:...transactionTypes)',
                  {
                    transactionTypes: transactionTypes.map((type) =>
                      type.toLowerCase(),
                    ),
                  },
                );
              }

              if (deviceTypes && deviceTypes.length > 0) {
                qrQuery.andWhere(
                  'LOWER(transaction.txn_type) IN (:...deviceTypes)',
                  {
                    deviceTypes: deviceTypes.map((type) => type.toLowerCase()),
                  },
                );
              }

              const qrData = await qrQuery.getRawOne();

              return {
                sourceStationId: sourceStation.id,
                destinationStationId: destinationStation.id,
                destinationStationName: destinationStation.station_name,
                totalAmount: qrData.total_amount || 0,
              };
            }),
          );

          return {
            sourceStation: sourceStation,
            data: entryExitData,
          };
        }),
      );

      return {
        success: true,
        data: stationData,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        message: 'Failed to retrieve station ticket counts',
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

          deviceTotal.upi = parseInt(result.upi || 0);
          // parseInt(result?.admin_fee_upi_revenue || 0) +
          // parseInt(penaltyTransactions?.penalty_upi || 0);
          deviceTotal.cash = parseInt(result.cash || 0);
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

  async tomShiftReport({ date, deviceTypes, deviceIds, stations: stationIds }) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);
    const stations = stationIds
      ? await this.stationRepository.find({
          where: { is_active: true, id: In(stationIds) },
          order: { id: 'ASC' },
        })
      : await this.stationRepository.find({
          where: { is_active: true },
          order: { id: 'ASC' },
        });

    const stationArr = [];
    for (const station of stations) {
      const stationObj = {
        station_name: station.station_name,
        date: date,
        device: [],
      };

      const shiftQuery = this.loginSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect(
          'equipment',
          'equipment',
          'session.device_id = equipment.device_id',
        )
        .where('session.station_id = :station_id', {
          station_id: station.id,
        })
        .andWhere('session.login_time BETWEEN :start_date AND :end_date', {
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
        .orderBy('session.login_time', 'ASC');

      if (deviceIds && deviceIds.length > 0) {
        shiftQuery.andWhere('session.device_id IN (:...deviceIds)', {
          deviceIds,
        });
      }
      if (deviceTypes && deviceTypes.length > 0) {
        shiftQuery.andWhere('equipment.equipment_type IN (:...deviceTypes)', {
          deviceTypes,
        });
      }

      const shift = await shiftQuery.getRawMany();

      stationObj.device?.push(...shift);

      stationArr.push(stationObj);
    }

    return stationArr;
  }

  async getCollectionReportByStationOperator({
    date,
    deviceTypes,
    deviceIds,
    stations: stationIds,
  }) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const stations = stationIds
      ? await this.stationRepository.find({
          where: { is_active: true, id: In(stationIds) },
          order: { id: 'ASC' },
        })
      : await this.stationRepository.find({
          where: { is_active: true },
          order: { id: 'ASC' },
        });

    const stationArr = [];
    for (const station of stations) {
      // if (station_id && station.id !== station_id) {
      //   continue;
      // }

      const stationObj = {
        station: station.station_name,
        date: date,
        devices: [],
      };

      const shiftsQuery = this.loginSessionRepository
        .createQueryBuilder('session')
        .leftJoinAndSelect(
          'equipment',
          'equipment',
          'session.device_id = equipment.device_id',
        )
        .where('session.station_id = :station_id', {
          station_id: station.id,
        })
        .andWhere('session.login_time BETWEEN :start_date AND :end_date', {
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
          'session.device_id as device_id',
          'CAST(session.no_of_tickets_cash AS INTEGER) as no_of_tickets_cash',
          'CAST(session.no_of_tickets_upi AS INTEGER) as no_of_tickets_upi',
          'CAST(session.no_of_refund AS INTEGER) as no_of_refund',
          'CAST(session.total_refund_amount AS INTEGER) as refund_amount',
          'CAST(session.no_of_cancelled AS INTEGER) as no_of_cancelled',
          'CAST(session.total_cancelled_amount AS INTEGER) as cancelled_amount',
          'CAST(session.total_amount AS INTEGER) as total_amount',
        ])
        .orderBy('session.login_time', 'ASC');

      if (deviceIds && deviceIds.length > 0) {
        shiftsQuery.andWhere('session.device_id IN (:...deviceIds)', {
          deviceIds,
        });
      }
      if (deviceTypes && deviceTypes.length > 0) {
        shiftsQuery.andWhere('equipment.equipment_type IN (:...deviceTypes)', {
          deviceTypes,
        });
      }
      const shifts = await shiftsQuery.getRawMany();

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

  async getCollectionReportByStation(date, station_id = null) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    const stationFilter = station_id ? { id: station_id } : {};

    const stations = await this.stationRepository.find({
      where: stationFilter,
      select: ['id', 'station_name'],
      order: { id: 'ASC' },
    });

    const stationsArr = [];

    for (const station of stations) {
      let stationObj = {
        station_name: station.station_name,
        date: date,
        shifts: [],
      };

      const stationDevices = await this.equipmentRepository.find({
        where: { station: { id: station.id } },
      });

      for (const stationDevice of stationDevices) {
        const sessions = await this.loginSessionRepository.find({
          where: {
            device_id: stationDevice.device_id,
            login_time: Between(startDate, endDate),
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

        sessions.forEach((session) => {
          let shift = {
            name: session.shift_id,
            shift_id: session.shift_id,
            device_id: stationDevice.device_name,
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

      stationsArr.push(stationObj);
    }

    return stationsArr;
  }

  async shiftReport(payload: LoginSessionInput) {
    const {
      station,
      user,
      cash_amount,
      device_id,
      login_time,
      logout_time,
      no_of_cancelled,
      no_of_refund,
      no_of_tickets,
      no_of_tickets_cash,
      no_of_tickets_upi,
      shift_id,
      total_amount,
      total_cancelled_amount,
      total_refund_amount,
      upi_amount,
      employee_id,
      username,
    } = payload;
    const session = this.loginSessionRepository.create({
      station: { id: station },
      user: { id: user },
      cash_amount,
      device_id,
      login_time,
      logout_time,
      no_of_cancelled,
      no_of_refund,
      no_of_tickets,
      no_of_tickets_cash,
      no_of_tickets_upi,
      shift_id,
      total_amount,
      total_cancelled_amount,
      total_refund_amount,
      upi_amount,
      employee_id,
      username,
    });
    const savedSession = await this.loginSessionRepository.save(session);
    return savedSession;
  }

  async findShiftReport({
    fromDate,
    endDate,
    deviceTypes,
    deviceIds,
    stations: stationIds,
  }) {
    try {
      // const { fromDate, endDate, station } = payload;
      const startDate = new Date(fromDate);
      const toDate = new Date(endDate);

      const stations = stationIds
        ? await this.stationRepository.find({
            where: { is_active: true, id: In(stationIds) },
            order: { id: 'ASC' },
          })
        : await this.stationRepository.find({
            where: { is_active: true },
            order: { id: 'ASC' },
          });

      // console.log(station);

      startDate.setUTCHours(0, 0, 0, 0);
      toDate.setUTCHours(23, 59, 59, 999);

      const data = [];

      for (const station of stations) {
        // let where: any = {
        //   login_time: Between(startDate, toDate),
        //   station: station.id,
        // };

        // if (deviceIds && deviceIds.length > 0) {
        //   .andWhere('session.device_id IN (:...deviceIds)', { deviceIds });
        // }
        // if (deviceTypes && deviceTypes.length > 0) {
        //   .andWhere('equipment.equipment_type IN (:...deviceTypes)', { deviceTypes });
        // }

        // const sessions = await this.loginSessionRepository.findOne({
        //   where,
        //   relations: ['station', 'user'],
        //   select: [
        //     'id',
        //     'device_id',
        //     'station',
        //     'shift_id',
        //     'total_amount',
        //     'cash_amount',
        //     'upi_amount',
        //     'no_of_tickets',
        //     'no_of_tickets_cash',
        //     'no_of_tickets_upi',
        //     'no_of_refund',
        //     'total_refund_amount',
        //     'no_of_cancelled',
        //     'total_cancelled_amount',
        //     'login_time',
        //     'logout_time',
        //     'user',
        //     'employee_id',
        //     'username',
        //   ],
        // });
        const shiftsQuery = this.loginSessionRepository
          .createQueryBuilder('session')
          .leftJoin(
            'equipment',
            'equipment',
            'session.device_id = equipment.device_id',
          )
          .where(
            'session.login_time BETWEEN :startDate AND :endDate AND session.station = :stationId',
            {
              startDate: startDate,
              endDate: toDate,
              stationId: station.id,
            },
          );

        // Apply deviceIds filter if provided
        if (deviceIds && deviceIds.length > 0) {
          shiftsQuery.andWhere('session.device_id IN (:...deviceIds)', {
            deviceIds,
          });
        }

        // Apply deviceTypes filter if provided
        if (deviceTypes && deviceTypes.length > 0) {
          shiftsQuery.andWhere(
            'equipment.equipment_type IN (:...deviceTypes)',
            { deviceTypes },
          );
        }

        // Execute the query to get the result
        const sessions = await shiftsQuery
          .leftJoinAndSelect('session.station', 'station')
          .leftJoinAndSelect('session.user', 'user')
          .select([
            'session.id',
            'session.device_id',
            'session.station',
            'session.shift_id',
            'session.total_amount',
            'session.cash_amount',
            'session.upi_amount',
            'session.no_of_tickets',
            'session.no_of_tickets_cash',
            'session.no_of_tickets_upi',
            'session.no_of_refund',
            'session.total_refund_amount',
            'session.no_of_cancelled',
            'session.total_cancelled_amount',
            'session.login_time',
            'session.logout_time',
            'session.user',
            'session.employee_id',
            'user',
            'session.username',
          ])
          .getOne();
        if (sessions) {
          data.push(sessions);
        }
      }
      return { data: data };
    } catch (err) {
      console.log(err);
      throw new BadRequestException('Something went wrong');
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
