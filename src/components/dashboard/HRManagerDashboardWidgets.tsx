import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  Users,
  Briefcase,
  UserCheck,
  Clock,
  Building,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  getCurrentMonthName,
} from '../../utils/formatters';

export const HRManagerDashboardWidgets: React.FC = () => {
  const {
    staff,
    staffAttendance,
    staffLeaves,
    expenses,
    settings,
    setActiveTab,
  } = useSchool();

  const today = getTodayDateString();
  const currentMonth = getCurrentMonthName();
  const activeStaff = useMemo(() => staff.filter(s => s.status === 'active'), [staff]);
  const totalStaffCount = activeStaff.length;

  const todayStaffRecords = useMemo(() => {
    return staffAttendance.filter(a => a.date === today);
  }, [staffAttendance, today]);

  // Turnout stats
  const turnoutStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;

    for (const r of todayStaffRecords) {
      if (r.status === 'present') present++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'leave') leave++;
    }

    const rate = totalStaffCount > 0 ? Math.round((present / totalStaffCount) * 100) : 0;

    return {
      present,
      absent,
      leave,
      rate,
    };
  }, [todayStaffRecords, totalStaffCount]);

  // Pending leaves
  const pendingLeaves = useMemo(() => {
    return (staffLeaves || []).filter(l => l.status === 'pending');
  }, [staffLeaves]);

  // Payroll summary
  const payrollSummary = useMemo(() => {
    let totalObligation = 0;
    let totalDisbursed = 0;
    let disbursedCount = 0;

    for (const member of activeStaff) {
      const net = member.monthlySalary + (member.allowances || 0) - (member.deductions || 0);
      totalObligation += net;

      const paid = expenses.find(
        e =>
          e.category === 'Staff Salaries' &&
          e.staffId === member.id &&
          e.monthForSalary === currentMonth
      );

      if (paid) {
        totalDisbursed += paid.amount;
        disbursedCount++;
      }
    }

    const pendingDisbursal = Math.max(0, totalObligation - totalDisbursed);
    const disbursalRate = totalObligation > 0 ? Math.round((totalDisbursed / totalObligation) * 100) : 100;

    return {
      totalStaff: activeStaff.length,
      totalObligation,
      totalDisbursed,
      pendingDisbursal,
      disbursedCount,
      disbursalRate,
    };
  }, [activeStaff, expenses, currentMonth]);

  // Department breakdown
  const departments = useMemo(() => {
    const map: Record<string, { total: number; present: number }> = {};
    for (const s of activeStaff) {
      const dept = s.department || 'General';
      if (!map[dept]) map[dept] = { total: 0, present: 0 };
      map[dept].total++;

      const isPresent = todayStaffRecords.some(r => r.staffId === s.id && r.status === 'present');
      if (isPresent) map[dept].present++;
    }
    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
    }));
  }, [activeStaff, todayStaffRecords]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Context Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                HR Manager Persona
              </span>
              <span className="text-xs text-purple-200">{formatDate(today)}</span>
            </div>
            <h3 className="text-base font-black tracking-tight mt-0.5">
              Faculty Coverage, Staff Attendance &amp; Payroll Management
            </h3>
            <p className="text-xs text-purple-200/80">
              Departmental staffing ratios, faculty turnout roll-call, leave applications, and monthly salary disbursal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          <button
            onClick={() => setActiveTab('staff-attendance')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500 hover:bg-purple-400 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Mark Staff Turnout</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Faculty Dossiers</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('staff-attendance')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Faculty Turnout Today
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {turnoutStats.rate}%
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {turnoutStats.present} Present
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, turnoutStats.rate)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{totalStaffCount} Active Faculty</span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">Attendance Log →</span>
          </p>
        </div>

        <div
          onClick={() => setActiveTab('staff-attendance')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Leave Requests
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {pendingLeaves.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">Applications</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Awaiting administrative/HR approval
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between">
            <span>Review Requests</span>
            <span>Review →</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('payroll')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Monthly Salary Disbursal
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {payrollSummary.disbursedCount} / {payrollSummary.totalStaff}
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {payrollSummary.disbursalRate}% Paid
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Disbursed: {formatCurrency(payrollSummary.totalDisbursed, settings.currencySymbol)}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-between">
            <span>Pending: {formatCurrency(payrollSummary.pendingDisbursal, settings.currencySymbol)}</span>
            <span>Payroll Hub →</span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('staff')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Departments
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {departments.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">Depts</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Staff roster and credentials
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-between">
            <span>Staff Directory</span>
            <span>View Roster →</span>
          </div>
        </div>
      </div>

      {/* Departmental Faculty Coverage Breakdown */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600" />
              <span>Departmental Faculty Coverage Today</span>
            </h4>
            <p className="text-xs text-slate-500">Attendance and active staff availability by department</p>
          </div>
          <button
            onClick={() => setActiveTab('staff')}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            <span>All Faculty</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map(dept => (
            <div
              key={dept.name}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white">{dept.name}</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">{dept.rate}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-1.5 rounded-full"
                  style={{ width: `${dept.rate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{dept.present} Present</span>
                <span>{dept.total} Total Staff</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
