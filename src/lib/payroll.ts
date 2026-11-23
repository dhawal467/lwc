export interface RawWorker {
  id: string;
  name: string;
  department?: string | null;
  phone?: string | null;
  active?: boolean | null;
  daily_rate?: number | string | null;
  rate?: number | string | null;
  dailyRate?: number | string | null;
}

export interface RawAttendance {
  worker_id: string;
  shifts_worked?: number | string | null;
  status?: string | null;
  date?: string | null;
}

export interface RawAdvance {
  worker_id: string;
  amount: number | string | null;
  date?: string | null;
}

export type PayrollWorkerStatus = "payable" | "advance_carryover" | "settled" | "inactive";

export interface WorkerPayrollRecord {
  id: string;
  name: string;
  department: string;
  phone: string | null;
  dailyRate: number;
  shifts: number;
  gross: number;
  advances: number;
  netPayable: number;
  carryover: number;
  status: PayrollWorkerStatus;
}

export interface PayrollTotals {
  totalGross: number;
  totalAdvances: number;
  totalNetPayable: number;
  totalShifts: number;
}

export interface PayrollCalculationResult {
  month: string;
  startDate: string;
  endDate: string;
  totals: PayrollTotals;
  workers: WorkerPayrollRecord[];
}

/**
 * Returns canonical start and end dates for a YYYY-MM month string.
 * Defaults to current month if null/empty or invalid format.
 */
export function getMonthDateRange(monthParam?: string | null): {
  month: string;
  startDate: string;
  endDate: string;
  year: number;
  monthNum: number;
} {
  let month = monthParam?.trim() || "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date();
    month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  const [year, monthNum] = month.split("-").map(Number);
  const startDate = `${month}-01`;
  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  return { month, startDate, endDate, year, monthNum };
}

/**
 * Pure calculation engine for artisan wages and advance settlements.
 */
export function calculatePayroll(
  workers: RawWorker[],
  attendance: RawAttendance[],
  advances: RawAdvance[],
  monthStr?: string
): PayrollCalculationResult {
  const { month, startDate, endDate } = getMonthDateRange(monthStr);

  // Group shifts by worker
  const shiftsByWorker: Record<string, number> = {};
  attendance.forEach((att) => {
    const wid = att.worker_id;
    if (!wid) return;
    const shiftVal =
      att.shifts_worked != null
        ? Number(att.shifts_worked)
        : att.status === "present"
        ? 1.0
        : att.status === "half_day"
        ? 0.5
        : 0;
    shiftsByWorker[wid] = (shiftsByWorker[wid] || 0) + (isNaN(shiftVal) ? 0 : shiftVal);
  });

  // Group advances by worker
  const advancesByWorker: Record<string, number> = {};
  advances.forEach((adv) => {
    const wid = adv.worker_id;
    if (!wid) return;
    const amt = Number(adv.amount || 0);
    advancesByWorker[wid] = (advancesByWorker[wid] || 0) + (isNaN(amt) ? 0 : amt);
  });

  let totalGross = 0;
  let totalAdvances = 0;
  let totalNetPayable = 0;
  let totalShifts = 0;

  const processedWorkers: WorkerPayrollRecord[] = workers.map((w) => {
    const rawShifts = shiftsByWorker[w.id] || 0;
    const shifts = Math.round(rawShifts * 10) / 10;

    const rawAdv = advancesByWorker[w.id] || 0;
    const workerAdvances = Math.round(rawAdv * 100) / 100;

    const rawRate = w.daily_rate ?? w.rate ?? w.dailyRate ?? 800;
    const parsedRate = Number(rawRate);
    const dailyRate = isNaN(parsedRate) || parsedRate <= 0 ? 800 : parsedRate;

    const gross = Math.round(shifts * dailyRate * 100) / 100;
    const netPayable = Math.round(Math.max(0, gross - workerAdvances) * 100) / 100;
    const carryover = Math.round(Math.max(0, workerAdvances - gross) * 100) / 100;

    totalGross += gross;
    totalAdvances += workerAdvances;
    totalNetPayable += netPayable;
    totalShifts += shifts;

    let status: PayrollWorkerStatus = "inactive";
    if (netPayable > 0) {
      status = "payable";
    } else if (carryover > 0) {
      status = "advance_carryover";
    } else if (shifts > 0 || workerAdvances > 0) {
      status = "settled";
    }

    return {
      id: w.id,
      name: w.name,
      department: w.department || "General",
      phone: w.phone || null,
      dailyRate,
      shifts,
      gross,
      advances: workerAdvances,
      netPayable,
      carryover,
      status,
    };
  });

  const totals: PayrollTotals = {
    totalGross: Math.round(totalGross * 100) / 100,
    totalAdvances: Math.round(totalAdvances * 100) / 100,
    totalNetPayable: Math.round(totalNetPayable * 100) / 100,
    totalShifts: Math.round(totalShifts * 10) / 10,
  };

  return {
    month,
    startDate,
    endDate,
    totals,
    workers: processedWorkers,
  };
}
