import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, getTodayDateString, exportToCSV, exportToExcel } from '../../utils/formatters';
import { formatLedgerForExport, exportMasterSchoolWorkbook } from '../../utils/exportUtils';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  generateGeneralLedgerPdf,
  generateFinancialStatementPdf,
  generateStudentStatementPdf,
  LedgerPdfEntry,
  FinancialStatementData,
} from '../../utils/financialPdf';
import { FeePayment, Expense, PaymentMode, IncomeCategory, ExpenseCategory } from '../../types';
import {
  BookOpen,
  User,
  Building,
  Printer,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  FileText,
  X,
  PieChart,
  Clock,
  Sparkles,
  Save,
  FileSpreadsheet,
  Upload,
  Lock,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { BulkImportFinancialModal } from './BulkImportFinancialModal';

type LedgerTabType = 'school' | 'statements' | 'daily' | 'student';

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Student Fees',
  'Other Income',
  'Donation',
  'Security Received',
  'Annual Charges',
  'Registration Charges',
  'Admission Charges',
  'Book Shop Income',
  'Miscellaneous Income',
  'Other Revenue',
  'Admission & Registration',
  'Grants & Subsidies',
  'Donations & Sponsorships',
  'Bookstore & Uniforms',
  'Cafeteria & Canteen',
  'Transport Services',
  'Facility & Hall Rental',
  'Events & Competitions',
];

const EXPENSE_CATEGORIES: (ExpenseCategory | string)[] = [
  'Utilities',
  'Building Maintenance',
  'Repairs & Maintenance',
  'Transport & Fuel',
  'Stationery',
  'Educational Supplies',
  'Examination & Events',
  'IT & Software',
  'Lab & Sports Equipment',
  'Office Expenses',
  'Bank Charges',
  'Miscellaneous Expense',
  'Other Expense',
  'Staff Salaries',
  'Utilities (Electricity/Water)',
  'Marketing & Advertising',
  'Exam & Events',
  'Miscellaneous',
];

const PAYMENT_MODES: PaymentMode[] = [
  'Cash',
  'Bank Transfer',
  'Cheque',
  'Online/UPI',
  'Card',
  'Other',
];

