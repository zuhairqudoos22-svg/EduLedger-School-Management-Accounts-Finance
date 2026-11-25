import React, { useState, useMemo, useEffect } from 'react';
import {
  MonthlyPayrollRun,
  EmployeePayrollItem,
  StaffLoan,
  StaffAdvance,
  PayrollRunStatus,
  Staff,
  StaffAttendanceRecord,
  SchoolSettings,
} from '../../types';
import {
  formatCurrency,
  formatDate,
  exportToCSV,
} from '../../utils/formatters';
import { payrollStorage } from '../../utils/payrollStorage';
import {
  Play,
  CheckCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  ShieldCheck,
  Check,
  X,
  FileText,
  Search,
  Filter,
  Printer,
  Eye,
  AlertTriangle,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Save,
  Plus,
  RefreshCw,
  Building,
  User,
  Users,
  DollarSign,
  ArrowUpDown,
  FileCheck,
} from 'lucide-react';

interface PayrollRunsTabProps {
  runs: MonthlyPayrollRun[];
  onRunsChange: (updatedRuns: MonthlyPayrollRun[]) => void;
  staff: Staff[];
  attendance: StaffAttendanceRecord[];
  loans: StaffLoan[];
  onLoansChange: (updatedLoans: StaffLoan[]) => void;
  advances: StaffAdvance[];
  onAdvancesChange: (updatedAdvances: StaffAdvance[]) => void;
  settings: SchoolSettings;
  isAdmin: boolean;
  isFinance: boolean;
  currentUser: { id?: string; fullName: string; role: string } | null;
  onPostSalaryExpense: (run: MonthlyPayrollRun, paymentMethod: string, paymentDate: string) => Promise<string | void>;
  onDeleteSalaryExpense?: (expenseId: string) => Promise<void>;
  onViewPayslip: (employee: EmployeePayrollItem, month: string) => void;
  autoOpenGenerate?: boolean;
  onResetAutoOpenGenerate?: () => void;
  onPrintAllPayslips?: (run: MonthlyPayrollRun) => void;
}

