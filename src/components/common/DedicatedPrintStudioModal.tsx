import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  Download,
  X,
  Sparkles,
  Scissors,
  CheckCircle,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Receipt,
  DollarSign,
  User,
  Users,
  QrCode,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { SchoolSettings, FeePayment, Student, Staff } from '../../types';
import { formatCurrency, formatDate, amountToWords, getTodayDateString } from '../../utils/formatters';
import {
  downloadFeeVouchersPdf,
  downloadPaySlipsPdf,
  downloadMixedSlipsPdf,
  PaperSizeFormat,
  PaySlipData,
} from '../../utils/voucherAndPayslipPdf';
import { useSchool } from '../../context/SchoolContext';

export interface DedicatedPrintStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocumentType?: 'fee_receipt' | 'payroll_slip' | 'mixed';
  initialReceipt?: FeePayment | null;
  initialPaySlip?: PaySlipData | null;
  allReceipts?: FeePayment[];
  allPaySlips?: PaySlipData[];
  settings?: SchoolSettings;
  studentsMap?: Record<string, Student>;
}

export const DedicatedPrintStudioModal: React.FC<DedicatedPrintStudioModalProps> = ({
  isOpen,
  onClose,
  initialDocumentType = 'fee_receipt',
  initialReceipt = null,
  initialPaySlip = null,
  allReceipts = [],
  allPaySlips = [],
  settings: passedSettings,
  studentsMap: passedStudentsMap = {},
}) => {
  const schoolContext = useSchool();
  const settings = passedSettings || schoolContext.settings;
  const contextReceipts = allReceipts.length > 0 ? allReceipts : schoolContext.feePayments || [];
  const contextStudents = schoolContext.students || [];
  const contextStaff = schoolContext.staff || [];

  // Fallback to all staff members if allPaySlips is empty
  const resolvedPaySlips: PaySlipData[] = useMemo(() => {
    if (allPaySlips.length > 0) return allPaySlips;
    return contextStaff.map(member => ({
      staff: member,
      selectedMonth: initialPaySlip?.selectedMonth || 'October 2026',
      isPaid: true,
      paidDate: initialPaySlip?.paidDate || getTodayDateString(),
      paymentRef: `SAL-${member.employeeCode}-202610`,
      paymentMode: 'Bank Transfer',
      basicSalary: member.monthlySalary,
      allowances: member.allowances,
      deductions: member.deductions,
      bonus: 0,
      netSalary: member.monthlySalary + member.allowances - member.deductions,
    }));
  }, [allPaySlips, contextStaff, initialPaySlip]);

  // Map students by ID
  const studentsMap = useMemo(() => {
    if (Object.keys(passedStudentsMap).length > 0) return passedStudentsMap;
    const map: Record<string, Student> = {};
    contextStudents.forEach(s => {
      map[s.id] = s;
    });
    return map;
  }, [passedStudentsMap, contextStudents]);

  // Mode Selection
  const [docType, setDocType] = useState<'fee_receipt' | 'payroll_slip' | 'mixed'>(initialDocumentType);
  const [paperSize, setPaperSize] = useState<PaperSizeFormat>('a4');
  const [layoutMode, setLayoutMode] = useState<'1-per-page' | '2-per-page'>('2-per-page');
  const [twoSlipMode, setTwoSlipMode] = useState<'duplicate' | 'two_different'>('two_different');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Selected Receipts (Slot 1 and Slot 2)
  const [receipt1Id, setReceipt1Id] = useState<string>('');
  const [receipt2Id, setReceipt2Id] = useState<string>('');

  // Selected PaySlips (Slot 1 and Slot 2)
  const [paySlip1Id, setPaySlip1Id] = useState<string>('');
  const [paySlip2Id, setPaySlip2Id] = useState<string>('');

  // Slip Display Options
  const [showQrCode, setShowQrCode] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showPerforationNotice, setShowPerforationNotice] = useState(true);

  // Sync initial receipts and payslips when opening
  useEffect(() => {
    if (!isOpen) return;
    setDocType(initialDocumentType);

    if (initialReceipt) {
      setReceipt1Id(initialReceipt.id);
      // Pick second different receipt if available
      const otherReceipt = contextReceipts.find(r => r.id !== initialReceipt.id);
      if (otherReceipt) setReceipt2Id(otherReceipt.id);
      else setReceipt2Id(initialReceipt.id);
    } else if (contextReceipts.length > 0) {
      setReceipt1Id(contextReceipts[0].id);
      setReceipt2Id(contextReceipts[1]?.id || contextReceipts[0].id);
    }

    if (initialPaySlip) {
      setPaySlip1Id(initialPaySlip.staff.id);
      const otherSlip = resolvedPaySlips.find(p => p.staff.id !== initialPaySlip.staff.id);
      if (otherSlip) setPaySlip2Id(otherSlip.staff.id);
      else setPaySlip2Id(initialPaySlip.staff.id);
    } else if (resolvedPaySlips.length > 0) {
      setPaySlip1Id(resolvedPaySlips[0].staff.id);
      setPaySlip2Id(resolvedPaySlips[1]?.staff.id || resolvedPaySlips[0].staff.id);
    }
  }, [isOpen, initialDocumentType, initialReceipt, initialPaySlip, contextReceipts, resolvedPaySlips]);

  // If paper size is A6, 2-per-page is cramped, so recommend 1-per-page or keep compact
  useEffect(() => {
    if (paperSize === 'a6' && layoutMode === '2-per-page') {
      // Allow user to use it if they want ultra-compact pocket vouchers, but notify
    }
  }, [paperSize, layoutMode]);

  // Resolve Active Slip Items
  const activeReceipt1: FeePayment | null = useMemo(() => {
    return contextReceipts.find(r => r.id === receipt1Id) || initialReceipt || contextReceipts[0] || null;
  }, [contextReceipts, receipt1Id, initialReceipt]);

  const activeReceipt2: FeePayment | null = useMemo(() => {
    if (twoSlipMode === 'duplicate') return activeReceipt1;
    return contextReceipts.find(r => r.id === receipt2Id) || contextReceipts[1] || activeReceipt1;
  }, [contextReceipts, receipt2Id, twoSlipMode, activeReceipt1]);

  const activePaySlip1: PaySlipData | null = useMemo(() => {
    return resolvedPaySlips.find(p => p.staff.id === paySlip1Id) || initialPaySlip || resolvedPaySlips[0] || null;
  }, [resolvedPaySlips, paySlip1Id, initialPaySlip]);

  const activePaySlip2: PaySlipData | null = useMemo(() => {
    if (twoSlipMode === 'duplicate') return activePaySlip1;
    return resolvedPaySlips.find(p => p.staff.id === paySlip2Id) || resolvedPaySlips[1] || activePaySlip1;
  }, [resolvedPaySlips, paySlip2Id, twoSlipMode, activePaySlip1]);

  if (!isOpen) return null;

  // Handle Browser Native Print with exact paper size rules
  const handleTriggerPrint = () => {
    // 1. Add dedicated print mode class and paper size class to body
    document.body.classList.add('print-mode-dedicated-slips');
    document.body.classList.add(`print-paper-${paperSize}`);

    // 2. Inject dynamic @page size rule so browser print dialog matches user selection automatically
    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-paper-size-style';
    styleEl.innerHTML = `
      @page {
        size: ${paperSize.toUpperCase()} portrait;
        margin: ${paperSize === 'a6' ? '3mm 4mm' : paperSize === 'a5' ? '4mm 5mm' : '6mm 8mm'};
      }
    `;
    document.head.appendChild(styleEl);

    // 3. Trigger Print
    window.print();

    // 4. Cleanup after print dialog dismisses
    const cleanup = () => {
      document.body.classList.remove('print-mode-dedicated-slips');
      document.body.classList.remove(`print-paper-${paperSize}`);
      const el = document.getElementById('dynamic-print-paper-size-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // Safety fallback cleanup
    setTimeout(cleanup, 2000);
  };

  // Handle Download PDF with matching parameters
  const handleDownloadPdf = () => {
    if (docType === 'mixed' && activeReceipt1 && activePaySlip1) {
      downloadMixedSlipsPdf(
        activeReceipt1,
        activePaySlip1,
        settings,
        studentsMap,
        { paperSize },
        `Mixed_Fee_And_Payroll_${paperSize.toUpperCase()}.pdf`
      );
      return;
    }

    if (docType === 'fee_receipt') {
      const list = layoutMode === '2-per-page'
        ? (activeReceipt1 && activeReceipt2 ? [activeReceipt1, activeReceipt2] : activeReceipt1 ? [activeReceipt1, activeReceipt1] : [])
        : (activeReceipt1 ? [activeReceipt1] : []);

      downloadFeeVouchersPdf(list, settings, studentsMap, {
        layout: layoutMode,
        paperSize,
      });
    } else {
      const list = layoutMode === '2-per-page'
        ? (activePaySlip1 && activePaySlip2 ? [activePaySlip1, activePaySlip2] : activePaySlip1 ? [activePaySlip1, activePaySlip1] : [])
        : (activePaySlip1 ? [activePaySlip1] : []);

      downloadPaySlipsPdf(list, settings, {
        layout: layoutMode,
        paperSize,
      });
    }
  };

  // Calculate paper sheet preview width/height in Tailwind / pixels
  const getSheetDimensions = () => {
    switch (paperSize) {
      case 'a6':
        return {
          label: 'A6 Pocket Slip (105 × 148 mm)',
          containerClass: 'w-full max-w-[105mm] min-h-[148mm]',
          heightMm: 148,
          isCompact: true,
        };
      case 'a5':
        return {
          label: 'A5 Half Sheet Voucher (148 × 210 mm)',
          containerClass: 'w-full max-w-[148mm] min-h-[210mm]',
          heightMm: 210,
          isCompact: false,
        };
      case 'a4':
      default:
        return {
          label: 'A4 Standard Sheet (210 × 297 mm)',
          containerClass: 'w-full max-w-[210mm] min-h-[297mm]',
          heightMm: 297,
          isCompact: false,
        };
    }
  };

  const sheetDim = getSheetDimensions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:block print:overflow-visible">
      <div className="relative w-full max-w-6xl rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex flex-col max-h-[96vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 print:max-h-none print:border-none print:shadow-none print:bg-transparent print:w-full print:rounded-none">
        
        {/* ========================================================================= */}
        {/* TOP TOOLBAR: Document Type, Paper Size (A6/A5/A4), 2-in-1, Print Buttons   */}
        {/* ========================================================================= */}
        <div className="print:hidden flex-none px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
          
          {/* Document Type Selector */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                  Dedicated Print Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Auto-Format Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Format official receipts &amp; payroll slips for A6, A5, or A4 paper with dual-slip layout
              </p>
            </div>
          </div>

          {/* Controls: Document Type Tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setDocType('fee_receipt')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                docType === 'fee_receipt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Fee Receipts</span>
            </button>
            <button
              type="button"
              onClick={() => setDocType('payroll_slip')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                docType === 'payroll_slip'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Payroll Slips</span>
            </button>
            <button
              type="button"
              onClick={() => setDocType('mixed')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                docType === 'mixed'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Print 1 Fee Receipt and 1 Payroll Slip together on 1 page"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mixed (2-in-1)</span>
            </button>
          </div>

          {/* Action Buttons: Print, Download, Close */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerPrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
              title={`Trigger print command formatted for ${paperSize.toUpperCase()}`}
            >
              <Printer className="w-4 h-4" />
              <span>Print {paperSize.toUpperCase()} Now</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer"
              title={`Download PDF in ${paperSize.toUpperCase()} format`}
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Close Print Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECONDARY SETTINGS BAR: Paper Size (A6 / A5 / A4) & Layout Mode & Pairing  */}
        {/* ========================================================================= */}
        <div className="print:hidden px-4 sm:px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Left: Paper Size Selector (A6, A5, A4) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Paper Size:</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              {(['a4', 'a5', 'a6'] as PaperSizeFormat[]).map(size => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPaperSize(size)}
                  className={`px-3 py-1 rounded-lg font-bold uppercase transition cursor-pointer ${
                    paperSize === size
                      ? size === 'a4'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : size === 'a5'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={
                    size === 'a4'
                      ? 'Standard A4 Sheet (210 x 297 mm)'
                      : size === 'a5'
                      ? 'A5 Half Sheet Voucher (148 x 210 mm)'
                      : 'A6 Pocket/Counter Receipt (105 x 148 mm)'
                  }
                >
                  {size}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              ({sheetDim.label})
            </span>
          </div>

          {/* Center: Layout Mode: 1 Slip per Page vs 2 Slips in One Page */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Layout:</span>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setLayoutMode('1-per-page')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  layoutMode === '1-per-page'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1 Slip / Page
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('2-per-page')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  layoutMode === '2-per-page'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Print 2 slips on one single sheet with perforation line"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>2 Slips in One Page</span>
              </button>
            </div>

            {/* If 2 Slips in One Page: Mode selector (Duplicate vs 2 Different) */}
            {layoutMode === '2-per-page' && docType !== 'mixed' && (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setTwoSlipMode('duplicate')}
                  className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                    twoSlipMode === 'duplicate'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Original Copy + School/Office Copy of the same record"
                >
                  Duplicate Copies
                </button>
                <button
                  type="button"
                  onClick={() => setTwoSlipMode('two_different')}
                  className={`px-2 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                    twoSlipMode === 'two_different'
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Pair 2 completely different records on the same page"
                >
                  2 Different Slips
                </button>
              </div>
            )}
          </div>

          {/* Right: Zoom Level Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.max(50, z - 10))}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-400 w-9 text-center">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel(z => Math.min(150, z + 10))}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Reset 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RECORD PICKER BAR (If 2 Different Slips Selected)                        */}
        {/* ========================================================================= */}
        {layoutMode === '2-per-page' && twoSlipMode === 'two_different' && docType !== 'mixed' && (
          <div className="print:hidden px-4 sm:px-6 py-2 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5" />
                <span>Pairing 2 Different Slips on 1 Page:</span>
              </span>
            </div>

            {docType === 'fee_receipt' ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Top Slip:</span>
                  <select
                    value={receipt1Id}
                    onChange={e => setReceipt1Id(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  >
                    {contextReceipts.map(r => (
                      <option key={`top-${r.id}`} value={r.id}>
                        #{r.receiptNumber} — {r.studentName} ({formatCurrency(r.totalAmount, settings.currencySymbol)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Bottom Slip:</span>
                  <select
                    value={receipt2Id}
                    onChange={e => setReceipt2Id(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-purple-500"
                  >
                    {contextReceipts.map(r => (
                      <option key={`bottom-${r.id}`} value={r.id}>
                        #{r.receiptNumber} — {r.studentName} ({formatCurrency(r.totalAmount, settings.currencySymbol)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Top Slip:</span>
                  <select
                    value={paySlip1Id}
                    onChange={e => setPaySlip1Id(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  >
                    {resolvedPaySlips.map(p => (
                      <option key={`p1-${p.staff.id}`} value={p.staff.id}>
                        {p.staff.fullName} ({p.staff.employeeCode}) — {p.staff.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-medium">Bottom Slip:</span>
                  <select
                    value={paySlip2Id}
                    onChange={e => setPaySlip2Id(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-purple-500"
                  >
                    {resolvedPaySlips.map(p => (
                      <option key={`p2-${p.staff.id}`} value={p.staff.id}>
                        {p.staff.fullName} ({p.staff.employeeCode}) — {p.staff.designation}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Record Picker Bar for Mixed 2-in-1 */}
        {docType === 'mixed' && (
          <div className="print:hidden px-4 sm:px-6 py-2 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Mixed Mode (Fee Receipt + Payroll Slip in 1 Page):</span>
            </span>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Fee Receipt:</span>
                <select
                  value={receipt1Id}
                  onChange={e => setReceipt1Id(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
                >
                  {contextReceipts.map(r => (
                    <option key={`mix-r-${r.id}`} value={r.id}>
                      #{r.receiptNumber} — {r.studentName} ({formatCurrency(r.totalAmount, settings.currencySymbol)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Payroll Slip:</span>
                <select
                  value={paySlip1Id}
                  onChange={e => setPaySlip1Id(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-hidden focus:border-purple-500"
                >
                  {resolvedPaySlips.map(p => (
                    <option key={`mix-p-${p.staff.id}`} value={p.staff.id}>
                      {p.staff.fullName} ({p.staff.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PREVIEW VIEWPORT: Simulated Paper Sheet (A6 / A5 / A4)                     */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center custom-scrollbar">
          
          <div
            id="printable-dedicated-studio"
            className="w-full flex flex-col items-center transition-transform origin-top print:transform-none"
            style={{
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
            }}
          >
            {/* The Physical Sheet Container */}
            <div
              className={`bg-white text-slate-900 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col justify-between relative print:min-h-0 print:p-2 print:shadow-none print:rounded-none border border-slate-200 ${
                sheetDim.containerClass
              }`}
            >
              {/* SLIP 1 / TOP SLIP */}
              {docType === 'mixed' ? (
                // Top: Fee Receipt
                activeReceipt1 && (
                  <SingleFeeReceiptTemplate
                    receipt={activeReceipt1}
                    student={studentsMap[activeReceipt1.studentId]}
                    settings={settings}
                    paperSize={paperSize}
                    copyLabel="ACCOUNTS COPY / OFFICIAL RECEIPT"
                    isTwoPerPage={true}
                  />
                )
              ) : docType === 'fee_receipt' ? (
                activeReceipt1 && (
                  <SingleFeeReceiptTemplate
                    receipt={activeReceipt1}
                    student={studentsMap[activeReceipt1.studentId]}
                    settings={settings}
                    paperSize={paperSize}
                    copyLabel={
                      layoutMode === '2-per-page'
                        ? twoSlipMode === 'duplicate'
                          ? 'STUDENT COPY / ORIGINAL'
                          : `SLIP #1 • ${activeReceipt1.studentName.toUpperCase()}`
                        : 'ORIGINAL STUDENT VOUCHER'
                    }
                    isTwoPerPage={layoutMode === '2-per-page'}
                  />
                )
              ) : (
                activePaySlip1 && (
                  <SinglePaySlipTemplate
                    data={activePaySlip1}
                    settings={settings}
                    paperSize={paperSize}
                    copyLabel={
                      layoutMode === '2-per-page'
                        ? twoSlipMode === 'duplicate'
                          ? 'EMPLOYEE COPY / ORIGINAL'
                          : `SLIP #1 • ${activePaySlip1.staff.fullName.toUpperCase()}`
                        : 'ORIGINAL EMPLOYEE PAY SLIP'
                    }
                    isTwoPerPage={layoutMode === '2-per-page'}
                  />
                )
              )}

              {/* Perforation Cutting Line (if 2 Slips in One Page) */}
              {layoutMode === '2-per-page' && (
                <div className="perforation-line my-3 print:my-2" />
              )}

              {/* SLIP 2 / BOTTOM SLIP (if 2 Slips in One Page) */}
              {layoutMode === '2-per-page' && (
                docType === 'mixed' ? (
                  // Bottom: Pay Slip
                  activePaySlip1 && (
                    <SinglePaySlipTemplate
                      data={activePaySlip1}
                      settings={settings}
                      paperSize={paperSize}
                      copyLabel="FACULTY DISBURSAL VOUCHER"
                      isTwoPerPage={true}
                    />
                  )
                ) : docType === 'fee_receipt' ? (
                  activeReceipt2 && (
                    <SingleFeeReceiptTemplate
                      receipt={activeReceipt2}
                      student={studentsMap[activeReceipt2.studentId]}
                      settings={settings}
                      paperSize={paperSize}
                      copyLabel={
                        twoSlipMode === 'duplicate'
                          ? 'INSTITUTION / BURSAR COPY'
                          : `SLIP #2 • ${activeReceipt2.studentName.toUpperCase()}`
                      }
                      isTwoPerPage={true}
                    />
                  )
                ) : (
                  activePaySlip2 && (
                    <SinglePaySlipTemplate
                      data={activePaySlip2}
                      settings={settings}
                      paperSize={paperSize}
                      copyLabel={
                        twoSlipMode === 'duplicate'
                          ? 'FINANCE & ACCOUNTS AUDIT COPY'
                          : `SLIP #2 • ${activePaySlip2.staff.fullName.toUpperCase()}`
                      }
                      isTwoPerPage={true}
                    />
                  )
                )
              )}
            </div>

            {/* Quick Helper below paper preview */}
            <div className="print:hidden text-center text-xs text-slate-500 mt-4 max-w-md">
              <p>
                Clicking <strong>&ldquo;Print {paperSize.toUpperCase()} Now&rdquo;</strong> triggers the browser print dialog with strict physical <strong>@{paperSize}</strong> sizing rules applied, preventing unwanted blank pages or layout clipping.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* DEDICATED TEMPLATE 1: FEE RECEIPT (AUTO-SCALES FOR A6, A5, A4)            */
/* ========================================================================= */
interface SingleFeeReceiptProps {
  receipt: FeePayment;
  student?: Student | null;
  settings: SchoolSettings;
  paperSize: PaperSizeFormat;
  copyLabel: string;
  isTwoPerPage: boolean;
}

const SingleFeeReceiptTemplate: React.FC<SingleFeeReceiptProps> = ({
  receipt,
  student,
  settings,
  paperSize,
  copyLabel,
  isTwoPerPage,
}) => {
  // Density parameters based on Paper Size
  const isA6 = paperSize === 'a6';
  const isA5 = paperSize === 'a5';

  return (
    <div
      className={`slip-card-container flex-1 flex flex-col justify-between border border-slate-300 rounded-xl bg-white text-slate-900 relative overflow-hidden ${
        isA6 ? 'p-2.5 text-[9px]' : isA5 ? 'p-3.5 text-[10px]' : isTwoPerPage ? 'p-4 text-[11px]' : 'p-6 text-xs'
      }`}
    >
      {/* Top Color Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />

      {/* Header Bar */}
      <div>
        <div className="flex items-start justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={`rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center shrink-0 ${
                isA6 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
              }`}
            >
              EL
            </div>
            <div>
              <h4 className={`font-black tracking-tight text-slate-900 uppercase ${isA6 ? 'text-[11px]' : 'text-sm'}`}>
                {settings.schoolName || 'St. Augustine International Academy'}
              </h4>
              <p className="text-[9px] text-slate-500 line-clamp-1 leading-tight">
                {settings.schoolTagline || 'Excellence in Education'} • Tel: {settings.schoolPhone || '+92 51 1234567'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8px] font-black uppercase tracking-wider">
              {copyLabel}
            </span>
            <p className="font-mono font-bold text-slate-800 text-[10px] mt-0.5">
              #{receipt.receiptNumber}
            </p>
            <p className="text-[9px] text-slate-500">
              {formatDate(receipt.date)}
            </p>
          </div>
        </div>

        {/* Student & Payment Metadata Grid */}
        <div className={`grid grid-cols-2 gap-2 my-2 p-2 rounded-lg bg-slate-50 border border-slate-200 ${isA6 ? 'py-1 gap-1' : ''}`}>
          <div>
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Student Name</span>
            <span className="font-bold text-slate-900 line-clamp-1">
              {receipt.studentName}
            </span>
            <span className="text-slate-500 text-[9px] block">
              Roll No: {student?.rollNo || receipt.studentId || '2026-N/A'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Class &amp; Session</span>
            <span className="font-bold text-slate-900 line-clamp-1">
              {receipt.className} — Sec {receipt.section}
            </span>
            <span className="text-slate-500 text-[9px] block">
              Fee Month: {receipt.monthFor || 'Current Term'}
            </span>
          </div>
        </div>

        {/* Itemized Breakdown Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden my-2">
          <table className="w-full text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-1 px-2">Description / Fee Head</th>
                <th className="py-1 px-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {receipt.feeBreakdown && receipt.feeBreakdown.length > 0 ? (
                receipt.feeBreakdown.slice(0, isA6 ? 2 : 4).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1 px-2 font-medium">{item.headName}</td>
                    <td className="py-1 px-2 text-right font-mono">
                      {formatCurrency(item.amount, settings.currencySymbol)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-1 px-2 font-medium">Consolidated Tuition &amp; Academy Dues</td>
                  <td className="py-1 px-2 text-right font-mono">
                    {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-emerald-50/70 border-t border-emerald-200 font-bold text-slate-900">
              <tr>
                <td className="py-1.5 px-2">
                  <span>Total Amount Paid ({receipt.paymentMode || 'Cash'}):</span>
                </td>
                <td className="py-1.5 px-2 text-right font-mono text-emerald-700 font-black">
                  {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer Attestation & Signature Blocks */}
      <div className="pt-2 border-t border-slate-200 flex items-end justify-between gap-4 mt-auto">
        <div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold text-[9px]">
            <CheckCircle className="w-3 h-3" />
            <span>Official Receipt Verified</span>
          </div>
          <p className="text-[8px] text-slate-400">
            Mode: {receipt.paymentMode} {receipt.transactionRef ? `(${receipt.transactionRef})` : ''}
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="w-24 border-b border-slate-400 mb-1" />
          <span className="text-[8px] font-bold text-slate-600 uppercase">
            Authorized Signature &amp; Stamp
          </span>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* DEDICATED TEMPLATE 2: PAYROLL SLIP (AUTO-SCALES FOR A6, A5, A4)           */
/* ========================================================================= */
interface SinglePaySlipProps {
  data: PaySlipData;
  settings: SchoolSettings;
  paperSize: PaperSizeFormat;
  copyLabel: string;
  isTwoPerPage: boolean;
}

const SinglePaySlipTemplate: React.FC<SinglePaySlipProps> = ({
  data,
  settings,
  paperSize,
  copyLabel,
  isTwoPerPage,
}) => {
  const isA6 = paperSize === 'a6';
  const isA5 = paperSize === 'a5';

  const basic = data.basicSalary ?? data.staff.monthlySalary;
  const allowances = data.allowances ?? data.staff.allowances;
  const bonus = data.bonus ?? 0;
  const gross = basic + allowances + bonus;
  const deductions = data.deductions ?? data.staff.deductions;
  const net = data.netSalary ?? gross - deductions;

  return (
    <div
      className={`slip-card-container flex-1 flex flex-col justify-between border border-slate-300 rounded-xl bg-white text-slate-900 relative overflow-hidden ${
        isA6 ? 'p-2.5 text-[9px]' : isA5 ? 'p-3.5 text-[10px]' : isTwoPerPage ? 'p-4 text-[11px]' : 'p-6 text-xs'
      }`}
    >
      {/* Top Color Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-purple-600" />

      {/* Header Bar */}
      <div>
        <div className="flex items-start justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={`rounded-lg bg-purple-600 text-white font-black flex items-center justify-center shrink-0 ${
                isA6 ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
              }`}
            >
              HR
            </div>
            <div>
              <h4 className={`font-black tracking-tight text-slate-900 uppercase ${isA6 ? 'text-[11px]' : 'text-sm'}`}>
                {settings.schoolName || 'St. Augustine International Academy'}
              </h4>
              <p className="text-[9px] text-slate-500 line-clamp-1 leading-tight">
                Institutional HR &amp; Payroll Directorate • {data.selectedMonth || 'Current Period'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-800 border border-purple-200 text-[8px] font-black uppercase tracking-wider">
              {copyLabel}
            </span>
            <p className="font-mono font-bold text-slate-800 text-[10px] mt-0.5">
              Code: {data.staff.employeeCode}
            </p>
            <p className="text-[9px] text-slate-500">
              {data.paidDate ? formatDate(data.paidDate) : formatDate(getTodayDateString())}
            </p>
          </div>
        </div>

        {/* Employee Metadata */}
        <div className={`grid grid-cols-2 gap-2 my-2 p-2 rounded-lg bg-slate-50 border border-slate-200 ${isA6 ? 'py-1 gap-1' : ''}`}>
          <div>
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Employee</span>
            <span className="font-bold text-slate-900 line-clamp-1">
              {data.staff.fullName}
            </span>
            <span className="text-slate-500 text-[9px] block">
              {data.staff.designation}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase text-[8px] font-bold block">Department &amp; Status</span>
            <span className="font-bold text-slate-900 line-clamp-1">
              {data.staff.department}
            </span>
            <span className="text-emerald-600 font-bold text-[9px] block">
              {data.isPaid ? 'PAID / DISBURSED' : 'PENDING'}
            </span>
          </div>
        </div>

        {/* Earnings & Deductions Dual Grid */}
        <div className="grid grid-cols-2 gap-2 my-2">
          {/* Earnings */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 text-slate-700 font-bold px-2 py-1 text-[9px] border-b border-slate-200">
              Earnings
            </div>
            <div className="p-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span>Basic Salary:</span>
                <span className="font-mono font-semibold">{formatCurrency(basic, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Allowances:</span>
                <span className="font-mono">{formatCurrency(allowances, settings.currencySymbol)}</span>
              </div>
              {bonus > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Bonus:</span>
                  <span className="font-mono">{formatCurrency(bonus, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-slate-900">
                <span>Gross:</span>
                <span className="font-mono">{formatCurrency(gross, settings.currencySymbol)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-100 text-slate-700 font-bold px-2 py-1 text-[9px] border-b border-slate-200">
              Deductions
            </div>
            <div className="p-1.5 space-y-0.5">
              <div className="flex justify-between">
                <span>Provident Fund:</span>
                <span className="font-mono">{formatCurrency(Math.round(deductions * 0.6), settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax &amp; Welfare:</span>
                <span className="font-mono">{formatCurrency(deductions - Math.round(deductions * 0.6), settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-rose-600">
                <span>Total Deductions:</span>
                <span className="font-mono">{formatCurrency(deductions, settings.currencySymbol)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight Box */}
        <div className="p-2 rounded-lg bg-purple-50/80 border border-purple-200 flex items-center justify-between">
          <div>
            <span className="text-[8px] uppercase tracking-wider text-purple-900 font-bold block">
              Net Payable Disbursed Salary
            </span>
            <span className="text-[9px] text-slate-500 italic line-clamp-1">
              {amountToWords(net)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-black font-mono text-purple-700">
              {formatCurrency(net, settings.currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Attestation */}
      <div className="pt-2 border-t border-slate-200 flex items-end justify-between gap-4 mt-auto">
        <div>
          <div className="flex items-center gap-1 text-purple-600 font-bold text-[9px]">
            <ShieldCheck className="w-3 h-3" />
            <span>Digitally Verified Pay Slip</span>
          </div>
          <p className="text-[8px] text-slate-400">
            Payment Mode: {data.paymentMode || 'Bank Transfer'} • {data.paymentRef || 'REF-N/A'}
          </p>
        </div>

        <div className="text-right flex flex-col items-end">
          <div className="w-24 border-b border-slate-400 mb-1" />
          <span className="text-[8px] font-bold text-slate-600 uppercase">
            Bursar / Finance Officer
          </span>
        </div>
      </div>
    </div>
  );
};
