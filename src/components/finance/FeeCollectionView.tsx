import React, { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { FeePayment, PaymentMode, Student, canUserApplyDiscount } from '../../types';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  getCurrentMonthName,
  exportToCSV,
  exportToExcel,
} from '../../utils/formatters';
import { formatFeePaymentsForExport } from '../../utils/exportUtils';
import { ExportDropdown } from '../common/ExportDropdown';
import {
  Receipt,
  Search,
  DollarSign,
  Printer,
  Download,
  CheckCircle,
  CreditCard,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Coins,
  Check,
  Users,
  CheckSquare,
  Square,
  Filter,
  Sparkles,
  Info,
  Clock,
  ListChecks,
  AlertCircle,
  RefreshCw,
  X,
  Sliders,
  ChevronRight,
  GraduationCap,
  FileText,
  MessageSquare,
  Mail,
  Plus,
  Trash2,
  Tag,
  ShieldAlert,
  ShieldCheck,
  Percent,
  BadgePercent,
  Lock,
} from 'lucide-react';
import { generateFeeCollectionAuditPdf } from '../../utils/financialPdf';
import { PrintPreviewModal } from '../common/PrintPreviewModal';
import { DedicatedPrintStudioModal } from '../common/DedicatedPrintStudioModal';
import { PasswordConfirmModal } from '../common/PasswordConfirmModal';
import { ShareModal, ShareRecipientItem } from '../common/ShareModal';
import { downloadFeeVouchersPdf } from '../../utils/voucherAndPayslipPdf';

