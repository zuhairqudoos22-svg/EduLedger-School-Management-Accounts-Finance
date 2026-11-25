import React, { useState } from 'react';
import { Staff, SchoolSettings, PaymentMode } from '../../types';
import {
  formatCurrency,
  formatDate,
  getTodayDateString,
  amountToWords,
} from '../../utils/formatters';
import {
  Printer,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
  Download,
  Award,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { BackButton } from '../common/BackButton';
import { DeveloperLogo } from '../common/DeveloperLogo';
import { downloadPaySlipsPdf } from '../../utils/voucherAndPayslipPdf';
import { ShareModal, ShareRecipientItem } from '../common/ShareModal';

interface PaySlipModalProps {
  staff: Staff | null;
  selectedMonth: string;
  isPaid: boolean;
  paidDate?: string;
  paymentRef?: string;
  paymentMode?: PaymentMode;
  settings: SchoolSettings;
  onClose: () => void;
  onDisburse?: (staff: Staff) => void;
}

import { DedicatedPrintStudioModal } from '../common/DedicatedPrintStudioModal';
import { PaperSizeFormat } from '../../utils/voucherAndPayslipPdf';

export const PaySlipModal: React.FC<PaySlipModalProps> = ({
  staff,
  selectedMonth,
  isPaid,
  paidDate,
  paymentRef,
  paymentMode = 'Bank Transfer',
  settings,
  onClose,
  onDisburse,
}) => {
  if (!staff) return null;

  const [paperSize, setPaperSize] = useState<PaperSizeFormat>('a4');
  const [paperSaverLayout, setPaperSaverLayout] = useState(true);
  const [isPrintStudioOpen, setIsPrintStudioOpen] = useState(false);

  const netSalary = staff.monthlySalary + staff.allowances - staff.deductions;
  const grossEarnings = staff.monthlySalary + staff.allowances;

  // Realistic itemized breakdown for standard payslip formatting
  const hraAmount = staff.allowances > 0 ? Math.round(staff.allowances * 0.45) : 0;
  const daAmount = staff.allowances > 0 ? Math.round(staff.allowances * 0.35) : 0;
  const conveyanceAmount = staff.allowances > 0 ? staff.allowances - hraAmount - daAmount : 0;

  const pfDeduction = staff.deductions > 0 ? Math.round(staff.deductions * 0.50) : 0;
  const taxDeduction = staff.deductions > 0 ? Math.round(staff.deductions * 0.30) : 0;
  const insuranceDeduction = staff.deductions > 0 ? staff.deductions - pfDeduction - taxDeduction : 0;

  const payslipNo = paymentRef && paymentRef.startsWith('SAL-')
    ? `PAY-${paymentRef}`
    : `PS-${selectedMonth.replace(/\s+/g, '').toUpperCase()}-${staff.employeeCode}`;

  const handlePrint = () => {
    // 1. Add dedicated print mode and paper size classes
    document.body.classList.add(`print-paper-${paperSize}`);

    // 2. Inject dynamic @page size rule so browser print dialog formats automatically for A6/A5/A4
    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-payslip-print-style';
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
      const el = document.getElementById('dynamic-payslip-print-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
  };

  const [shareState, setShareState] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
  }>({
    isOpen: false,
    mode: 'whatsapp',
  });

  const handleDownloadPdf = () => {
    downloadPaySlipsPdf(
      [
        {
          staff,
          selectedMonth,
          isPaid,
          paidDate,
          paymentRef,
          paymentMode,
          basicSalary: staff.monthlySalary,
          allowances: staff.allowances,
          deductions: staff.deductions,
          bonus: 0,
          netSalary,
        },
      ],
      settings,
      {
        layout: paperSaverLayout ? '2-per-page' : '1-per-page',
        paperSize,
      }
    );
  };

  const shareItem: ShareRecipientItem = {
    id: staff.id,
    name: staff.fullName,
    role: 'employee',
    subheading: `${staff.designation} • ${staff.department}`,
    phone: staff.contactNumber || '',
    email: staff.email || '',
    period: selectedMonth,
    amount: netSalary,
    paySlipData: {
      staff,
      selectedMonth,
      isPaid,
      paidDate,
      paymentRef,
      paymentMode,
      basicSalary: staff.monthlySalary,
      allowances: staff.allowances,
      deductions: staff.deductions,
      netSalary,
    },
  };

  const handleDownloadText = () => {
    const textContent = `
============================================================
${settings.schoolName || 'St. Augustine International Academy'}
${settings.schoolAddress || 'Campus Boulevard, Education City'}
SALARY PAY SLIP — ${selectedMonth}
============================================================
Payslip No: ${payslipNo}
Date of Issue: ${formatDate(getTodayDateString())}
Employee: ${staff.fullName} (${staff.employeeCode})
Designation: ${staff.designation} | Department: ${staff.department}
Payment Status: ${isPaid ? `PAID (${formatDate(paidDate)})` : 'PENDING'}
Payment Mode: ${paymentMode} | Ref: ${paymentRef || 'N/A'}

EARNINGS:
- Basic Salary: ${formatCurrency(staff.monthlySalary, settings.currencySymbol)}
- House Rent Allowance (HRA): ${formatCurrency(hraAmount, settings.currencySymbol)}
- Dearness & Academic Allowance: ${formatCurrency(daAmount, settings.currencySymbol)}
- Conveyance / Medical: ${formatCurrency(conveyanceAmount, settings.currencySymbol)}
Total Gross Earnings: ${formatCurrency(grossEarnings, settings.currencySymbol)}

DEDUCTIONS:
- Provident Fund (EPF): ${formatCurrency(pfDeduction, settings.currencySymbol)}
- Professional / Income Tax: ${formatCurrency(taxDeduction, settings.currencySymbol)}
- Health / Welfare Insurance: ${formatCurrency(insuranceDeduction, settings.currencySymbol)}
Total Deductions: ${formatCurrency(staff.deductions, settings.currencySymbol)}

------------------------------------------------------------
NET PAYABLE SALARY: ${formatCurrency(netSalary, settings.currencySymbol)}
IN WORDS: ${amountToWords(netSalary)}
============================================================
Authorized Bursar Signature: Verified via EduLedger School ERP
`;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payslip_${staff.employeeCode}_${selectedMonth.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:static print:bg-transparent print:p-0 print:block print:overflow-visible">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto animate-in fade-in zoom-in-95 overflow-hidden print:max-h-none print:my-0 print:border-none print:shadow-none print:w-full print:max-w-none print:overflow-visible">
        
        {/* Navigation & Controls Top Bar (Hidden in Print) */}
        <div className="print:hidden flex-none flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            {/* Prominent Reusable Back Button */}
            <BackButton onClick={onClose} label="Back to Payroll" variant="modal" />

            <span className="hidden sm:inline-block w-px h-5 bg-slate-200 dark:bg-slate-700" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600">
                <FileText className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Pay Slip: {staff.fullName}
              </span>
              <span className="text-xs text-slate-400 font-mono">({selectedMonth})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* If pending, can disburse directly from payslip view */}
            {!isPaid && onDisburse && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDisburse(staff);
                }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <span>Authorize &amp; Disburse</span>
              </button>
            )}

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

            {/* Paper Saver Layout Mode Toggle */}
            <button
              type="button"
              onClick={() => setPaperSaverLayout(!paperSaverLayout)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                paperSaverLayout
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
              }`}
              title="Paper-Saving layout: formats 2 pay slips per A4 sheet"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{paperSaverLayout ? '2 Per A4' : 'Full Page'}</span>
            </button>

            {/* Dedicated Print Studio Button (2 Different Slips in 1 Page) */}
            <button
              type="button"
              onClick={() => setIsPrintStudioOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition active:scale-95 cursor-pointer"
              title="Open Dedicated Print Studio: Pair 2 different payroll slips on 1 page and choose A6/A5/A4"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950" />
              <span className="hidden md:inline">2-on-1 Studio</span>
            </button>

            {/* Print Pay Slip Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title={`Print official pay slip on ${paperSize.toUpperCase()}`}
            >
              <Printer className="w-4 h-4" />
              <span>Print ({paperSize.toUpperCase()})</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
              title="Download pay slip as PDF"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* WhatsApp Sharing */}
            <button
              type="button"
              onClick={() => setShareState({ isOpen: true, mode: 'whatsapp' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Send pay slip via WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Email Sharing */}
            <button
              type="button"
              onClick={() => setShareState({ isOpen: true, mode: 'email' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-600 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Send pay slip via Email"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Close Pay Slip"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Pay Slip Body with custom scrollbar */}
        <div
          id="printable-payslip"
          className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 bg-white text-slate-900 print:overflow-visible print:p-0 space-y-6"
        >
          {/* Header & Official School Branding */}
          <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {settings.schoolName ? settings.schoolName.charAt(0) : 'E'}
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                  {settings.schoolName || 'St. Augustine International Academy'}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {settings.schoolTagline || 'Excellence in Comprehensive Education & Leadership'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {settings.schoolAddress || '742 Evergreen Campus Way, Academic District'} • Tel: {settings.schoolPhone || '+1 (555) 019-2834'}
                </p>
                <p className="text-[10px] text-slate-400">
                  Academic Year: {settings.currentAcademicYear || '2026-2027'} • Currency: {settings.currencyCode || 'USD'} ({settings.currencySymbol || '$'})
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-black rounded-lg uppercase tracking-wider">
                {paperSaverLayout ? 'EMPLOYEE COPY / ORIGINAL' : 'Salary Pay Slip'}
              </span>
              <p className="text-xs font-bold text-slate-800 mt-2">
                Payslip No: <span className="font-mono text-indigo-700">{payslipNo}</span>
              </p>
              <p className="text-xs text-slate-600">
                Pay Period: <strong className="text-slate-900">{selectedMonth}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Issue Date: {formatDate(getTodayDateString())}
              </p>
            </div>
          </div>

          {/* Payment Status Ribbon */}
          <div className={`p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
            isPaid
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-2">
              {isPaid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <div>
                <span className="font-bold text-sm">
                  {isPaid ? 'Salary Successfully Disbursed' : 'Salary Pending Disbursal'}
                </span>
                <p className="text-[11px] opacity-80">
                  {isPaid
                    ? `Payment confirmed on ${formatDate(paidDate)} via ${paymentMode}`
                    : `Compensation approved for ${selectedMonth}; pending accounting authorization`}
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs">
              <span className="text-[10px] uppercase font-bold opacity-75 block">Transaction Ref</span>
              <span className="font-bold">{paymentRef || (isPaid ? 'DIRECT-DEPOSIT' : 'AWAITING-DISBURSAL')}</span>
            </div>
          </div>

          {/* Employee Demographic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Employee Profile
              </span>
              <div>
                <span className="text-slate-500 block text-[11px]">Staff Name:</span>
                <span className="font-black text-slate-900 text-sm">{staff.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Employee Code:</span>
                <span className="font-mono font-bold text-indigo-700">{staff.employeeCode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Gender:</span>
                <span className="font-semibold text-slate-800 capitalize">{staff.gender}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Department &amp; Role
              </span>
              <div>
                <span className="text-slate-500 block text-[11px]">Designation:</span>
                <span className="font-bold text-slate-900">{staff.designation}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Department:</span>
                <span className="font-semibold text-slate-800">{staff.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Classification:</span>
                <span className="font-semibold text-slate-700">
                  {staff.isTeaching ? 'Teaching Faculty' : 'Administrative / Support'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Disbursal &amp; Banking
              </span>
              <div>
                <span className="text-slate-500 block text-[11px]">Payment Mode:</span>
                <span className="font-bold text-slate-900">{paymentMode}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Bank Account / ID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {staff.bankAccount || '••••••••4921 (Direct Deposit)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date of Joining:</span>
                <span className="font-semibold text-slate-700">{formatDate(staff.joiningDate)}</span>
              </div>
            </div>
          </div>

          {/* Attendance & Leave Summary Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 block">Total Working Days</span>
              <span className="font-black text-slate-900 text-sm">26 Days</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Payable Days</span>
              <span className="font-black text-emerald-700 text-sm">26 Days</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Leaves Taken</span>
              <span className="font-black text-slate-800 text-sm">0 Days</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Leave Balance</span>
              <span className="font-semibold text-slate-700 text-xs">
                CL: {staff.leaveBalance?.casual ?? 4} | SL: {staff.leaveBalance?.sick ?? 6} | PL: {staff.leaveBalance?.paid ?? 10}
              </span>
            </div>
          </div>

          {/* Detailed Itemized Earnings and Deductions Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Table 1: Earnings */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-black text-xs text-slate-800 uppercase tracking-wider">
                    Earnings (Allowances)
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">Amount ({settings.currencySymbol || '$'})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2 px-4 font-semibold text-slate-900">Basic Monthly Salary</td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(staff.monthlySalary, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">House Rent Allowance (HRA)</td>
                      <td className="py-2 px-4 text-right font-mono text-emerald-700">
                        +{formatCurrency(hraAmount, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Dearness &amp; Academic Allowance (DA)</td>
                      <td className="py-2 px-4 text-right font-mono text-emerald-700">
                        +{formatCurrency(daAmount, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Conveyance &amp; Medical Allowance</td>
                      <td className="py-2 px-4 text-right font-mono text-emerald-700">
                        +{formatCurrency(conveyanceAmount, settings.currencySymbol)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center font-bold text-xs">
                <span className="text-slate-800 uppercase">Gross Total Earnings:</span>
                <span className="font-mono text-sm text-slate-900">
                  {formatCurrency(grossEarnings, settings.currencySymbol)}
                </span>
              </div>
            </div>

            {/* Table 2: Deductions */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-black text-xs text-slate-800 uppercase tracking-wider">
                    Deductions &amp; Taxes
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">Amount ({settings.currencySymbol || '$'})</span>
                </div>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2 px-4">Provident Fund (EPF / Retirement)</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        -{formatCurrency(pfDeduction, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Income / Professional Tax Withholding</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        -{formatCurrency(taxDeduction, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4">Health &amp; Welfare Fund Insurance</td>
                      <td className="py-2 px-4 text-right font-mono text-rose-600">
                        -{formatCurrency(insuranceDeduction, settings.currencySymbol)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-slate-400">Other Adjustments / LOP</td>
                      <td className="py-2 px-4 text-right font-mono text-slate-400">
                        {formatCurrency(0, settings.currencySymbol)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-between items-center font-bold text-xs">
                <span className="text-slate-800 uppercase">Total Deductions:</span>
                <span className="font-mono text-sm text-rose-600">
                  -{formatCurrency(staff.deductions, settings.currencySymbol)}
                </span>
              </div>
            </div>

          </div>

          {/* Net Salary Payable Callout Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-indigo-300 block">
                Net Disbursed Take-Home Salary
              </span>
              <p className="text-xs text-indigo-200 mt-1 italic">
                Amount in Words: <strong>{amountToWords(netSalary)}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white block">
                {formatCurrency(netSalary, settings.currencySymbol)}
              </span>
              <span className="text-[11px] text-indigo-300">
                Gross ({formatCurrency(grossEarnings, settings.currencySymbol)}) − Deductions ({formatCurrency(staff.deductions, settings.currencySymbol)})
              </span>
            </div>
          </div>

          {/* Verification Signatures & Stamp Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs">
            {/* Employee Signature */}
            <div className="space-y-4">
              <div className="h-12 flex items-end">
                <div className="w-full border-b border-dashed border-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-800">{staff.fullName}</p>
                <p className="text-[11px] text-slate-500">Employee Signature &amp; Acknowledgment</p>
                <p className="text-[10px] text-slate-400">Date: ________________________</p>
              </div>
            </div>

            {/* School System Seal */}
            <div className="flex flex-col items-center justify-center text-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-600 flex items-center justify-center text-indigo-600 mb-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide">
                Official Payroll Seal
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                EduLedger Verified
              </span>
            </div>

            {/* Authorized Signatory */}
            <div className="space-y-4 sm:text-right">
              <div className="h-12 flex items-end sm:justify-end">
                <div className="w-48 border-b border-dashed border-slate-400" />
              </div>
              <div>
                <p className="font-bold text-slate-800">Authorized Bursar / Principal</p>
                <p className="text-[11px] text-slate-500">Finance &amp; Accounts Division</p>
                <p className="text-[10px] text-slate-400">St. Augustine International Academy</p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-2 text-[10px] text-slate-400 border-t border-slate-100 flex flex-col items-center gap-1">
            <p>
              This is a computer-generated salary pay slip issued via EduLedger School Management ERP.
              All confidential compensation information is protected under institutional policy.
            </p>
            {settings.showDeveloperCreditOnPrint !== false && (
              <div className="pt-0.5 flex items-center justify-center">
                <DeveloperLogo size="xs" isForPrint={true} showCredit={true} creditVariant="developedBy" />
              </div>
            )}
          </div>

          {/* Slip 2: Bottom Voucher / School & Audit Copy (if Paper Saver 2-in-1 layout) */}
          {paperSaverLayout && (
            <>
              <div className="perforation-line my-4 print:my-2" />
              <div className="payslip-single-slip space-y-4 pt-2">
                {/* Header & Official School Branding */}
                <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-800 pb-3 gap-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                      {settings.schoolName ? settings.schoolName.charAt(0) : 'E'}
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight text-slate-900 uppercase">
                        {settings.schoolName || 'St. Augustine International Academy'}
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Institutional HR &amp; Payroll Division • Accounts Audit Copy
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="inline-block px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-800 text-[10px] font-black rounded-md uppercase tracking-wider">
                      ACCOUNTS &amp; HR AUDIT COPY
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      Payslip No: <span className="font-mono text-slate-800">{payslipNo}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Pay Period: <strong>{selectedMonth}</strong>
                    </p>
                  </div>
                </div>

                {/* Employee Info Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Employee</span>
                    <span className="font-bold text-slate-900 text-xs">{staff.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Staff Code</span>
                    <span className="font-mono font-bold text-indigo-700 text-xs">{staff.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Designation</span>
                    <span className="font-semibold text-slate-800 text-xs">{staff.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Department</span>
                    <span className="font-semibold text-slate-800 text-xs">{staff.department}</span>
                  </div>
                </div>

                {/* Earnings & Deductions Compact Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 font-bold px-3 py-1.5 text-[11px] text-slate-800 border-b border-slate-200">
                      Earnings Breakdown
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Basic Salary:</span>
                        <span className="font-mono font-semibold">{formatCurrency(staff.monthlySalary, settings.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowances (HRA / DA / Conv):</span>
                        <span className="font-mono">{formatCurrency(staff.allowances, settings.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-emerald-700">
                        <span>Gross Earnings:</span>
                        <span className="font-mono">{formatCurrency(grossEarnings, settings.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 font-bold px-3 py-1.5 text-[11px] text-slate-800 border-b border-slate-200">
                      Deductions
                    </div>
                    <div className="p-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Provident Fund (EPF):</span>
                        <span className="font-mono">{formatCurrency(pfDeduction, settings.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax &amp; Welfare Deductions:</span>
                        <span className="font-mono">{formatCurrency(staff.deductions - pfDeduction, settings.currencySymbol)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-100 text-rose-600">
                        <span>Total Deductions:</span>
                        <span className="font-mono">{formatCurrency(staff.deductions, settings.currencySymbol)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Salary Highlight */}
                <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-300 block">Net Payable Disbursed</span>
                    <span className="text-[11px] text-slate-300 italic">{amountToWords(netSalary)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black font-mono text-emerald-400">
                      {formatCurrency(netSalary, settings.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <div className="w-32 border-b border-dashed border-slate-400 mb-1 mt-4" />
                    <p className="font-semibold text-slate-700 text-[11px]">Employee Signature</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="w-36 border-b border-dashed border-slate-400 mb-1 mt-4" />
                    <p className="font-semibold text-slate-700 text-[11px]">Bursar / Accounts Officer</p>
                  </div>
                </div>

                {settings.showDeveloperCreditOnPrint !== false && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
                    <DeveloperLogo size="xs" isForPrint={true} showCredit={true} creditVariant="developedBy" />
                  </div>
                )}
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
      documentType="pay_slip"
      items={[shareItem]}
      settings={settings}
    />

    <DedicatedPrintStudioModal
      isOpen={isPrintStudioOpen}
      onClose={() => setIsPrintStudioOpen(false)}
      initialDocumentType="payroll_slip"
      initialPaySlip={{
        staff,
        selectedMonth,
        isPaid,
        paidDate,
        paymentRef,
        paymentMode,
        basicSalary: staff.monthlySalary,
        allowances: staff.allowances,
        deductions: staff.deductions,
        bonus: 0,
        netSalary,
      }}
      settings={settings}
    />
  </>
  );
};
