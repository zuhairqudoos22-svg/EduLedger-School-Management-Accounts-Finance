import React, { useState, useEffect } from 'react';
import { FeePayment, SchoolSettings } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Printer,
  X,
  CheckCircle,
  ShieldCheck,
  Download,
  MessageSquare,
  Mail,
  Sparkles,
} from 'lucide-react';
import { BackButton } from './BackButton';
import { DeveloperLogo } from './DeveloperLogo';
import { downloadFeeVouchersPdf } from '../../utils/voucherAndPayslipPdf';
import { ShareModal, ShareRecipientItem } from './ShareModal';

interface ReceiptModalProps {
  receipt: FeePayment | null;
  settings: SchoolSettings;
  onClose: () => void;
}

import { DedicatedPrintStudioModal } from './DedicatedPrintStudioModal';
import { PaperSizeFormat } from '../../utils/voucherAndPayslipPdf';

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, settings, onClose }) => {
  useEffect(() => {
    if (!receipt) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [receipt, onClose]);

  if (!receipt) return null;

  const [shareState, setShareState] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
  }>({
    isOpen: false,
    mode: 'whatsapp',
  });

  const [paperSize, setPaperSize] = useState<PaperSizeFormat>('a4');
  const [paperSaverLayout, setPaperSaverLayout] = useState(true);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);

  const handlePrint = () => {
    // 1. Add dedicated print mode and paper size classes
    document.body.classList.add(`print-paper-${paperSize}`);

    // 2. Inject dynamic @page size rule so browser print dialog formats automatically for A6/A5/A4
    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-receipt-print-style';
    styleEl.innerHTML = `
      @page {
        size: ${paperSize.toUpperCase()} portrait;
        margin: ${paperSize === 'a6' ? '3mm 4mm' : paperSize === 'a5' ? '4mm 5mm' : '6mm 8mm'};
      }
    `;
    document.head.appendChild(styleEl);

    // 3. Trigger Print
    window.print();

    // 4. Cleanup
    const cleanup = () => {
      document.body.classList.remove(`print-paper-${paperSize}`);
      const el = document.getElementById('dynamic-receipt-print-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
  };

  const handleDownloadPdf = () => {
    downloadFeeVouchersPdf([receipt], settings, {}, {
      layout: paperSaverLayout ? '2-per-page' : '1-per-page',
      paperSize,
    });
  };

  const shareItem: ShareRecipientItem = {
    id: receipt.id,
    name: receipt.studentName,
    role: 'student',
    subheading: `${receipt.className} — Section ${receipt.section}`,
    phone: '',
    email: '',
    period: receipt.monthFor || 'Current Term',
    amount: receipt.totalAmount,
    voucherData: receipt,
  };

  return (
    <>
      <div
        onClick={e => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:static print:bg-transparent print:p-0 print:block print:overflow-visible"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto animate-in fade-in zoom-in-95 overflow-hidden print:max-h-none print:my-0 print:border-none print:shadow-none print:w-full print:max-w-none print:overflow-visible"
        >
          {/* Modal Controls (Hidden in Print) */}
          <div className="print:hidden flex-none flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <BackButton onClick={onClose} label="Back" variant="modal" />
              <div className="hidden sm:flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                  Official Voucher
                </span>
                <span className="text-xs text-slate-500 font-mono">#{receipt.receiptNumber}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Paper Size Selector (A4, A5, A6) */}
              <div className="flex items-center bg-slate-200 dark:bg-slate-800 rounded-xl p-0.5 text-xs">
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
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={`Format print template for ${size.toUpperCase()} paper`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Layout Mode Pill */}
              <button
                type="button"
                onClick={() => setPaperSaverLayout(!paperSaverLayout)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                  paperSaverLayout
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
                title="Paper-Saving layout: formats 2 vouchers per A4 sheet"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{paperSaverLayout ? '2 Per A4' : 'Full Page'}</span>
              </button>

              {/* Dedicated Print Studio Button (2 Different Slips in 1 Page) */}
              <button
                type="button"
                onClick={() => setIsPrintStudioOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-95 cursor-pointer"
                title="Open Dedicated Print Studio: Pair 2 different receipts on 1 page and choose A6/A5/A4"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden md:inline">2-on-1 Studio</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                title={`Print voucher on ${paperSize.toUpperCase()}`}
              >
                <Printer className="w-4 h-4" />
                <span>Print ({paperSize.toUpperCase()})</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                title="Download voucher PDF"
              >
                <Download className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShareState({ isOpen: true, mode: 'whatsapp' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                title="Send fee voucher via WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setShareState({ isOpen: true, mode: 'email' })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white shadow-xs transition active:scale-95 cursor-pointer"
                title="Send fee voucher via Email"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="Close Voucher"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

        {/* Printable Receipt Body with sleek custom scrollbar */}
        <div
          id="printable-receipt"
          className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-7 bg-white text-slate-900 print:overflow-visible print:p-0 space-y-4"
        >
          {/* Slip 1: Top Voucher / Student Copy */}
          <div className="receipt-single-slip">
            {/* Header & Logo */}
            <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-base">
                    EL
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                      {settings.schoolName || 'St. Augustine International Academy'}
                    </h1>
                    <p className="text-[11px] text-slate-500">{settings.schoolTagline}</p>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 mt-1 max-w-sm">
                  {settings.schoolAddress} • Tel: {settings.schoolPhone}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">
                  {paperSaverLayout ? 'STUDENT COPY / ORIGINAL' : 'FEE RECEIPT'}
                </span>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  Receipt No: <span className="font-mono text-indigo-600">#{receipt.receiptNumber}</span>
                </p>
                <p className="text-[11px] text-slate-500">Date: {formatDate(receipt.date)}</p>
                <p className="text-[11px] text-slate-500">Academic Year: {settings.currentAcademicYear}</p>
              </div>
            </div>

            {/* Student Info Box */}
            <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <p className="text-slate-500 text-[10px]">Student Name</p>
                <p className="font-bold text-slate-900 text-xs">{receipt.studentName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Class &amp; Section</p>
                <p className="font-bold text-slate-900 text-xs">
                  {receipt.className} — Sec {receipt.section}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Fee Period</p>
                <p className="font-bold text-slate-900 text-xs">{receipt.monthFor || 'Current Term'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px]">Payment Mode</p>
                <p className="font-bold text-slate-900 text-xs">
                  {receipt.paymentMode}{' '}
                  {receipt.transactionRef && (
                    <span className="font-mono font-normal text-slate-600">({receipt.transactionRef})</span>
                  )}
                </p>
              </div>
            </div>

            {/* Itemized Fee Breakdown Table */}
            <div className="mb-4">
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-1.5 px-3">#</th>
                    <th className="py-1.5 px-3">Fee Head / Description</th>
                    <th className="py-1.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px]">
                  {receipt.feeBreakdown && receipt.feeBreakdown.length > 0 ? (
                    receipt.feeBreakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 text-slate-500 w-8">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-medium">{item.headName}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold">
                          {formatCurrency(item.amount, settings.currencySymbol)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-1.5 px-3 text-slate-500 w-8">1</td>
                      <td className="py-1.5 px-3 font-medium">Consolidated Tuition &amp; School Fees</td>
                      <td className="py-1.5 px-3 text-right font-mono font-semibold">
                        {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-indigo-50/50 border-t-2 border-indigo-600 text-xs">
                  {receipt.discount_amount && receipt.discount_amount > 0 ? (
                    <>
                      <tr>
                        <td colSpan={2} className="py-1.5 px-3 text-right text-slate-600 font-medium">
                          Total Gross Fee:
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {formatCurrency(receipt.gross_fee ?? (receipt.totalAmount + receipt.discount_amount), settings.currencySymbol)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="py-1.5 px-3 text-right text-amber-700 font-medium">
                          Fee Concession / Discount ({receipt.discount_reason || 'Institutional'}):
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-700">
                          - {formatCurrency(receipt.discount_amount, settings.currencySymbol)}
                        </td>
                      </tr>
                      {receipt.net_fee !== undefined && (
                        <tr>
                          <td colSpan={2} className="py-1.5 px-3 text-right text-slate-800 font-bold">
                            Net Payable Fee:
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(receipt.net_fee, settings.currencySymbol)}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : null}
                  <tr className="border-t border-indigo-200">
                    <td colSpan={2} className="py-2 px-3 text-right text-slate-900 font-bold">
                      Total Amount Paid:
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-sm text-indigo-700 font-black">
                      {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Discount Savings Highlight Banner */}
            {receipt.discount_amount && receipt.discount_amount > 0 ? (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <span>🌟 Concession Applied:</span>
                  <span className="font-bold">{receipt.discount_reason || 'Approved Concession'}</span>
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  You saved {formatCurrency(receipt.discount_amount, settings.currencySymbol)}
                </span>
              </div>
            ) : null}

            {/* Remarks and Status */}
            {receipt.remarks && (
              <p className="text-[11px] text-slate-500 mb-4 italic">
                <strong>Notes/Remarks:</strong> {receipt.remarks}
              </p>
            )}

            {/* Signatures & Stamp */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold mb-0.5 text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Verified System Record</span>
                </div>
                <p className="text-slate-500 text-[10px]">Collected by: {receipt.collectedBy || 'Accounts Department'}</p>
                <p className="text-slate-400 text-[9px]">
                  Computer-generated receipt via EduLedger PWA offline database.
                </p>
                {settings.showDeveloperCreditOnPrint !== false && (
                  <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[9px] text-slate-400">
                    <DeveloperLogo size="xs" isForPrint={true} showCredit={true} creditVariant="developedBy" />
                  </div>
                )}
              </div>
              <div className="text-right flex flex-col items-end">
                <div className="w-28 border-b border-slate-400 mb-1 mt-2" />
                <p className="font-semibold text-slate-700 text-[11px]">Authorized Bursar Signature</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <ShieldCheck className="w-3 h-3 text-indigo-500" />
                  <span>EduLedger Stamp Verified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slip 2: Bottom Voucher / School Copy (if Paper Saver 2-in-1 layout) */}
          {paperSaverLayout && (
            <>
              <div className="perforation-line my-4 print:my-2" />
              <div className="receipt-single-slip">
                {/* Header & Logo */}
                <div className="flex items-start justify-between border-b-2 border-slate-700 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-base">
                        EL
                      </div>
                      <div>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                          {settings.schoolName || 'St. Augustine International Academy'}
                        </h1>
                        <p className="text-[11px] text-slate-500">{settings.schoolTagline}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1 max-w-sm">
                      Accounts Office &amp; Audit Registry
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-bold rounded uppercase tracking-wider">
                      ACCOUNTS / BURSAR COPY
                    </span>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      Receipt No: <span className="font-mono text-slate-800">#{receipt.receiptNumber}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">Date: {formatDate(receipt.date)}</p>
                    <p className="text-[11px] text-slate-500">Academic Year: {settings.currentAcademicYear}</p>
                  </div>
                </div>

                {/* Student Info Box */}
                <div className="grid grid-cols-2 gap-3 my-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-500 text-[10px]">Student Name</p>
                    <p className="font-bold text-slate-900 text-xs">{receipt.studentName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px]">Class &amp; Section</p>
                    <p className="font-bold text-slate-900 text-xs">
                      {receipt.className} — Sec {receipt.section}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px]">Fee Period</p>
                    <p className="font-bold text-slate-900 text-xs">{receipt.monthFor || 'Current Term'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px]">Payment Mode</p>
                    <p className="font-bold text-slate-900 text-xs">
                      {receipt.paymentMode}{' '}
                      {receipt.transactionRef && (
                        <span className="font-mono font-normal text-slate-600">({receipt.transactionRef})</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Itemized Fee Breakdown Table */}
                <div className="mb-4">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-1.5 px-3">#</th>
                        <th className="py-1.5 px-3">Fee Head / Description</th>
                        <th className="py-1.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px]">
                      {receipt.feeBreakdown && receipt.feeBreakdown.length > 0 ? (
                        receipt.feeBreakdown.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-3 text-slate-500 w-8">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-medium">{item.headName}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold">
                              {formatCurrency(item.amount, settings.currencySymbol)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-1.5 px-3 text-slate-500 w-8">1</td>
                          <td className="py-1.5 px-3 font-medium">Consolidated Tuition &amp; School Fees</td>
                          <td className="py-1.5 px-3 text-right font-mono font-semibold">
                            {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t-2 border-slate-700 text-xs">
                      {receipt.discount_amount && receipt.discount_amount > 0 ? (
                        <>
                          <tr>
                            <td colSpan={2} className="py-1.5 px-3 text-right text-slate-600 font-medium">
                              Total Gross Fee:
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-slate-800">
                              {formatCurrency(receipt.gross_fee ?? (receipt.totalAmount + receipt.discount_amount), settings.currencySymbol)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} className="py-1.5 px-3 text-right text-amber-750 font-medium">
                              Fee Concession / Discount ({receipt.discount_reason || 'Institutional'}):
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold text-amber-700">
                              - {formatCurrency(receipt.discount_amount, settings.currencySymbol)}
                            </td>
                          </tr>
                          {receipt.net_fee !== undefined && (
                            <tr>
                              <td colSpan={2} className="py-1.5 px-3 text-right text-slate-800 font-bold">
                                Net Payable Fee:
                              </td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatCurrency(receipt.net_fee, settings.currencySymbol)}
                              </td>
                            </tr>
                          )}
                        </>
                      ) : null}
                      <tr className="border-t border-slate-300">
                        <td colSpan={2} className="py-2 px-3 text-right text-slate-900 font-bold">
                          Total Amount Paid:
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-slate-900 font-black">
                          {formatCurrency(receipt.totalAmount, settings.currencySymbol)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Discount Savings Highlight Banner (Bursar Copy) */}
                {receipt.discount_amount && receipt.discount_amount > 0 ? (
                  <div className="mb-3 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <span>🏷️ Concession Authorized:</span>
                      <span className="font-bold">{receipt.discount_reason || 'Concession'}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-800">
                      Concession Deducted: {formatCurrency(receipt.discount_amount, settings.currencySymbol)}
                    </span>
                  </div>
                ) : null}

                {/* Signatures & Stamp */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-slate-700 font-bold mb-0.5 text-[11px]">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Accounts Record Copy</span>
                    </div>
                    <p className="text-slate-500 text-[10px]">Collected by: {receipt.collectedBy || 'Accounts Department'}</p>
                    {settings.showDeveloperCreditOnPrint !== false && (
                      <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-1.5 text-[9px] text-slate-400">
                        <DeveloperLogo size="xs" isForPrint={true} showCredit={true} creditVariant="developedBy" />
                      </div>
                    )}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="w-28 border-b border-slate-400 mb-1 mt-2" />
                    <p className="font-semibold text-slate-700 text-[11px]">Cashier / Receiver Stamp</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    <ShareModal
        isOpen={shareState.isOpen}
        onClose={() => setShareState({ isOpen: false, mode: 'whatsapp' })}
        shareMode={shareState.mode}
        documentType="fee_voucher"
        items={[shareItem]}
        settings={settings}
      />

      <DedicatedPrintStudioModal
        isOpen={isPrintStudioOpen}
        onClose={() => setIsPrintStudioOpen(false)}
        initialDocumentType="fee_receipt"
        initialReceipt={receipt}
        settings={settings}
      />
    </>
  );
};
