"use client";

import React, { useState, useEffect } from "react";
import { 
  useWorkers, 
  useAttendance, 
  useMarkAttendance, 
  useToggleWorkerStatus,
  useAddWorker,
  useDeleteWorker,
  useUpdateWorker,
  Worker
} from "@/hooks/useWorkers";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from "@/components/ui/dialog";
import { Edit2, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import { WorkerAttendanceModal } from "@/components/workers/WorkerAttendanceModal";

export default function WorkersPage() {
  const [activeTab, setActiveTab] = useState<"directory" | "attendance">("attendance");

  const { data: workers, isLoading: workersLoading } = useWorkers();
  const supabase = createClient();
  const [userRole, setUserRole] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [summaryWorker, setSummaryWorker] = useState<Worker | null>(null);
  const [workerName, setWorkerName] = useState("");

  useEffect(() => {
    async function getRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        setUserRole(profile?.role || 'worker');
      }
    }
    getRole();
  }, [supabase]);

  const isAdmin = userRole === 'admin';

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
  const addWorkerMutation = useAddWorker();
  const updateWorkerMutation = useUpdateWorker();
  const deleteWorkerMutation = useDeleteWorker();

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim()) return;
    addWorkerMutation.mutate({ name: workerName, active: true }, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setWorkerName("");
      }
    });
  };

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !workerName.trim()) return;
    updateWorkerMutation.mutate({ id: editingWorker.id, name: workerName }, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        setEditingWorker(null);
        setWorkerName("");
      }
    });
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setWorkerName(worker.name);
    setIsEditModalOpen(true);
  };

  const handleDeleteWorker = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this worker? This will also remove their attendance records.")) {
      deleteWorkerMutation.mutate(id);
    }
  };

  const getAttendanceForDay = (workerId: string, date: string) => {
    return attendanceLogs?.find((a) => a.worker_id === workerId && a.date === date);
  };

  const handleToggleAttendance = (workerId: string, date: string, currentShifts: number) => {
    let nextShifts = 0;
    if (currentShifts === 0) nextShifts = 1;
    else if (currentShifts === 1) nextShifts = 1.5;
    else if (currentShifts === 1.5) nextShifts = 2;
    else nextShifts = 0;

    const nextStatus = nextShifts > 0 ? "present" : "absent";
    markAttendanceMutation.mutate({ worker_id: workerId, date, status: nextStatus, shifts_worked: nextShifts });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-display font-bold text-text-primary">Workers & Attendance</h1>
        {isAdmin && activeTab === "directory" && (
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shadow-sm">
            <UserPlus className="w-4 h-4" />
            Add Worker
          </Button>
        )}
      </div>

      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-3 px-4 font-semibold ${activeTab === "attendance" ? "border-b-2 border-primary text-primary" : "text-text-secondary"}`}
        >
          Attendance
        </button>
        <button
          onClick={() => setActiveTab("directory")}
          className={`py-3 px-4 font-semibold ${activeTab === "directory" ? "border-b-2 border-primary text-primary" : "text-text-secondary"}`}
        >
          Directory
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
                    <h3 
                      className="text-lg font-semibold text-text-primary hover:text-primary hover:underline cursor-pointer transition-colors"
                      onClick={() => setSummaryWorker(worker)}
                    >
                      {worker.name}
                    </h3>
                    <p className="text-sm text-text-secondary mt-1">{worker.phone || "No phone"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-text-secondary hover:text-primary"
                          onClick={() => openEditModal(worker)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-text-secondary hover:text-danger"
                          onClick={() => handleDeleteWorker(worker.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <Badge variant="secondary" className="bg-surface">{worker.department || "General"}</Badge>
                  </div>
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
                  <tr key={worker.id} className="hover:bg-surface-raised transition-colors group">
                    <td 
                      className="px-6 py-4 font-medium text-text-primary sticky left-0 bg-surface group-hover:bg-surface-raised z-10 border-r border-border shadow-[1px_0_0_0_var(--border)] cursor-pointer hover:text-primary hover:underline transition-colors"
                      onClick={() => setSummaryWorker(worker)}
                    >
                      {worker.name}
                    </td>
                    {last7Days.map((dateStr) => {
                      const attendance = getAttendanceForDay(worker.id, dateStr);
                      const shifts = attendance?.shifts_worked || 0;
                      
                      let btnClass = "bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200"; // 0
                      if (shifts === 1) btnClass = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200";
                      else if (shifts === 1.5) btnClass = "bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200";
                      else if (shifts === 2) btnClass = "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";

                      return (
                        <td key={dateStr} className="px-4 py-3 text-center border-r border-gray-50 last:border-0 relative">
                          <button
                            onClick={() => handleToggleAttendance(worker.id, dateStr, shifts)}
                            disabled={markAttendanceMutation.isPending}
                            className={`w-10 h-10 rounded-md shadow-sm font-bold transition-all active:scale-95 border ${btnClass}`}
                          >
                            {shifts}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-raised border-t border-border font-bold">
                <tr>
                  <td className="px-6 py-4 text-text-primary sticky left-0 bg-surface-raised z-10 border-r border-border shadow-[1px_0_0_0_var(--border)]">
                    Total Shifts
                  </td>
                  {last7Days.map((dateStr) => {
                    const totalShiftsForDay = workers?.reduce((sum, worker) => {
                      const attendance = getAttendanceForDay(worker.id, dateStr);
                      return sum + (attendance?.shifts_worked || 0);
                    }, 0) || 0;
                    return (
                      <td key={dateStr} className="px-4 py-4 text-center border-r border-border last:border-0 text-text-primary">
                        {totalShiftsForDay}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {/* Add Worker Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Worker</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWorker} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Enter worker's name" 
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={addWorkerMutation.isPending}>
                {addWorkerMutation.isPending ? "Adding..." : "Add Worker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Worker Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Worker</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateWorker} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input 
                id="edit-name" 
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateWorkerMutation.isPending}>
                {updateWorkerMutation.isPending ? "Updating..." : "Update Worker"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Worker Attendance Modal */}
      <WorkerAttendanceModal worker={summaryWorker} onClose={() => setSummaryWorker(null)} />
    </div>
  );
}
