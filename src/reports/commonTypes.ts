import { Station, User } from "@spot-demo/shared-entities";

export type LoginSessionInput = {
    device_id?: string;
    station?:  number;
    shift_id?: string;
    total_amount?: number;
    cash_amount?: number;
    upi_amount?: number;
    no_of_tickets?: number;
    no_of_tickets_cash?: number;
    no_of_tickets_upi?: number;
    fine_amount?:number,
    fine_count?:number,
    no_of_refund?: number;
    total_refund_amount?: number;
    no_of_cancelled?: number;
    total_cancelled_amount?: number;
    login_time?: Date;
    logout_time?: Date;
    user: number;
  };