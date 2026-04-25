"use client";

import React, { useState } from "react";
import { useWorkers, useAttendance, useMarkAttendance, useToggleWorkerStatus } from "@/hooks/useWorkers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WorkersPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "attendance">("directory");

  const { data: workers, isLoading: workersLoading } = useWorkers();

  // Generate last 7 days dates for attendance
  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  });

  const startDate = last7Days[0];
  const endDate = last7Days[last7Days.length - 1];

  const { data: attendanceLogs, isLoading: attendanceLoading } = useAttendance(startDate, endDate);
  const markAttendanceMutation = useMarkAttendance();
  const toggleWorkerStatus = useToggleWorkerStatus();

  const getAttendanceForDay = (workerId: string, date: string) => {
    return attendanceLogs?.find((a) => a.worker_id === workerId && a.date === date)?.status || "absent";
  };

  const handleToggleAttendance = (workerId: string, date: string, currentStatus: string) => {
    const nextStatus = currentStatus === "present" ? "absent" : "present";
    markAttendanceMutation.mutate({ worker_id: workerId, date, status: nextStatus });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold text-text-primary">Workers & Attendance</h1>
      </div>

      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("directory")}
          className={`py-3 px-4 font-semibold ${activeTab === "directory" ? "border-b-2 border-primary text-primary" : "text-text-secondary"}`}
        >
          Directory
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-3 px-4 font-semibold ${activeTab === "attendance" ? "border-b-2 border-primary text-primary" : "text-text-secondary"}`}
        >
          Attendance
        </button>
      </div>

      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {workersLoading ? (
            <p>Loading workers...</p>
          ) : workers?.map((worker) => (
            <Card key={worker.id} className="border-border shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{worker.name}</h3>
                    <p className="text-sm text-text-secondary mt-1">{worker.phone || "No phone"}</p>
                  </div>
                  <Badge variant="secondary" className="bg-surface">{worker.department}</Badge>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-text-secondary">Status</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={worker.active}
                      onChange={() => toggleWorkerStatus.mutate({ id: worker.id, active: !worker.active })}
                      disabled={toggleWorkerStatus.isPending}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface-raised border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold text-text-secondary uppercase tracking-wider sticky left-0 bg-surface-raised z-10 w-48">Worker</th>
                  {last7Days.map((dateStr) => {
                    const dateObj = new Date(dateStr);
                    const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                    return (
                      <th key={dateStr} className="px-4 py-4 font-semibold text-text-secondary uppercase tracking-wider text-center">
                        {dayLabel}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workersLoading || attendanceLoading ? (
                  <tr><td colSpan={8} className="p-4 text-center">Loading matrix...</td></tr>
                ) : workers?.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-text-primary sticky left-0 bg-surface group-hover:bg-gray-50 z-10 border-r border-gray-100 shadow-[1px_0_0_0_#f3f4f6]">
                      {worker.name}
                    </td>
                    {last7Days.map((dateStr) => {
                      const status = getAttendanceForDay(worker.id, dateStr);
                      const isPresent = status === "present";
                      return (
                        <td key={dateStr} className="px-4 py-3 text-center border-r border-gray-50 last:border-0 relative">
                          <button
                            onClick={() => handleToggleAttendance(worker.id, dateStr, status)}
                            disabled={markAttendanceMutation.isPending}
                            className={`w-10 h-10 rounded-md shadow-sm font-bold transition-all active:scale-95 ${
                              isPresent 
                                ? "bg-green-100 text-green-700 hover:bg-green-200 border border-green-200" 
                                : "bg-red-100 text-red-700 hover:bg-red-200 border border-red-200"
                            }`}
                          >
                            {isPresent ? "P" : "A"}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
