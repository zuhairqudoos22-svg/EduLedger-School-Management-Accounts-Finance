import React, { useState, useMemo } from 'react';
import {
  Printer,
  Download,
  MessageSquare,
  Mail,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Scissors,
  CheckCircle,
  ShieldCheck,
  RotateCw,
  Building,
} from 'lucide-react';
import { SchoolSettings, FeePayment, Student, Staff } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  downloadFeeVouchersPdf,
  downloadPaySlipsPdf,
  PaySlipData,
} from '../../utils/voucherAndPayslipPdf';
import { ShareModal, ShareRecipientItem } from './ShareModal';

export interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'fee_voucher' | 'pay_slip';
  vouchers?: FeePayment[];
  paySlips?: PaySlipData[];
  studentsMap?: Record<string, Student>;
  settings: SchoolSettings;
}

import { DedicatedPrintStudioModal } from './DedicatedPrintStudioModal';
import { PaperSizeFormat } from '../../utils/voucherAndPayslipPdf';

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  vouchers = [],
  paySlips = [],
  studentsMap = {},
  settings,
}) => {
  if (!isOpen) return null;

  const totalCount = documentType === 'fee_voucher' ? vouchers.length : paySlips.length;
  if (totalCount === 0) return null;

  // Paper Size & Layout Mode
  const [paperSize, setPaperSize] = useState<PaperSizeFormat>('a4');
  const [layoutMode, setLayoutMode] = useState<'2-per-page' | '1-per-page'>('2-per-page');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);

  // Share modal state
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
  }>({
    isOpen: false,
    mode: 'whatsapp',
  });

  // Calculate items per page
  const itemsPerPage = layoutMode === '2-per-page' ? 2 : 1;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Chunks of items per page for rendering
  const pagesData = useMemo(() => {
    const pages: any[][] = [];
    const items = documentType === 'fee_voucher' ? vouchers : paySlips;

    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push(items.slice(i, i + itemsPerPage));
    }
    return pages;
  }, [documentType, vouchers, paySlips, itemsPerPage]);

  const handlePrint = () => {
    document.body.classList.add(`print-paper-${paperSize}`);

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-bulk-preview-print-style';
    styleEl.innerHTML = `
      @page {
        size: ${paperSize.toUpperCase()} portrait;
        margin: ${paperSize === 'a6' ? '3mm 4mm' : paperSize === 'a5' ? '4mm 5mm' : '6mm 8mm'};
      }
    `;
    document.head.appendChild(styleEl);

    window.print();

    const cleanup = () => {
      document.body.classList.remove(`print-paper-${paperSize}`);
      const el = document.getElementById('dynamic-bulk-preview-print-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
  };

  const handleDownloadPdf = () => {
    if (documentType === 'fee_voucher') {
      downloadFeeVouchersPdf(vouchers, settings, studentsMap, {
        layout: layoutMode,
        paperSize,
      });
    } else {
      downloadPaySlipsPdf(paySlips, settings, {
        layout: layoutMode,
        paperSize,
      });
    }
  };

  // Convert items into share recipients
  const shareRecipientItems: ShareRecipientItem[] = useMemo(() => {
    if (documentType === 'fee_voucher') {
      return vouchers.map(v => {
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
    } else {
      return paySlips.map(p => {
        const basic = p.basicSalary ?? p.staff.monthlySalary;
        const allowances = p.allowances ?? p.staff.allowances;
        const bonus = p.bonus ?? 0;
        const deductions = p.deductions ?? p.staff.deductions;
        const net = p.netSalary ?? basic + allowances + bonus - deductions;

        return {
          id: p.staff.id,
          name: p.staff.fullName,
          role: 'employee',
          subheading: `${p.staff.designation} • ${p.staff.department}`,
          phone: p.staff.contactNumber || '',
          email: p.staff.email || '',
          period: p.selectedMonth,
          amount: net,
          paySlipData: p,
        };
      });
    }
  }, [documentType, vouchers, paySlips, studentsMap]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:block print:overflow-visible">
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-preview-container, #print-preview-container * {
              visibility: visible !important;
            }
            #print-preview-container {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .a4-page-sheet {
              page-break-after: always !important;
              break-after: page !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-width: 210mm !important;
              min-height: 295mm !important;
              padding: 6mm !important;
            }
            .no-print-in-dialog {
              display: none !important;
            }
          }
        `}</style>

        <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 flex flex-col max-h-[95vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 print:max-h-none print:border-none print:shadow-none print:bg-transparent print:w-full print:rounded-none">
          {/* Top Control Bar (Hidden in Print) */}
          <div className="no-print-in-dialog flex-none px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">
            {/* Title & Document Badge */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                    {documentType === 'fee_voucher' ? 'Fee Voucher Print & Share' : 'Employee Pay Slip Print & Share'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                    {totalCount} {totalCount === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {layoutMode === '2-per-page'
                    ? `${totalCount} ${documentType === 'fee_voucher' ? 'fee vouchers' : 'pay slips'} arranged on ${totalPages} A4 sheet(s) • Paper Saver Active`
                    : `${totalCount} documents • 1 per page`}
                </p>
              </div>
            </div>

            {/* Paper Size Selector (A4, A5, A6) */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs font-semibold">Size:</span>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
                {(['a4', 'a5', 'a6'] as PaperSizeFormat[]).map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPaperSize(size)}
                    className={`px-2 py-1 rounded-lg font-bold uppercase transition cursor-pointer text-[10px] ${
                      paperSize === size
                        ? size === 'a4'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : size === 'a5'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Format preview for ${size.toUpperCase()}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Mode Selector (Paper Saver vs Full Page) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode('2-per-page');
                    setActivePageIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    layoutMode === '2-per-page'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Optimize paper usage by printing 2 vouchers or payslips on 1 sheet with cutting line"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>2 Per Page</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLayoutMode('1-per-page');
                    setActivePageIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    layoutMode === '1-per-page'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>1 Per Page</span>
                </button>
              </div>

              {/* Dedicated Print Studio Button */}
              <button
                type="button"
                onClick={() => setIsPrintStudioOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-95 cursor-pointer"
                title="Open Dedicated Print Studio to pair 2 different slips and format for A6/A5/A4"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden md:inline">2-on-1 Studio</span>
              </button>

              {/* Action Buttons: Print, PDF, WhatsApp, Email */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition active:scale-95 cursor-pointer"
                  title={`Trigger print formatted for ${paperSize.toUpperCase()}`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print ({paperSize.toUpperCase()})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer"
                  title="Download consolidated PDF file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalState({ isOpen: true, mode: 'whatsapp' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition active:scale-95 cursor-pointer"
                  title="Send via WhatsApp with pre-filled message and PDF voucher"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalState({ isOpen: true, mode: 'email' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer"
                  title="Send via Email with pre-filled subject and PDF attachment"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden md:inline">Email</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Subheader Notice & Page Navigation Bar */}
          <div className="no-print-in-dialog px-6 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-400 font-semibold">
                {layoutMode === '2-per-page'
                  ? 'Paper-Saving Mode: 2 documents arranged per A4 sheet with dashed cutting line'
                  : 'Standard Mode: 1 document per page'}
              </span>
            </div>

            {/* Multi-page controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  Page <strong>{activePageIndex + 1}</strong> of <strong>{totalPages}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex(p => Math.max(0, p - 1))}
                    disabled={activePageIndex === 0}
                    className="p-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePageIndex(p => Math.min(totalPages - 1, p + 1))}
                    disabled={activePageIndex === totalPages - 1}
                    className="p-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Viewport (Scrollable with zoom scaling) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950 flex flex-col items-center custom-scrollbar">
            <div
              id="print-preview-container"
              className="w-full flex flex-col items-center gap-8 transition-transform origin-top"
              style={{
                transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none',
              }}
            >
              {pagesData.map((pageItems, pageIdx) => {
                // In interactive preview, show the currently active page (or all pages if printing)
                const isPageVisibleInUi = pageIdx === activePageIndex;

                return (
                  <div
                    key={`page-${pageIdx}`}
                    className={`a4-page-sheet w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col justify-between relative print:min-h-0 print:p-4 print:shadow-none print:rounded-none ${
                      isPageVisibleInUi ? 'block' : 'hidden print:block'
                    }`}
                  >
                    {pageItems.map((item, itemIdx) => {
                      const isTopSlot = itemIdx === 0;

                      if (documentType === 'fee_voucher') {
                        const receipt = item as FeePayment;
                        const student =
                          studentsMap[receipt.studentId] ||
                          Object.values(studentsMap).find(s => s.fullName === receipt.studentName);

                        return (
                          <React.Fragment key={receipt.id || itemIdx}>
                            {/* Fee Voucher Card */}
                            <div className="flex-1 flex flex-col justify-between border border-slate-300 rounded-2xl p-4 sm:p-5 relative bg-white overflow-hidden text-xs">
                              {/* Color Accent Top Bar */}
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-600" />

                              {/* Header */}
                              <div className="flex items-start justify-between border-b border-slate-200 pb-3 gap-2">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                                    {settings.schoolName ? settings.schoolName.charAt(0) : 'E'}
                                  </div>
                                  <div>
                                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                                      {settings.schoolName || 'St. Augustine International Academy'}
                                    </h2>
                                    <p className="text-[11px] text-slate-500">{settings.schoolTagline || 'Excellence in Education'}</p>
                                    <p className="text-[10px] text-slate-400">
                                      {settings.schoolAddress || 'Institutional Campus'} • Tel: {settings.schoolPhone || '+92 51 1234567'}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                                    Official Fee Voucher
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 mt-1">
                                    Voucher No: <span className="font-mono text-indigo-600">{receipt.receiptNumber}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-500">Date: {formatDate(receipt.date)}</p>
                                </div>
                              </div>

                              {/* Student Metadata Box (2 Columns) */}
                              <div className="grid grid-cols-2 gap-3 my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Student Details</span>
                                  <p className="font-black text-slate-900 text-xs">{receipt.studentName}</p>
                                  <p className="text-slate-600">Roll No: <span className="font-mono font-bold text-slate-800">{student?.rollNo || receipt.studentId}</span></p>
                                  <p className="text-slate-500">Guardian: {student?.guardianName || 'Parent / Guardian'}</p>
                                </div>

                                <div className="border-l border-slate-200 pl-3">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Academic Details</span>
                                  <p className="font-bold text-slate-900">{receipt.className} — Sec {receipt.section}</p>
                                  <p className="text-slate-600">Period: <span className="font-semibold text-slate-800">{receipt.monthFor || 'Current Term'}</span></p>
                                  <p className="text-slate-500">Channel: {receipt.paymentMode}</p>
                                </div>
                              </div>

                              {/* Fee Particulars Table */}
                              <div className="my-1 border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                                    <tr>
                                      <th className="py-1 px-3 w-8">#</th>
                                      <th className="py-1 px-3">Fee Particulars</th>
                                      <th className="py-1 px-3 text-right">Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {receipt.feeBreakdown && receipt.feeBreakdown.length > 0 ? (
                                      receipt.feeBreakdown.slice(0, 4).map((head, hIdx) => (
                                        <tr key={hIdx}>
                                          <td className="py-1 px-3 text-slate-400">{hIdx + 1}</td>
                                          <td className="py-1 px-3 font-medium">{head.headName}</td>
                                          <td className="py-1 px-3 text-right font-mono font-semibold">
                                            {formatCurrency(head.amount, settings.currencySymbol)}
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td className="py-1 px-3 text-slate-400">1</td>
                                        <td className="py-1 px-3 font-medium">Consolidated Tuition &amp; Academic Fees</td>
                                        <td className="py-1 px-3 text-right font-mono font-semibold">
                                          {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                  <tfoot className="bg-indigo-50/70 border-t border-indigo-200 font-bold text-slate-900">
                                    <tr>
                                      <td colSpan={2} className="py-1.5 px-3 text-right text-[11px]">Total Payable / Paid:</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-xs text-indigo-700">
                                        {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>

                              {/* Footer & Stamps */}
                              <div className="flex items-end justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                                <div>
                                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Verified Electronic Receipt • Accounts Bureau</span>
                                  </div>
                                  <p className="text-slate-400 text-[9px] mt-0.5">
                                    Collector: {receipt.collectedBy || 'Bursar'} • Non-refundable
                                  </p>
                                </div>

                                <div className="text-right">
                                  <div className="w-28 border-b border-slate-400 mb-1 inline-block" />
                                  <p className="font-semibold text-slate-700 text-[9px]">Authorized Institutional Signature</p>
                                </div>
                              </div>
                            </div>

                            {/* Middle Cutting Line when 2 per page and top voucher */}
                            {layoutMode === '2-per-page' && isTopSlot && pageItems.length > 1 && (
                              <div className="my-3 py-1 flex items-center justify-center gap-2 border-t border-dashed border-slate-400 text-slate-500 text-[10px] font-mono">
                                <Scissors className="w-3.5 h-3.5" />
                                <span>- - - - - - - - - - - - - - - Cut Along Dashed Line - - - - - - - - - - - - - - -</span>
                                <Scissors className="w-3.5 h-3.5 rotate-180" />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      } else {
                        // Employee Pay Slip Card
                        const paySlip = item as PaySlipData;
                        const basic = paySlip.basicSalary ?? paySlip.staff.monthlySalary;
                        const allowances = paySlip.allowances ?? paySlip.staff.allowances;
                        const bonus = paySlip.bonus ?? 0;
                        const deductions = paySlip.deductions ?? paySlip.staff.deductions;
                        const net = paySlip.netSalary ?? basic + allowances + bonus - deductions;

                        return (
                          <React.Fragment key={paySlip.staff.id || itemIdx}>
                            <div className="flex-1 flex flex-col justify-between border border-slate-300 rounded-2xl p-4 sm:p-5 relative bg-white overflow-hidden text-xs">
                              {/* Emerald Accent Top Bar */}
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-600" />

                              {/* Header */}
                              <div className="flex items-start justify-between border-b border-slate-200 pb-3 gap-2">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                                    {settings.schoolName ? settings.schoolName.charAt(0) : 'E'}
                                  </div>
                                  <div>
                                    <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                                      {settings.schoolName || 'St. Augustine International Academy'}
                                    </h2>
                                    <p className="text-[11px] text-slate-500">Human Resources &amp; Staff Payroll Directorate</p>
                                    <p className="text-[10px] text-slate-400">
                                      {settings.schoolAddress || 'Main Campus'} • Tel: {settings.schoolPhone || '+92 51 1234567'}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                                    Salary Pay Slip
                                  </span>
                                  <p className="text-xs font-bold text-slate-800 mt-1">
                                    Period: <span className="font-mono text-emerald-600">{paySlip.selectedMonth}</span>
                                  </p>
                                  <p className="text-[10px] text-slate-500">Date: {paySlip.paidDate ? formatDate(paySlip.paidDate) : formatDate(new Date().toISOString().split('T')[0])}</p>
                                </div>
                              </div>

                              {/* Employee Metadata */}
                              <div className="grid grid-cols-2 gap-3 my-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                                <div>
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Employee Information</span>
                                  <p className="font-black text-slate-900 text-xs">{paySlip.staff.fullName}</p>
                                  <p className="text-slate-600">ID: <span className="font-mono font-bold text-slate-800">{paySlip.staff.employeeCode}</span></p>
                                  <p className="text-slate-500">Designation: {paySlip.staff.designation}</p>
                                </div>

                                <div className="border-l border-slate-200 pl-3">
                                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Payroll Breakdown</span>
                                  <p className="font-bold text-slate-900">Department: {paySlip.staff.department}</p>
                                  <p className="text-slate-600">Mode: {paySlip.paymentMode || 'Bank Transfer'}</p>
                                  <p className="text-slate-500">Status: <span className="font-bold text-emerald-600">{paySlip.isPaid ? 'DISBURSED' : 'AUTHORIZED'}</span></p>
                                </div>
                              </div>

                              {/* Earnings vs Deductions (2 Columns) */}
                              <div className="grid grid-cols-2 gap-2 my-1">
                                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase block border-b border-slate-200 pb-1 mb-1">
                                    Earnings &amp; Allowances
                                  </span>
                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Basic Salary:</span>
                                      <span className="font-mono font-bold text-slate-800">{formatCurrency(basic, settings.currencySymbol)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Allowances:</span>
                                      <span className="font-mono font-bold text-slate-800">{formatCurrency(allowances, settings.currencySymbol)}</span>
                                    </div>
                                    {bonus > 0 && (
                                      <div className="flex justify-between text-emerald-600">
                                        <span>Bonus / Incentive:</span>
                                        <span className="font-mono font-bold">{formatCurrency(bonus, settings.currencySymbol)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase block border-b border-slate-200 pb-1 mb-1">
                                    Statutory Deductions
                                  </span>
                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Taxes &amp; Deductions:</span>
                                      <span className="font-mono font-bold text-slate-800">{formatCurrency(deductions, settings.currencySymbol)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Leave Deductions:</span>
                                      <span className="font-mono font-bold text-slate-800">{formatCurrency(0, settings.currencySymbol)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Net Salary Highlight */}
                              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between font-bold text-xs my-1">
                                <span className="text-emerald-900 uppercase">Net Salary Disbursed:</span>
                                <span className="font-mono text-emerald-700 text-sm">{formatCurrency(net, settings.currencySymbol)}</span>
                              </div>

                              {/* Footer & Signature */}
                              <div className="flex items-end justify-between pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                                <div>
                                  <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Verified Institutional Salary Record</span>
                                  </div>
                                  <p className="text-slate-400 text-[9px] mt-0.5">
                                    Ref: {paySlip.paymentRef || 'SYS-' + paySlip.staff.employeeCode}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <div className="w-28 border-b border-slate-400 mb-1 inline-block" />
                                  <p className="font-semibold text-slate-700 text-[9px]">Authorized Finance Bursar</p>
                                </div>
                              </div>
                            </div>

                            {/* Middle Cutting Line */}
                            {layoutMode === '2-per-page' && isTopSlot && pageItems.length > 1 && (
                              <div className="my-3 py-1 flex items-center justify-center gap-2 border-t border-dashed border-slate-400 text-slate-500 text-[10px] font-mono">
                                <Scissors className="w-3.5 h-3.5" />
                                <span>- - - - - - - - - - - - - - - Cut Along Dashed Line - - - - - - - - - - - - - - -</span>
                                <Scissors className="w-3.5 h-3.5 rotate-180" />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      }
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Dialog Bar (Hidden in Print) */}
          <div className="no-print-in-dialog flex-none px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
            <span>
              Standard A4 Size (210 × 297 mm) • Compatible with all thermal and standard office laser printers
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Dialog for WhatsApp / Email */}
      <ShareModal
        isOpen={shareModalState.isOpen}
        onClose={() => setShareModalState({ isOpen: false, mode: 'whatsapp' })}
        shareMode={shareModalState.mode}
        documentType={documentType}
        items={shareRecipientItems}
        settings={settings}
      />

      {/* Dedicated Print Studio Modal */}
      <DedicatedPrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        initialDocumentType={documentType === 'fee_voucher' ? 'fee_receipt' : 'payroll_slip'}
        initialReceipt={vouchers[0] || null}
        initialPaySlip={paySlips[0] || null}
        allReceipts={vouchers}
        allPaySlips={paySlips}
        settings={settings}
        studentsMap={studentsMap}
      />
    </>
  );
};
