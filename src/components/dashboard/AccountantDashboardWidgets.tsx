import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { MonthlyRevenueExpensesWidget } from './MonthlyRevenueExpensesWidget';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  Wallet,
  AlertTriangle,
  CreditCard,
  Building,
  Search,
  Phone,
  FileText,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import {
  formatCurrency,
  getTodayDateString,
  getCurrentMonthName,
} from '../../utils/formatters';
import { PaymentMode } from '../../types';

export const AccountantDashboardWidgets: React.FC = () => {
  const {
    staff,
    feePayments,
    expenses,
    settings,
    setActiveTab,
    setSelectedStudentIdForDetail,
    getDefaultersList,
    getMonthlyStats,
  } = useSchool();

  const [searchDefaulter, setSearchDefaulter] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'high' | 'moderate'>('all');

  const today = getTodayDateString();
  const currentMonth = getCurrentMonthName();
  const monthlyStats = getMonthlyStats();
  const defaulters = getDefaultersList();

  // 1. Fee Collection By Payment Mode Breakdown
  const paymentModeBreakdown = useMemo(() => {
    const currentMonthPayments = feePayments.filter(
      p => p.monthFor === currentMonth || (p.date && p.date.startsWith(today.slice(0, 7)))
    );

    const modeTotals: Record<PaymentMode, number> = {
      'Cash': 0,
      'Bank Transfer': 0,
      'Online/UPI': 0,
      'Cheque': 0,
      'Card': 0,
      'Other': 0,
    };

    const modeCounts: Record<PaymentMode, number> = {
      'Cash': 0,
      'Bank Transfer': 0,
      'Online/UPI': 0,
      'Cheque': 0,
      'Card': 0,
      'Other': 0,
    };

    for (const p of currentMonthPayments) {
      const mode = p.paymentMode || 'Cash';
      if (modeTotals[mode] !== undefined) {
        modeTotals[mode] += p.totalAmount;
        modeCounts[mode] += 1;
      } else {
        modeTotals['Cash'] += p.totalAmount;
        modeCounts['Cash'] += 1;
      }
    }

    const totalCollected = Object.values(modeTotals).reduce((s, v) => s + v, 0);

    const colors: Record<PaymentMode, string> = {
      'Cash': '#10b981', // emerald-500
      'Bank Transfer': '#4f46e5', // indigo-600
      'Online/UPI': '#0ea5e9', // sky-500
      'Cheque': '#f59e0b', // amber-500
      'Card': '#8b5cf6', // violet-500
      'Other': '#64748b', // slate-500
    };

    return (Object.keys(modeTotals) as PaymentMode[])
      .filter(mode => modeTotals[mode] > 0 || mode === 'Cash' || mode === 'Bank Transfer' || mode === 'Online/UPI')
      .map(mode => ({
        mode,
        label: mode,
        amount: modeTotals[mode],
        transactions: modeCounts[mode],
        percentage: totalCollected > 0 ? Math.round((modeTotals[mode] / totalCollected) * 100) : 0,
        color: colors[mode] || '#6366f1',
      }));
  }, [feePayments, currentMonth, today]);

  // 2. Daily Fee Collections (Last 7 Days)
  const dailyCollectionTrend = useMemo(() => {
    const days: { date: string; displayDate: string; amount: number; count: number }[] = [];
    const todayDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

      const dayPayments = feePayments.filter(p => p.date === iso);
      const amount = dayPayments.reduce((s, p) => s + p.totalAmount, 0);

      days.push({
        date: iso,
        displayDate: dayName,
        amount,
        count: dayPayments.length,
      });
    }
    return days;
  }, [feePayments]);

  // 3. Categorized Expenses Distribution
  const expenseCategories = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const exp of expenses) {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    }

    const colors: Record<string, string> = {
      'Staff Salaries': '#4f46e5',
      'Utilities': '#0ea5e9',
      'Maintenance': '#f59e0b',
      'Academic Supplies': '#10b981',
      'Transportation': '#8b5cf6',
      'Events': '#ec4899',
      'Miscellaneous': '#64748b',
    };

    const totalExpenses = Object.values(totals).reduce((a, b) => a + b, 0);

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
        color: colors[name] || '#6366f1',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // 4. Overdue Defaulters Table Data
  const studentBalanceAlerts = useMemo(() => {
    return defaulters.map(({ student, pendingAmount, lastPaymentDate }) => {
      let severity: 'critical' | 'high' | 'moderate' = 'moderate';
      let badgeLabel = 'MODERATE';
      let badgeColor = 'amber';

      if (pendingAmount >= 1000) {
        severity = 'critical';
        badgeLabel = 'CRITICAL OVERDUE';
        badgeColor = 'rose';
      } else if (pendingAmount >= 500) {
        severity = 'high';
        badgeLabel = 'HIGH BALANCE';
        badgeColor = 'orange';
      }

      return {
        id: `student-${student.id}`,
        student,
        name: student.fullName,
        rollNo: student.rollNo,
        className: student.className,
        section: student.section,
        guardianName: student.guardianName,
        contactNumber: student.contactNumber,
        amount: pendingAmount,
        severity,
        badgeLabel,
        badgeColor,
        lastPaymentDate,
      };
    });
  }, [defaulters]);

  const filteredDefaulters = useMemo(() => {
    return studentBalanceAlerts.filter(item => {
      if (filterSeverity !== 'all' && item.severity !== filterSeverity) return false;
      if (searchDefaulter.trim()) {
        const q = searchDefaulter.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.rollNo.toLowerCase().includes(q) ||
          item.className.toLowerCase().includes(q) ||
          (item.guardianName && item.guardianName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [studentBalanceAlerts, filterSeverity, searchDefaulter]);

  // 5. Staff Salary Disbursal Status for Current Month
  const staffPayrollSummary = useMemo(() => {
    const activeStaff = staff.filter(s => s.status === 'active');
    let totalPayrollObligation = 0;
    let totalDisbursed = 0;
    let disbursedCount = 0;

    for (const member of activeStaff) {
      const netSalary = member.monthlySalary + (member.allowances || 0) - (member.deductions || 0);
      totalPayrollObligation += netSalary;

      const paidExpense = expenses.find(
        e =>
          e.category === 'Staff Salaries' &&
          e.staffId === member.id &&
          e.monthForSalary === currentMonth
      );

      if (paidExpense) {
        totalDisbursed += paidExpense.amount;
        disbursedCount += 1;
      }
    }

    const pendingDisbursal = Math.max(0, totalPayrollObligation - totalDisbursed);
    const disbursalRate = totalPayrollObligation > 0
      ? Math.round((totalDisbursed / totalPayrollObligation) * 100)
      : 100;

    return {
      totalStaff: activeStaff.length,
      disbursedCount,
      totalPayrollObligation,
      totalDisbursed,
      pendingDisbursal,
      disbursalRate,
    };
  }, [staff, expenses, currentMonth]);

  const totalFeeCollected = monthlyStats.totalFeeCollectedThisMonth;
  const totalExpenses = monthlyStats.totalExpensesThisMonth;
  const netCashFlow = totalFeeCollected - totalExpenses;
  const totalPendingDues = monthlyStats.totalPendingThisMonth;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Accountant Notice / Context Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Accountant &amp; Finance Persona
              </span>
              <span className="text-xs text-emerald-200">Fiscal Period: {currentMonth}</span>
            </div>
            <h3 className="text-base font-black tracking-tight mt-0.5">
              Financial Health, Invoices &amp; Accounts Ledger Console
            </h3>
            <p className="text-xs text-emerald-200/80">
              Specialized ledger tracking fee receipts velocity, payment channels, operating burn, and tuition recovery.
            </p>
          </div>
        </div>

        {/* Quick Finance Actions */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          <button
            onClick={() => setActiveTab('fee-collection')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-slate-950" />
            <span>Collect Fee</span>
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Day Ledger</span>
          </button>
        </div>
      </div>

      {/* Row 1: Specialized Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Month's Fee Collection */}
        <div
          onClick={() => setActiveTab('fee-collection')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fee Collections ({currentMonth.split(' ')[0]})
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalFeeCollected, settings.currencySymbol)}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {monthlyStats.collectionPercentage}% Recovered
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, monthlyStats.collectionPercentage)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Expected: {formatCurrency(monthlyStats.totalExpectedThisMonth, settings.currencySymbol)}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">View Register →</span>
          </p>
        </div>

        {/* Card 2: Outstanding Overdue Dues */}
        <div
          onClick={() => setActiveTab('due-fees')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-300 dark:hover:border-rose-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Overdue Tuition Dues
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(totalPendingDues, settings.currencySymbol)}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {defaulters.length} Accounts
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Across {studentBalanceAlerts.filter(s => s.severity === 'critical').length} critical delinquent students
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center justify-between">
            <span>Immediate Action Required</span>
            <span>Follow Up →</span>
          </div>
        </div>

        {/* Card 3: Operating Expenses Burn */}
        <div
          onClick={() => setActiveTab('expenses')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Operational Expenses
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {formatCurrency(totalExpenses, settings.currencySymbol)}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {expenses.length} Records
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 line-clamp-1">
            Top Category: {expenseCategories[0]?.name || 'Staff Salaries'} ({expenseCategories[0]?.percentage || 0}%)
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Audit trail verified</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Expense Log →</span>
          </div>
        </div>

        {/* Card 4: Net Operating Cash Flow */}
        <div
          onClick={() => setActiveTab('ledger')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Net Operational Surplus
            </span>
            <div className={`p-2 rounded-xl ${netCashFlow >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatCurrency(netCashFlow, settings.currencySymbol)}
            </span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Income minus Operating Expenses for {currentMonth}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center justify-between">
            <span>Financial Statements</span>
            <span>View Ledger →</span>
          </div>
        </div>
      </div>

      {/* Row 2: Comprehensive Cash Flow Widget (Recharts) */}
      <MonthlyRevenueExpensesWidget />

      {/* Row 3: Payment Channel Breakdown & Daily Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Channels (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Collections by Payment Mode</span>
              </h4>
              <p className="text-xs text-slate-500">Receipts distributed across financial rails</p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {formatCurrency(totalFeeCollected, settings.currencySymbol)}
            </span>
          </div>

          <div className="space-y-3">
            {paymentModeBreakdown.map(channel => (
              <div key={channel.mode} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: channel.color }}
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {channel.label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({channel.transactions} txn)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(channel.amount, settings.currencySymbol)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {channel.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${channel.percentage}%`,
                      backgroundColor: channel.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Staff Payroll Status Card */}
          <div className="mt-4 p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Monthly Staff Payroll Status</span>
              </span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300">
                {staffPayrollSummary.disbursedCount} of {staffPayrollSummary.totalStaff} Paid
              </span>
            </div>
            <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-400 h-1.5 rounded-full"
                style={{ width: `${staffPayrollSummary.disbursalRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
              <span>Disbursed: {formatCurrency(staffPayrollSummary.totalDisbursed, settings.currencySymbol)}</span>
              <span>Pending: {formatCurrency(staffPayrollSummary.pendingDisbursal, settings.currencySymbol)}</span>
            </div>
          </div>
        </div>

        {/* 7-Day Fee Collection Velocity Chart (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Daily Fee Collection Velocity (Past 7 Days)</span>
              </h4>
              <p className="text-xs text-slate-500">Day-by-day inflow of tuition dues</p>
            </div>
            <button
              onClick={() => setActiveTab('fee-collection')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Fee Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCollectionTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8', strokeWidth: 0.5 }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={val => `${val}`}
                />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">{data.displayDate}</p>
                          <p className="text-emerald-400 font-mono font-bold text-sm">
                            {formatCurrency(data.amount, settings.currencySymbol)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {data.count} transaction(s) recorded
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Today Collected</span>
              <p className="font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatCurrency(
                  dailyCollectionTrend[dailyCollectionTrend.length - 1]?.amount || 0,
                  settings.currencySymbol
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">7-Day Total</span>
              <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(
                  dailyCollectionTrend.reduce((s, d) => s + d.amount, 0),
                  settings.currencySymbol
                )}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">7-Day Txns</span>
              <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {dailyCollectionTrend.reduce((s, d) => s + d.count, 0)} Receipts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Prioritized Fee Defaulters Recovery Console */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Prioritized Tuition Defaulters Ledger ({filteredDefaulters.length})</span>
            </h4>
            <p className="text-xs text-slate-500">
              Actionable list of outstanding accounts requiring fee recovery and reminder follow-up
            </p>
          </div>

          {/* Filter Chips & Search */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll..."
                value={searchDefaulter}
                onChange={e => setSearchDefaulter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
              {(['all', 'critical', 'high', 'moderate'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                    filterSeverity === sev
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Defaulter Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-2.5 px-3">Student &amp; Roll No</th>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Guardian &amp; Phone</th>
                <th className="py-2.5 px-3">Overdue Balance</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
              {filteredDefaulters.slice(0, 8).map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Roll: {item.rollNo}</span>
                  </td>
                  <td className="py-2.5 px-3 font-semibold">
                    {item.className} - {item.section}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="block text-slate-800 dark:text-slate-200">{item.guardianName}</span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {item.contactNumber || 'No phone'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatCurrency(item.amount, settings.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                          : item.severity === 'high'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                      }`}
                    >
                      {item.badgeLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedStudentIdForDetail(item.student.id);
                        setActiveTab('fee-collection');
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      Collect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDefaulters.length > 8 && (
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('due-fees')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View All {filteredDefaulters.length} Defaulters in Due Fees Manager</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
