import { describe, it, expect } from "vitest";
import {
  getMonthDateRange,
  calculatePayroll,
  RawWorker,
  RawAttendance,
  RawAdvance,
  RawSettlement,
} from "@/lib/payroll";

describe("Artisan Wage & Cash Advance Settlement Ledger [DIR-02]", () => {
  describe("Month Date Range Calculations", () => {
    it("computes exact month boundaries for a standard 30-day month", () => {
      const range = getMonthDateRange("2026-11");
      expect(range.month).toBe("2026-11");
      expect(range.startDate).toBe("2026-11-01");
      expect(range.endDate).toBe("2026-11-30");
      expect(range.year).toBe(2026);
      expect(range.monthNum).toBe(11);
    });

    it("computes exact month boundaries for a 31-day month", () => {
      const range = getMonthDateRange("2026-12");
      expect(range.startDate).toBe("2026-12-01");
      expect(range.endDate).toBe("2026-12-31");
    });

    it("computes exact month boundaries for February in a leap year (2024)", () => {
      const range = getMonthDateRange("2024-02");
      expect(range.startDate).toBe("2024-02-01");
      expect(range.endDate).toBe("2024-02-29");
    });

    it("computes exact month boundaries for February in a non-leap year (2025)", () => {
      const range = getMonthDateRange("2025-02");
      expect(range.startDate).toBe("2025-02-01");
      expect(range.endDate).toBe("2025-02-28");
    });

    it("falls back to current month if null, empty, or invalid string provided", () => {
      const range = getMonthDateRange(null);
      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      expect(range.month).toBe(expectedMonth);
      expect(range.startDate).toBe(`${expectedMonth}-01`);

      const invalidRange = getMonthDateRange("invalid-date");
      expect(invalidRange.month).toBe(expectedMonth);
    });
  });

  describe("Wage & Cash Advance Calculation Engine", () => {
    const mockWorkers: RawWorker[] = [
      {
        id: "w-1",
        name: "Ramesh Sharma",
        department: "Carpentry",
        phone: "+91 98765 43210",
        active: true,
      },
      {
        id: "w-2",
        name: "Suresh Kumar",
        department: "Polishing",
        phone: "+91 98765 43211",
        daily_rate: 1000, // custom rate
        active: true,
      },
      {
        id: "w-3",
        name: "Mukesh Patel",
        department: "Upholstery",
        phone: "+91 98765 43212",
        active: true,
      },
      {
        id: "w-4",
        name: "Anil Verma",
        department: "Carpentry",
        phone: null,
        active: true,
      },
    ];

    it("calculates gross wages using default rate (800) and custom rates", () => {
      const mockAttendance: RawAttendance[] = [
        { worker_id: "w-1", shifts_worked: 1.0, date: "2026-11-01" },
        { worker_id: "w-1", shifts_worked: 1.5, date: "2026-11-02" }, // 2.5 shifts * 800 = 2000
        { worker_id: "w-2", shifts_worked: 2.0, date: "2026-11-01" }, // 2.0 shifts * 1000 = 2000
      ];

      const result = calculatePayroll(mockWorkers, mockAttendance, [], "2026-11");

      const w1 = result.workers.find((w) => w.id === "w-1");
      expect(w1).toBeDefined();
      expect(w1?.dailyRate).toBe(800);
      expect(w1?.shifts).toBe(2.5);
      expect(w1?.gross).toBe(2000);
      expect(w1?.advances).toBe(0);
      expect(w1?.netPayable).toBe(2000);
      expect(w1?.carryover).toBe(0);
      expect(w1?.status).toBe("payable");

      const w2 = result.workers.find((w) => w.id === "w-2");
      expect(w2).toBeDefined();
      expect(w2?.dailyRate).toBe(1000);
      expect(w2?.shifts).toBe(2);
      expect(w2?.gross).toBe(2000);
      expect(w2?.netPayable).toBe(2000);
      expect(w2?.status).toBe("payable");
    });

    it("deducts advances from gross wage accurately", () => {
      const mockAttendance: RawAttendance[] = [
        { worker_id: "w-1", shifts_worked: 5.0, date: "2026-11-05" }, // gross = 5 * 800 = 4000
      ];
      const mockAdvances: RawAdvance[] = [
        { worker_id: "w-1", amount: 1500, date: "2026-11-02" },
        { worker_id: "w-1", amount: 500, date: "2026-11-10" }, // total advance = 2000
      ];

      const result = calculatePayroll(mockWorkers, mockAttendance, mockAdvances, "2026-11");
      const w1 = result.workers.find((w) => w.id === "w-1");

      expect(w1?.gross).toBe(4000);
      expect(w1?.advances).toBe(2000);
      expect(w1?.netPayable).toBe(2000);
      expect(w1?.carryover).toBe(0);
      expect(w1?.status).toBe("payable");
    });

    it("calculates carryover when cash advances exceed gross wage", () => {
      const mockAttendance: RawAttendance[] = [
        { worker_id: "w-3", shifts_worked: 1.0, date: "2026-11-01" }, // gross = 800
      ];
      const mockAdvances: RawAdvance[] = [
        { worker_id: "w-3", amount: 2500, date: "2026-11-01" }, // advances = 2500 > 800
      ];

      const result = calculatePayroll(mockWorkers, mockAttendance, mockAdvances, "2026-11");
      const w3 = result.workers.find((w) => w.id === "w-3");

      expect(w3?.gross).toBe(800);
      expect(w3?.advances).toBe(2500);
      expect(w3?.netPayable).toBe(0);
      expect(w3?.carryover).toBe(1700);
      expect(w3?.status).toBe("advance_carryover");
    });

    it("marks status as settled when advances exactly equal gross wage", () => {
      const mockAttendance: RawAttendance[] = [
        { worker_id: "w-1", shifts_worked: 2.0, date: "2026-11-01" }, // gross = 1600
      ];
      const mockAdvances: RawAdvance[] = [
        { worker_id: "w-1", amount: 1600, date: "2026-11-02" }, // advances = 1600
      ];

      const result = calculatePayroll(mockWorkers, mockAttendance, mockAdvances, "2026-11");
      const w1 = result.workers.find((w) => w.id === "w-1");

      expect(w1?.gross).toBe(1600);
      expect(w1?.advances).toBe(1600);
      expect(w1?.netPayable).toBe(0);
      expect(w1?.carryover).toBe(0);
      expect(w1?.status).toBe("settled");
    });

    it("marks status as inactive when worker has 0 shifts and 0 advances", () => {
      const result = calculatePayroll(mockWorkers, [], [], "2026-11");
      const w4 = result.workers.find((w) => w.id === "w-4");

      expect(w4?.shifts).toBe(0);
      expect(w4?.gross).toBe(0);
      expect(w4?.advances).toBe(0);
      expect(w4?.netPayable).toBe(0);
      expect(w4?.carryover).toBe(0);
      expect(w4?.status).toBe("inactive");
    });

    it("handles legacy attendance records with status but null shifts_worked", () => {
      const legacyAttendance: RawAttendance[] = [
        { worker_id: "w-1", status: "present", shifts_worked: null }, // should default to 1.0
        { worker_id: "w-1", status: "half_day", shifts_worked: null }, // should default to 0.5
        { worker_id: "w-1", status: "absent", shifts_worked: null }, // should default to 0
      ];

      const result = calculatePayroll(mockWorkers, legacyAttendance, [], "2026-11");
      const w1 = result.workers.find((w) => w.id === "w-1");

      expect(w1?.shifts).toBe(1.5);
      expect(w1?.gross).toBe(1200);
      expect(w1?.netPayable).toBe(1200);
    });

    it("aggregates totals across all workers correctly", () => {
      const mockAttendance: RawAttendance[] = [
        { worker_id: "w-1", shifts_worked: 10.0 }, // rate 800 => 8000
        { worker_id: "w-2", shifts_worked: 5.0 }, // rate 1000 => 5000
        { worker_id: "w-3", shifts_worked: 2.0 }, // rate 800 => 1600
        // w-4 has 0 shifts
      ];
      // Total gross: 8000 + 5000 + 1600 = 14600
      // Total shifts: 17.0

      const mockAdvances: RawAdvance[] = [
        { worker_id: "w-1", amount: 2000 }, // net: 6000
        { worker_id: "w-2", amount: 1000 }, // net: 4000
        { worker_id: "w-3", amount: 2000 }, // net: 0, carryover: 400
      ];
      // Total advances: 2000 + 1000 + 2000 = 5000
      // Total net payable: 6000 + 4000 + 0 = 10000

      const result = calculatePayroll(mockWorkers, mockAttendance, mockAdvances, "2026-11");

      expect(result.totals.totalShifts).toBe(17);
      expect(result.totals.totalGross).toBe(14600);
      expect(result.totals.totalAdvances).toBe(5000);
      expect(result.totals.totalNetPayable).toBe(10000);
    });

    it("freezes worker figures when a settlement snapshot exists, preventing historical drift", () => {
      // Dynamic attendance shows 10 shifts, but settlement snapshot was frozen at 8 shifts
      const mockAttendance: RawAttendance[] = [
        { worker_id: "w-1", shifts_worked: 10.0, date: "2026-11-01" }, // retroactive edit to 10 shifts
      ];
      const mockAdvances: RawAdvance[] = [
        { worker_id: "w-1", amount: 3000, date: "2026-11-02" }, // retroactive advance
      ];
      const mockSettlements: RawSettlement[] = [
        {
          id: "settle-1",
          worker_id: "w-1",
          month: "2026-11",
          shifts_count: 8.0,
          daily_rate: 800,
          gross_wage: 6400,
          advances_deducted: 1000,
          net_paid: 5400,
          carryover_balance: 0,
          settled_at: "2026-11-30T18:00:00Z",
        },
      ];

      const result = calculatePayroll(mockWorkers, mockAttendance, mockAdvances, "2026-11", mockSettlements);
      const w1 = result.workers.find((w) => w.id === "w-1");

      // Verifies snapshot values remain frozen despite retroactive attendance/advance mutations
      expect(w1?.isSettled).toBe(true);
      expect(w1?.shifts).toBe(8.0); // Not 10.0
      expect(w1?.gross).toBe(6400); // Not 8000
      expect(w1?.advances).toBe(1000); // Not 3000
      expect(w1?.netPayable).toBe(5400);
      expect(w1?.status).toBe("settled");
      expect(w1?.settledAt).toBe("2026-11-30T18:00:00Z");
    });
  });
});
