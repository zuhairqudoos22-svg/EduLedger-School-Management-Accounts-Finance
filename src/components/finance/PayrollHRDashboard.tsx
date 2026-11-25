import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  Staff,
  PaymentMode,
  Expense,
  MonthlyPayrollRun,
  StaffLoan,
  StaffAdvance,
  PayrollAuditLog,
  EmployeePayrollItem,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getTodayDateString,
  exportToCSV,
  exportToExcel,
} from '../../utils/formatters';
import { payrollStorage } from '../../utils/payrollStorage';
import { PayrollRunsTab } from './PayrollRunsTab';
import { PaySlipModal } from './PaySlipModal';
import { FiscalYearPayrollProjectionChart } from './FiscalYearPayrollProjectionChart';
import { PayrollAuditLogModal } from './PayrollAuditLogModal';
import { DedicatedPrintStudioModal } from '../common/DedicatedPrintStudioModal';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  CreditCard,
  Wallet,
  PiggyBank,
  FileText,
  Calendar,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
  ShieldCheck,
  Check,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Play,
  ArrowRight,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  FileCheck,
  Layers,
  CheckCircle,
  X,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const PayrollHRDashboard: React.FC<{ initialTab?: string }> = ({ initialTab }) => {
  const {
    staff,
    expenses,
    staffLeaves,
    settings,
    recordExpense,
    deleteExpense,
    staffAttendance,
    payrollRuns: contextPayrollRuns,
    salaryRecords: contextSalaryRecords,
  } = useSchool();
  const { currentUser, isAdmin, isFinance } = useAuth();

  // Active sub-tab within Payroll & HR: exactly the 6 requested tabs
  const [activeTab, setActiveTab] = useState<
    'overview' | 'runs' | 'loans' | 'advances' | 'reports' | 'bank_transfer'
  >((initialTab as any) || 'overview');

  // Selected Month for Overview & Runs
  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const months = ['July 2026', 'August 2026', 'September 2026', 'October 2026', 'November 2026'];

  // Current today string
  const today = getTodayDateString();

  // Persistent Payroll State (synchronizing between SchoolContext IndexedDB and payrollStorage)
  const [runs, setRuns] = useState<MonthlyPayrollRun[]>(() =>
    contextPayrollRuns && contextPayrollRuns.length > 0 ? contextPayrollRuns : payrollStorage.loadRuns()
  );
  const [loans, setLoans] = useState<StaffLoan[]>(() => payrollStorage.loadLoans());
  const [advances, setAdvances] = useState<StaffAdvance[]>(() => payrollStorage.loadAdvances());
  const [auditLogs, setAuditLogs] = useState<PayrollAuditLog[]>(() => payrollStorage.loadAuditLogs());

  // Keep runs synced whenever contextPayrollRuns updates from IndexedDB
  useEffect(() => {
    if (contextPayrollRuns && contextPayrollRuns.length > 0) {
      setRuns(contextPayrollRuns);
    }
  }, [contextPayrollRuns]);

  // Reload storage when context or runs change
  useEffect(() => {
    setAuditLogs(payrollStorage.loadAuditLogs());
  }, [runs, loans, advances]);

  // Modal States
  const [selectedStaffForPayslip, setSelectedStaffForPayslip] = useState<{
    member: Staff;
    isPaid: boolean;
    paidDate?: string;
    paymentRef?: string;
    paymentMode?: PaymentMode;
  } | null>(null);

  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);
  const [autoOpenGenerateModal, setAutoOpenGenerateModal] = useState(false);

  // Loan Modals State
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [selectedLoanForDetail, setSelectedLoanForDetail] = useState<StaffLoan | null>(null);
  const [isLoanAgreementSlipOpen, setIsLoanAgreementSlipOpen] = useState(false);
  const [loanForSlip, setLoanForSlip] = useState<StaffLoan | null>(null);

  // Advance Modals State
  const [isNewAdvanceModalOpen, setIsNewAdvanceModalOpen] = useState(false);
  const [isAdvanceVoucherSlipOpen, setIsAdvanceVoucherSlipOpen] = useState(false);
  const [advanceForSlip, setAdvanceForSlip] = useState<StaffAdvance | null>(null);

  // Reports State
  const [selectedReportType, setSelectedReportType] = useState('monthly_summary');
  const [reportDeptFilter, setReportDeptFilter] = useState('all');
  const [reportSearch, setReportSearch] = useState('');

  // Bank Transfer Tab State
  const [selectedRunForBank, setSelectedRunForBank] = useState<string>('pr-2026-10');
  const [editingBankStaff, setEditingBankStaff] = useState<Staff | null>(null);
  const [bankEditForm, setBankEditForm] = useState({ bankName: '', accountTitle: '', accountNumber: '', branchName: '' });

  // Form states for New Loan
  const [loanStaffId, setLoanStaffId] = useState('');
  const [loanAmount, setLoanAmount] = useState<number>(50000);
  const [loanInstallments, setLoanInstallments] = useState<number>(5);
  const [loanInstallmentAmount, setLoanInstallmentAmount] = useState<number>(10000);
  const [loanStartDate, setLoanStartDate] = useState(today);
  const [loanStartMonth, setLoanStartMonth] = useState('October 2026');
  const [loanReason, setLoanReason] = useState('');

  // Form states for New Advance
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState<number>(15000);
  const [advDate, setAdvDate] = useState(today);
  const [advRecoveryMonth, setAdvRecoveryMonth] = useState('November 2026');
  const [advRecoveryMethod, setAdvRecoveryMethod] = useState<'Full in next payroll' | 'Split across months'>('Full in next payroll');
  const [advReason, setAdvReason] = useState('');

  // Repayment form for active loan
  const [manualRepayAmount, setManualRepayAmount] = useState<number>(10000);
  const [skipReason, setSkipReason] = useState('');

  // Notification Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Active staff list
  const activeStaffList = useMemo(() => staff.filter(s => s.status === 'active'), [staff]);

  // Current month run (if generated)
  const currentMonthRun = useMemo(() => {
    return runs.find(r => r.month.trim().toLowerCase() === selectedMonth.trim().toLowerCase());
  }, [runs, selectedMonth]);

  // ==========================================
  // TAB 1: OVERVIEW KPI CARDS
  // ==========================================
  const totalEmployees = staff.length;
  const activeEmployees = activeStaffList.length;

  const staffWithoutSalaryStructure = useMemo(() => {
    return activeStaffList.filter(s => !s.monthlySalary || s.monthlySalary <= 0);
  }, [activeStaffList]);

  // Monthly Gross, Net, Deductions
  const currentMonthGrossPayroll = useMemo(() => {
    if (currentMonthRun) {
      return (
        currentMonthRun.totalBasicSalary +
        currentMonthRun.totalAllowances +
        (currentMonthRun.totalBonuses || 0) +
        (currentMonthRun.totalOvertime || 0)
      );
    }
    return activeStaffList.reduce((sum, s) => sum + (s.monthlySalary + (s.allowances || 0)), 0);
  }, [currentMonthRun, activeStaffList]);

  const currentMonthNetPayable = useMemo(() => {
    if (currentMonthRun) {
      return currentMonthRun.totalNetPayroll;
    }
    return activeStaffList.reduce(
      (sum, s) => sum + (s.monthlySalary + (s.allowances || 0) - (s.deductions || 0)),
      0
    );
  }, [currentMonthRun, activeStaffList]);

  const currentMonthTotalDeductions = useMemo(() => {
    if (currentMonthRun) {
      return currentMonthRun.totalDeductions;
    }
    return activeStaffList.reduce((sum, s) => sum + (s.deductions || 0), 0);
  }, [currentMonthRun, activeStaffList]);

  // Salary Paid vs Pending for selected month
  const salaryPaidAmount = useMemo(() => {
    if (currentMonthRun && currentMonthRun.status === 'paid') {
      return currentMonthRun.totalNetPayroll;
    }
    const matchingExpenses = expenses.filter(
      e =>
        (e.category === 'Staff Salaries' || !!e.staffId) &&
        (e.monthForSalary === selectedMonth || e.title.includes(selectedMonth))
    );
    return matchingExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [currentMonthRun, expenses, selectedMonth]);

  const salaryPendingAmount = Math.max(0, currentMonthNetPayable - salaryPaidAmount);

  // Outstanding Loans & Advances
  const totalOutstandingLoans = useMemo(() => {
    return loans
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + (l.balanceRemaining ?? 0), 0);
  }, [loans]);

  const totalOutstandingAdvances = useMemo(() => {
    return advances
      .filter(a => a.status === 'approved')
      .reduce((sum, a) => sum + (a.balanceRemaining ?? a.requestedAmount - a.recoveredAmount), 0);
  }, [advances]);

  // Staff on leave today
  const staffOnLeaveTodayCount = useMemo(() => {
    if (!staffLeaves) return 0;
    return staffLeaves.filter(
      l => l.status === 'approved' && l.startDate <= today && l.endDate >= today
    ).length;
  }, [staffLeaves, today]);

  // ==========================================
  // CHARTS DATA
  // ==========================================
  // 1. Monthly Payroll Cost Trend (last 12 months)
  const monthlySalaryTrendData = useMemo(() => {
    const monthKeys = [
      'November 2025',
      'December 2025',
      'January 2026',
      'February 2026',
      'March 2026',
      'April 2026',
      'May 2026',
      'June 2026',
      'July 2026',
      'August 2026',
      'September 2026',
      'October 2026',
    ];

    return monthKeys.map(m => {
      // Check payroll runs first
      const run = runs.find(r => r.month === m);
      if (run) {
        return {
          month: m.split(' ')[0].slice(0, 3),
          fullMonth: m,
          cost: run.totalNetPayroll,
          gross: run.totalBasicSalary + run.totalAllowances,
        };
      }
      // Check expenses
      const mExpenses = expenses.filter(
        e =>
          (e.category === 'Staff Salaries' || !!e.staffId) &&
          (e.monthForSalary === m || e.title.includes(m))
      );
      const total = mExpenses.reduce((sum, e) => sum + e.amount, 0);
      return {
        month: m.split(' ')[0].slice(0, 3),
        fullMonth: m,
        cost: total > 0 ? total : 31000 + Math.floor(Math.sin(m.length) * 2000),
        gross: 36000,
      };
    });
  }, [runs, expenses]);

  // 2. Paid vs Pending Donut
  const paidVsPendingData = useMemo(() => {
    return [
      { name: 'Paid Salary', value: salaryPaidAmount > 0 ? salaryPaidAmount : 0, color: '#10b981' },
      { name: 'Pending Salary', value: salaryPendingAmount > 0 ? salaryPendingAmount : 1, color: '#f59e0b' },
    ];
  }, [salaryPaidAmount, salaryPendingAmount]);

  // 3. Department-wise salary distribution
  const departmentPayrollData = useMemo(() => {
    const deptMap: Record<string, { count: number; totalSalary: number }> = {};
    activeStaffList.forEach(s => {
      const dept = s.department || 'Other';
      if (!deptMap[dept]) {
        deptMap[dept] = { count: 0, totalSalary: 0 };
      }
      deptMap[dept].count += 1;
      deptMap[dept].totalSalary += s.monthlySalary + (s.allowances || 0) - (s.deductions || 0);
    });

    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];
    return Object.entries(deptMap).map(([name, data], idx) => ({
      name,
      staffCount: data.count,
      salary: data.totalSalary,
      color: colors[idx % colors.length],
    }));
  }, [activeStaffList]);

  // 4. Earnings vs Deductions Breakdown (stacked bar)
  const earningsVsDeductionsData = useMemo(() => {
    const basic = currentMonthRun ? currentMonthRun.totalBasicSalary : 34100;
    const allowances = currentMonthRun ? currentMonthRun.totalAllowances : 2650;
    const bonuses = currentMonthRun ? (currentMonthRun.totalBonuses || 0) : 500;
    const deductions = currentMonthTotalDeductions;
    const net = currentMonthNetPayable;

    return [
      {
        category: 'Payroll Breakdown',
        Basic: basic,
        Allowances: allowances,
        Bonuses: bonuses,
        Deductions: deductions,
        Net: net,
      },
    ];
  }, [currentMonthRun, currentMonthTotalDeductions, currentMonthNetPayable]);

  // ==========================================
  // EXPENSE POSTING HANDLERS
  // ==========================================
  const handlePostSalaryExpense = async (
    run: MonthlyPayrollRun,
    paymentMethod: string,
    paymentDate: string
  ): Promise<string> => {
    const newExpense = await recordExpense({
      title: `Staff Salaries Disbursement - ${run.month}`,
      amount: run.totalNetPayroll,
      category: 'Staff Salaries',
      date: paymentDate,
      paymentMode: (paymentMethod === 'bank'
        ? 'Bank Transfer'
        : paymentMethod === 'cash'
        ? 'Cash'
        : 'Cheque') as any,
      referenceNumber: `SAL-${run.month.replace(' ', '-').toUpperCase()}-${Date.now().toString().slice(-4)}`,
      notes: `Automated salary expense voucher generated for ${run.totalEmployees} employees (${run.month}). Net amount: ${run.totalNetPayroll}`,
      recordedBy: currentUser?.fullName || 'Finance Officer',
      monthForSalary: run.month,
      source: 'system',
    });
    return newExpense.id;
  };

  const handleDeleteSalaryExpense = async (expenseId: string) => {
    if (deleteExpense) {
      await deleteExpense(expenseId);
    }
  };

  // Open Payslip handler
  const handleOpenPayslipForEmployee = (emp: EmployeePayrollItem, month: string) => {
    const matchedStaff = staff.find(s => s.id === emp.staffId) || {
      id: emp.staffId,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      designation: emp.designation,
      department: emp.department,
      monthlySalary: emp.basicSalary,
      allowances: emp.allowances,
      deductions: emp.totalDeductions,
      paymentMode: emp.paymentMode,
      status: 'active' as const,
      joinedDate: '2023-01-01',
      leaveBalance: { casual: 10, sick: 8, annual: 14 },
    };

    setSelectedStaffForPayslip({
      member: matchedStaff as Staff,
      isPaid: emp.status === 'paid',
      paidDate: emp.paidDate,
      paymentRef: emp.transactionRef,
      paymentMode: emp.paymentMode,
    });
  };

  // ==========================================
  // LOANS MANAGEMENT HANDLERS
  // ==========================================
  const handleOpenNewLoanModal = () => {
    setLoanStaffId(activeStaffList[0]?.id || '');
    setLoanAmount(50000);
    setLoanInstallments(5);
    setLoanInstallmentAmount(10000);
    setLoanStartDate(today);
    setLoanStartMonth(selectedMonth);
    setLoanReason('');
    setIsNewLoanModalOpen(true);
  };

  const handleCreateLoan = () => {
    const targetStaff = staff.find(s => s.id === loanStaffId);
    if (!targetStaff) {
      alert('Please select a valid staff member.');
      return;
    }

    // Validation: 1 active loan rule
    const existingActiveLoan = loans.find(l => l.staffId === loanStaffId && l.status === 'active');
    if (existingActiveLoan) {
      alert(
        `Staff member ${targetStaff.fullName} already has an active loan with balance ${formatCurrency(
          existingActiveLoan.balanceRemaining,
          settings.currencySymbol
        )}. Only one active loan is permitted.`
      );
      return;
    }

    // Validation: Max salary multiplier (e.g. 5x monthly salary)
    const maxAllowed = targetStaff.monthlySalary * 5;
    if (loanAmount > maxAllowed) {
      alert(
        `Loan amount (${formatCurrency(loanAmount, settings.currencySymbol)}) exceeds the maximum allowed limit of 5x monthly salary (${formatCurrency(
          maxAllowed,
          settings.currencySymbol
        )}).`
      );
      return;
    }

    const newLoan: StaffLoan = {
      id: `loan-${Date.now()}`,
      loanNumber: `LOAN-2026-${Date.now().toString().slice(-4)}`,
      staffId: targetStaff.id,
      staffName: targetStaff.fullName,
      employeeCode: targetStaff.employeeCode,
      department: targetStaff.department,
      designation: targetStaff.designation,
      principalAmount: Number(loanAmount),
      totalAmount: Number(loanAmount),
      monthlyInstallment: Number(loanInstallmentAmount),
      totalInstallments: Number(loanInstallments),
      paidInstallments: 0,
      amountRepaid: 0,
      balanceRemaining: Number(loanAmount),
      disbursementDate: loanStartDate,
      startMonth: loanStartMonth,
      reason: loanReason || 'Staff personal development loan',
      status: 'active',
      paymentMode: targetStaff.paymentMode || 'Bank Transfer',
      approvedBy: currentUser?.fullName || 'Administrator',
      repaymentHistory: [],
      createdAt: new Date().toISOString(),
    };

    const updatedLoans = payrollStorage.saveSingleLoan(newLoan);
    setLoans(updatedLoans);

    payrollStorage.addAuditLog({
      action: 'loan_added',
      title: `Loan Issued: ${targetStaff.fullName}`,
      details: `New loan of ${formatCurrency(loanAmount, settings.currencySymbol)} issued across ${loanInstallments} installments.`,
      userName: currentUser?.fullName || 'Finance Officer',
      userRole: currentUser?.role || 'Finance',
      targetId: newLoan.id,
      targetName: targetStaff.fullName,
      amount: loanAmount,
    });

    setIsNewLoanModalOpen(false);
    showToast(`Loan of ${formatCurrency(loanAmount, settings.currencySymbol)} issued to ${targetStaff.fullName}!`);
  };

  const handleManualRepayment = (loan: StaffLoan) => {
    if (manualRepayAmount <= 0) return;
    const payment = Math.min(manualRepayAmount, loan.balanceRemaining);
    const newPaid = loan.amountRepaid + payment;
    const newBal = loan.balanceRemaining - payment;

    const updatedLoan: StaffLoan = {
      ...loan,
      amountRepaid: newPaid,
      balanceRemaining: newBal,
      status: newBal === 0 ? 'completed' : 'active',
      repaymentHistory: [
        ...(loan.repaymentHistory || []),
        {
          id: `rep-${Date.now()}`,
          date: today,
          payrollMonth: selectedMonth,
          amount: payment,
          type: 'manual_repayment',
          notes: 'Direct counter repayment',
        },
      ],
    };

    const updated = payrollStorage.saveSingleLoan(updatedLoan);
    setLoans(updated);
    setSelectedLoanForDetail(updatedLoan);

    payrollStorage.addAuditLog({
      action: 'loan_repaid',
      title: `Extra Loan Repayment: ${loan.staffName}`,
      details: `Received manual repayment of ${formatCurrency(payment, settings.currencySymbol)}. Remaining balance: ${formatCurrency(
        newBal,
        settings.currencySymbol
      )}.`,
      userName: currentUser?.fullName || 'Finance Officer',
      userRole: currentUser?.role || 'Finance',
      targetId: loan.id,
      amount: payment,
    });

    showToast(`Manual repayment of ${formatCurrency(payment, settings.currencySymbol)} recorded.`);
  };

  const handleEarlySettlement = (loan: StaffLoan) => {
    if (!window.confirm(`Settle and close remaining balance of ${formatCurrency(loan.balanceRemaining, settings.currencySymbol)} for ${loan.staffName}?`)) {
      return;
    }
    const settlementAmount = loan.balanceRemaining;
    const updatedLoan: StaffLoan = {
      ...loan,
      amountRepaid: loan.amountRepaid + settlementAmount,
      balanceRemaining: 0,
      paidInstallments: loan.totalInstallments,
      status: 'completed',
      repaymentHistory: [
        ...(loan.repaymentHistory || []),
        {
          id: `rep-${Date.now()}`,
          date: today,
          payrollMonth: selectedMonth,
          amount: settlementAmount,
          type: 'early_settlement',
          notes: 'Full early loan closure settlement',
        },
      ],
    };

    const updated = payrollStorage.saveSingleLoan(updatedLoan);
    setLoans(updated);
    setSelectedLoanForDetail(updatedLoan);

    payrollStorage.addAuditLog({
      action: 'loan_settled',
      title: `Early Loan Settlement: ${loan.staffName}`,
      details: `Full early closure of ${formatCurrency(settlementAmount, settings.currencySymbol)}. Loan marked as Completed.`,
      userName: currentUser?.fullName || 'Finance Officer',
      userRole: currentUser?.role || 'Finance',
      targetId: loan.id,
      amount: settlementAmount,
    });

    showToast(`Loan fully settled and marked as Completed!`);
  };

  const handleSkipInstallment = (loan: StaffLoan) => {
    if (!skipReason.trim()) {
      alert('Please provide a reason for skipping this month\'s installment.');
      return;
    }

    const updatedLoan: StaffLoan = {
      ...loan,
      skipHistory: [
        ...(loan.skipHistory || []),
        {
          id: `skip-${Date.now()}`,
          month: selectedMonth,
          reason: skipReason,
          skippedDate: today,
          approvedBy: currentUser?.fullName || 'Finance Officer',
        },
      ],
    };

    const updated = payrollStorage.saveSingleLoan(updatedLoan);
    setLoans(updated);
    setSelectedLoanForDetail(updatedLoan);
    setSkipReason('');

    payrollStorage.addAuditLog({
      action: 'loan_skipped',
      title: `Loan Installment Rescheduled: ${loan.staffName}`,
      details: `Installment for ${selectedMonth} was postponed. Reason: ${skipReason}`,
      userName: currentUser?.fullName || 'Finance Officer',
      userRole: currentUser?.role || 'Finance',
      targetId: loan.id,
    });

    showToast(`Installment rescheduled for next payroll cycle.`);
  };

  // ==========================================
  // ADVANCES MANAGEMENT HANDLERS
  // ==========================================
  const handleOpenNewAdvanceModal = () => {
    setAdvStaffId(activeStaffList[0]?.id || '');
    setAdvAmount(15000);
    setAdvDate(today);
    setAdvRecoveryMonth(selectedMonth);
    setAdvRecoveryMethod('Full in next payroll');
    setAdvReason('');
    setIsNewAdvanceModalOpen(true);
  };

  const handleCreateAdvance = () => {
    const targetStaff = staff.find(s => s.id === advStaffId);
    if (!targetStaff) {
      alert('Please select a valid staff member.');
      return;
    }

    // Validation: cannot exceed 50% of monthly salary
    const maxAdvance = Math.round(targetStaff.monthlySalary * 0.5);
    if (advAmount > maxAdvance) {
      alert(
        `Advance request (${formatCurrency(advAmount, settings.currencySymbol)}) exceeds the limit of 50% monthly salary (${formatCurrency(
          maxAdvance,
          settings.currencySymbol
        )}).`
      );
      return;
    }

    const newAdvance: StaffAdvance = {
      id: `adv-${Date.now()}`,
      advanceNumber: `ADV-2026-${Date.now().toString().slice(-4)}`,
      staffId: targetStaff.id,
      staffName: targetStaff.fullName,
      employeeCode: targetStaff.employeeCode,
      department: targetStaff.department,
      designation: targetStaff.designation,
      requestedAmount: Number(advAmount),
      recoveredAmount: 0,
      balanceRemaining: Number(advAmount),
      appliedDate: advDate,
      recoveryMonth: advRecoveryMonth,
      recoveryMethod: advRecoveryMethod === 'Full in next payroll' ? 'next_payroll' : 'split',
      reason: advReason || 'Family medical emergency advance',
      status: isAdmin ? 'approved' : 'pending',
      approvedBy: isAdmin ? currentUser?.fullName : undefined,
      actionDate: isAdmin ? today : undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = payrollStorage.saveSingleAdvance(newAdvance);
    setAdvances(updated);

    payrollStorage.addAuditLog({
      action: 'advance_requested',
      title: `Advance Requested: ${targetStaff.fullName}`,
      details: `Salary advance of ${formatCurrency(advAmount, settings.currencySymbol)} requested. Status: ${newAdvance.status}.`,
      userName: currentUser?.fullName || 'Finance User',
      userRole: currentUser?.role || 'Finance',
      targetId: newAdvance.id,
      targetName: targetStaff.fullName,
      amount: advAmount,
    });

    setIsNewAdvanceModalOpen(false);
    showToast(`Salary advance request submitted successfully.`);
  };

  const handleApproveAdvance = (adv: StaffAdvance) => {
    if (!isAdmin) {
      alert('Only an Administrator can approve advance requests.');
      return;
    }

    const updatedAdv: StaffAdvance = {
      ...adv,
      status: 'approved',
      approvedBy: currentUser?.fullName || 'Administrator',
      actionDate: today,
    };

    const updated = payrollStorage.saveSingleAdvance(updatedAdv);
    setAdvances(updated);

    payrollStorage.addAuditLog({
      action: 'advance_approved',
      title: `Advance Approved: ${adv.staffName}`,
      details: `Advance of ${formatCurrency(adv.requestedAmount, settings.currencySymbol)} approved for recovery in ${adv.recoveryMonth}.`,
      userName: currentUser?.fullName || 'Administrator',
      userRole: 'Administrator',
      targetId: adv.id,
      amount: adv.requestedAmount,
    });

    showToast(`Advance for ${adv.staffName} approved!`);
  };

  const handleRejectAdvance = (adv: StaffAdvance) => {
    if (!isAdmin) {
      alert('Only an Administrator can reject advance requests.');
      return;
    }

    const updatedAdv: StaffAdvance = {
      ...adv,
      status: 'rejected',
      approvedBy: currentUser?.fullName || 'Administrator',
      actionDate: today,
      rejectionReason: 'Exceeded budgetary allocation',
    };

    const updated = payrollStorage.saveSingleAdvance(updatedAdv);
    setAdvances(updated);

    payrollStorage.addAuditLog({
      action: 'advance_rejected',
      title: `Advance Rejected: ${adv.staffName}`,
      details: `Advance request rejected by administration.`,
      userName: currentUser?.fullName || 'Administrator',
      userRole: 'Administrator',
      targetId: adv.id,
    });

    showToast(`Advance request rejected.`);
  };

  // ==========================================
  // BANK TRANSFER SHEET & EXPORTS
  // ==========================================
  const bankTransferRows = useMemo(() => {
    return activeStaffList.map(s => {
      const netPay = s.monthlySalary + (s.allowances || 0) - (s.deductions || 0);
      const hasBank = !!(s.bankDetails?.accountNumber || s.bankAccount);
      return {
        id: s.id,
        code: s.employeeCode,
        name: s.fullName,
        designation: s.designation,
        department: s.department,
        mode: s.paymentMode || 'Bank Transfer',
        bankName: s.bankDetails?.bankName || s.bankName || 'Meezan Bank Ltd',
        accountTitle: s.bankDetails?.accountTitle || s.fullName,
        accountNumber: s.bankDetails?.accountNumber || s.bankAccount || '',
        branchName: (s.bankDetails as any)?.branchName || 'Main Campus Branch',
        netSalary: netPay,
        hasMissingDetails: !hasBank,
      };
    });
  }, [activeStaffList]);

  const handleExportBankTransferSheet = (format: 'csv' | 'excel') => {
    const rows = bankTransferRows.map(r => ({
      'Employee Code': r.code,
      'Beneficiary Full Name': r.name,
      'Designation': r.designation,
      'Department': r.department,
      'Payment Mode': r.mode,
      'Bank Name': r.bankName,
      'Account Title': r.accountTitle,
      'Account Number / IBAN': r.accountNumber || 'MISSING ACCOUNT DETAILS',
      'Branch': r.branchName,
      'Net Payable (PKR)': r.netSalary,
    }));

    if (format === 'csv') {
      exportToCSV(`EduLedger_Bank_Transfer_Advice_${selectedMonth.replace(' ', '_')}`, rows);
    } else {
      exportToExcel(
        `EduLedger_Bank_Transfer_Advice_${selectedMonth.replace(' ', '_')}`,
        'Bank Advice',
        rows
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-2xl bg-indigo-600 text-white shadow-2xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Module Title Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-950">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              HRMS &amp; Compensation
            </span>
            <span className="text-xs text-indigo-200">Currency: {settings.currencySymbol}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-200 font-mono">
              Offline IndexedDB
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
            Payroll &amp; HR
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
            Automated monthly payroll runs, staff loan ledgers, short-term advances, printable payslips, and banking exports.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/15">
            <Calendar className="w-4 h-4 text-emerald-400 ml-1" />
            <span className="text-xs font-bold text-slate-200 uppercase">Cycle:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/20 focus:outline-hidden cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Dedicated 2-on-1 Print Studio */}
          <button
            type="button"
            onClick={() => setIsPrintStudioOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition cursor-pointer"
            title="Open Dedicated Print Studio: format for A6, A5, A4 and pair 2 different payroll slips on 1 page"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            <span>2-on-1 Print Studio (A6/A5/A4)</span>
          </button>

          {/* Audit Log Modal Button */}
          <button
            type="button"
            onClick={() => setIsAuditLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
            title="Open comprehensive Audit Log recording all payroll status changes, timestamps, and user IDs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Audit Log</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/40 text-indigo-200 font-mono font-bold">
              {auditLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Modern SaaS 6-Tab Navigation Bar (Wrapping Grid, Zero Cut-off, Zero Scrollbar) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs w-full box-border min-w-0">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'runs', label: 'Payroll Runs', icon: Play, badge: runs.length },
          { id: 'loans', label: 'Loans', icon: PiggyBank, badge: loans.filter(l => l.status === 'active').length },
          { id: 'advances', label: 'Advances', icon: Wallet, badge: advances.filter(a => a.status === 'pending').length || undefined },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'bank_transfer', label: 'Bank Transfer', icon: Building },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              id={t.id === 'runs' ? 'btn-payroll-runs' : `tab-${t.id}`}
              data-testid={t.id === 'runs' ? 'payrollruns-btn' : `tab-${t.id}`}
              aria-label={t.label}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold transition cursor-pointer w-full min-w-0 ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs ring-2 ring-indigo-500/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              <span className="truncate">{t.label}</span>
              {t.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW                                                */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Month Status Banner */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  !currentMonthRun
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    : currentMonthRun.status === 'draft'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                    : currentMonthRun.status === 'processed'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                    : currentMonthRun.status === 'approved'
                    ? 'bg-purple-100 dark:bg-purple-950 text-purple-600'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                }`}
              >
                {!currentMonthRun ? (
                  <Clock className="w-6 h-6" />
                ) : currentMonthRun.status === 'paid' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Lock className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Cycle Status &bull; {selectedMonth}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      !currentMonthRun
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : currentMonthRun.status === 'draft'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : currentMonthRun.status === 'processed'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : currentMonthRun.status === 'approved'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {!currentMonthRun ? 'NOT GENERATED' : currentMonthRun.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {!currentMonthRun
                    ? `Payroll for ${selectedMonth} has not been initiated yet.`
                    : currentMonthRun.status === 'paid'
                    ? `Salaries for ${selectedMonth} were disbursed on ${formatDate(
                        currentMonthRun.paidDate || today
                      )}.`
                    : `Payroll is currently in ${currentMonthRun.status.toUpperCase()} status (${currentMonthRun.totalEmployees} employees, Net: ${formatCurrency(
                        currentMonthRun.totalNetPayroll,
                        settings.currencySymbol
                      )}).`}
                </p>
              </div>
            </div>

            {/* Quick Button to Payroll Runs */}
            <button
              type="button"
              id="banner-payroll-run-btn"
              data-testid="banner-payroll-run-btn"
              onClick={() => {
                if (!currentMonthRun) {
                  setAutoOpenGenerateModal(true);
                }
                setActiveTab('runs');
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{currentMonthRun ? 'Manage Payroll Run' : 'Run Payroll for ' + selectedMonth}</span>
            </button>
          </div>

          {/* Alerts Panel */}
          {(staffWithoutSalaryStructure.length > 0 ||
            runs.some(r => r.status === 'processed') ||
            salaryPendingAmount > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {staffWithoutSalaryStructure.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">
                      Missing Salary Structures
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300">
                      {staffWithoutSalaryStructure.length} active staff member(s) have no basic salary defined and will be skipped during payroll generation.
                    </span>
                  </div>
                </div>
              )}

              {runs.some(r => r.status === 'processed') && (
                <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-purple-900 dark:text-purple-200 block">
                      Pending Administrator Approval
                    </span>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300">
                      Payroll runs are awaiting official Admin sign-off before salary disbursals can proceed.
                    </span>
                  </div>
                </div>
              )}

              {salaryPendingAmount > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-rose-900 dark:text-rose-200 block">
                      Pending Salary Disbursal
                    </span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-300">
                      {formatCurrency(salaryPendingAmount, settings.currencySymbol)} pending payment for {selectedMonth}.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions Panel */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Quick Operations
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <button
                type="button"
                id="quick-run-payroll-btn"
                data-testid="quick-run-payroll-btn"
                onClick={() => {
                  setAutoOpenGenerateModal(true);
                  setActiveTab('runs');
                }}
                className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-indigo-600" />
                <span>Run Payroll</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewLoanModal}
                className="flex items-center gap-2 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-purple-600" />
                <span>Add Loan</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewAdvanceModal}
                className="flex items-center gap-2 p-3 rounded-xl bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 font-bold text-xs transition cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-pink-600" />
                <span>Add Advance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bank_transfer')}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition cursor-pointer"
              >
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Generate Bank File</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className="flex items-center gap-2 p-3 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold text-xs transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Open Reports</span>
              </button>
            </div>
          </div>

          {/* 7 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total Staff */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Staff on Payroll
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {activeEmployees}
              </p>
              <span className="text-[10px] text-slate-400">{totalEmployees} total staff in system</span>
            </div>

            {/* 2. Gross Payroll */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 shadow-2xs">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                Month Gross Payroll
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-indigo-700 dark:text-indigo-400 mt-1">
                {formatCurrency(currentMonthGrossPayroll, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-indigo-600/80">Basic + allowances &amp; overtime</span>
            </div>

            {/* 3. Net Payable */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/80 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                Net Payable ({selectedMonth})
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {formatCurrency(currentMonthNetPayable, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-emerald-600">Net institutional liability</span>
            </div>

            {/* 4. Total Deductions */}
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-300 dark:border-rose-800/80 shadow-2xs">
              <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider block">
                Total Deductions
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-rose-700 dark:text-rose-400 mt-1">
                -{formatCurrency(currentMonthTotalDeductions, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-rose-600">Loans, advances, absences, tax</span>
            </div>

            {/* 5. Salary Paid vs Pending */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Disbursed vs Pending
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-bold text-sm text-emerald-600">
                  {formatCurrency(salaryPaidAmount, settings.currencySymbol)}
                </span>
                <span className="text-slate-400">/</span>
                <span className="font-mono font-bold text-sm text-amber-600">
                  {formatCurrency(salaryPendingAmount, settings.currencySymbol)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Paid / Awaiting payment</span>
            </div>

            {/* 6. Outstanding Loans */}
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-300 dark:border-purple-800/80 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider block">
                Outstanding Loans
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-purple-700 dark:text-purple-400 mt-1">
                {formatCurrency(totalOutstandingLoans, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-purple-600">
                {loans.filter(l => l.status === 'active').length} active staff loans
              </span>
            </div>

            {/* 7. Outstanding Advances */}
            <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-300 dark:border-pink-800/80 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-pink-800 dark:text-pink-300 uppercase tracking-wider block">
                Outstanding Advances
              </span>
              <p className="text-lg sm:text-xl font-mono font-black text-pink-700 dark:text-pink-400 mt-1">
                {formatCurrency(totalOutstandingAdvances, settings.currencySymbol)}
              </p>
              <span className="text-[10px] text-pink-600">
                {advances.filter(a => a.status === 'approved').length} approved advances
              </span>
            </div>

            {/* 8. Staff on leave today */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Staff on Leave Today
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                {staffOnLeaveTodayCount}
              </p>
              <span className="text-[10px] text-slate-400">Approved leaves active</span>
            </div>
          </div>

          {/* 4 Interactive Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart 1: 12-Month Payroll Trend (8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>Monthly Payroll Cost Trend (12 Months)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Net salary expenditures and gross payroll liabilities
                  </p>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySalaryTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={val => `${Math.round(val / 1000)}k`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      formatter={(val: any) => [formatCurrency(Number(val), settings.currencySymbol), 'Amount']}
                    />
                    <Bar dataKey="cost" fill="#10b981" radius={[6, 6, 0, 0]} name="Net Disbursed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Paid vs Pending Donut (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-600" />
                  <span>Salary Paid vs Pending</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of current month liability settled
                </p>
              </div>

              <div className="h-60 sm:h-64 w-full flex items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paidVsPendingData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {paidVsPendingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [
                        formatCurrency(Number(val), settings.currencySymbol),
                        name,
                      ]}
                    />
                    <RechartsLegend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Department-wise Salary Distribution (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>Department Salary Distribution</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Faculty and administration compensation weight by department
                </p>
              </div>

              <div className="h-60 w-full flex items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentPayrollData}
                      dataKey="salary"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={entry => entry.name}
                    >
                      {departmentPayrollData.map((entry, index) => (
                        <Cell key={`dept-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => [formatCurrency(Number(val), settings.currencySymbol), 'Salary']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Earnings vs Deductions (6 cols) */}
            <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pink-600" />
                  <span>Earnings vs Deductions Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate compensation components and withholdings
                </p>
              </div>

              <div className="h-60 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={earningsVsDeductionsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tickFormatter={val => `${Math.round(val / 1000)}k`} />
                    <YAxis type="category" dataKey="category" hide />
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [formatCurrency(Number(val), settings.currencySymbol), name]}
                    />
                    <RechartsLegend verticalAlign="bottom" />
                    <Bar dataKey="Basic" fill="#6366f1" stackId="a" />
                    <Bar dataKey="Allowances" fill="#3b82f6" stackId="a" />
                    <Bar dataKey="Bonuses" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="Deductions" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recharts Fiscal Year Projected vs Actual Monthly Payroll Expenses */}
          <FiscalYearPayrollProjectionChart
            runs={runs}
            staff={staff}
            expenses={expenses}
            settings={settings}
            defaultFiscalYear="2026-2027"
            onNavigateToMonth={(monthName) => {
              setSelectedMonth(monthName);
              setActiveTab('runs');
            }}
          />

          {/* Recent Activity List (Last 10 Actions) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Recent Payroll &amp; HR Activity (Audit Log)</span>
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">Last {Math.min(10, auditLogs.length)} events</span>
                <button
                  type="button"
                  onClick={() => setIsAuditLogModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>View Full Audit Log ({auditLogs.length})</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {auditLogs.slice(0, 10).map(log => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                      <FileCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">{log.title}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">{log.details}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {formatDateTime(log.timestamp)}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      {log.userName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PAYROLL RUNS                                            */}
      {/* ============================================================== */}
      {activeTab === 'runs' && (
        <PayrollRunsTab
          runs={runs}
          onRunsChange={updated => {
            setRuns(updated);
            setAuditLogs(payrollStorage.loadAuditLogs());
          }}
          staff={staff}
          attendance={staffAttendance || []}
          loans={loans}
          onLoansChange={updated => setLoans(updated)}
          advances={advances}
          onAdvancesChange={updated => setAdvances(updated)}
          settings={settings}
          isAdmin={isAdmin}
          isFinance={isFinance}
          currentUser={currentUser}
          onPostSalaryExpense={handlePostSalaryExpense}
          onDeleteSalaryExpense={handleDeleteSalaryExpense}
          onViewPayslip={handleOpenPayslipForEmployee}
          autoOpenGenerate={autoOpenGenerateModal}
          onResetAutoOpenGenerate={() => setAutoOpenGenerateModal(false)}
          onPrintAllPayslips={() => setIsPrintStudioOpen(true)}
        />
      )}

      {/* ============================================================== */}
      {/* TAB 3: LOANS                                                   */}
      {/* ============================================================== */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-purple-600" />
                <span>Staff Loan Ledger</span>
              </h3>
              <p className="text-xs text-slate-500">
                Active staff loans, monthly auto-deductions, repayment schedules, and outstanding balances
              </p>
            </div>
            <button
              onClick={handleOpenNewLoanModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Loan</span>
            </button>
          </div>

          {/* Loan List Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Total Loan</th>
                  <th className="py-3 px-4 text-right">Monthly Installment</th>
                  <th className="py-3 px-4 text-right">Paid Amount</th>
                  <th className="py-3 px-4 text-right">Remaining Balance</th>
                  <th className="py-3 px-4">Repayment Progress</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loans.map(loan => {
                  const percentPaid = Math.round((loan.amountRepaid / (loan.totalAmount || 1)) * 100);
                  return (
                    <tr key={loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {loan.staffName}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{loan.department}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(loan.totalAmount, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400">
                        -{formatCurrency(loan.monthlyInstallment, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(loan.amountRepaid, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(loan.balanceRemaining, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-28 space-y-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {percentPaid}% &bull; {loan.paidInstallments}/{loan.totalInstallments} inst.
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            loan.status === 'active'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedLoanForDetail(loan)}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                            title="View full repayment schedule and details"
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoanForSlip(loan);
                              setIsLoanAgreementSlipOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-purple-600 cursor-pointer"
                            title="Print Loan Agreement Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: ADVANCES                                                */}
      {/* ============================================================== */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-pink-600" />
                <span>Salary Advance Management</span>
              </h3>
              <p className="text-xs text-slate-500">
                Short-term salary advances, administrative approvals, auto-deduction, and voucher generation
              </p>
            </div>
            <button
              onClick={handleOpenNewAdvanceModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request Advance</span>
            </button>
          </div>

          {/* Advances Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Advance Amount</th>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4">Recovery Month</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {advances.map(adv => (
                  <tr key={adv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {adv.staffName}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{adv.department}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-pink-600 dark:text-pink-400">
                      {formatCurrency(adv.requestedAmount, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDate(adv.appliedDate)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                      {adv.recoveryMonth}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{adv.reason}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          adv.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : adv.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : adv.status === 'recovered'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {adv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {adv.status === 'pending' && isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveAdvance(adv)}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectAdvance(adv)}
                              className="px-2 py-1 rounded text-[11px] font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAdvanceForSlip(adv);
                            setIsAdvanceVoucherSlipOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-pink-600 cursor-pointer"
                          title="Print Advance Voucher"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: REPORTS                                                 */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Comprehensive HR &amp; Payroll Reports</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Export institutional compensation sheets, loan ledgers, tax withholdings, and salary registers
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={reportDeptFilter}
                  onChange={e => setReportDeptFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {Array.from(new Set(staff.map(s => s.department).filter(Boolean))).map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 10 Standard Reports Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
              {[
                {
                  id: 'monthly_summary',
                  title: 'Monthly Payroll Summary',
                  desc: 'Comprehensive summary of basic pay, allowances, deductions, and net payable for cycle.',
                  type: 'Summary',
                },
                {
                  id: 'salary_sheet',
                  title: 'Salary Sheet (Department-wise)',
                  desc: 'Faculty compensation broken down by academic and administrative departments.',
                  type: 'Department',
                },
                {
                  id: 'payslip_register',
                  title: 'Payslip Register',
                  desc: 'Complete index of all employee salary slips issued with transaction references.',
                  type: 'Register',
                },
                {
                  id: 'deductions_report',
                  title: 'Deductions Report',
                  desc: 'Withholdings audit: Income tax, provident fund, loans, advances, and unpaid leaves.',
                  type: 'Tax & PF',
                },
                {
                  id: 'loan_report',
                  title: 'Staff Loan Report',
                  desc: 'Active, completed, and outstanding staff loan obligations and repayment progress.',
                  type: 'Loans',
                },
                {
                  id: 'advance_report',
                  title: 'Salary Advance Report',
                  desc: 'Short-term advance disbursement, recovery progress, and outstanding balances.',
                  type: 'Advances',
                },
                {
                  id: 'yearly_history',
                  title: 'Staff-wise Salary History',
                  desc: 'Annual historical disbursals and increments per employee over time.',
                  type: 'Yearly',
                },
                {
                  id: 'attendance_deductions',
                  title: 'Attendance vs Salary Deductions',
                  desc: 'Detailed breakdown of absent days, daily rates, and applied salary cuts.',
                  type: 'Attendance',
                },
                {
                  id: 'ytd_summary',
                  title: 'Year-to-Date (YTD) Payroll',
                  desc: 'Cumulative fiscal year payroll cost, total taxes withheld, and benefits.',
                  type: 'Fiscal YTD',
                },
                {
                  id: 'paid_unpaid',
                  title: 'Paid vs Unpaid Salary Report',
                  desc: 'Status of disbursed vouchers vs pending staff compensations for current cycle.',
                  type: 'Reconciliation',
                },
              ].map(rep => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {rep.type}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                      {rep.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">{rep.desc}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportBankTransferSheet('csv')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: BANK TRANSFER                                           */}
      {/* ============================================================== */}
      {activeTab === 'bank_transfer' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Bank Transfer Sheet &amp; Direct Deposit Advice</span>
              </h3>
              <p className="text-xs text-slate-500">
                Generate batch bank upload files with employee bank names, titles, IBANs and net payables
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportBankTransferSheet('csv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => handleExportBankTransferSheet('excel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Missing Bank Details Warning */}
          {bankTransferRows.some(r => r.hasMissingDetails) && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Warning:</strong> {bankTransferRows.filter(r => r.hasMissingDetails).length} employee(s) are missing bank account numbers or IBANs. Please update them below before sending file to the bank.
              </span>
            </div>
          )}

          {/* Bank Transfer Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Emp Code</th>
                  <th className="py-3 px-4">Beneficiary Employee</th>
                  <th className="py-3 px-4">Bank Name</th>
                  <th className="py-3 px-4">Account Title</th>
                  <th className="py-3 px-4">Account Number / IBAN</th>
                  <th className="py-3 px-4 text-right">Net Payable</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bankTransferRows.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-slate-500">{row.code}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 dark:text-white block">{row.name}</span>
                      <span className="text-[10px] text-slate-400">{row.designation}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {row.bankName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{row.accountTitle}</td>
                    <td className="py-3 px-4 font-mono">
                      {row.accountNumber ? (
                        <span className="text-slate-700 dark:text-slate-300">{row.accountNumber}</span>
                      ) : (
                        <span className="text-rose-600 font-bold">Missing Account Details</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(row.netSalary, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.hasMissingDetails
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {row.hasMissingDetails ? 'Incomplete' : 'Ready'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NEW LOAN MODAL                                                 */}
      {/* ============================================================== */}
      {isNewLoanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-purple-600" />
                <span>Issue New Staff Loan</span>
              </h3>
              <button
                onClick={() => setIsNewLoanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Staff Member
                </label>
                <select
                  value={loanStaffId}
                  onChange={e => setLoanStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer text-slate-900 dark:text-white"
                >
                  {activeStaffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.department} &bull; Salary: {formatCurrency(s.monthlySalary, settings.currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Loan Amount ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={e => {
                      const amt = Number(e.target.value);
                      setLoanAmount(amt);
                      setLoanInstallmentAmount(Math.round(amt / loanInstallments));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Total Installments
                  </label>
                  <select
                    value={loanInstallments}
                    onChange={e => {
                      const inst = Number(e.target.value);
                      setLoanInstallments(inst);
                      setLoanInstallmentAmount(Math.round(loanAmount / inst));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                  >
                    {[3, 4, 5, 6, 8, 10, 12, 18, 24].map(n => (
                      <option key={n} value={n}>
                        {n} Months
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monthly Installment Amount (Auto-Calculated, Editable)
                </label>
                <input
                  type="number"
                  value={loanInstallmentAmount}
                  onChange={e => setLoanInstallmentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-purple-600 dark:text-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    value={loanStartDate}
                    onChange={e => setLoanStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Start Month
                  </label>
                  <select
                    value={loanStartMonth}
                    onChange={e => setLoanStartMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason / Agreement Notes
                </label>
                <textarea
                  rows={2}
                  value={loanReason}
                  onChange={e => setLoanReason(e.target.value)}
                  placeholder="e.g., Staff emergency aid, home improvement, vehicle advance"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewLoanModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateLoan}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Loan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LOAN DETAIL & REPAYMENT MODAL                                  */}
      {/* ============================================================== */}
      {selectedLoanForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Loan Schedule: {selectedLoanForDetail.staffName}
                </h3>
                <span className="text-xs text-slate-500">
                  Total: {formatCurrency(selectedLoanForDetail.totalAmount, settings.currencySymbol)} &bull; Balance:{' '}
                  <strong className="text-amber-600">
                    {formatCurrency(selectedLoanForDetail.balanceRemaining, settings.currencySymbol)}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedLoanForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Repayment History */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                Repayment History ({selectedLoanForDetail.repaymentHistory?.length || 0} entries)
              </span>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/40">
                {!selectedLoanForDetail.repaymentHistory?.length ? (
                  <p className="text-slate-400 p-2 text-center">No repayments recorded yet.</p>
                ) : (
                  selectedLoanForDetail.repaymentHistory.map((rep, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{rep.payrollMonth || rep.date}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {rep.date} &bull; {rep.type}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600">
                        {formatCurrency(rep.amount, settings.currencySymbol)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Extra Manual Repayment Option */}
            {selectedLoanForDetail.status === 'active' && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Manual Extra Repayment
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={manualRepayAmount}
                    onChange={e => setManualRepayAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => handleManualRepayment(selectedLoanForDetail)}
                    className="px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    Repay Amount
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleEarlySettlement(selectedLoanForDetail)}
                    className="text-indigo-600 hover:underline font-bold text-[11px] cursor-pointer"
                  >
                    Early Full Settlement
                  </button>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Reason for skipping..."
                      value={skipReason}
                      onChange={e => setSkipReason(e.target.value)}
                      className="px-2 py-1 text-[11px] rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => handleSkipInstallment(selectedLoanForDetail)}
                      className="px-2 py-1 rounded text-[11px] font-bold bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
                    >
                      Skip Installment
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLoanForDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* LOAN AGREEMENT PRINTABLE SLIP MODAL                            */}
      {/* ============================================================== */}
      {isLoanAgreementSlipOpen && loanForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-indigo-600 uppercase">Official Loan Agreement</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setIsLoanAgreementSlipOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slip Paper Body */}
            <div className="space-y-4 text-xs border border-slate-200 rounded-2xl p-5 bg-slate-50/30">
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-base font-black uppercase tracking-tight">{settings.schoolName || 'EduLedger Academy'}</h2>
                <p className="text-[11px] text-slate-500">Staff Loan Agreement &amp; Undertaking Voucher</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Employee Name:</span>
                  <p className="font-bold">{loanForSlip.staffName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Department:</span>
                  <p className="font-bold">{loanForSlip.department}</p>
                </div>
                <div>
                  <span className="text-slate-500">Loan Amount:</span>
                  <p className="font-mono font-bold text-sm text-indigo-700">
                    {formatCurrency(loanForSlip.totalAmount, settings.currencySymbol)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Monthly Deduction:</span>
                  <p className="font-mono font-bold text-rose-600">
                    {formatCurrency(loanForSlip.monthlyInstallment, settings.currencySymbol)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Start Month:</span>
                  <p className="font-bold">{loanForSlip.startMonth}</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Tenor:</span>
                  <p className="font-bold">{loanForSlip.totalInstallments} Monthly Installments</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-200">
                I hereby authorize EduLedger Administration to deduct the agreed monthly installment directly from my salary starting from the scheduled cycle until the full loan balance is repaid.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="border-t border-slate-400 text-center text-[10px] text-slate-500 pt-1">
                  Employee Signature
                </div>
                <div className="border-t border-slate-400 text-center text-[10px] text-slate-500 pt-1">
                  Finance Officer / Principal
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NEW ADVANCE MODAL                                              */}
      {/* ============================================================== */}
      {isNewAdvanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-pink-600" />
                <span>Issue Salary Advance</span>
              </h3>
              <button
                onClick={() => setIsNewAdvanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Select Staff Member
                </label>
                <select
                  value={advStaffId}
                  onChange={e => setAdvStaffId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer text-slate-900 dark:text-white"
                >
                  {activeStaffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.department} &bull; Monthly: {formatCurrency(s.monthlySalary, settings.currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Advance Amount ({settings.currencySymbol}) &bull; Max 50% Salary
                </label>
                <input
                  type="number"
                  value={advAmount}
                  onChange={e => setAdvAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-pink-600 dark:text-pink-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Request Date
                  </label>
                  <input
                    type="date"
                    value={advDate}
                    onChange={e => setAdvDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Recovery Month
                  </label>
                  <select
                    value={advRecoveryMonth}
                    onChange={e => setAdvRecoveryMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Recovery Method
                </label>
                <select
                  value={advRecoveryMethod}
                  onChange={e => setAdvRecoveryMethod(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                >
                  <option value="Full in next payroll">Full in next payroll</option>
                  <option value="Split across months">Split across 2 months</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for Advance
                </label>
                <textarea
                  rows={2}
                  value={advReason}
                  onChange={e => setAdvReason(e.target.value)}
                  placeholder="e.g. Medical emergency, urgent travel"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewAdvanceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAdvance}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-pink-600 hover:bg-pink-700 text-white shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Submit Advance Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADVANCE VOUCHER PRINTABLE SLIP                                 */}
      {/* ============================================================== */}
      {isAdvanceVoucherSlipOpen && advanceForSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-pink-600 uppercase">Salary Advance Voucher</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-600 text-white cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setIsAdvanceVoucherSlipOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Slip Paper Body */}
            <div className="space-y-4 text-xs border border-slate-200 rounded-2xl p-5 bg-slate-50/30">
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-base font-black uppercase tracking-tight">{settings.schoolName || 'EduLedger Academy'}</h2>
                <p className="text-[11px] text-slate-500">Short-Term Salary Advance Payment Voucher</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Staff Beneficiary:</span>
                  <p className="font-bold">{advanceForSlip.staffName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Department:</span>
                  <p className="font-bold">{advanceForSlip.department}</p>
                </div>
                <div>
                  <span className="text-slate-500">Advance Amount:</span>
                  <p className="font-mono font-bold text-sm text-pink-700">
                    {formatCurrency(advanceForSlip.requestedAmount, settings.currencySymbol)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Recovery Target:</span>
                  <p className="font-bold">{advanceForSlip.recoveryMonth}</p>
                </div>
                <div>
                  <span className="text-slate-500">Issue Date:</span>
                  <p className="font-mono">{formatDate(advanceForSlip.appliedDate)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>
                  <p className="font-bold text-emerald-600">{advanceForSlip.status}</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-slate-200">
                Received the above sum as a short-term salary advance, recoverable from my remuneration in {advanceForSlip.recoveryMonth}.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-8">
                <div className="border-t border-slate-400 text-center text-[10px] text-slate-500 pt-1">
                  Recipient Signature
                </div>
                <div className="border-t border-slate-400 text-center text-[10px] text-slate-500 pt-1">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Payslip Modal */}
      {selectedStaffForPayslip && (
        <PaySlipModal
          staff={selectedStaffForPayslip.member}
          selectedMonth={selectedMonth}
          isPaid={selectedStaffForPayslip.isPaid}
          paidDate={selectedStaffForPayslip.paidDate}
          paymentRef={selectedStaffForPayslip.paymentRef}
          paymentMode={selectedStaffForPayslip.paymentMode}
          settings={settings}
          onClose={() => setSelectedStaffForPayslip(null)}
        />
      )}

      {/* Dedicated 2-on-1 Print Studio */}
      {isPrintStudioOpen && (
        <DedicatedPrintStudioModal
          isOpen={isPrintStudioOpen}
          onClose={() => setIsPrintStudioOpen(false)}
          initialDocumentType="payroll_slip"
        />
      )}

      {/* Payroll Status Audit Log Modal */}
      {isAuditLogModalOpen && (
        <PayrollAuditLogModal
          isOpen={isAuditLogModalOpen}
          onClose={() => setIsAuditLogModalOpen(false)}
          auditLogs={auditLogs}
          settings={settings}
        />
      )}
    </div>
  );
};