export const FeeCollectionView: React.FC = () => {
  const {
    students,
    feeStructures,
    feePayments,
    settings,
    updateSettings,
    recordFeePayment,
    bulkRecordFeePayments,
    setReceiptToPrint,
    getStudentPendingFee,
    selectedStudentIdForDetail,
    setSelectedStudentIdForDetail,
  } = useSchool();
  const { currentUser, isAdmin } = useAuth();
  const { t } = useTranslation();

  // Mode Switcher: 'single' (Individual Voucher & History) vs 'batch' (Classroom Batch Collection)
  const [collectionMode, setCollectionMode] = useState<'single' | 'batch'>('single');
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);

  // ----------------------------------------------------
  // PRINT PREVIEW & SHARING STATE
  // ----------------------------------------------------
  const [printPreviewState, setPrintPreviewState] = useState<{
    isOpen: boolean;
    vouchers: FeePayment[];
  }>({
    isOpen: false,
    vouchers: [],
  });

  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);

  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
    items: ShareRecipientItem[];
  }>({
    isOpen: false,
    mode: 'whatsapp',
    items: [],
  });

  // Multi-selection state for past payment transactions table
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  // ----------------------------------------------------
  // SINGLE VOUCHER STATE
  // ----------------------------------------------------
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [monthFor, setMonthFor] = useState<string>(getCurrentMonthName());
  const [remarks, setRemarks] = useState<string>('Paid in full');
  const [amountToPay, setAmountToPay] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fee Discount States & Authorization
  const canApplyDiscount = canUserApplyDiscount(currentUser);
  const [grossFee, setGrossFee] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [isPasswordConfirmOpen, setIsPasswordConfirmOpen] = useState(false);

  // Discount validation flags
  const isDiscountOverGross = discountAmount > grossFee;
  const isReasonMissing = discountAmount > 0 && discountReason.trim().length < 3;
  const isReasonTooLong = discountReason.length > 120;
  const netPayableFee = Math.max(0, Math.round((grossFee - discountAmount) * 100) / 100);
  const remainingBalance = Math.max(0, Math.round((netPayableFee - amountToPay) * 100) / 100);
  const isDiscountValid =
    discountAmount >= 0 && !isDiscountOverGross && (!discountAmount || (!isReasonMissing && !isReasonTooLong));
  const isLargeDiscount = grossFee > 0 && discountAmount > grossFee * 0.5;

  // Search in payments table
  const [paymentSearch, setPaymentSearch] = useState('');

  // ----------------------------------------------------
  // BATCH FEE COLLECTION & RECEIPT GENERATOR STATE
  // ----------------------------------------------------
  const [batchClassFilter, setBatchClassFilter] = useState<string>('All');
  const [batchSectionFilter, setBatchSectionFilter] = useState<string>('All');
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | 'with-dues' | 'active-only'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const defaultBatchMonth = `${getCurrentMonthName()} ${settings.currentAcademicYear || '2026-2027'}`;
  const [batchMonth, setBatchMonth] = useState<string>(defaultBatchMonth);
  const [batchChargeType, setBatchChargeType] = useState<
    'class-structure' | 'custom-amount' | 'clear-dues' | 'custom-heads'
  >('class-structure');
  const [batchCustomAmount, setBatchCustomAmount] = useState<number>(500);
  const [batchCustomHeadName, setBatchCustomHeadName] = useState<string>('Monthly Tuition Fee');
  const [batchCustomHeads, setBatchCustomHeads] = useState<
    { id: string; name: string; amount: number }[]
  >([
    { id: '1', name: 'Monthly Tuition Fee', amount: 400 },
    { id: '2', name: 'Lab & Science Facilities', amount: 50 },
    { id: '3', name: 'Sports & Activities', amount: 50 },
  ]);
  const [batchPaymentMode, setBatchPaymentMode] = useState<PaymentMode>('Cash');
  const [batchCollectionDate, setBatchCollectionDate] = useState<string>(getTodayDateString());
  const [batchRemarks, setBatchRemarks] = useState<string>(`Monthly fee collection for ${getCurrentMonthName()}`);
  const [batchTransactionRef, setBatchTransactionRef] = useState<string>('');
  const [batchCollectorName, setBatchCollectorName] = useState<string>(currentUser?.fullName || 'Accounts Bursar');
  const [batchAutoGenerateReceipts, setBatchAutoGenerateReceipts] = useState<boolean>(true);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState<boolean>(false);

  // Success summary banner state
  const [batchSuccessResult, setBatchSuccessResult] = useState<{
    studentCount: number;
    totalCollected: number;
    month: string;
    receipts: FeePayment[];
    firstReceiptNumber: string;
    lastReceiptNumber: string;
  } | null>(null);

  // Student Map for fast lookup
  const studentsMap: Record<string, Student> = useMemo(() => {
    const map: Record<string, Student> = {};
    students.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [students]);

  // Helper to build ShareRecipientItem list from vouchers
  const buildVoucherShareItems = (vouchersList: FeePayment[]): ShareRecipientItem[] => {
    return vouchersList.map(v => {
      const student =
        studentsMap[v.studentId] ||
        Object.values(studentsMap).find(s => s.fullName === v.studentName);
      return {
        id: v.id,
        name: v.studentName,
        role: 'student',
        subheading: `${v.className} — Section ${v.section}`,
        phone: student?.contactNumber || '',
        email: student?.email || '',
        period: v.monthFor || 'Current Term',
        amount: v.totalAmount,
        voucherData: v,
        studentData: student,
      };
    });
  };

  // Drill down from outside
  useEffect(() => {
    if (selectedStudentIdForDetail) {
      setSelectedStudentId(selectedStudentIdForDetail);
      setCollectionMode('single');
      setSelectedStudentIdForDetail(null);
    } else if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [selectedStudentIdForDetail, students, selectedStudentId, setSelectedStudentIdForDetail]);

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // When student changes, auto calculate pending amount and load class fee structure heads
  useEffect(() => {
    if (selectedStudent) {
      const pending = getStudentPendingFee(selectedStudent);
      const classStruct = feeStructures.find(
        f => f.className.toLowerCase() === selectedStudent.className.toLowerCase()
      );
      const expected = classStruct ? classStruct.totalAmount : 450;
      const initialTotal = pending > 0 ? pending : expected;
      setGrossFee(initialTotal);
      setDiscountAmount(0);
      setDiscountReason('');
      setAmountToPay(initialTotal);
    }
  }, [selectedStudent, feeStructures, getStudentPendingFee]);

  const currentPending = selectedStudent ? getStudentPendingFee(selectedStudent) : 0;
  const currentStructure = selectedStudent
    ? feeStructures.find(f => f.className.toLowerCase() === selectedStudent.className.toLowerCase())
    : null;

  // Single Payment Submit Logic
  const executeRecordPayment = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);

    try {
      const breakdown = currentStructure
        ? currentStructure.heads.map(h => ({ headName: h.name, amount: h.amount }))
        : [{ headName: 'Tuition Fee', amount: grossFee || amountToPay }];

      const newReceipt = await recordFeePayment({
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        className: selectedStudent.className,
        section: selectedStudent.section,
        date: getTodayDateString(),
        monthFor,
        feeBreakdown: breakdown,
        gross_fee: grossFee,
        discount_amount: discountAmount,
        discount_reason: discountAmount > 0 ? discountReason.trim() : '',
        net_fee: netPayableFee,
        totalAmount: amountToPay,
        paymentMode,
        transactionRef: transactionRef.trim() || undefined,
        remarks: remarks.trim() || undefined,
        collectedBy: currentUser?.fullName || 'Accounts Bursar',
      });

      // Automatically launch receipt print preview modal
      setReceiptToPrint(newReceipt);

      // Reset discount state for next voucher
      setDiscountAmount(0);
      setDiscountReason('');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to record fee payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (discountAmount > 0 && !canApplyDiscount) {
      alert('Unauthorized: You do not have permission to apply fee discounts/concessions.');
      return;
    }

    if (isDiscountOverGross) {
      alert('Validation Error: Discount amount cannot exceed total gross fee.');
      return;
    }

    if (discountAmount > 0 && isReasonMissing) {
      alert('Validation Error: Please provide a valid reason for the discount (min 3 characters).');
      return;
    }

    if (netPayableFee > 0 && amountToPay <= 0) {
      alert('Payment amount received must be greater than zero.');
      return;
    }

    if (amountToPay < 0) {
      alert('Payment amount received cannot be negative.');
      return;
    }

    // High concession (> 50%) requires password re-verification
    if (isLargeDiscount) {
      setIsPasswordConfirmOpen(true);
      return;
    }

    await executeRecordPayment();
  };

  const handlePrintPreview = () => {
    if (!selectedStudent) {
      alert('Please select a student first to preview and print their fee voucher.');
      return;
    }

    const breakdown = currentStructure
      ? currentStructure.heads.map(h => ({ headName: h.name, amount: h.amount }))
      : [{ headName: 'Tuition Fee', amount: amountToPay || 450 }];

    const previewReceipt: FeePayment = {
      id: `voucher-prev-${Date.now()}`,
      receiptNumber: `VCH-${new Date().getFullYear()}-${selectedStudent.rollNo || '001'}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      className: selectedStudent.className,
      section: selectedStudent.section,
      date: getTodayDateString(),
      monthFor: monthFor || getCurrentMonthName(),
      feeBreakdown: breakdown,
      gross_fee: grossFee,
      discount_amount: discountAmount,
      discount_reason: discountAmount > 0 ? discountReason.trim() : '',
      net_fee: netPayableFee,
      totalAmount: amountToPay > 0 ? amountToPay : netPayableFee,
      paymentMode,
      transactionRef: transactionRef.trim() || undefined,
      remarks: remarks.trim() || undefined,
      collectedBy: currentUser?.fullName || 'Accounts Bursar',
      createdAt: new Date().toISOString(),
    };

    setReceiptToPrint(previewReceipt);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // ----------------------------------------------------
  // BATCH COMPUTATIONS & HANDLERS
  // ----------------------------------------------------
  const availableClasses = useMemo(() => {
    const list = Array.from(new Set(students.map(s => s.className))).filter(Boolean);
    return list.sort();
  }, [students]);

  const availableSections = useMemo(() => {
    const filtered = students.filter(
      s => batchClassFilter === 'All' || s.className === batchClassFilter
    );
    return Array.from(new Set(filtered.map(s => s.section))).filter(Boolean).sort();
  }, [students, batchClassFilter]);

  const filteredBatchStudents = useMemo(() => {
    return students.filter(s => {
      if (batchClassFilter !== 'All' && s.className !== batchClassFilter) return false;
      if (batchSectionFilter !== 'All' && s.section !== batchSectionFilter) return false;
      if (batchStatusFilter === 'active-only' && s.status !== 'active') return false;
      if (batchStatusFilter === 'with-dues') {
        const pending = getStudentPendingFee(s);
        if (pending <= 0) return false;
      }
      if (batchSearchQuery.trim()) {
        const q = batchSearchQuery.toLowerCase();
        const matchesName = s.fullName.toLowerCase().includes(q);
        const matchesRoll = s.rollNo.toLowerCase().includes(q);
        const matchesGuardian = s.guardianName?.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesGuardian) return false;
      }
      return true;
    });
  }, [students, batchClassFilter, batchSectionFilter, batchStatusFilter, batchSearchQuery, getStudentPendingFee]);

  const filteredStudentsWithDues = useMemo(() => {
    return filteredBatchStudents.filter(s => getStudentPendingFee(s) > 0);
  }, [filteredBatchStudents, getStudentPendingFee]);

  const handleSelectAllWithDues = () => {
    const idsWithDues = filteredStudentsWithDues.map(s => s.id);
    setSelectedStudentIds(prev => Array.from(new Set([...prev, ...idsWithDues])));
  };

  const isAllFilteredSelected =
    filteredBatchStudents.length > 0 &&
    filteredBatchStudents.every(s => selectedStudentIds.includes(s.id));

  const handleToggleSelectAll = () => {
    const filteredIds = filteredBatchStudents.map(s => s.id);
    if (isAllFilteredSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const getStudentFeeAmount = (student: Student) => {
    if (batchChargeType === 'custom-amount') {
      return batchCustomAmount > 0 ? batchCustomAmount : 0;
    }
    if (batchChargeType === 'custom-heads') {
      return batchCustomHeads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);
    }
    if (batchChargeType === 'clear-dues') {
      const pending = getStudentPendingFee(student);
      if (pending > 0) return pending;
      const classStruct = feeStructures.find(
        f => f.className.toLowerCase() === student.className.toLowerCase()
      );
      return classStruct ? classStruct.totalAmount : 450;
    }
    const classStruct = feeStructures.find(
      f => f.className.toLowerCase() === student.className.toLowerCase()
    );
    return classStruct ? classStruct.totalAmount : 450;
  };

  const batchTotalAmount = useMemo(() => {
    return selectedStudentIds.reduce((sum, id) => {
      const student = students.find(s => s.id === id);
      if (!student) return sum;
      return sum + getStudentFeeAmount(student);
    }, 0);
  }, [selectedStudentIds, students, batchChargeType, batchCustomAmount, batchCustomHeads, feeStructures, getStudentPendingFee]);

  // Execute Batch Collection
  const handleExecuteBatchFee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      alert('Administrator Privilege Required: Only school administrators can authorize and process batch fee collections in bulk.');
      return;
    }

    if (selectedStudentIds.length === 0) {
      alert('Please select at least one student via the checkboxes for batch fee collection.');
      return;
    }

    if (batchChargeType === 'custom-amount' && batchCustomAmount <= 0) {
      alert('Please enter a valid monthly fee amount greater than zero.');
      return;
    }

    if (batchChargeType === 'custom-heads') {
      const totalHeadSum = batchCustomHeads.reduce((s, h) => s + (Number(h.amount) || 0), 0);
      if (totalHeadSum <= 0) {
        alert('Please specify at least one fee head with an amount greater than zero.');
        return;
      }
    }

    setIsBatchSubmitting(true);
    try {
      const targetMonth = batchMonth.trim() || defaultBatchMonth;
      let breakdown: { headName: string; amount: number }[] | undefined;
      let customAmount: number | undefined;
      let studentAmounts: Record<string, { totalAmount: number; breakdown?: { headName: string; amount: number }[] }> | undefined;

      if (batchChargeType === 'custom-amount') {
        customAmount = batchCustomAmount;
        breakdown = [{ headName: batchCustomHeadName.trim() || 'Monthly Tuition Fee', amount: batchCustomAmount }];
      } else if (batchChargeType === 'custom-heads') {
        const totalHeadSum = batchCustomHeads.reduce((s, h) => s + (Number(h.amount) || 0), 0);
        customAmount = totalHeadSum;
        breakdown = batchCustomHeads
          .filter(h => (Number(h.amount) || 0) > 0)
          .map(h => ({ headName: h.name.trim() || 'Fee Item', amount: Number(h.amount) || 0 }));
      } else if (batchChargeType === 'clear-dues') {
        studentAmounts = {};
        for (const id of selectedStudentIds) {
          const s = students.find(st => st.id === id);
          if (!s) continue;
          const due = getStudentPendingFee(s);
          const amt = due > 0 ? due : (feeStructures.find(f => f.className.toLowerCase() === s.className.toLowerCase())?.totalAmount || 450);
          studentAmounts[id] = {
            totalAmount: amt,
            breakdown: [
              {
                headName: due > 0 ? 'Full Outstanding Dues Clearance' : 'Tuition & Academic Term Charges',
                amount: amt,
              },
            ],
          };
        }
      }

      const receipts = await bulkRecordFeePayments(
        selectedStudentIds,
        targetMonth,
        batchPaymentMode,
        batchRemarks.trim() || `Batch monthly fee collection for ${targetMonth}`,
        {
          customAmount,
          feeBreakdown: breakdown,
          studentAmounts,
          date: batchCollectionDate || getTodayDateString(),
          collectedBy: batchCollectorName.trim() || currentUser?.fullName || 'Accounts Bursar',
          transactionRef: batchTransactionRef.trim() || undefined,
        }
      );

      if (receipts && receipts.length > 0) {
        setBatchSuccessResult({
          studentCount: receipts.length,
          totalCollected: receipts.reduce((sum, r) => sum + r.totalAmount, 0),
          month: targetMonth,
          receipts,
          firstReceiptNumber: receipts[0]?.receiptNumber || '',
          lastReceiptNumber: receipts[receipts.length - 1]?.receiptNumber || '',
        });
        setSelectedStudentIds([]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process batch fee collection. Please try again.');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const handleExportBatchReceiptsCSV = (receipts: FeePayment[]) => {
    const rows = receipts.map(p => ({
      'Receipt No': p.receiptNumber,
      'Student Name': p.studentName,
      Class: `${p.className} - ${p.section}`,
      Date: p.date,
      Month: p.monthFor,
      'Payment Mode': p.paymentMode,
      'Transaction Ref': p.transactionRef || 'N/A',
      'Total Amount': p.totalAmount,
      'Collected By': p.collectedBy,
      Remarks: p.remarks || '',
    }));
    exportToCSV(`Batch_Fee_Collection_${batchMonth.replace(/\s+/g, '_')}`, rows);
  };

  const filteredPayments = feePayments.filter(
    p =>
      p.studentName.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.receiptNumber.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.className.toLowerCase().includes(paymentSearch.toLowerCase())
  );

  const isAllPaymentsSelected =
    filteredPayments.length > 0 &&
    filteredPayments.every(p => selectedPaymentIds.includes(p.id));

  const handleToggleSelectAllPayments = () => {
    if (isAllPaymentsSelected) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(filteredPayments.map(p => p.id));
    }
  };

  const handleTogglePaymentSelection = (id: string) => {
    setSelectedPaymentIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectedPaymentsList = useMemo(() => {
    return feePayments.filter(p => selectedPaymentIds.includes(p.id));
  }, [feePayments, selectedPaymentIds]);

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const showExportNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;
    const rows = formatFeePaymentsForExport(filteredPayments, settings.currencySymbol || '$');
    exportToCSV(`Fee_Collection_Report_${getTodayDateString()}`, rows);
    showExportNotice(`Exported ${filteredPayments.length} fee payment records to CSV.`);
  };

  const handleExportExcel = () => {
    if (filteredPayments.length === 0) return;
    const rows = formatFeePaymentsForExport(filteredPayments, settings.currencySymbol || '$');
    exportToExcel(`Fee_Collection_Report`, 'Fee Payments', rows);
    showExportNotice(`Exported ${filteredPayments.length} fee payment records to Excel (.xlsx).`);
  };

  const handleDownloadCollectionPdf = () => {
    if (filteredPayments.length === 0) {
      showExportNotice('No fee payment records found to generate audit PDF.');
      return;
    }
    generateFeeCollectionAuditPdf(settings, filteredPayments, {
      title: 'OFFICIAL FEE COLLECTION & REVENUE AUDIT REPORT',
      scope: paymentSearch ? `Filtered: "${paymentSearch}"` : 'All Recorded Transactions',
      period: `Audited Collection Registry (${filteredPayments.length} Receipts)`,
    });
    showExportNotice('Downloaded official fee collection audit PDF.');
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-600" />
              <span>{t('finance.feeCollection', 'Fee Collection & Payment Receipts')}</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {t('finance.feeCollectionDesc', 'Record tuition & term payments, execute batch classroom collections, and generate instant printable vouchers')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Currency Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
              title="Change Global Currency (e.g. PKR, USD)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition cursor-pointer shadow-2xs"
            >
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono text-emerald-700 dark:text-emerald-300">
                {settings.currencyCode || 'PKR'} ({settings.currencySymbol || 'Rs.'})
              </span>
            </button>

            {isCurrencyMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                  Select Currency Unit
                </p>
                {[
                  { code: 'PKR', symbol: 'Rs.', label: 'Pakistani Rupee (Rs.)', flag: '🇵🇰' },
                  { code: 'PKR', symbol: 'PKR', label: 'Pakistani Rupee (PKR)', flag: '🇵🇰' },
                  { code: 'USD', symbol: '$', label: 'US Dollar ($)', flag: '🇺🇸' },
                  { code: 'EUR', symbol: '€', label: 'Euro (€)', flag: '🇪🇺' },
                  { code: 'GBP', symbol: '£', label: 'British Pound (£)', flag: '🇬🇧' },
                  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)', flag: '🇮🇳' },
                  { code: 'AED', symbol: 'AED', label: 'UAE Dirham', flag: '🇦🇪' },
                  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal', flag: '🇸🇦' },
                ].map((item, idx) => {
                  const isSelected =
                    settings.currencyCode === item.code && settings.currencySymbol === item.symbol;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={async () => {
                        await updateSettings({
                          ...settings,
                          currencyCode: item.code,
                          currencySymbol: item.symbol,
                        });
                        setIsCurrencyMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{item.flag}</span>
                        <span>{item.label}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Download PDF Audit Report */}
          <button
            type="button"
            onClick={handleDownloadCollectionPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Download printable official fee collection audit PDF for financial audits"
          >
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Download PDF</span>
          </button>

          <ExportDropdown
            label="Export Fees"
            totalCount={filteredPayments.length}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            size="sm"
          />
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Mode Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setCollectionMode('single')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              collectionMode === 'single'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Single Student Voucher</span>
          </button>

          <button
            id="tab-batch-fee-collection"
            type="button"
            onClick={() => setCollectionMode('batch')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
              collectionMode === 'batch'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 border border-indigo-500'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Batch Fee Collection</span>
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full tracking-wide ${
                collectionMode === 'batch'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              ⚡ Bulk Transaction
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsPrintStudioOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-95 cursor-pointer"
            title="Open Dedicated Print Studio to format for A6, A5, A4 and print 2 different receipts in 1 page"
          >
            <Printer className="w-3.5 h-3.5 text-slate-950" />
            <span>2-on-1 Print Studio (A6/A5/A4)</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500">
            {collectionMode === 'single' ? (
              <span>Total Vouchers: <strong className="text-slate-700 dark:text-slate-200 font-mono">{feePayments.length}</strong></span>
            ) : (
              <span>Students Available: <strong className="text-slate-700 dark:text-slate-200 font-mono">{students.length}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SINGLE VOUCHER MODE (Default View)                                    */}
      {/* ========================================================================= */}
      {collectionMode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Record Payment Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col max-h-[calc(100vh-12rem)] min-h-[520px]">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-none">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Fee Collection Voucher Entry
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollectionMode('batch')}
                  title="Switch to Batch Fee Collection (Select multiple students via checkboxes and process payments in bulk)"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/80 transition shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Batch Fee Collection</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintPreview}
                  title="Print Preview (Triggers print dialog for this voucher)"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/80 transition shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Print Preview</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1 pr-1.5 pt-1">
              {/* Student Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Student *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.rollNo} • {s.className}-{s.section})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-shown Student Due Summary */}
              {selectedStudent && (
                <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Class & Section:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedStudent.className} — Sec {selectedStudent.section}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Guardian:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedStudent.guardianName} ({selectedStudent.contactNumber})
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-indigo-200 dark:border-indigo-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Current Outstanding Due:
                    </span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        currentPending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(currentPending, settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              )}

              {/* Fee Heads Breakdown for Voucher */}
              {currentStructure && currentStructure.heads.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Voucher Fee Breakdown ({currentStructure.heads.length} Heads)
                    </label>
                    <span className="text-[10px] text-slate-400">Class {currentStructure.className}</span>
                  </div>
                  <div className="max-h-28 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-2.5 space-y-1.5">
                    {currentStructure.heads.map((head, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {head.name}
                          {head.isOptional && (
                            <span className="text-[9px] px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-400">
                              Optional
                            </span>
                          )}
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatCurrency(head.amount, settings.currencySymbol)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fee Month & Gross Fee Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Period *
                  </label>
                  <input
                    type="text"
                    value={monthFor}
                    onChange={e => setMonthFor(e.target.value)}
                    placeholder="e.g. September 2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gross Fee ({settings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={grossFee}
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value));
                      setGrossFee(val);
                      setAmountToPay(Math.max(0, val - discountAmount));
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Fee Discount / Concession Section */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <label className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Fee Concession &amp; Discount
                    </label>
                  </div>
                  {!canApplyDiscount ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Permission Required</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">
                      Authorized ({currentUser?.role})
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-600 dark:text-slate-400 text-[11px] mb-1">
                      Discount Amount ({settings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      disabled={!canApplyDiscount}
                      value={discountAmount === 0 ? '' : discountAmount}
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setDiscountAmount(val);
                        setAmountToPay(Math.max(0, Math.round((grossFee - val) * 100) / 100));
                      }}
                      placeholder="0.00"
                      className={`w-full px-3 py-2 rounded-xl font-mono font-bold border transition ${
                        !canApplyDiscount
                          ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          : isDiscountOverGross
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                        Reason for Discount {discountAmount > 0 && <span className="text-rose-500">*</span>}
                      </label>
                      {discountAmount > 0 && (
                        <span className="text-[10px] text-slate-400">{discountReason.length}/120</span>
                      )}
                    </div>
                    <input
                      type="text"
                      disabled={!canApplyDiscount}
                      maxLength={120}
                      value={discountReason}
                      onChange={e => setDiscountReason(e.target.value)}
                      placeholder={canApplyDiscount ? "e.g. Sibling Discount, Financial Aid..." : "Disabled (No privilege)"}
                      className={`w-full px-3 py-2 rounded-xl text-xs border transition ${
                        !canApplyDiscount
                          ? 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                          : isReasonMissing
                          ? 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 text-slate-900 dark:text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Reason Suggestions Chips */}
                {canApplyDiscount && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-slate-400">Suggestions:</span>
                    {['Financial Aid', 'Sibling Discount', 'Merit/Scholarship', 'Staff Child', 'Other'].map(
                      sug => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setDiscountReason(sug)}
                          className={`text-[10px] px-2 py-0.5 rounded-md font-medium transition cursor-pointer ${
                            discountReason === sug
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {sug}
                        </button>
                      )
                    )}
                  </div>
                )}

                {/* Inline Validation Warnings */}
                {isDiscountOverGross && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>Discount amount exceeds total gross fee ({formatCurrency(grossFee, settings.currencySymbol)}). Please enter a valid concession.</span>
                  </div>
                )}

                {isReasonMissing && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Please provide a reason for the discount (min 3 characters).</span>
                  </div>
                )}

                {isLargeDiscount && !isDiscountOverGross && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-[11px] font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>High concession (&gt; 50%): System will request password confirmation upon submitting.</span>
                  </div>
                )}
              </div>

              {/* Financial Calculation Summary Block */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/90 dark:border-indigo-800/70 space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Total Gross Fee:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(grossFee, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <span>Discount / Concession:</span>
                    {discountAmount > 0 && discountReason && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                        ({discountReason})
                      </span>
                    )}
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    - {formatCurrency(discountAmount, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-indigo-200 dark:border-indigo-800/80">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200">Net Payable Fee:</span>
                  <span className="font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                    {formatCurrency(netPayableFee, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-indigo-100 dark:border-indigo-900/60 text-slate-600 dark:text-slate-300">
                  <span>Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(amountToPay, settings.currencySymbol)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Remaining Balance:</span>
                  <span className={`font-mono font-bold ${remainingBalance > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {formatCurrency(remainingBalance, settings.currencySymbol)}
                  </span>
                </div>
              </div>

              {/* Amount to Pay & Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Amount Received ({settings.currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={amountToPay === 0 ? '' : amountToPay}
                    onChange={e => setAmountToPay(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="Online/UPI">Online / UPI</option>
                    <option value="Bank Transfer">Bank Wire / Transfer</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              {/* Ref / Cheque & Remarks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Ref / Cheque # (Opt)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-9402"
                    value={transactionRef}
                    onChange={e => setTransactionRef(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receipt Remarks
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isDiscountValid || amountToPay < 0 || (netPayableFee > 0 && amountToPay <= 0)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Record &amp; Print Official Receipt</span>
              </button>
            </form>
          </div>

          {/* Right Column: Historical Fee Receipts Table */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-12rem)] min-h-[520px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-none bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Payment History & Receipts ({feePayments.length})
                </span>
                {selectedPaymentIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {selectedPaymentIds.length} Selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 max-w-xs bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter name, receipt, class..."
                    value={paymentSearch}
                    onChange={e => setPaymentSearch(e.target.value)}
                    className="w-36 sm:w-44 bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
                <ExportDropdown
                  label="Export Receipts"
                  totalCount={filteredPayments.length}
                  onExportExcel={handleExportExcel}
                  onExportCSV={handleExportCSV}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={handleDownloadCollectionPdf}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Download Fee Collection Audit PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            </div>

            {/* Bulk Actions Floating Bar when vouchers are selected */}
            {selectedPaymentIds.length > 0 && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/70 border-b border-indigo-200 dark:border-indigo-800/80 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">
                    {selectedPaymentIds.length} voucher{selectedPaymentIds.length === 1 ? '' : 's'} selected:
                  </span>
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                    Arranged 2 per A4 sheet for paper saving
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setPrintPreviewState({
                        isOpen: true,
                        vouchers: selectedPaymentsList,
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                    title="Print Selected Vouchers (Paper-saving: 2 per A4 page)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Selected ({selectedPaymentIds.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadFeeVouchersPdf(selectedPaymentsList, settings, studentsMap, {
                        layout: '2-per-page',
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                    title="Download Selected Vouchers as PDF (2 per A4)"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShareModalState({
                        isOpen: true,
                        mode: 'whatsapp',
                        items: buildVoucherShareItems(selectedPaymentsList),
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                    title="Send selected vouchers via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setShareModalState({
                        isOpen: true,
                        mode: 'email',
                        items: buildVoucherShareItems(selectedPaymentsList),
                      })
                    }
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white shadow-xs transition active:scale-95 cursor-pointer"
                    title="Send selected vouchers via Email"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentIds([])}
                    className="px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-indigo-100/50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPaymentsSelected}
                        onChange={handleToggleSelectAllPayments}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        title="Select/Deselect All in filtered list"
                      />
                    </th>
                    <th className="py-3 px-3">Receipt No</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Date & Month</th>
                    <th className="py-3 px-3">Mode</th>
                    <th className="py-3 px-3 text-right">Amount Paid</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No payment records matching the query.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map(payment => {
                      const isSelected = selectedPaymentIds.includes(payment.id);

                      return (
                        <tr
                          key={payment.id}
                          className={`transition ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100/60'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleTogglePaymentSelection(payment.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {payment.receiptNumber}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                            {payment.studentName}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                            {payment.className} — {payment.section}
                          </td>
                          <td className="py-3 px-3">
                            <p className="text-slate-800 dark:text-slate-200">{formatDate(payment.date)}</p>
                            <p className="text-[10px] text-slate-400">{payment.monthFor}</p>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                            {payment.paymentMode}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                              {formatCurrency(payment.totalAmount, settings.currencySymbol)}
                            </span>
                            {payment.discount_amount && payment.discount_amount > 0 ? (
                              <div
                                className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5"
                                title={`Discount: ${formatCurrency(payment.discount_amount, settings.currencySymbol)}${payment.discount_reason ? ` (${payment.discount_reason})` : ''} | Gross: ${formatCurrency(payment.gross_fee || (payment.totalAmount + payment.discount_amount), settings.currencySymbol)}`}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                <span>-{formatCurrency(payment.discount_amount, settings.currencySymbol)}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Preview / Print */}
                              <button
                                type="button"
                                onClick={() => setReceiptToPrint(payment)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Print / Preview Official Voucher"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Download PDF */}
                              <button
                                type="button"
                                onClick={() =>
                                  downloadFeeVouchersPdf([payment], settings, studentsMap, {
                                    layout: '2-per-page',
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Download Voucher PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* WhatsApp Share */}
                              <button
                                type="button"
                                onClick={() =>
                                  setShareModalState({
                                    isOpen: true,
                                    mode: 'whatsapp',
                                    items: buildVoucherShareItems([payment]),
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Send Voucher via WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Email Share */}
                              <button
                                type="button"
                                onClick={() =>
                                  setShareModalState({
                                    isOpen: true,
                                    mode: 'email',
                                    items: buildVoucherShareItems([payment]),
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Send Voucher via Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BATCH FEE COLLECTION (Classroom Mode)                                  */}
      {/* ========================================================================= */}
      {collectionMode === 'batch' && (
        <div className="space-y-6">
          {/* Success Banner if batch just processed */}
          {batchSuccessResult && (
            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 shadow-md flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 mt-0.5">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-black text-emerald-950 dark:text-emerald-100">
                      Batch Fee Collection Successfully Processed!
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200/70 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300">
                      {batchSuccessResult.studentCount} Vouchers Issued
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                    Recorded payment for <strong>{batchSuccessResult.studentCount} students</strong> for{' '}
                    <strong>{batchSuccessResult.month}</strong> totaling{' '}
                    <strong className="font-mono font-bold text-sm">
                      {formatCurrency(batchSuccessResult.totalCollected, settings.currencySymbol)}
                    </strong>
                    . Receipts:{' '}
                    <span className="font-mono font-bold text-emerald-900 dark:text-emerald-200">
                      {batchSuccessResult.firstReceiptNumber} → {batchSuccessResult.lastReceiptNumber}
                    </span>
                    .
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>
                      {Math.ceil(batchSuccessResult.studentCount / 2)} A4 page(s) arranged in Paper-Saving layout (2 vouchers per A4 sheet). Ready to print &amp; share!
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full xl:w-auto justify-end">
                {/* Print All Vouchers (2 Per A4) */}
                <button
                  type="button"
                  onClick={() =>
                    setPrintPreviewState({
                      isOpen: true,
                      vouchers: batchSuccessResult.receipts,
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                  title="Open Print Preview to print all batch fee vouchers (2 per A4 page)"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print All Vouchers (2 Per A4)</span>
                </button>

                {/* Download Batch PDF */}
                <button
                  type="button"
                  onClick={() =>
                    downloadFeeVouchersPdf(batchSuccessResult.receipts, settings, studentsMap, {
                      layout: '2-per-page',
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 transition active:scale-95 cursor-pointer"
                  title="Download consolidated batch vouchers PDF file (2 per A4 page)"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Download Vouchers PDF</span>
                </button>

                {/* WhatsApp Share */}
                <button
                  type="button"
                  onClick={() =>
                    setShareModalState({
                      isOpen: true,
                      mode: 'whatsapp',
                      items: buildVoucherShareItems(batchSuccessResult.receipts),
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition active:scale-95 cursor-pointer"
                  title="Send fee vouchers via WhatsApp to student contacts"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp ({batchSuccessResult.studentCount})</span>
                </button>

                {/* Email Share */}
                <button
                  type="button"
                  onClick={() =>
                    setShareModalState({
                      isOpen: true,
                      mode: 'email',
                      items: buildVoucherShareItems(batchSuccessResult.receipts),
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition active:scale-95 cursor-pointer"
                  title="Send fee vouchers via Email to student/parent contacts"
                >
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </button>

                {/* Batch Audit Report PDF */}
                <button
                  type="button"
                  onClick={() => {
                    generateFeeCollectionAuditPdf(settings, batchSuccessResult.receipts, {
                      title: `CLASSROOM BATCH COLLECTION AUDIT REPORT - ${batchSuccessResult.month.toUpperCase()}`,
                      scope: `Batch Collection (${batchSuccessResult.studentCount} Students)`,
                      period: batchSuccessResult.month,
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Download Batch Receipts Summary Audit PDF"
                >
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Audit Table</span>
                </button>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={() => handleExportBatchReceiptsCSV(batchSuccessResult.receipts)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Export Batch Receipts CSV"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCollectionMode('single');
                    setPaymentSearch(batchSuccessResult.receipts[0]?.monthFor || '');
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 transition cursor-pointer"
                >
                  <span>History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setBatchSuccessResult(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Batch Classroom Filter & Quick Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Classroom Filter:</span>
              </div>

              {/* Class Dropdown */}
              <div className="min-w-[130px]">
                <select
                  value={batchClassFilter}
                  onChange={e => {
                    setBatchClassFilter(e.target.value);
                    setBatchSectionFilter('All');
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="All">All Classes ({availableClasses.length})</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      Class {cls}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="min-w-[110px]">
                <select
                  value={batchSectionFilter}
                  onChange={e => setBatchSectionFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="All">All Sections</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="min-w-[120px]">
                <select
                  value={batchStatusFilter}
                  onChange={e => setBatchStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="active-only">Active Only</option>
                  <option value="with-dues">With Pending Dues</option>
                </select>
              </div>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[160px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter name or roll #..."
                  value={batchSearchQuery}
                  onChange={e => setBatchSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick Selection Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition cursor-pointer"
              >
                {isAllFilteredSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Deselect All Filtered</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Select All in Filter ({filteredBatchStudents.length})</span>
                  </>
                )}
              </button>

              {filteredStudentsWithDues.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllWithDues}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 transition cursor-pointer"
                  title="Quickly select all students in current filter who have outstanding pending dues"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Select with Dues ({filteredStudentsWithDues.length})</span>
                </button>
              )}

              {selectedStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Clear Selection
                </button>
              )}

              <span className="text-xs px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black">{selectedStudentIds.length}</span> / {filteredBatchStudents.length} Selected
              </span>
            </div>
          </div>

          {/* Main Batch Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Students Table Selection List (7 Cols) */}
            <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-h-[560px] max-h-[calc(100vh-14rem)]">
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Classroom Students ({filteredBatchStudents.length})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Click student row to toggle inclusion
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Roll & Name</th>
                      <th className="py-2.5 px-3">Class & Sec</th>
                      <th className="py-2.5 px-3">Pending Due</th>
                      <th className="py-2.5 px-3 text-right">Fee Charge</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredBatchStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400">
                          <p className="text-sm font-semibold">No students matching the current filters.</p>
                          <p className="text-xs text-slate-400 mt-1">Try selecting another class or clearing search.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredBatchStudents.map(student => {
                        const isSelected = selectedStudentIds.includes(student.id);
                        const pendingDue = getStudentPendingFee(student);
                        const feeAmt = getStudentFeeAmount(student);

                        return (
                          <tr
                            key={student.id}
                            onClick={() => handleToggleStudent(student.id)}
                            className={`transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleStudent(student.id)}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  #{student.rollNo}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    {student.fullName}
                                    {student.status !== 'active' && (
                                      <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                                        {student.status}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Guardian: {student.guardianName || 'N/A'} • {student.contactNumber}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {student.className}
                              </span>
                              <span className="text-slate-400 text-[10px] ml-1">
                                (Sec {student.section})
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              {pendingDue > 0 ? (
                                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                  {formatCurrency(pendingDue, settings.currencySymbol)}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  Clear
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency(feeAmt, settings.currencySymbol)}
                            </td>

                            <td className="py-3 px-2 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(student.id);
                                  setCollectionMode('single');
                                }}
                                title="Open in Single Voucher form"
                                className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Batch Fee Charge Configuration Panel (5 Cols) */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Batch Fee Charge Setup
                  </h3>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  Instant Multi-Student
                </span>
              </div>

              <form onSubmit={handleExecuteBatchFee} className="space-y-4 text-xs">
                {/* Administrator Authorization Banner */}
                {isAdmin ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Administrator Authorized:</strong> Clearance active to process bulk fee transactions for all selected students.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Administrator Privilege Required:</strong> Only school administrators can authorize and commit bulk batch fee collections.
                    </span>
                  </div>
                )}

                {/* Billing Month / Period */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Billing Period / Fee Month *
                    </label>
                    <span className="text-[10px] text-slate-400">Applied to all selected</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={batchMonth}
                    onChange={e => setBatchMonth(e.target.value)}
                    placeholder="e.g. September 2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[
                      `${getCurrentMonthName()} ${settings.currentAcademicYear || '2026-2027'}`,
                      `October ${settings.currentAcademicYear?.split('-')[0] || '2026'}`,
                      `Annual Fee ${settings.currentAcademicYear || '2026-2027'}`,
                    ].map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setBatchMonth(m)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Charge Model Choice */}
                <div className="space-y-2 pt-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Fee Charge Calculation Method:
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Option 1: Standard Class Structure */}
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                        batchChargeType === 'class-structure'
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="batchChargeType"
                        value="class-structure"
                        checked={batchChargeType === 'class-structure'}
                        onChange={() => setBatchChargeType('class-structure')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          Use Standard Class Fee Structure
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Automatically applies each student's designated class fee heads (Tuition, Lab, Exam, Library) configured in Fee Structures.
                        </p>
                      </div>
                    </label>

                    {/* Option 2: Clear Outstanding Dues */}
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                        batchChargeType === 'clear-dues'
                          ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-1 ring-amber-400/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="batchChargeType"
                        value="clear-dues"
                        checked={batchChargeType === 'clear-dues'}
                        onChange={() => setBatchChargeType('clear-dues')}
                        className="mt-0.5 text-amber-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            Clear Outstanding Balance (Dues Recovery Mode)
                          </p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            Reconciliation
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Charges each student their exact outstanding pending fee balance to bring ledger to zero.
                        </p>
                      </div>
                    </label>

                    {/* Option 3: Uniform Custom Fixed Amount */}
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                        batchChargeType === 'custom-amount'
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="batchChargeType"
                        value="custom-amount"
                        checked={batchChargeType === 'custom-amount'}
                        onChange={() => setBatchChargeType('custom-amount')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">
                          Uniform Fixed Fee Amount for All
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Charge every selected student the exact same custom fee amount.
                        </p>

                        {batchChargeType === 'custom-amount' && (
                          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                Fee Head Name
                              </label>
                              <input
                                type="text"
                                value={batchCustomHeadName}
                                onChange={e => setBatchCustomHeadName(e.target.value)}
                                placeholder="Monthly Tuition Fee"
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                                Amount Per Student ({settings.currencySymbol})
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={batchCustomAmount}
                                onChange={e => setBatchCustomAmount(Number(e.target.value))}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-emerald-600 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* Option 4: Custom Itemized Fee Breakdown */}
                    <label
                      className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                        batchChargeType === 'custom-heads'
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400/30'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="batchChargeType"
                        value="custom-heads"
                        checked={batchChargeType === 'custom-heads'}
                        onChange={() => setBatchChargeType('custom-heads')}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 dark:text-white">
                          Custom Itemized Fee Heads (Multi-Heads)
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Specify tailored fee heads (e.g. Tuition, Exam, Lab, Sports) applied uniformly to all selected students.
                        </p>

                        {batchChargeType === 'custom-heads' && (
                          <div className="mt-2.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/60 space-y-2">
                            <div className="space-y-1.5">
                              {batchCustomHeads.map((head, index) => (
                                <div key={head.id} className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={head.name}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setBatchCustomHeads(prev =>
                                        prev.map(h => (h.id === head.id ? { ...h, name: val } : h))
                                      );
                                    }}
                                    placeholder="Head name..."
                                    className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs"
                                  />
                                  <div className="w-24 relative">
                                    <input
                                      type="number"
                                      min="0"
                                      value={head.amount}
                                      onChange={e => {
                                        const amt = Number(e.target.value);
                                        setBatchCustomHeads(prev =>
                                          prev.map(h => (h.id === head.id ? { ...h, amount: amt } : h))
                                        );
                                      }}
                                      className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-emerald-600 text-xs text-right"
                                    />
                                  </div>
                                  {batchCustomHeads.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setBatchCustomHeads(prev => prev.filter(h => h.id !== head.id))
                                      }
                                      className="p-1 text-slate-400 hover:text-red-500 rounded transition cursor-pointer"
                                      title="Remove Head"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setBatchCustomHeads(prev => [
                                    ...prev,
                                    { id: String(Date.now()), name: 'Additional Fee', amount: 50 },
                                  ])
                                }
                                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Fee Head</span>
                              </button>
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                Total Per Student:{' '}
                                <strong className="font-mono text-emerald-600">
                                  {formatCurrency(
                                    batchCustomHeads.reduce((s, h) => s + (Number(h.amount) || 0), 0),
                                    settings.currencySymbol
                                  )}
                                </strong>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>

                {/* Payment Mode & Collection Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={batchPaymentMode}
                      onChange={e => setBatchPaymentMode(e.target.value as PaymentMode)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <option value="Cash">Cash Counter</option>
                      <option value="Online/UPI">Online / UPI</option>
                      <option value="Bank Transfer">Bank Wire / Transfer</option>
                      <option value="Cheque">Bank Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Collection
                    </label>
                    <input
                      type="date"
                      value={batchCollectionDate}
                      onChange={e => setBatchCollectionDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                {/* Collector & Batch Ref */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Collected / Authorized By
                    </label>
                    <input
                      type="text"
                      value={batchCollectorName}
                      onChange={e => setBatchCollectorName(e.target.value)}
                      placeholder="Accounts Officer"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Batch Ref # (Opt)
                    </label>
                    <input
                      type="text"
                      value={batchTransactionRef}
                      onChange={e => setBatchTransactionRef(e.target.value)}
                      placeholder="e.g. BATCH-SEP26"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Remarks / Receipt Note
                  </label>
                  <input
                    type="text"
                    value={batchRemarks}
                    onChange={e => setBatchRemarks(e.target.value)}
                    placeholder="e.g. Monthly tuition & examination fees"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Live Batch Summary Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Students Selected:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedStudentIds.length} Student{selectedStudentIds.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Average Fee per Student:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(
                        selectedStudentIds.length > 0
                          ? Math.round(batchTotalAmount / selectedStudentIds.length)
                          : 0,
                        settings.currencySymbol
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Paper-Saving Layout:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.ceil(selectedStudentIds.length / 2)} A4 Sheet(s) (2 vouchers per page)
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Total Batch Collection:
                    </span>
                    <span className="font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(batchTotalAmount, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Process Button */}
                <button
                  id="btn-process-batch-fee-collection"
                  type="submit"
                  disabled={selectedStudentIds.length === 0 || isBatchSubmitting || !isAdmin}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm transition shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isBatchSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Bulk Fee Collection &amp; Issuing Receipts...</span>
                    </>
                  ) : !isAdmin ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Administrator Privilege Required for Bulk Processing</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>
                        ⚡ Process Batch Fee Collection ({selectedStudentIds.length} Students • {formatCurrency(batchTotalAmount, settings.currencySymbol)})
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals for Print Preview and WhatsApp/Email Sharing */}
      <PrintPreviewModal
        isOpen={printPreviewState.isOpen}
        onClose={() => setPrintPreviewState({ isOpen: false, vouchers: [] })}
        documentType="fee_voucher"
        vouchers={printPreviewState.vouchers}
        studentsMap={studentsMap}
        settings={settings}
      />

      <ShareModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState({ isOpen: false, mode: 'whatsapp', items: [] })}
        shareMode={shareModalState.mode}
        documentType="fee_voucher"
        items={shareModalState.items}
        settings={settings}
      />

      <DedicatedPrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        initialDocumentType="fee_receipt"
        allReceipts={feePayments}
        studentsMap={studentsMap}
        settings={settings}
      />

      {/* Password Re-Verification for Large Concessions (> 50%) */}
      <PasswordConfirmModal
        isOpen={isPasswordConfirmOpen}
        title="Administrative Verification for High Fee Discount"
        description={`You are applying a high concession of ${formatCurrency(discountAmount, settings.currencySymbol)} (${grossFee > 0 ? Math.round((discountAmount / grossFee) * 100) : 0}% of gross fee) for ${selectedStudent?.fullName || 'student'}. To prevent unauthorized or accidental fee concessions, please confirm your login password.`}
        actionButtonLabel="Confirm & Authorize Discount"
        actionButtonColor="amber"
        onClose={() => setIsPasswordConfirmOpen(false)}
        onConfirm={async () => {
          setIsPasswordConfirmOpen(false);
          await executeRecordPayment();
        }}
      />
    </div>
  );
};