export const PayrollRunsTab: React.FC<PayrollRunsTabProps> = ({
  runs,
  onRunsChange,
  staff,
  attendance,
  loans,
  onLoansChange,
  advances,
  onAdvancesChange,
  settings,
  isAdmin,
  isFinance,
  currentUser,
  onPostSalaryExpense,
  onDeleteSalaryExpense,
  onViewPayslip,
  autoOpenGenerate,
  onResetAutoOpenGenerate,
  onPrintAllPayslips,
}) => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | PayrollRunStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Bulk Selection States for Pending Runs
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [isBulkRejectModalOpen, setIsBulkRejectModalOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');

  // Modal States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedRunForView, setSelectedRunForView] = useState<MonthlyPayrollRun | null>(null);
  const [isConfirmProcessOpen, setIsConfirmProcessOpen] = useState(false);
  const [runToProcess, setRunToProcess] = useState<MonthlyPayrollRun | null>(null);
  const [isConfirmPayOpen, setIsConfirmPayOpen] = useState(false);
  const [runToPay, setRunToPay] = useState<MonthlyPayrollRun | null>(null);
  const [payMethod, setPayMethod] = useState<'bank' | 'cash' | 'cheque'>('bank');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [runToDelete, setRunToDelete] = useState<MonthlyPayrollRun | null>(null);
  const [deleteUnlockReason, setDeleteUnlockReason] = useState('');
  const [isUnlockPromptOpen, setIsUnlockPromptOpen] = useState(false);

  // Generation Form State
  const currentMonthYear = useMemo(() => {
    const d = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
  }, []);

  const [genMonth, setGenMonth] = useState<string>('October');
  const [genYear, setGenYear] = useState<string>('2026');
  const [genScope, setGenScope] = useState<'all' | 'department' | 'selected'>('all');
  const [genDepartment, setGenDepartment] = useState<string>('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const departments = useMemo(() => {
    const depts = new Set(staff.map(s => s.department).filter(Boolean));
    return Array.from(depts);
  }, [staff]);

  // Available Months & Years
  const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const yearOptions = ['2025', '2026', '2027'];

  // Filtered & Sorted Runs
  const filteredRuns = useMemo(() => {
    return runs
      .filter(run => {
        const matchesSearch =
          !searchQuery ||
          run.month.toLowerCase().includes(searchQuery.toLowerCase()) ||
          run.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (run.notes && run.notes.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'pending'
            ? run.status === 'draft' || run.status === 'processed'
            : run.status === statusFilter);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.month > a.month ? 1 : -1);
        if (sortBy === 'oldest') return (a.month > b.month ? 1 : -1);
        if (sortBy === 'highest') return b.totalNetPayroll - a.totalNetPayroll;
        if (sortBy === 'lowest') return a.totalNetPayroll - b.totalNetPayroll;
        return 0;
      });
  }, [runs, searchQuery, statusFilter, sortBy]);

  // Bulk Selection Handlers for Runs
  const pendingRuns = useMemo(() => {
    return filteredRuns.filter(r => r.status === 'draft' || r.status === 'processed');
  }, [filteredRuns]);

  const allPendingSelected = useMemo(() => {
    if (pendingRuns.length === 0) return false;
    return pendingRuns.every(r => selectedRunIds.includes(r.id));
  }, [pendingRuns, selectedRunIds]);

  const toggleSelectAllPendingRuns = () => {
    if (allPendingSelected) {
      setSelectedRunIds(prev => prev.filter(id => !pendingRuns.some(r => r.id === id)));
    } else {
      const pendingIds = pendingRuns.map(r => r.id);
      setSelectedRunIds(prev => Array.from(new Set([...prev, ...pendingIds])));
    }
  };

  const toggleSelectRun = (id: string) => {
    setSelectedRunIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Bulk Approval of Runs
  const handleBulkApproveRuns = () => {
    if (!isAdmin) {
      showToast('Only an Administrator can bulk approve payroll runs.', 'error');
      return;
    }

    const runsToApprove = runs.filter(
      r => selectedRunIds.includes(r.id) && (r.status === 'draft' || r.status === 'processed')
    );

    if (runsToApprove.length === 0) {
      showToast('No pending or processed runs selected for approval.', 'warning');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    let updatedRunsList = [...runs];

    runsToApprove.forEach(run => {
      const updatedRun: MonthlyPayrollRun = {
        ...run,
        status: 'approved',
        approvedDate: todayStr,
        approvedBy: currentUser?.fullName || 'Administrator',
        updatedAt: nowIso,
      };

      updatedRunsList = payrollStorage.saveSingleRun(updatedRun);

      payrollStorage.addAuditLog({
        action: 'run_approved',
        fromStatus: run.status,
        toStatus: 'approved',
        userId: currentUser?.id || 'usr-admin-01',
        userName: currentUser?.fullName || 'Administrator',
        userRole: 'Administrator',
        title: `Bulk Payroll Approved: ${run.month}`,
        details: `Status changed from ${run.status.toUpperCase()} to APPROVED via bulk selection for ${run.totalEmployees} employees. Ready for disbursement.`,
        targetId: updatedRun.id,
        amount: updatedRun.totalNetPayroll,
      });
    });

    onRunsChange(updatedRunsList);
    setSelectedRunIds([]);
    showToast(`Successfully bulk approved ${runsToApprove.length} pending payroll run(s)!`, 'success');
  };

  // Bulk Rejection of Runs
  const handleOpenBulkRejectModal = () => {
    const runsToReject = runs.filter(
      r => selectedRunIds.includes(r.id) && (r.status === 'draft' || r.status === 'processed')
    );
    if (runsToReject.length === 0) {
      showToast('No pending runs selected to reject.', 'warning');
      return;
    }
    setBulkRejectReason('');
    setIsBulkRejectModalOpen(true);
  };

  const handleConfirmBulkReject = () => {
    const runsToReject = runs.filter(
      r => selectedRunIds.includes(r.id) && (r.status === 'draft' || r.status === 'processed')
    );

    const nowIso = new Date().toISOString();
    let updatedRunsList = [...runs];

    runsToReject.forEach(run => {
      const updatedEmployees = run.employees.map(e => ({
        ...e,
        approvalStatus: 'rejected' as const,
        rejectionReason: bulkRejectReason || 'Returned for revisions by Administrator',
      }));

      const updatedRun: MonthlyPayrollRun = {
        ...run,
        status: 'draft',
        isLocked: false,
        notes: bulkRejectReason
          ? `[REJECTED by ${currentUser?.fullName || 'Admin'} on ${nowIso.split('T')[0]}]: ${bulkRejectReason}`
          : run.notes,
        employees: updatedEmployees,
        updatedAt: nowIso,
      };

      updatedRunsList = payrollStorage.saveSingleRun(updatedRun);

      payrollStorage.addAuditLog({
        action: 'run_rejected',
        fromStatus: run.status,
        toStatus: 'draft',
        userId: currentUser?.id || 'usr-admin-01',
        userName: currentUser?.fullName || 'Administrator',
        userRole: currentUser?.role || 'Administrator',
        title: `Bulk Payroll Rejected: ${run.month}`,
        details: `Status changed from ${run.status.toUpperCase()} to DRAFT (Rejected) via bulk selection. Reason: ${bulkRejectReason || 'Returned for revisions.'}`,
        targetId: updatedRun.id,
        amount: updatedRun.totalNetPayroll,
      });
    });

    onRunsChange(updatedRunsList);
    setIsBulkRejectModalOpen(false);
    setSelectedRunIds([]);
    showToast(`Bulk rejected ${runsToReject.length} payroll run(s). Reverted to Draft status.`, 'warning');
  };

  // Open Generate Modal handler
  const handleOpenGenerateModal = () => {
    const parts = currentMonthYear.split(' ');
    if (parts.length === 2) {
      setGenMonth(parts[0]);
      setGenYear(parts[1]);
    }
    setGenScope('all');
    setGenDepartment(departments[0] || '');
    setSelectedStaffIds(staff.filter(s => s.status === 'active').map(s => s.id));
    setIsGenerateModalOpen(true);
  };

  useEffect(() => {
    if (autoOpenGenerate) {
      handleOpenGenerateModal();
      onResetAutoOpenGenerate?.();
    }
  }, [autoOpenGenerate]);

  // ONE-CLICK BULK GENERATION
  const handleGeneratePayroll = () => {
    const targetMonthString = `${genMonth} ${genYear}`;

    // 1. Check duplicate
    const existingRun = runs.find(r => r.month.trim().toLowerCase() === targetMonthString.trim().toLowerCase());
    if (existingRun) {
      showToast(
        `Payroll for ${targetMonthString} already exists (Status: ${existingRun.status.toUpperCase()}). Please review or edit the existing run.`,
        'warning'
      );
      setIsGenerateModalOpen(false);
      setSelectedRunForView(existingRun);
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      // 2. Select eligible staff
      let candidateStaff = staff.filter(s => s.status === 'active');
      if (genScope === 'department' && genDepartment) {
        candidateStaff = candidateStaff.filter(s => s.department === genDepartment);
      } else if (genScope === 'selected') {
        candidateStaff = candidateStaff.filter(s => selectedStaffIds.includes(s.id));
      }

      // 3. Skip staff with no salary structure (monthlySalary <= 0)
      const validStaff: Staff[] = [];
      const skippedStaff: Staff[] = [];

      candidateStaff.forEach(s => {
        if (!s.monthlySalary || s.monthlySalary <= 0) {
          skippedStaff.push(s);
        } else {
          validStaff.push(s);
        }
      });

      if (validStaff.length === 0) {
        setIsGenerating(false);
        showToast('No active staff with valid salary structures were found for the selected scope.', 'error');
        return;
      }

      // 4. Calculate items for each employee
      const employeeItems: EmployeePayrollItem[] = validStaff.map(emp => {
        const basicSalary = emp.monthlySalary || 0;
        const allowances = emp.allowances || 0;
        const bonus = (emp as any).bonuses || 0;
        const overtimeAmt = (emp as any).overtimePay || 0;
        const grossSalary = basicSalary + allowances + bonus + overtimeAmt;

        // Attendance Deduction: Look up unpaid leaves/absent records for this staff in target month
        const staffMonthAttendance = attendance.filter(
          a =>
            a.staffId === emp.id &&
            a.status === 'absent' &&
            a.date.startsWith(`${genYear}-${String(monthOptions.indexOf(genMonth) + 1).padStart(2, '0')}`)
        );
        const absentDays = staffMonthAttendance.length;
        const dailyRate = Math.round(basicSalary / 26);
        const absentDeduction = absentDays * dailyRate;

        // Loan installment deduction if employee has an active loan
        const activeLoan = loans.find(l => l.staffId === emp.id && l.status === 'active' && (l.balanceRemaining ?? 0) > 0);
        const loanDeduction = activeLoan
          ? Math.min(activeLoan.monthlyInstallment, activeLoan.balanceRemaining ?? 0)
          : 0;

        // Advance recovery deduction if employee has an approved advance for this month
        const pendingAdvance = advances.find(
          a =>
            a.staffId === emp.id &&
            a.status === 'approved' &&
            (a.balanceRemaining ?? a.requestedAmount - a.recoveredAmount) > 0 &&
            (a.recoveryMonth.toLowerCase() === targetMonthString.toLowerCase() || !a.recoveryMonth)
        );
        const advanceDeduction = pendingAdvance
          ? Math.min(
              pendingAdvance.requestedAmount,
              pendingAdvance.balanceRemaining ?? (pendingAdvance.requestedAmount - pendingAdvance.recoveredAmount)
            )
          : 0;

        // Tax calculation: progressive brackets
        let taxDeduction = 0;
        if (grossSalary > 100000) {
          taxDeduction = Math.round(grossSalary * 0.08);
        } else if (grossSalary > 50000) {
          taxDeduction = Math.round(grossSalary * 0.04);
        }

        // Provident Fund (5% of basic salary)
        const providentFundDeduction = Math.round(basicSalary * 0.05);
        const otherDeductions = emp.deductions ? Math.max(0, emp.deductions - absentDeduction) : 0;

        const totalDeductions =
          absentDeduction + loanDeduction + advanceDeduction + taxDeduction + providentFundDeduction + otherDeductions;
        const netSalary = Math.max(0, grossSalary - totalDeductions);

        return {
          staffId: emp.id,
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          designation: emp.designation,
          department: emp.department,
          employmentType: emp.employmentType === 'contract' ? 'Contract' : 'Permanent',
          paymentMode: emp.paymentMode || 'Bank Transfer',
          bankName: emp.bankDetails?.bankName || emp.bankName || 'Meezan Bank Ltd',
          accountTitle: emp.bankDetails?.accountTitle || emp.fullName,
          accountNumber: emp.bankDetails?.accountNumber || emp.bankAccount || '',
          basicSalary,
          houseRentAllowance: Math.round(allowances * 0.5),
          medicalAllowance: Math.round(allowances * 0.3),
          transportAllowance: Math.round(allowances * 0.2),
          otherAllowances: 0,
          allowances,
          bonuses: bonus,
          overtimeHours: overtimeAmt > 0 ? 8 : 0,
          overtimeRate: 250,
          overtimeAmount: overtimeAmt,
          absentDays,
          absentDeduction,
          taxDeduction,
          providentFundDeduction,
          loanDeduction,
          loanId: activeLoan?.id,
          advanceDeduction,
          advanceId: pendingAdvance?.id,
          otherDeductions,
          grossSalary,
          totalDeductions,
          netSalary,
          status: 'pending',
          remarks: absentDays > 0 ? `${absentDays} day(s) absent attendance deduction applied` : '',
        };
      });

      // 5. Aggregate totals
      const totalBasic = employeeItems.reduce((sum, e) => sum + e.basicSalary, 0);
      const totalAllowances = employeeItems.reduce((sum, e) => sum + e.allowances, 0);
      const totalBonuses = employeeItems.reduce((sum, e) => sum + e.bonuses, 0);
      const totalOvertime = employeeItems.reduce((sum, e) => sum + e.overtimeAmount, 0);
      const totalDeductions = employeeItems.reduce((sum, e) => sum + e.totalDeductions, 0);
      const totalNetPayroll = employeeItems.reduce((sum, e) => sum + e.netSalary, 0);

      const newRunId = `pr-${genYear}-${String(monthOptions.indexOf(genMonth) + 1).padStart(2, '0')}`;
      const newRun: MonthlyPayrollRun = {
        id: newRunId,
        month: targetMonthString,
        fiscalYear: `${genYear}-${Number(genYear) + 1}`,
        status: 'draft',
        scope: genScope,
        departmentFilter: genScope === 'department' ? genDepartment : undefined,
        totalEmployees: employeeItems.length,
        paidEmployees: 0,
        totalBasicSalary: totalBasic,
        totalAllowances,
        totalBonuses,
        totalOvertime,
        totalDeductions,
        totalNetPayroll,
        isLocked: false,
        notes: `Draft payroll run generated on ${formatDate(new Date().toISOString())} for ${employeeItems.length} staff members.`,
        employees: employeeItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedRuns = payrollStorage.saveSingleRun(newRun);
      onRunsChange(updatedRuns);

      // Log in audit log
      payrollStorage.addAuditLog({
        action: 'run_created',
        fromStatus: 'none',
        toStatus: 'draft',
        userId: currentUser?.id || 'usr-fin-01',
        userName: currentUser?.fullName || 'Finance Officer',
        userRole: currentUser?.role || 'Finance',
        title: `Payroll Generated: ${targetMonthString}`,
        details: `Draft payroll run generated for ${employeeItems.length} employees. Total Net: ${formatCurrency(
          totalNetPayroll,
          settings.currencySymbol
        )}.`,
        targetId: newRun.id,
        amount: totalNetPayroll,
      });

      setIsGenerating(false);
      setIsGenerateModalOpen(false);

      if (skippedStaff.length > 0) {
        showToast(
          `Payroll generated for ${validStaff.length} employees. (${skippedStaff.length} staff skipped: no salary structure: ${skippedStaff
            .map(s => s.fullName)
            .slice(0, 2)
            .join(', ')}${skippedStaff.length > 2 ? '...' : ''})`,
          'warning'
        );
      } else {
        showToast(`Payroll successfully generated for ${validStaff.length} employees!`, 'success');
      }

      // Automatically open view for immediate inspection/edits
      setSelectedRunForView(newRun);
    }, 400);
  };

  // PROCESS RUN (Draft -> Processed)
  const handleProcessRun = (run: MonthlyPayrollRun) => {
    setRunToProcess(run);
    setIsConfirmProcessOpen(true);
  };

  const confirmProcessRun = () => {
    if (!runToProcess) return;

    // Deduct loan installments and advance recoveries officially
    const updatedLoans = [...loans];
    const updatedAdvances = [...advances];

    runToProcess.employees.forEach(emp => {
      // Deduct loan installment
      if (emp.loanId && emp.loanDeduction > 0) {
        const loanIdx = updatedLoans.findIndex(l => l.id === emp.loanId);
        if (loanIdx >= 0) {
          const l = updatedLoans[loanIdx];
          const newPaid = l.amountRepaid + emp.loanDeduction;
          const newBal = Math.max(0, l.balanceRemaining - emp.loanDeduction);
          const newPaidInstallments = l.paidInstallments + 1;
          const newRemInstallments = Math.max(0, (l.totalInstallments - newPaidInstallments));
          updatedLoans[loanIdx] = {
            ...l,
            amountRepaid: newPaid,
            balanceRemaining: newBal,
            paidInstallments: newPaidInstallments,
            status: newBal === 0 ? 'completed' : 'active',
            repaymentHistory: [
              ...(l.repaymentHistory || []),
              {
                id: `rep-${Date.now()}-${emp.loanId}`,
                date: new Date().toISOString().split('T')[0],
                payrollMonth: runToProcess.month,
                amount: emp.loanDeduction,
                type: 'payroll_deduction',
                notes: `Deducted in ${runToProcess.month} payroll run`,
              },
            ],
          };
        }
      }

      // Deduct advance recovery
      if (emp.advanceId && emp.advanceDeduction > 0) {
        const advIdx = updatedAdvances.findIndex(a => a.id === emp.advanceId);
        if (advIdx >= 0) {
          const a = updatedAdvances[advIdx];
          const newRec = a.recoveredAmount + emp.advanceDeduction;
          const newBal = Math.max(0, (a.balanceRemaining ?? a.requestedAmount) - emp.advanceDeduction);
          updatedAdvances[advIdx] = {
            ...a,
            recoveredAmount: newRec,
            balanceRemaining: newBal,
            status: newBal === 0 ? 'recovered' : 'approved',
          };
        }
      }
    });

    payrollStorage.saveLoans(updatedLoans);
    onLoansChange(updatedLoans);

    payrollStorage.saveAdvances(updatedAdvances);
    onAdvancesChange(updatedAdvances);

    // Update run status to 'processed'
    const updatedRun: MonthlyPayrollRun = {
      ...runToProcess,
      status: 'processed',
      isLocked: true,
      processedDate: new Date().toISOString().split('T')[0],
      processedBy: currentUser?.fullName || 'Finance Officer',
      updatedAt: new Date().toISOString(),
    };

    const updatedRuns = payrollStorage.saveSingleRun(updatedRun);
    onRunsChange(updatedRuns);

    payrollStorage.addAuditLog({
      action: 'run_processed',
      fromStatus: 'draft',
      toStatus: 'processed',
      userId: currentUser?.id || 'usr-fin-01',
      userName: currentUser?.fullName || 'Finance Officer',
      userRole: currentUser?.role || 'Finance',
      title: `Payroll Processed: ${runToProcess.month}`,
      details: `Status changed from DRAFT to PROCESSED. Locked ${runToProcess.totalEmployees} employee salary records. Loan and advance balances officially updated.`,
      targetId: updatedRun.id,
      amount: updatedRun.totalNetPayroll,
    });

    setIsConfirmProcessOpen(false);
    setRunToProcess(null);
    if (selectedRunForView && selectedRunForView.id === updatedRun.id) {
      setSelectedRunForView(updatedRun);
    }
    showToast(`Payroll for ${runToProcess.month} marked as Processed and locked for Admin approval.`, 'success');
  };

  // APPROVE RUN (Processed -> Approved) - ADMIN ONLY
  const handleApproveRun = (run: MonthlyPayrollRun) => {
    if (!isAdmin) {
      showToast('Only an Administrator can approve processed payroll runs.', 'error');
      return;
    }

    const updatedRun: MonthlyPayrollRun = {
      ...run,
      status: 'approved',
      approvedDate: new Date().toISOString().split('T')[0],
      approvedBy: currentUser?.fullName || 'Administrator',
      updatedAt: new Date().toISOString(),
    };

    const updatedRuns = payrollStorage.saveSingleRun(updatedRun);
    onRunsChange(updatedRuns);

    payrollStorage.addAuditLog({
      action: 'run_approved',
      fromStatus: run.status,
      toStatus: 'approved',
      userId: currentUser?.id || 'usr-admin-01',
      userName: currentUser?.fullName || 'Administrator',
      userRole: 'Administrator',
      title: `Payroll Approved: ${run.month}`,
      details: `Status changed from ${run.status.toUpperCase()} to APPROVED. Administrative approval verified for ${run.totalEmployees} employees. Ready for disbursement.`,
      targetId: updatedRun.id,
      amount: updatedRun.totalNetPayroll,
    });

    if (selectedRunForView && selectedRunForView.id === updatedRun.id) {
      setSelectedRunForView(updatedRun);
    }
    showToast(`Payroll for ${run.month} successfully Approved! Ready for payment disbursement.`, 'success');
  };

  // MARK AS PAID (Approved -> Paid)
  const handleOpenMarkPaid = (run: MonthlyPayrollRun) => {
    setRunToPay(run);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('bank');
    setIsConfirmPayOpen(true);
  };

  const confirmMarkAsPaid = async () => {
    if (!runToPay) return;

    try {
      // 1. Post expense into Accounts & Finance
      const expenseId = await onPostSalaryExpense(runToPay, payMethod, payDate);

      // 2. Mark employees as paid
      const updatedEmployees = runToPay.employees.map(e => ({
        ...e,
        status: 'paid' as const,
        paidDate: payDate,
        paymentMethodUsed: (payMethod === 'bank' ? 'Bank Transfer' : payMethod === 'cash' ? 'Cash' : 'Cheque') as any,
      }));

      const updatedRun: MonthlyPayrollRun = {
        ...runToPay,
        status: 'paid',
        paidEmployees: updatedEmployees.length,
        paidDate: payDate,
        expensePostedId: (typeof expenseId === 'string' ? expenseId : `exp-sal-${runToPay.id}`),
        employees: updatedEmployees,
        updatedAt: new Date().toISOString(),
      };

      const updatedRuns = payrollStorage.saveSingleRun(updatedRun);
      onRunsChange(updatedRuns);

      payrollStorage.addAuditLog({
        action: 'salary_paid',
        fromStatus: 'approved',
        toStatus: 'paid',
        userId: currentUser?.id || 'usr-fin-01',
        userName: currentUser?.fullName || 'Finance Officer',
        userRole: currentUser?.role || 'Finance',
        title: `Salaries Disbursed: ${runToPay.month}`,
        details: `Status changed from APPROVED to PAID. All ${runToPay.totalEmployees} salaries paid via ${payMethod.toUpperCase()} on ${payDate}. Automatically posted expense of ${formatCurrency(
          runToPay.totalNetPayroll,
          settings.currencySymbol
        )} under 'Staff Salaries' in Accounts.`,
        targetId: updatedRun.id,
        amount: updatedRun.totalNetPayroll,
      });

      setIsConfirmPayOpen(false);
      setRunToPay(null);
      if (selectedRunForView && selectedRunForView.id === updatedRun.id) {
        setSelectedRunForView(updatedRun);
      }
      showToast(`Payroll marked as Paid! Salaries expense automatically recorded in Accounts & Finance.`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Error recording salary expense in Accounts.', 'error');
    }
  };

  // DELETE RUN
  const handleDeleteRun = (run: MonthlyPayrollRun) => {
    setRunToDelete(run);
    setDeleteUnlockReason('');
    if (run.status === 'draft') {
      setIsConfirmDeleteOpen(true);
    } else {
      setIsUnlockPromptOpen(true);
    }
  };

  const confirmDeleteRun = async () => {
    if (!runToDelete) return;

    // Reverse loan/advance updates if run was already processed or paid
    if (runToDelete.status !== 'draft') {
      const updatedLoans = [...loans];
      const updatedAdvances = [...advances];

      runToDelete.employees.forEach(emp => {
        if (emp.loanId && emp.loanDeduction > 0) {
          const lIdx = updatedLoans.findIndex(l => l.id === emp.loanId);
          if (lIdx >= 0) {
            const l = updatedLoans[lIdx];
            updatedLoans[lIdx] = {
              ...l,
              amountRepaid: Math.max(0, l.amountRepaid - emp.loanDeduction),
              balanceRemaining: l.balanceRemaining + emp.loanDeduction,
              paidInstallments: Math.max(0, l.paidInstallments - 1),
              status: 'active',
            };
          }
        }

        if (emp.advanceId && emp.advanceDeduction > 0) {
          const aIdx = updatedAdvances.findIndex(a => a.id === emp.advanceId);
          if (aIdx >= 0) {
            const a = updatedAdvances[aIdx];
            updatedAdvances[aIdx] = {
              ...a,
              recoveredAmount: Math.max(0, a.recoveredAmount - emp.advanceDeduction),
              balanceRemaining: (a.balanceRemaining ?? 0) + emp.advanceDeduction,
              status: 'approved',
            };
          }
        }
      });

      payrollStorage.saveLoans(updatedLoans);
      onLoansChange(updatedLoans);
      payrollStorage.saveAdvances(updatedAdvances);
      onAdvancesChange(updatedAdvances);

      // Reverse posted expense if applicable
      if (runToDelete.expensePostedId && onDeleteSalaryExpense) {
        await onDeleteSalaryExpense(runToDelete.expensePostedId);
      }
    }

    const updatedRuns = payrollStorage.deleteRun(runToDelete.id);
    onRunsChange(updatedRuns);

    payrollStorage.addAuditLog({
      action: 'run_deleted',
      fromStatus: runToDelete.status,
      toStatus: 'deleted',
      userId: currentUser?.id || 'usr-admin-01',
      userName: currentUser?.fullName || 'User',
      userRole: currentUser?.role || 'Staff',
      title: `Payroll Deleted: ${runToDelete.month}`,
      details: `Status changed from ${runToDelete.status.toUpperCase()} to DELETED. Payroll run for ${runToDelete.month} was permanently removed.${
        deleteUnlockReason ? ` Reason: ${deleteUnlockReason}` : ''
      }`,
      targetId: runToDelete.id,
      amount: runToDelete.totalNetPayroll,
    });

    setIsConfirmDeleteOpen(false);
    setIsUnlockPromptOpen(false);
    if (selectedRunForView && selectedRunForView.id === runToDelete.id) {
      setSelectedRunForView(null);
    }
    setRunToDelete(null);
    showToast(`Payroll run for ${runToDelete.month} deleted successfully.`, 'success');
  };

  // Status Badge Helper
  const renderStatusBadge = (status: PayrollRunStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            Draft
          </span>
        );
      case 'processed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <Lock className="w-3 h-3 text-blue-500" />
            Processed
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <ShieldCheck className="w-3 h-3 text-purple-500" />
            Approved
          </span>
        );
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Paid
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold transition-all animate-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-rose-600 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Bulk Compensation Engine
            </span>
            <span className="text-xs font-semibold text-slate-500">
              {runs.length} total run(s) recorded
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            Monthly Payroll Runs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-generate employee compensation, process loans &amp; advances, review draft revisions, and disburse salaries.
          </p>
        </div>

        {/* Prominent "Generate Payroll" Button */}
        <button
          type="button"
          onClick={handleOpenGenerateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition transform active:scale-95 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Generate Payroll</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payroll runs by month, notes, status..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-indigo-500 text-slate-900 dark:text-white font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Approval (Draft &amp; Processed)</option>
              <option value="draft">Draft</option>
              <option value="processed">Processed</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-bold text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Net Total</option>
              <option value="lowest">Lowest Net Total</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Runs Action Banner */}
      {selectedRunIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-indigo-600 dark:bg-indigo-700 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center font-bold text-xs">
              {selectedRunIds.length}
            </div>
            <div>
              <span className="font-extrabold text-xs">
                {selectedRunIds.length} Payroll Run(s) Selected
              </span>
              <span className="text-[11px] text-indigo-200 block">
                Bulk approve pending runs or reject back to draft for revisions
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBulkApproveRuns}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-white shadow-md transition cursor-pointer"
              title="Bulk approve all selected pending payroll runs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Bulk Approve ({selectedRunIds.length})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenBulkRejectModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-400 text-white shadow-md transition cursor-pointer"
              title="Bulk reject all selected runs back to draft"
            >
              <X className="w-4 h-4" />
              <span>Bulk Reject ({selectedRunIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRunIds([])}
              className="px-2.5 py-1.5 rounded-xl text-xs text-indigo-100 hover:text-white font-bold cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Payroll Runs List Table */}
      {filteredRuns.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No Payroll Runs Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {searchQuery || statusFilter !== 'all'
                ? 'No payroll cycles match your current search and filter criteria.'
                : 'No payroll cycles have been generated yet. Create your first automated run in one click.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenGenerateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Generate First Payroll</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="w-10 py-3.5 px-3 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all pending runs"
                      checked={allPendingSelected && pendingRuns.length > 0}
                      onChange={toggleSelectAllPendingRuns}
                      title={allPendingSelected ? 'Deselect all pending runs' : 'Select all pending runs for bulk approval/rejection'}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Month &amp; Year</th>
                  <th className="py-3.5 px-4 text-center">Employees</th>
                  <th className="py-3.5 px-4 text-right">Gross Salary</th>
                  <th className="py-3.5 px-4 text-right">Total Deductions</th>
                  <th className="py-3.5 px-4 text-right">Total Net Payable</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Workflow &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRuns.map(run => (
                  <tr
                    key={run.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      selectedRunIds.includes(run.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Select run for ${run.month}`}
                        checked={selectedRunIds.includes(run.id)}
                        onChange={() => toggleSelectRun(run.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Month */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                          <span className="font-extrabold text-slate-900 dark:text-white block text-sm">
                            {run.month}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Scope: {run.scope === 'all' ? 'All Active Staff' : run.scope?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Employees */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                        <Users className="w-3 h-3 text-slate-400" />
                        {run.totalEmployees}
                      </span>
                      {run.paidEmployees > 0 && (
                        <span className="text-[10px] text-emerald-600 block mt-0.5">
                          {run.paidEmployees} Paid
                        </span>
                      )}
                    </td>

                    {/* Gross */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {formatCurrency(run.totalBasicSalary + run.totalAllowances + (run.totalBonuses || 0) + (run.totalOvertime || 0), settings.currencySymbol)}
                    </td>

                    {/* Deductions */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(run.totalDeductions, settings.currencySymbol)}
                    </td>

                    {/* Total Net */}
                    <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(run.totalNetPayroll, settings.currencySymbol)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {renderStatusBadge(run.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedRunForView(run)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="View detailed employee sheet and edit"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          <span>View</span>
                        </button>

                        {/* Workflow Transition Buttons */}
                        {run.status === 'draft' && (
                          <button
                            type="button"
                            onClick={() => handleProcessRun(run)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer"
                            title="Process and lock payroll run"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Process</span>
                          </button>
                        )}

                        {run.status === 'processed' && (
                          <button
                            type="button"
                            onClick={() => handleApproveRun(run)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                              isAdmin
                                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                            title={isAdmin ? 'Approve payroll for disbursement' : 'Requires Administrator role to approve'}
                            disabled={!isAdmin}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {run.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleOpenMarkPaid(run)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                            title="Mark salaries as paid and record Accounts expense"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRun(run)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title={run.status === 'draft' ? 'Delete Draft Run' : 'Delete Run (Requires Admin Unlock)'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      {/* 1. ONE-CLICK BULK PAYROLL GENERATION MODAL                     */}
      {/* ============================================================== */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <Play className="w-5 h-5 fill-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Generate Monthly Payroll Run
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bulk calculate earnings, attendance deductions &amp; loan recoveries
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4">
              {/* Month and Year Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payroll Month
                  </label>
                  <select
                    value={genMonth}
                    onChange={e => setGenMonth(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {monthOptions.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Payroll Year
                  </label>
                  <select
                    value={genYear}
                    onChange={e => setGenYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {yearOptions.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Staff Scope */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Staff Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Active Staff' },
                    { id: 'department', label: 'By Department' },
                    { id: 'selected', label: 'Selected Staff' },
                  ].map(sc => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setGenScope(sc.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        genScope === sc.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Detail: Department */}
              {genScope === 'department' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Department
                  </label>
                  <select
                    value={genDepartment}
                    onChange={e => setGenDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white cursor-pointer"
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>
                        {d} ({staff.filter(s => s.department === d && s.status === 'active').length} staff)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Scope Detail: Selected Staff */}
              {genScope === 'selected' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Select Staff Members ({selectedStaffIds.length} chosen)
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    {staff.filter(s => s.status === 'active').map(s => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 p-1 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStaffIds.includes(s.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedStaffIds(prev => [...prev, s.id]);
                            } else {
                              setSelectedStaffIds(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold">{s.fullName}</span>
                        <span className="text-[10px] text-slate-400">({s.department})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculation Summary Notice */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200 text-xs space-y-1">
                <span className="font-extrabold flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Auto-Computation Formula:
                </span>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                  Gross = Basic + Allowances + Bonuses + Overtime
                  <br />
                  Deductions = Attendance Absences + Active Loans + Advances + Tax + Provident Fund
                  <br />
                  Net Salary = Total Earnings &minus; Total Deductions
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePayroll}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Generate Payroll Run</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. RUN DETAIL & EDITABLE DRAFT MODAL                           */}
      {/* ============================================================== */}
      {selectedRunForView && (
        <PayrollRunDetailModal
          run={selectedRunForView}
          onClose={() => setSelectedRunForView(null)}
          onSaveRun={updated => {
            const updatedRuns = payrollStorage.saveSingleRun(updated);
            onRunsChange(updatedRuns);
            setSelectedRunForView(updated);
            showToast('Payroll sheet adjustments saved successfully.', 'success');
          }}
          settings={settings}
          onViewPayslip={emp => onViewPayslip(emp, selectedRunForView.month)}
          currentUser={currentUser}
          isAdmin={isAdmin}
          onPrintAllPayslips={() => {
            if (onPrintAllPayslips && selectedRunForView) {
              onPrintAllPayslips(selectedRunForView);
            } else {
              window.print();
            }
          }}
        />
      )}

      {/* ============================================================== */}
      {/* 3. PROCESS CONFIRMATION MODAL                                  */}
      {/* ============================================================== */}
      {isConfirmProcessOpen && runToProcess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Process Payroll Run?
                </h3>
                <p className="text-xs text-slate-500">
                  Month: <span className="font-bold text-slate-700 dark:text-slate-300">{runToProcess.month}</span>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Employees:</span>
                <span className="font-bold text-slate-900 dark:text-white">{runToProcess.totalEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Net Payable:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(runToProcess.totalNetPayroll, settings.currencySymbol)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                Processing locks the draft from further manual modifications, updates staff loan installments, and logs the action in the audit ledger.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmProcessOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmProcessRun}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Process &amp; Lock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MARK AS PAID MODAL                                          */}
      {/* ============================================================== */}
      {isConfirmPayOpen && runToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Mark Salaries as Paid
                </h3>
                <p className="text-xs text-slate-500">
                  {runToPay.month} &bull; {runToPay.totalEmployees} Employees
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Payment Channel / Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: 'Bank Transfer' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'cheque', label: 'Cheque' },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        payMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 text-xs">
                <span className="font-extrabold block">Automatic Accounts Posting:</span>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                  An institutional expense of{' '}
                  <strong className="font-mono">
                    {formatCurrency(runToPay.totalNetPayroll, settings.currencySymbol)}
                  </strong>{' '}
                  will be automatically created under category &ldquo;Staff Salaries&rdquo; in Accounts &amp; Finance.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmPayOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMarkAsPaid}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm &amp; Disburse Salaries</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. DELETE DRAFT RUN MODAL                                      */}
      {/* ============================================================== */}
      {isConfirmDeleteOpen && runToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Delete Draft Payroll?
                </h3>
                <p className="text-xs text-slate-500">
                  Month: <span className="font-bold">{runToDelete.month}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete this draft payroll run? All associated salary records will be removed. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRun}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. ADMIN UNLOCK & DELETE NON-DRAFT RUN MODAL                   */}
      {/* ============================================================== */}
      {isUnlockPromptOpen && runToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Locked Payroll Deletion
                </h3>
                <p className="text-xs text-slate-500">
                  Current Status: <strong className="uppercase">{runToDelete.status}</strong>
                </p>
              </div>
            </div>

            {!isAdmin ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs">
                  <strong>Notice:</strong> Only Draft payroll can be deleted directly. This run is currently <strong>{runToDelete.status.toUpperCase()}</strong>. Please contact an Administrator to unlock and reverse this payroll cycle.
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsUnlockPromptOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-400">
                  As an Administrator, you can unlock and delete this non-draft run. Deleting will reverse any applied loan installments, advance recoveries, and remove corresponding expense records.
                </p>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Administrative Reason for Deletion (Required for Audit Log)
                  </label>
                  <textarea
                    rows={2}
                    value={deleteUnlockReason}
                    onChange={e => setDeleteUnlockReason(e.target.value)}
                    placeholder="e.g., Incorrect attendance data applied or revised compensation scale needed"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUnlockPromptOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!deleteUnlockReason.trim()}
                    onClick={confirmDeleteRun}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unlock &amp; Delete Run</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 7. BULK REJECT RUNS MODAL                                      */}
      {/* ============================================================== */}
      {isBulkRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Bulk Reject Selected Payroll Runs?
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRunIds.length} run(s) will be returned to Draft for adjustments.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Administrative Rejection (Recorded in Audit Log)
              </label>
              <textarea
                rows={3}
                value={bulkRejectReason}
                onChange={e => setBulkRejectReason(e.target.value)}
                placeholder="e.g., Attendance deduction discrepancies identified or revised allowance schedule required"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkReject}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Confirm Bulk Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ====================================================================
// SUB-COMPONENT: PAYROLL RUN DETAIL & EDIT MODAL WITH BULK APPROVAL
// ====================================================================
interface PayrollRunDetailModalProps {
  run: MonthlyPayrollRun;
  onClose: () => void;
  onSaveRun: (updatedRun: MonthlyPayrollRun) => void;
  settings: SchoolSettings;
  onViewPayslip: (employee: EmployeePayrollItem) => void;
  onPrintAllPayslips?: () => void;
  currentUser?: { id?: string; fullName: string; role: string } | null;
  isAdmin?: boolean;
}

const PayrollRunDetailModal: React.FC<PayrollRunDetailModalProps> = ({
  run,
  onClose,
  onSaveRun,
  settings,
  onViewPayslip,
  onPrintAllPayslips,
  currentUser,
  isAdmin,
}) => {
  const [employees, setEmployees] = useState<EmployeePayrollItem[]>(run.employees);
  const [deptFilter, setDeptFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Bulk Selection States for Employee Records
  const [selectedEmpStaffIds, setSelectedEmpStaffIds] = useState<string[]>([]);
  const [isRecordRejectModalOpen, setIsRecordRejectModalOpen] = useState(false);
  const [recordRejectReason, setRecordRejectReason] = useState('');

  const isEditable = run.status === 'draft';

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.department).filter(Boolean)));
  }, [employees]);

  // Recalculate totals
  const totals = useMemo(() => {
    const totalBasic = employees.reduce((sum, e) => sum + e.basicSalary, 0);
    const totalAllowances = employees.reduce((sum, e) => sum + e.allowances, 0);
    const totalBonuses = employees.reduce((sum, e) => sum + (e.bonuses || 0), 0);
    const totalOvertime = employees.reduce((sum, e) => sum + (e.overtimeAmount || 0), 0);
    const totalDeductions = employees.reduce((sum, e) => sum + e.totalDeductions, 0);
    const totalNet = employees.reduce((sum, e) => sum + e.netSalary, 0);
    return {
      totalBasic,
      totalAllowances,
      totalBonuses,
      totalOvertime,
      totalDeductions,
      totalNet,
    };
  }, [employees]);

  // Update employee row field in draft mode
  const handleUpdateEmployee = (index: number, field: keyof EmployeePayrollItem, value: any) => {
    if (!isEditable) return;
    setEmployees(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Recalculate net if numerical fields change
      const basic = Number(item.basicSalary) || 0;
      const allowances = Number(item.allowances) || 0;
      const bonus = Number(item.bonuses) || 0;
      const ot = Number(item.overtimeAmount) || 0;
      const gross = basic + allowances + bonus + ot;

      const absentDed = Number(item.absentDeduction) || 0;
      const loanDed = Number(item.loanDeduction) || 0;
      const advDed = Number(item.advanceDeduction) || 0;
      const taxDed = Number(item.taxDeduction) || 0;
      const pfDed = Number(item.providentFundDeduction) || 0;
      const otherDed = Number(item.otherDeductions) || 0;
      const totalDed = absentDed + loanDed + advDed + taxDed + pfDed + otherDed;

      item.grossSalary = gross;
      item.totalDeductions = totalDed;
      item.netSalary = Math.max(0, gross - totalDed);

      updated[index] = item;
      return updated;
    });
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = () => {
    const updatedRun: MonthlyPayrollRun = {
      ...run,
      totalBasicSalary: totals.totalBasic,
      totalAllowances: totals.totalAllowances,
      totalBonuses: totals.totalBonuses,
      totalOvertime: totals.totalOvertime,
      totalDeductions: totals.totalDeductions,
      totalNetPayroll: totals.totalNet,
      employees,
      updatedAt: new Date().toISOString(),
    };
    onSaveRun(updatedRun);
    setHasUnsavedChanges(false);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q);
      const matchDept = deptFilter === 'all' || e.department === deptFilter;
      
      const currentApproval = e.approvalStatus || 'pending';
      const matchApproval =
        approvalFilter === 'all' ||
        (approvalFilter === 'pending'
          ? currentApproval === 'pending'
          : currentApproval === approvalFilter);

      return matchSearch && matchDept && matchApproval;
    });
  }, [employees, search, deptFilter, approvalFilter]);

  // Bulk selection logic for employee records
  const isAllFilteredSelected = useMemo(() => {
    if (filteredEmployees.length === 0) return false;
    return filteredEmployees.every(e => selectedEmpStaffIds.includes(e.staffId));
  }, [filteredEmployees, selectedEmpStaffIds]);

  const toggleSelectAllFilteredEmployees = () => {
    if (isAllFilteredSelected) {
      setSelectedEmpStaffIds(prev =>
        prev.filter(id => !filteredEmployees.some(e => e.staffId === id))
      );
    } else {
      const ids = filteredEmployees.map(e => e.staffId);
      setSelectedEmpStaffIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const toggleSelectEmployee = (staffId: string) => {
    setSelectedEmpStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    );
  };

  const handleBulkApproveRecords = () => {
    const selectedCount = selectedEmpStaffIds.length;
    if (selectedCount === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const approverName = currentUser?.fullName || 'Administrator';
    const approverId = currentUser?.id || 'usr-admin-01';

    const updated = employees.map(emp => {
      if (selectedEmpStaffIds.includes(emp.staffId)) {
        return {
          ...emp,
          approvalStatus: 'approved' as const,
          approvedBy: approverName,
          approvedDate: todayStr,
          rejectionReason: undefined,
        };
      }
      return emp;
    });

    setEmployees(updated);
    setSelectedEmpStaffIds([]);

    const updatedRun: MonthlyPayrollRun = {
      ...run,
      employees: updated,
      updatedAt: new Date().toISOString(),
    };
    onSaveRun(updatedRun);

    // Audit log
    payrollStorage.addAuditLog({
      action: 'record_approved',
      fromStatus: 'pending',
      toStatus: 'approved',
      userId: approverId,
      userName: approverName,
      userRole: currentUser?.role || 'Administrator',
      title: `Records Approved (${selectedCount} staff): ${run.month}`,
      details: `Administrative bulk approval granted for ${selectedCount} individual employee payroll records in ${run.month}.`,
      targetId: run.id,
    });
  };

  const handleBulkRejectRecords = () => {
    const selectedCount = selectedEmpStaffIds.length;
    if (selectedCount === 0) return;

    const approverName = currentUser?.fullName || 'Administrator';
    const approverId = currentUser?.id || 'usr-admin-01';
    const reason = recordRejectReason.trim() || 'Discrepancy identified during administrative review';

    const updated = employees.map(emp => {
      if (selectedEmpStaffIds.includes(emp.staffId)) {
        return {
          ...emp,
          approvalStatus: 'rejected' as const,
          rejectionReason: reason,
        };
      }
      return emp;
    });

    setEmployees(updated);
    setSelectedEmpStaffIds([]);
    setIsRecordRejectModalOpen(false);
    setRecordRejectReason('');

    const updatedRun: MonthlyPayrollRun = {
      ...run,
      employees: updated,
      updatedAt: new Date().toISOString(),
    };
    onSaveRun(updatedRun);

    // Audit log
    payrollStorage.addAuditLog({
      action: 'record_rejected',
      fromStatus: 'pending',
      toStatus: 'rejected',
      userId: approverId,
      userName: approverName,
      userRole: currentUser?.role || 'Administrator',
      title: `Records Rejected (${selectedCount} staff): ${run.month}`,
      details: `Administrative bulk rejection for ${selectedCount} employee records in ${run.month}. Reason: ${reason}`,
      targetId: run.id,
    });
  };

  const handleExportCSV = () => {
    const rows = employees.map(e => ({
      'Employee Code': e.employeeCode,
      'Full Name': e.fullName,
      'Designation': e.designation,
      'Department': e.department,
      'Basic Salary': e.basicSalary,
      'Allowances': e.allowances,
      'Bonuses': e.bonuses,
      'Overtime': e.overtimeAmount,
      'Absent Deduction': e.absentDeduction,
      'Loan Deduction': e.loanDeduction,
      'Advance Recovery': e.advanceDeduction,
      'Tax': e.taxDeduction,
      'Provident Fund': e.providentFundDeduction,
      'Other Deductions': e.otherDeductions,
      'Total Deductions': e.totalDeductions,
      'Net Salary': e.netSalary,
      'Approval Status': e.approvalStatus || 'pending',
      'Rejection Reason': e.rejectionReason || '',
      'Payment Status': e.status,
      'Payment Mode': e.paymentMode,
      'Remarks': e.remarks || '',
    }));
    exportToCSV(`Payroll_Sheet_${run.month.replace(' ', '_')}`, rows);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {run.month} Payroll Register
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Status: <strong className="uppercase">{run.status}</strong>
              </span>
              {isEditable && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                  Editable Draft
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              Employee Compensation &amp; Deductions Sheet
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isEditable && hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleSaveChanges}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Adjustments</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintSheet}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              title="Print standard payroll register"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onPrintAllPayslips) {
                  onPrintAllPayslips();
                } else {
                  handlePrintSheet();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs cursor-pointer"
              title="Bulk print individual payslips for all employees in this run"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All Payslips</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Employees</span>
            <p className="text-base font-black text-slate-900 dark:text-white mt-0.5">{employees.length}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Payroll</span>
            <p className="text-base font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {formatCurrency(totals.totalBasic + totals.totalAllowances + totals.totalBonuses + totals.totalOvertime, settings.currencySymbol)}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Deductions</span>
            <p className="text-base font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
              -{formatCurrency(totals.totalDeductions, settings.currencySymbol)}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Net Disbursable</span>
            <p className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatCurrency(totals.totalNet, settings.currencySymbol)}
            </p>
          </div>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by staff name, code or designation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Approval Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Approval:</span>
              <select
                value={approvalFilter}
                onChange={e => setApprovalFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
              >
                <option value="all">All ({employees.length})</option>
                <option value="pending">
                  Pending ({employees.filter(e => !e.approvalStatus || e.approvalStatus === 'pending').length})
                </option>
                <option value="approved">
                  Approved ({employees.filter(e => e.approvalStatus === 'approved').length})
                </option>
                <option value="rejected">
                  Rejected ({employees.filter(e => e.approvalStatus === 'rejected').length})
                </option>
              </select>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Department:</span>
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Selection Bar for Employee Records */}
        {selectedEmpStaffIds.length > 0 && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-[11px]">
                {selectedEmpStaffIds.length}
              </div>
              <span className="font-extrabold text-indigo-950 dark:text-indigo-200">
                {selectedEmpStaffIds.length} employee record(s) selected
              </span>
              <span className="text-[11px] text-slate-500 hidden md:inline">
                &bull; Bulk approve or reject selected pending records
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBulkApproveRecords}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer transition"
                title="Bulk approve selected employee records"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Bulk Approve ({selectedEmpStaffIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRecordRejectModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer transition"
                title="Bulk reject selected employee records"
              >
                <X className="w-3.5 h-3.5" />
                <span>Bulk Reject ({selectedEmpStaffIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedEmpStaffIds([])}
                className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* Editable Table */}
        <div className="flex-1 overflow-auto mt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="w-10 py-3 px-3 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all visible employee records"
                    checked={isAllFilteredSelected && filteredEmployees.length > 0}
                    onChange={toggleSelectAllFilteredEmployees}
                    title={isAllFilteredSelected ? 'Deselect all records' : 'Select all records for bulk approval/rejection'}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Emp Code</th>
                <th className="py-3 px-3">Employee Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-2 text-right">Basic</th>
                <th className="py-3 px-2 text-right">Allowances</th>
                <th className="py-3 px-2 text-right">Bonus</th>
                <th className="py-3 px-2 text-right">Deductions</th>
                <th className="py-3 px-3 text-right">Net Salary</th>
                <th className="py-3 px-3 text-center">Approval</th>
                <th className="py-3 px-3 text-center">Payslip</th>
                {isEditable && <th className="py-3 px-3">Remarks</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredEmployees.map((emp) => {
                const originalIndex = employees.findIndex(e => e.staffId === emp.staffId);
                const isSelected = selectedEmpStaffIds.includes(emp.staffId);
                return (
                  <tr
                    key={emp.staffId}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Select employee ${emp.fullName}`}
                        checked={isSelected}
                        onChange={() => toggleSelectEmployee(emp.staffId)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{emp.employeeCode}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 dark:text-white block">{emp.fullName}</span>
                      <span className="text-[10px] text-slate-400">{emp.designation}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{emp.department}</td>

                    {/* Basic */}
                    <td className="py-2.5 px-2 text-right">
                      {isEditable ? (
                        <input
                          type="number"
                          value={emp.basicSalary}
                          onChange={e => handleUpdateEmployee(originalIndex, 'basicSalary', Number(e.target.value))}
                          className="w-20 px-1.5 py-1 text-right text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(emp.basicSalary, settings.currencySymbol)}</span>
                      )}
                    </td>

                    {/* Allowances */}
                    <td className="py-2.5 px-2 text-right">
                      {isEditable ? (
                        <input
                          type="number"
                          value={emp.allowances}
                          onChange={e => handleUpdateEmployee(originalIndex, 'allowances', Number(e.target.value))}
                          className="w-18 px-1.5 py-1 text-right text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(emp.allowances, settings.currencySymbol)}</span>
                      )}
                    </td>

                    {/* Bonus */}
                    <td className="py-2.5 px-2 text-right">
                      {isEditable ? (
                        <input
                          type="number"
                          value={emp.bonuses || 0}
                          onChange={e => handleUpdateEmployee(originalIndex, 'bonuses', Number(e.target.value))}
                          className="w-16 px-1.5 py-1 text-right text-xs font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      ) : (
                        <span className="font-mono">{formatCurrency(emp.bonuses || 0, settings.currencySymbol)}</span>
                      )}
                    </td>

                    {/* Total Deductions */}
                    <td className="py-2.5 px-2 text-right font-mono text-rose-600 dark:text-rose-400">
                      -{formatCurrency(emp.totalDeductions, settings.currencySymbol)}
                    </td>

                    {/* Net Salary */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(emp.netSalary, settings.currencySymbol)}
                    </td>

                    {/* Approval Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      {emp.approvalStatus === 'approved' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          title={`Approved by ${emp.approvedBy || 'Admin'} on ${emp.approvedDate || 'Record'}`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Approved
                        </span>
                      ) : emp.approvalStatus === 'rejected' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          title={`Rejected: ${emp.rejectionReason || 'Discrepancy flagged'}`}
                        >
                          <X className="w-3 h-3 text-rose-600" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Payslip Action */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onViewPayslip(emp)}
                        className="flex items-center gap-1 mx-auto px-2 py-1 rounded text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer"
                        title="Print individual employee payslip"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Slip</span>
                      </button>
                    </td>

                    {/* Remarks in Draft mode */}
                    {isEditable && (
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          placeholder="Add adjustment remark..."
                          value={emp.remarks || ''}
                          onChange={e => handleUpdateEmployee(originalIndex, 'remarks', e.target.value)}
                          className="w-full px-2 py-1 text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Showing {filteredEmployees.length} of {employees.length} employee salary records
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Record Rejection Modal */}
      {isRecordRejectModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Bulk Reject Selected Records?
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEmpStaffIds.length} employee record(s) will be marked as Rejected.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Record Rejection (Recorded in Audit Log)
              </label>
              <textarea
                rows={3}
                value={recordRejectReason}
                onChange={e => setRecordRejectReason(e.target.value)}
                placeholder="e.g., Attendance deduction discrepancy or unverified overtime claim"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRecordRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkRejectRecords}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