interface LedgerTransaction {
  id: string;
  sourceType: 'FEE_PAYMENT' | 'EXPENSE';
  source: 'system' | 'manual';
  rawRecord: FeePayment | Expense;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category: string;
  paymentMode: PaymentMode;
  referenceNumber: string;
  credit: number;
  debit: number;
  balance: number;
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const LedgerView: React.FC = () => {
  const {
    students,
    staff,
    feePayments,
    expenses,
    settings,
    getStudentPendingFee,
    recordDailyFinancialActivity,
    updateFeePayment,
    deleteFeePayment,
    updateExpense,
    deleteExpense,
  } = useSchool();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<LedgerTabType>('school');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [dateFilterType, setDateFilterType] = useState<'ALL' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('2026-08-01');
  const [customEndDate, setCustomEndDate] = useState(getTodayDateString());

  // Daily activity tab state
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>(getTodayDateString());

  // Statement customization state
  const [statementTitle, setStatementTitle] = useState('Statement of Revenues & Expenditures (P&L)');
  const [auditorNotes, setAuditorNotes] = useState(
    'Financial statements prepared under accrual-modified cash accounting standards. All operating cash inflows and disbursements have been audited against bank reconciliations and receipt vouchers.'
  );
  const [preparedBy, setPreparedBy] = useState(currentUser?.fullName || 'Chief Accounts Officer');
  const [approvedBy, setApprovedBy] = useState('School Bursar / Principal');
  const [isEditingStatementMeta, setIsEditingStatementMeta] = useState(false);

  // Modals state
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerTransaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<LedgerTransaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<LedgerTransaction | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state for Add Activity
  const [activityForm, setActivityForm] = useState({
    type: 'INCOME' as 'INCOME' | 'EXPENSE',
    date: getTodayDateString(),
    title: '',
    category: 'Other Income' as string,
    amount: '',
    paymentMode: 'Cash' as PaymentMode,
    referenceNumber: '',
    studentId: '',
    notes: '',
  });

  // Form state for Edit Transaction
  const [editForm, setEditForm] = useState({
    date: '',
    title: '',
    category: '',
    amount: '',
    paymentMode: 'Cash' as PaymentMode,
    referenceNumber: '',
    notes: '',
  });

  const notify = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 4000);
  };

  // 1. Compile General Ledger Transactions with Running Balances
  const allLedgerTransactions: LedgerTransaction[] = useMemo(() => {
    const incomeItems = feePayments.map(p => {
      const isManual = p.source === 'manual' || (!p.source && (!p.studentId || p.studentId === '' || p.studentId === 'general'));
      const source: 'system' | 'manual' = p.source || (isManual ? 'manual' : 'system');
      
      const desc = isManual
        ? (p.remarks || p.studentName || 'Manual Income Entry')
        : (p.studentId && p.studentId !== '' && p.studentId !== 'general'
            ? `Fee Collection: ${p.studentName} (${p.receiptNumber}) - ${p.monthFor}`
            : `${p.studentName || 'Revenue'} (${p.receiptNumber}) ${p.remarks ? `• ${p.remarks}` : ''}`);

      return {
        id: p.id,
        sourceType: 'FEE_PAYMENT' as const,
        source,
        rawRecord: p,
        date: p.date,
        type: 'INCOME' as const,
        description: desc,
        category: p.category || 'Other Income',
        paymentMode: p.paymentMode,
        referenceNumber: p.receiptNumber || p.transactionRef || '',
        credit: p.totalAmount,
        debit: 0,
        balance: 0,
        notes: p.remarks,
        recordedBy: p.collectedBy,
        createdAt: p.createdAt,
        createdBy: p.createdBy || p.collectedBy,
        updatedAt: p.updatedAt,
        updatedBy: p.updatedBy,
      };
    });

    const expenseItems = expenses.map(e => ({
      id: e.id,
      sourceType: 'EXPENSE' as const,
      source: (e.source || (e.staffId || e.monthForSalary ? 'system' : 'manual')) as 'system' | 'manual',
      rawRecord: e,
      date: e.date,
      type: 'EXPENSE' as const,
      description: e.title || 'Manual Expense Entry',
      category: e.category,
      paymentMode: e.paymentMode,
      referenceNumber: e.referenceNumber || '',
      credit: 0,
      debit: e.amount,
      balance: 0,
      notes: e.notes,
      recordedBy: e.recordedBy,
      createdAt: e.createdAt,
      createdBy: e.createdBy || e.recordedBy,
      updatedAt: e.updatedAt,
      updatedBy: e.updatedBy,
    }));

    // Sort ascending by date to calculate accurate running balance
    const sorted = [...incomeItems, ...expenseItems].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    let running = 0;
    return sorted.map(item => {
      running += item.credit - item.debit;
      return {
        ...item,
        balance: running,
      };
    });
  }, [feePayments, expenses]);

  // Filtered Ledger Transactions (Newest first for table view)
  const filteredTransactions = useMemo(() => {
    return allLedgerTransactions
      .filter(tx => {
        // Date filter
        if (dateFilterType === 'THIS_MONTH') {
          const currentMonthPrefix = getTodayDateString().slice(0, 7); // YYYY-MM
          if (!tx.date.startsWith(currentMonthPrefix)) return false;
        } else if (dateFilterType === 'CUSTOM') {
          if (tx.date < customStartDate || tx.date > customEndDate) return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && tx.category !== categoryFilter) {
          return false;
        }

        // Payment mode filter
        if (modeFilter !== 'ALL' && tx.paymentMode !== modeFilter) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = tx.description.toLowerCase().includes(q);
          const matchCat = tx.category.toLowerCase().includes(q);
          const matchRef = tx.referenceNumber.toLowerCase().includes(q);
          const matchMode = tx.paymentMode.toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchRef && !matchMode) return false;
        }

        return true;
      })
      .reverse(); // Display newest first
  }, [
    allLedgerTransactions,
    dateFilterType,
    customStartDate,
    customEndDate,
    categoryFilter,
    modeFilter,
    searchQuery,
  ]);

  // Overall Financial Totals
  const totalInflow = useMemo(
    () => filteredTransactions.reduce((acc, t) => acc + t.credit, 0),
    [filteredTransactions]
  );
  const totalOutflow = useMemo(
    () => filteredTransactions.reduce((acc, t) => acc + t.debit, 0),
    [filteredTransactions]
  );
  const netClosingBalance = totalInflow - totalOutflow;

  // Daily activities for the Daily tab
  const dailyTransactions = useMemo(() => {
    return allLedgerTransactions.filter(tx => tx.date === selectedDailyDate);
  }, [allLedgerTransactions, selectedDailyDate]);

  const dailyTotalInflow = dailyTransactions.reduce((acc, t) => acc + t.credit, 0);
  const dailyTotalOutflow = dailyTransactions.reduce((acc, t) => acc + t.debit, 0);
  const dailyNet = dailyTotalInflow - dailyTotalOutflow;

  // 2. Financial Statements Data (Income Statement & Balance Sheet Breakdown)
  const statementData: FinancialStatementData = useMemo(() => {
    const incomeCatMap: Record<string, number> = {};
    const expenseCatMap: Record<string, number> = {};

    let totalInc = 0;
    let totalExp = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === 'INCOME') {
        incomeCatMap[tx.category] = (incomeCatMap[tx.category] || 0) + tx.credit;
        totalInc += tx.credit;
      } else {
        expenseCatMap[tx.category] = (expenseCatMap[tx.category] || 0) + tx.debit;
        totalExp += tx.debit;
      }
    }

    const incomeCategories = Object.entries(incomeCatMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalInc > 0 ? (amt / totalInc) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const expenseCategories = Object.entries(expenseCatMap)
      .map(([cat, amt]) => ({
        category: cat,
        amount: amt,
        percentage: totalExp > 0 ? (amt / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const netSurplus = totalInc - totalExp;
    const operatingMargin = totalInc > 0 ? (netSurplus / totalInc) * 100 : 0;

    let periodString = 'All Time to Date';
    if (dateFilterType === 'THIS_MONTH') {
      periodString = `Month of ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    } else if (dateFilterType === 'CUSTOM') {
      periodString = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;
    }

    return {
      title: statementTitle,
      reportingPeriod: periodString,
      academicYear: settings.currentAcademicYear || '2026-2027',
      auditorNotes,
      preparedBy,
      approvedBy,
      incomeCategories,
      expenseCategories,
      totalIncome: totalInc,
      totalExpense: totalExp,
      netSurplus,
      operatingMargin,
    };
  }, [
    filteredTransactions,
    dateFilterType,
    customStartDate,
    customEndDate,
    statementTitle,
    auditorNotes,
    preparedBy,
    approvedBy,
    settings.currentAcademicYear,
  ]);

  // 3. Student Individual Statement
  const targetStudent = students.find(s => s.id === selectedStudentId);
  const studentPayments = useMemo(() => {
    return feePayments.filter(p => p.studentId === selectedStudentId);
  }, [feePayments, selectedStudentId]);

  const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const studentPending = targetStudent ? getStudentPendingFee(targetStudent) : 0;

  // Handlers for Adding Daily Activity / Manual Financial Entry
  const handleOpenAddModal = (defaultType: 'INCOME' | 'EXPENSE' = 'INCOME') => {
    setFormError(null);
    const prefix = defaultType === 'INCOME' ? 'INC' : 'EXP';
    setActivityForm({
      type: defaultType,
      date: getTodayDateString(),
      title: '',
      category: defaultType === 'INCOME' ? 'Other Income' : 'Utilities',
      amount: '',
      paymentMode: 'Cash',
      referenceNumber: `${prefix}-${Date.now().toString().slice(-6)}`,
      studentId: '',
      notes: '',
    });
    setShowAddActivityModal(true);
  };

  const handleSubmitAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 17. DATA VALIDATION
    if (!activityForm.date) {
      setFormError('Transaction date is required.');
      return;
    }
    if (!activityForm.type) {
      setFormError('Entry Type (Income or Expense) is required.');
      return;
    }
    if (!activityForm.category) {
      setFormError('Category is required.');
      return;
    }
    if (!activityForm.title.trim()) {
      setFormError('Particulars / Narration is required.');
      return;
    }
    const parsedAmount = parseFloat(activityForm.amount);
    if (!activityForm.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount is required and must be a valid number greater than zero.');
      return;
    }
    if (!activityForm.paymentMode) {
      setFormError('Payment Mode is required.');
      return;
    }

    try {
      const selectedStudent = students.find(s => s.id === activityForm.studentId);
      const prefix = activityForm.type === 'INCOME' ? 'INC' : 'EXP';
      const refNo = activityForm.referenceNumber.trim() || `${prefix}-${Date.now().toString().slice(-6)}`;
      const nowIso = new Date().toISOString();
      const userName = currentUser?.fullName || 'Finance Officer';

      await recordDailyFinancialActivity({
        type: activityForm.type,
        date: activityForm.date,
        title: activityForm.title.trim(),
        category: activityForm.category,
        amount: parsedAmount,
        paymentMode: activityForm.paymentMode,
        referenceNumber: refNo,
        studentId: activityForm.studentId || undefined,
        studentName: selectedStudent ? selectedStudent.fullName : undefined,
        notes: activityForm.notes.trim() || undefined,
        recordedBy: userName,
        source: 'manual',
        createdAt: nowIso,
        createdBy: userName,
      });

      setShowAddActivityModal(false);
      notify(
        `Successfully recorded ${activityForm.type === 'INCOME' ? 'Income / Credit' : 'Expense / Debit'} of ${formatCurrency(
          parsedAmount,
          settings.currencySymbol
        )} into the ledger.`
      );
    } catch (err) {
      console.error(err);
      setFormError('Failed to record financial entry. Please verify inputs and try again.');
    }
  };

  // Handlers for Editing Transaction
  const handleOpenEditModal = (tx: LedgerTransaction) => {
    if (tx.source === 'system') {
      setViewingTransaction(tx);
      return;
    }
    setEditingTransaction(tx);
    setEditForm({
      date: tx.date,
      title: tx.description,
      category: tx.category,
      amount: String(tx.type === 'INCOME' ? tx.credit : tx.debit),
      paymentMode: tx.paymentMode,
      referenceNumber: tx.referenceNumber,
      notes: tx.notes || '',
    });
  };

  const handleSaveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (editingTransaction.source === 'system') {
      alert('System-generated transactions are protected and cannot be modified through the manual entry interface.');
      setEditingTransaction(null);
      return;
    }

    if (!editForm.date) {
      alert('Date is required.');
      return;
    }
    if (!editForm.title.trim()) {
      alert('Particulars / Narration is required.');
      return;
    }
    const parsedAmount = parseFloat(editForm.amount);
    if (!editForm.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Amount must be a valid number greater than zero.');
      return;
    }
    if (!editForm.category) {
      alert('Category is required.');
      return;
    }
    if (!editForm.paymentMode) {
      alert('Payment mode is required.');
      return;
    }

    try {
      const nowIso = new Date().toISOString();
      const userName = currentUser?.fullName || 'Finance Officer';

      if (editingTransaction.sourceType === 'EXPENSE') {
        const original = editingTransaction.rawRecord as Expense;
        const updatedExp: Expense = {
          ...original,
          title: editForm.title.trim(),
          category: editForm.category,
          amount: parsedAmount,
          date: editForm.date,
          paymentMode: editForm.paymentMode,
          referenceNumber: editForm.referenceNumber.trim() || undefined,
          notes: editForm.notes.trim() || undefined,
          source: 'manual',
          updatedAt: nowIso,
          updatedBy: userName,
        };
        await updateExpense(updatedExp);
      } else {
        const original = editingTransaction.rawRecord as FeePayment;
        const updatedPay: FeePayment = {
          ...original,
          studentName: editForm.title.trim(),
          category: editForm.category,
          totalAmount: parsedAmount,
          date: editForm.date,
          paymentMode: editForm.paymentMode,
          receiptNumber: editForm.referenceNumber.trim() || original.receiptNumber,
          transactionRef: editForm.referenceNumber.trim() || original.transactionRef,
          remarks: editForm.notes.trim() || editForm.title.trim(),
          source: 'manual',
          updatedAt: nowIso,
          updatedBy: userName,
        };
        await updateFeePayment(updatedPay);
      }

      setEditingTransaction(null);
      notify('Manual transaction updated successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to update transaction.');
    }
  };

  // Handlers for Deleting Transaction
  const handleConfirmDelete = async () => {
    if (!deletingTransaction) return;

    if (deletingTransaction.source === 'system') {
      alert('System-generated transactions are protected and cannot be deleted through the manual entry interface.');
      setDeletingTransaction(null);
      return;
    }

    try {
      if (deletingTransaction.sourceType === 'EXPENSE') {
        await deleteExpense(deletingTransaction.id);
      } else {
        await deleteFeePayment(deletingTransaction.id);
      }
      setDeletingTransaction(null);
      notify('Transaction deleted from ledger.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete transaction.');
    }
  };

  // PDF Export Handlers
  const handleDownloadLedgerPdf = () => {
    const pdfEntries: LedgerPdfEntry[] = filteredTransactions.map(t => ({
      date: t.date,
      description: t.description,
      category: t.category,
      paymentMode: t.paymentMode,
      reference: t.referenceNumber,
      debit: t.debit,
      credit: t.credit,
      balance: t.balance,
    }));

    let startDate = '2026-08-01';
    let endDate = getTodayDateString();
    if (dateFilterType === 'THIS_MONTH') {
      const now = new Date();
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = getTodayDateString();
    } else if (dateFilterType === 'CUSTOM') {
      startDate = customStartDate;
      endDate = customEndDate;
    }

    const scopeParts: string[] = [];
    if (categoryFilter !== 'ALL') scopeParts.push(`Category: ${categoryFilter}`);
    if (modeFilter !== 'ALL') scopeParts.push(`Mode: ${modeFilter}`);
    if (searchQuery.trim()) scopeParts.push(`Search: "${searchQuery.trim()}"`);
    scopeParts.push(`${filteredTransactions.length} Audited Records`);

    generateGeneralLedgerPdf(
      settings,
      pdfEntries,
      {
        start: startDate,
        end: endDate,
      },
      {
        totalCredit: totalInflow,
        totalDebit: totalOutflow,
        closingBalance: netClosingBalance,
      },
      {
        title: 'OFFICIAL ACCOUNTS GENERAL LEDGER & CASHBOOK AUDIT',
        scope: scopeParts.join(' • '),
      }
    );
    notify(`General Ledger audit PDF (${filteredTransactions.length} records) downloaded.`);
  };

  const handleDownloadDailyPdf = () => {
    const pdfEntries: LedgerPdfEntry[] = dailyTransactions.map(t => ({
      date: t.date,
      description: t.description,
      category: t.category,
      paymentMode: t.paymentMode,
      reference: t.referenceNumber,
      debit: t.debit,
      credit: t.credit,
      balance: t.balance,
    }));

    generateGeneralLedgerPdf(
      settings,
      pdfEntries,
      {
        start: selectedDailyDate,
        end: selectedDailyDate,
      },
      {
        totalCredit: dailyTotalInflow,
        totalDebit: dailyTotalOutflow,
        closingBalance: dailyNet,
      },
      {
        title: 'OFFICIAL DAILY CASH DRAWER & AUDIT REPORT',
        scope: `Daily Log: ${formatDate(selectedDailyDate)} • ${dailyTransactions.length} Transactions Recorded`,
      }
    );
    notify(`Daily Cash Drawer audit PDF for ${formatDate(selectedDailyDate)} downloaded.`);
  };

  const handleDownloadStatementPdf = () => {
    generateFinancialStatementPdf(settings, statementData);
    notify('Official Financial Statement PDF downloaded.');
  };

  const handleDownloadStudentPdf = () => {
    if (!targetStudent) return;
    generateStudentStatementPdf(settings, targetStudent, studentPayments, studentPending);
    notify(`Student statement PDF for ${targetStudent.fullName} downloaded.`);
  };

  const handleActiveDownloadPdf = () => {
    if (activeTab === 'statements') {
      handleDownloadStatementPdf();
    } else if (activeTab === 'student') {
      handleDownloadStudentPdf();
    } else if (activeTab === 'daily') {
      handleDownloadDailyPdf();
    } else {
      handleDownloadLedgerPdf();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (activeTab === 'school' || activeTab === 'daily') {
      const txs = activeTab === 'daily' ? dailyTransactions : filteredTransactions;
      const rows = txs.map(e => ({
        Date: e.date,
        Type: e.type,
        Description: e.description,
        Category: e.category,
        Mode: e.paymentMode,
        'Ref / Receipt': e.referenceNumber,
        'Credit (Income)': e.credit || 0,
        'Debit (Expense)': e.debit || 0,
        'Running Balance': e.balance,
        Notes: e.notes || '',
        'Recorded By': e.recordedBy || '',
      }));
      exportToCSV(`General_Ledger_${getTodayDateString()}`, rows);
      notify('Exported ledger data to CSV.');
    } else if (activeTab === 'student' && targetStudent) {
      const rows = studentPayments.map(p => ({
        'Receipt No': p.receiptNumber,
        Date: p.date,
        'Billing Period': p.monthFor,
        'Amount Paid': p.totalAmount,
        Mode: p.paymentMode,
        'Collected By': p.collectedBy,
      }));
      exportToCSV(`Student_Statement_${targetStudent.rollNo}`, rows);
      notify('Exported student statement to CSV.');
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'school' || activeTab === 'daily') {
      const txs = activeTab === 'daily' ? dailyTransactions : filteredTransactions;
      const currency = settings.currencySymbol || '$';
      const rows = txs.map(e => ({
        Date: e.date,
        Type: e.type,
        'Particulars / Description': e.description,
        Category: e.category,
        'Payment Mode': e.paymentMode,
        'Ref / Receipt': e.referenceNumber,
        [`Credit - Inflow (${currency})`]: e.credit || 0,
        [`Debit - Outflow (${currency})`]: e.debit || 0,
        [`Running Balance (${currency})`]: e.balance,
        Notes: e.notes || '',
        'Recorded By': e.recordedBy || '',
      }));
      exportToExcel(`General_Ledger_${activeTab}`, 'General Ledger', rows);
      notify('Exported ledger data to Excel (.xlsx).');
    } else if (activeTab === 'student' && targetStudent) {
      const currency = settings.currencySymbol || '$';
      const rows = studentPayments.map(p => ({
        'Receipt No': p.receiptNumber,
        Date: p.date,
        'Billing Period': p.monthFor,
        [`Amount Paid (${currency})`]: p.totalAmount,
        'Payment Mode': p.paymentMode,
        'Collected By': p.collectedBy,
      }));
      exportToExcel(`Student_Statement_${targetStudent.rollNo}`, 'Student Statement', rows);
      notify(`Exported student statement for ${targetStudent.fullName} to Excel (.xlsx).`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {feedbackNotice && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-semibold shadow-xl animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="print:hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Accounts Ledger & Financial Statements</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add daily financial activities, edit transactions in real-time, audit ledger journals, and print/export statements as PDF.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleOpenAddModal('INCOME')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Financial Entry</span>
          </button>

          <button
            onClick={() => setShowBulkImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Bulk import daily financial activities from a CSV file"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleActiveDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
            title="Download filtered report as official PDF for external audit and record keeping"
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              {activeTab === 'statements'
                ? 'Download Statement PDF'
                : activeTab === 'student'
                ? 'Download Student PDF'
                : activeTab === 'daily'
                ? 'Download Daily PDF'
                : 'Download Ledger PDF'}
            </span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
            title="Open browser print dialogue / Save as PDF"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print View / PDF</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
            title="Export to CSV spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="print:hidden p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('school')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'school'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>General Ledger Journal</span>
        </button>

        <button
          onClick={() => setActiveTab('statements')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'statements'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Financial Statements (P&L)</span>
        </button>

        <button
          onClick={() => setActiveTab('daily')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'daily'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Daily Cash Drawer Log</span>
        </button>

        <button
          onClick={() => setActiveTab('student')}
          className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'student'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Student Account Statement</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SCHOOL GENERAL LEDGER JOURNAL                           */}
      {/* ============================================================== */}
      {activeTab === 'school' && (
        <div className="space-y-4">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inflow (Credits)</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                +{formatCurrency(totalInflow, settings.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {filteredTransactions.filter(t => t.type === 'INCOME').length} revenue transactions recorded
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Outflow (Debits)</span>
                <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
                -{formatCurrency(totalOutflow, settings.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {filteredTransactions.filter(t => t.type === 'EXPENSE').length} expense vouchers disbursed
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Operating Balance</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p
                className={`text-2xl font-black font-mono mt-2 ${
                  netClosingBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'
                }`}
              >
                {formatCurrency(netClosingBalance, settings.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Liquid cash & bank operating reserves position
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="print:hidden p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search description, student, voucher #, category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Date Scope Filter */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDateFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    dateFilterType === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All Dates
                </button>
                <button
                  onClick={() => setDateFilterType('THIS_MONTH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    dateFilterType === 'THIS_MONTH'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setDateFilterType('CUSTOM')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    dateFilterType === 'CUSTOM'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>

            {/* Custom Range & Category / Mode Selectors */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {dateFilterType === 'CUSTOM' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">From:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={e => setCustomStartDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <span className="text-slate-500 font-medium">To:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={e => setCustomEndDate(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Categories</option>
                  <optgroup label="Income Categories">
                    {INCOME_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Expense Categories">
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Mode:</span>
                <select
                  value={modeFilter}
                  onChange={e => setModeFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-900 dark:text-white"
                >
                  <option value="ALL">All Payment Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Online/UPI">Online / UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                General Ledger Transactions ({filteredTransactions.length})
              </span>
              <span className="text-xs text-slate-400">
                Real-time running balances • Click Edit to modify any transaction
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Particulars / Description</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3">Ref #</th>
                    <th className="py-3 px-3 text-right">Debit (-)</th>
                    <th className="py-3 px-3 text-right">Credit (+)</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                    <th className="py-3 px-3 text-center print:hidden">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No transactions match the selected filters. Click "+ Add Activity" to log a new record.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-slate-500 font-mono whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {tx.type === 'INCOME' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              Credit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
                              <ArrowUpRight className="w-3 h-3 text-red-600" />
                              Debit
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">{tx.description}</p>
                          {tx.notes && <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tx.notes}</p>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{tx.paymentMode}</td>
                        <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">{tx.referenceNumber || '—'}</td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-red-500 whitespace-nowrap">
                          {tx.debit > 0 ? `-${formatCurrency(tx.debit, settings.currencySymbol)}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {tx.credit > 0 ? `+${formatCurrency(tx.credit, settings.currencySymbol)}` : '—'}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            tx.balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'
                          }`}
                        >
                          {formatCurrency(tx.balance, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-center print:hidden whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {tx.source === 'system' ? (
                              <button
                                onClick={() => setViewingTransaction(tx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="System Generated (Protected) • Click to view details"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(tx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit manual entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingTransaction(tx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Delete manual entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: FINANCIAL STATEMENTS (INCOME STATEMENT & BALANCE SHEET) */}
      {/* ============================================================== */}
      {activeTab === 'statements' && (
        <div className="space-y-6">
          {/* Statement Customization Banner */}
          <div className="print:hidden p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Editable Statement Parameters</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You can customize statement title, auditor notes, and signatory titles prior to printing or generating the PDF.
              </p>
            </div>

            <button
              onClick={() => setIsEditingStatementMeta(!isEditingStatementMeta)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer"
            >
              {isEditingStatementMeta ? 'Done Editing' : 'Edit Statement Notes & Signatures'}
            </button>
          </div>

          {/* Statement Metadata Editor Form */}
          {isEditingStatementMeta && (
            <div className="print:hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customize Statement Headers & Notes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Financial Statement Title
                  </label>
                  <input
                    type="text"
                    value={statementTitle}
                    onChange={e => setStatementTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prepared By Signatory Title
                  </label>
                  <input
                    type="text"
                    value={preparedBy}
                    onChange={e => setPreparedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Approved By Signatory Title
                  </label>
                  <input
                    type="text"
                    value={approvedBy}
                    onChange={e => setApprovedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Auditor Notes & Accounting Policy Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={auditorNotes}
                    onChange={e => setAuditorNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Printable Official Statement Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            {/* Statement Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {settings.schoolName || 'St. Augustine International Academy'}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{statementData.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Academic Session: {statementData.academicYear} • Reporting Scope: {statementData.reportingPeriod}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  Operating Margin: {statementData.operatingMargin.toFixed(1)}%
                </span>
                <p className="text-[11px] text-slate-400 mt-1">Statement Status: Final Audited</p>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Gross Operating Revenues</span>
                <p className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                  +{formatCurrency(statementData.totalIncome, settings.currencySymbol)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                <span className="text-xs font-semibold text-red-800 dark:text-red-300">Total Operating Expenditures</span>
                <p className="text-2xl font-black font-mono text-red-700 dark:text-red-400 mt-1">
                  -{formatCurrency(statementData.totalExpense, settings.currencySymbol)}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
                <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">Net Operating Surplus / (Deficit)</span>
                <p
                  className={`text-2xl font-black font-mono mt-1 ${
                    statementData.netSurplus >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(statementData.netSurplus, settings.currencySymbol)}
                </p>
              </div>
            </div>

            {/* Section 1: Inflows Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Operating Revenues Breakdown (Credits)
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Revenue Stream / Category</th>
                      <th className="py-2.5 px-3 text-right">Amount ($)</th>
                      <th className="py-2.5 px-3 text-right">Share (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {statementData.incomeCategories.map(item => (
                      <tr key={item.category}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.category}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(item.amount, settings.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">TOTAL REVENUE INFLOWS</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(statementData.totalIncome, settings.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Outflows Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Operating Expenditures Breakdown (Debits)
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Expenditure Category</th>
                      <th className="py-2.5 px-3 text-right">Amount ($)</th>
                      <th className="py-2.5 px-3 text-right">Share (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {statementData.expenseCategories.map(item => (
                      <tr key={item.category}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{item.category}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-red-500">
                          {formatCurrency(item.amount, settings.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono">{item.percentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold">
                      <td className="py-2.5 px-3 text-slate-900 dark:text-white">TOTAL EXPENDITURES</td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-500">
                        {formatCurrency(statementData.totalExpense, settings.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-900 dark:text-white font-mono">100.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Auditor Notes & Signatory Block */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              {statementData.auditorNotes && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Accounting Policy Note: </span>
                  {statementData.auditorNotes}
                </div>
              )}

              <div className="grid grid-cols-2 gap-8 pt-6">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2 text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">Prepared By: {statementData.preparedBy}</p>
                  <p className="text-slate-400">Finance & Accounts Department</p>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2 text-xs text-right">
                  <p className="font-bold text-slate-900 dark:text-white">Approved By: {statementData.approvedBy}</p>
                  <p className="text-slate-400">Institutional Governance & Bursary</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DAILY FINANCIAL CASH DRAWER LOG                         */}
      {/* ============================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* Date Selector & Daily Summary Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Log Date:</span>
              <input
                type="date"
                value={selectedDailyDate}
                onChange={e => setSelectedDailyDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <button
                onClick={() => setSelectedDailyDate(getTodayDateString())}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                title="Bulk import daily financial activities from a CSV file"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import CSV</span>
              </button>

              <button
                onClick={handleDownloadDailyPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
                title="Download this day's cash drawer log as an official PDF"
              >
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Download Daily PDF</span>
              </button>

              <button
                onClick={() => handleOpenAddModal('INCOME')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Financial Entry</span>
              </button>
            </div>
          </div>

          {/* Daily Cash Drawer Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Day's Inflow (Collections)</span>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                +{formatCurrency(dailyTotalInflow, settings.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{dailyTransactions.filter(t => t.type === 'INCOME').length} receipts issued</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Day's Outflow (Expenses)</span>
              <p className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
                -{formatCurrency(dailyTotalOutflow, settings.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{dailyTransactions.filter(t => t.type === 'EXPENSE').length} vouchers paid</p>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daily Net Cash Movement</span>
              <p
                className={`text-2xl font-black font-mono mt-2 ${
                  dailyNet >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-500'
                }`}
              >
                {formatCurrency(dailyNet, settings.currencySymbol)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Net drawer addition / drawdown</p>
            </div>
          </div>

          {/* Daily Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daily Transactions for {formatDate(selectedDailyDate)} ({dailyTransactions.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Particulars</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Voucher #</th>
                    <th className="py-2.5 px-3 text-right">Debit (-)</th>
                    <th className="py-2.5 px-3 text-right">Credit (+)</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {dailyTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No financial activity logged for this day. Click "+ Record Today's Activity" above.
                      </td>
                    </tr>
                  ) : (
                    dailyTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3">
                          {tx.type === 'INCOME' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Income
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                              Expense
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{tx.description}</td>
                        <td className="py-2.5 px-3 text-slate-500">{tx.category}</td>
                        <td className="py-2.5 px-3 text-slate-500">{tx.paymentMode}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{tx.referenceNumber || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-500">
                          {tx.debit > 0 ? `-${formatCurrency(tx.debit, settings.currencySymbol)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          {tx.credit > 0 ? `+${formatCurrency(tx.credit, settings.currencySymbol)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {tx.source === 'system' ? (
                              <button
                                onClick={() => setViewingTransaction(tx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="System Generated (Protected) • Click to view details"
                              >
                                <Lock className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(tx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Edit manual entry"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingTransaction(tx)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 transition cursor-pointer"
                                  title="Delete manual entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: STUDENT INDIVIDUAL STATEMENT                            */}
      {/* ============================================================== */}
      {activeTab === 'student' && targetStudent && (
        <div className="space-y-6">
          {/* Selector */}
          <div className="print:hidden p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Select Student Account:</span>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.rollNo} • {s.className}-{s.section})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDownloadStudentPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
              title="Download official statement PDF for this student"
            >
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Download Statement PDF</span>
            </button>
          </div>

          {/* Printable Statement Card */}
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {settings.schoolName || 'St. Augustine International Academy'}
                </h3>
                <p className="text-xs text-slate-500">Student Account Ledger & Statement</p>
                <p className="text-xs text-slate-400 mt-1">Academic Year: {settings.currentAcademicYear}</p>
              </div>

              <div className="text-right text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{targetStudent.fullName}</p>
                <p className="font-mono text-slate-500">Roll No: {targetStudent.rollNo}</p>
                <p className="text-slate-500">{targetStudent.className} — Sec {targetStudent.section}</p>
                <p className="text-slate-500">Guardian: {targetStudent.guardianName}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">Total Fees Paid to Date</span>
                <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatCurrency(studentTotalPaid, settings.currencySymbol)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">Current Pending Balance</span>
                <p
                  className={`text-lg font-black font-mono mt-1 ${
                    studentPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(studentPending, settings.currencySymbol)}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">Account Standing</span>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {studentPending === 0 ? 'In Good Standing' : 'Dues Pending'}
                </p>
              </div>
            </div>

            {/* Payment history table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Period / Term</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {studentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No recorded payments found for this student.
                      </td>
                    </tr>
                  ) : (
                    studentPayments.map(p => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {p.receiptNumber}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{formatDate(p.date)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{p.monthFor}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.paymentMode}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.totalAmount, settings.currencySymbol)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD FINANCIAL ENTRY                                     */}
      {/* ============================================================== */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Add Financial Entry</span>
              </h3>
              <button
                onClick={() => setShowAddActivityModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAddActivity} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Validation Error Banner */}
              {formError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Entry Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivityForm(prev => ({
                        ...prev,
                        type: 'INCOME',
                        category: 'Other Income',
                        referenceNumber:
                          prev.referenceNumber.startsWith('EXP-') || prev.referenceNumber.startsWith('INC-')
                            ? `INC-${Date.now().toString().slice(-6)}`
                            : prev.referenceNumber,
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activityForm.type === 'INCOME'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Income (Credit / Inflow)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivityForm(prev => ({
                        ...prev,
                        type: 'EXPENSE',
                        category: 'Utilities',
                        referenceNumber:
                          prev.referenceNumber.startsWith('EXP-') || prev.referenceNumber.startsWith('INC-')
                            ? `EXP-${Date.now().toString().slice(-6)}`
                            : prev.referenceNumber,
                      }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      activityForm.type === 'EXPENSE'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Expense (Debit / Outflow)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {activityForm.type === 'INCOME'
                    ? 'Credit (+) will be recorded in the ledger and increase the liquid running balance.'
                    : 'Debit (-) will be recorded in the ledger and deducted from the liquid running balance.'}
                </p>
              </div>

              {/* Date & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={activityForm.date}
                    onChange={e => setActivityForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({settings.currencySymbol || '$'}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={activityForm.amount}
                    onChange={e => setActivityForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Title / Particulars / Narration */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Particulars / Narration <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activityForm.type === 'INCOME'
                      ? 'e.g., Donation received from ABC Foundation / Book shop sales'
                      : 'e.g., Electricity bill for September 2026 / Office stationery purchased'
                  }
                  value={activityForm.title}
                  onChange={e => setActivityForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              {/* Category & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={activityForm.category}
                    onChange={e => setActivityForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {activityForm.type === 'INCOME'
                      ? INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      : EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode / Transaction Mode <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={activityForm.paymentMode}
                    onChange={e => setActivityForm(prev => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {PAYMENT_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Voucher Reference & Student Link (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reference / Voucher No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EXP-001, INC-001, VCH-2026-001"
                    value={activityForm.referenceNumber}
                    onChange={e => setActivityForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {activityForm.type === 'INCOME' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Link Student (Optional)
                    </label>
                    <select
                      value={activityForm.studentId}
                      onChange={e => setActivityForm(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">None (School-wide Revenue)</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.fullName} ({s.rollNo})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Narration / Audit Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context, receipt counter sign, invoice details..."
                  value={activityForm.notes}
                  onChange={e => setActivityForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  Save Financial Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT TRANSACTION                                        */}
      {/* ============================================================== */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>Edit {editingTransaction.type === 'INCOME' ? 'Revenue' : 'Expense'} Transaction</span>
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTransaction} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={e => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount ({settings.currencySymbol || '$'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.amount}
                    onChange={e => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title / Particulars
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category Head
                  </label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                  >
                    {editingTransaction.type === 'INCOME'
                      ? INCOME_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)
                      : EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={editForm.paymentMode}
                    onChange={e => setEditForm(prev => ({ ...prev, paymentMode: e.target.value as PaymentMode }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {PAYMENT_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Voucher / Receipt #
                </label>
                <input
                  type="text"
                  value={editForm.referenceNumber}
                  onChange={e => setEditForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Narration / Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition active:scale-95 shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                     */}
      {/* ============================================================== */}
      {deletingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Transaction?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete this {deletingTransaction.type.toLowerCase()} of{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {formatCurrency(deletingTransaction.credit || deletingTransaction.debit, settings.currencySymbol)}
                </strong>
                ? All ledger balances will be recalculated.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingTransaction(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition active:scale-95 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VIEW TRANSACTION DETAILS (READ-ONLY & AUDIT PROTECTED)  */}
      {/* ============================================================== */}
      {viewingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className={`p-1.5 rounded-lg ${
                    viewingTransaction.source === 'system'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                  }`}
                >
                  {viewingTransaction.source === 'system' ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {viewingTransaction.source === 'system' ? 'System-Generated Transaction' : 'Financial Entry Details'}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {viewingTransaction.source === 'system' ? 'Automatic Record • Protected from modification' : 'Manual Entry • Audited'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingTransaction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {viewingTransaction.source === 'system' && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-bold">Protected Automatic Transaction</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      This transaction was automatically generated by the{' '}
                      {viewingTransaction.sourceType === 'FEE_PAYMENT'
                        ? 'Student Fee Collection'
                        : 'Staff Salary / Payroll'}{' '}
                      module (Ref: {viewingTransaction.referenceNumber || '—'}). To preserve financial integrity and audit standards, system-generated transactions cannot be modified or deleted in the manual ledger view. Please process adjustments in the originating module.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Transaction Date</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">
                    {formatDate(viewingTransaction.date)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Entry Type</span>
                  <span
                    className={`font-bold mt-0.5 inline-flex items-center gap-1 ${
                      viewingTransaction.type === 'INCOME'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-500'
                    }`}
                  >
                    {viewingTransaction.type === 'INCOME' ? '+ Credit (Income)' : '- Debit (Expense)'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Amount</span>
                  <span className="font-black text-sm font-mono mt-0.5 block text-slate-900 dark:text-white">
                    {formatCurrency(viewingTransaction.credit || viewingTransaction.debit, settings.currencySymbol)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {viewingTransaction.category}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Mode</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {viewingTransaction.paymentMode}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Voucher / Ref #</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {viewingTransaction.referenceNumber || '—'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Particulars / Narration</span>
                <p className="font-semibold text-slate-900 dark:text-white mt-1">
                  {viewingTransaction.description}
                </p>
                {viewingTransaction.notes && (
                  <p className="text-slate-500 text-[11px] mt-1 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                    {viewingTransaction.notes}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  Source:{' '}
                  <strong className="capitalize text-slate-600 dark:text-slate-300">
                    {viewingTransaction.source} Generated
                  </strong>
                </span>
                {viewingTransaction.recordedBy && <span>Audited / Posted By: {viewingTransaction.recordedBy}</span>}
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewingTransaction(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL: BULK CSV IMPORT                                         */}
      {/* ============================================================== */}
      <BulkImportFinancialModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={(count, incomeCount, expenseCount) => {
          notify(`Successfully imported ${count} financial activities (${incomeCount} revenues, ${expenseCount} expenses) into the ledger.`);
        }}
        defaultDate={selectedDailyDate || getTodayDateString()}
      />
    </div>
  );
};
