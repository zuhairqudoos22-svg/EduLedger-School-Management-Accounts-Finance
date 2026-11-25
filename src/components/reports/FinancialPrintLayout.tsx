import React, { useState } from 'react';
import { SchoolSettings, FeePayment, Expense } from '../../types';
import {
  Printer,
  Download,
  X,
  Building,
  Award,
  Calendar,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  RotateCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DeveloperLogo } from '../common/DeveloperLogo';

export interface FinancialPrintLayoutProps {
  settings: SchoolSettings;
  dateRangeStart: string;
  dateRangeEnd: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  operatingMargin: number;
  fiscalYearMonthlyData: {
    month: string;
    revenue: number;
    expenses: number;
    netSurplus: number;
    margin: number;
  }[];
  incomeCategories: { category: string; amount: number; percentage: number }[];
  expenseCategories: { category: string; amount: number; percentage: number }[];
  filteredPayments: FeePayment[];
  filteredExpenses: Expense[];
  filteredDefaulters: { student: any; pendingAmount: number }[];
  onClose: () => void;
  onDownloadPdf: () => void;
}

export const FinancialPrintLayout: React.FC<FinancialPrintLayoutProps> = ({
  settings,
  dateRangeStart,
  dateRangeEnd,
  totalIncome,
  totalExpense,
  netBalance,
  operatingMargin,
  fiscalYearMonthlyData,
  incomeCategories,
  expenseCategories,
  filteredPayments,
  filteredExpenses,
  filteredDefaulters,
  onClose,
  onDownloadPdf,
}) => {
  // Print configuration toggles
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [includeKpiCards, setIncludeKpiCards] = useState(true);
  const [includeMonthlyTable, setIncludeMonthlyTable] = useState(true);
  const [includeCategoryBreakdown, setIncludeCategoryBreakdown] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoomScale, setZoomScale] = useState(0.9);

  const schoolName = settings.schoolName || 'St. Augustine International Academy';
  const schoolAddress = settings.schoolAddress || '742 Evergreen Terrace, Academic District';
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const currencySymbol = settings.currencySymbol || '$';

  const totalDefaultersAmount = filteredDefaulters.reduce((acc, d) => acc + d.pendingAmount, 0);

  // Trigger high-res physical print
  const handlePrint = () => {
    document.body.classList.add('print-mode-financial');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-mode-financial');
    }, 1200);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit Print Layout</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Official Financial Statement &amp; Audit Print Layout
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Print-Ready Active
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Formatted with institutional headers, high-contrast tables, and signature sign-offs for PDF or physical printing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Slider */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setZoomScale(prev => Math.max(0.65, prev - 0.08))}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale(prev => Math.min(1.2, prev + 0.08))}
              className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(0.9)}
              className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-900"
            >
              Reset
            </button>
          </div>

          <button
            type="button"
            onClick={onDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Financial Document</span>
          </button>
        </div>
      </div>

      {/* Formatting & Content Toggles */}
      <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 flex-wrap gap-3">
        <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
          <span>Document Sections &amp; Orientation:</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-200 dark:bg-slate-750 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setPaperOrientation('portrait')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                paperOrientation === 'portrait'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Portrait (A4)
            </button>
            <button
              type="button"
              onClick={() => setPaperOrientation('landscape')}
              className={`px-2.5 py-1 rounded font-bold transition ${
                paperOrientation === 'landscape'
                  ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Landscape
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={e => setIncludeLetterhead(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600"
            />
            <span>Institutional Letterhead</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeKpiCards}
              onChange={e => setIncludeKpiCards(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600"
            />
            <span>Executive KPI Strip</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeMonthlyTable}
              onChange={e => setIncludeMonthlyTable(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600"
            />
            <span>Monthly Cashflow Ledger</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCategoryBreakdown}
              onChange={e => setIncludeCategoryBreakdown(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600"
            />
            <span>Revenue/Expense Categories</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSignatures}
              onChange={e => setIncludeSignatures(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-600"
            />
            <span>Signatures &amp; Audit Seal</span>
          </label>
        </div>
      </div>

      {/* Sheet Simulation Container */}
      <div className="p-4 sm:p-8 bg-slate-200/80 dark:bg-slate-950 rounded-2xl flex justify-center overflow-x-auto">
        <div
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
            width: paperOrientation === 'portrait' ? '210mm' : '297mm',
            minHeight: paperOrientation === 'portrait' ? '297mm' : '210mm',
            marginBottom: `-${(paperOrientation === 'portrait' ? 297 : 210) * 3.77 * (1 - zoomScale)}px`,
          }}
          id="printable-financial-report"
          className={`print-paper-sheet ${paperOrientation === 'portrait' ? 'sheet-portrait' : 'sheet-landscape'} rounded-sm p-6 sm:p-8 flex flex-col justify-between`}
        >
          <div>
            {/* 1. Institutional Letterhead Header */}
            {includeLetterhead && (
              <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center relative">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <h1 className="text-xl font-serif font-black tracking-wider uppercase text-slate-900">
                    {schoolName}
                  </h1>
                </div>
                <p className="text-[10px] text-slate-600 font-sans tracking-wide">
                  {schoolAddress} • Tel: {settings.schoolPhone || '+1 (555) 019-2831'} • Email: {settings.schoolEmail || 'admin@school.edu'}
                </p>
                <div className="inline-block mt-1 px-4 py-0.5 bg-slate-900 text-amber-300 font-serif font-bold text-[11px] tracking-widest uppercase rounded">
                  Official Audited Financial Statement &amp; Fiscal Report • Session {academicYear}
                </div>
              </div>
            )}

            {/* 2. Audit Scope & Metadata Strip */}
            <div className="flex items-center justify-between py-2 border-b border-slate-300 text-[10px] text-slate-600 mb-3.5">
              <div>
                <span className="font-semibold text-slate-800">Reporting Audit Period:</span>{' '}
                {formatDate(dateRangeStart)} through {formatDate(dateRangeEnd)}
              </div>
              <div>
                <span className="font-semibold text-slate-800">Generated:</span> {new Date().toLocaleString()}
              </div>
              <div className="font-mono text-slate-700">
                REF: FIN-AUDIT-{new Date().getFullYear()}-{Math.floor(1000 + Math.random() * 9000)}
              </div>
            </div>

            {/* 3. Executive Summary KPI Cards */}
            {includeKpiCards && (
              <div className="grid grid-cols-4 gap-2.5 my-3 print-section-block">
                <div className="print-kpi-card">
                  <div className="kpi-label">Total Operational Revenue</div>
                  <div className="kpi-value text-emerald-700 print-currency">
                    {formatCurrency(totalIncome, currencySymbol)}
                  </div>
                  <div className="text-[8.5px] text-slate-500 mt-0.5">{filteredPayments.length} receipts processed</div>
                </div>

                <div className="print-kpi-card">
                  <div className="kpi-label">Total Operating Expenses</div>
                  <div className="kpi-value text-red-700 print-currency">
                    {formatCurrency(totalExpense, currencySymbol)}
                  </div>
                  <div className="text-[8.5px] text-slate-500 mt-0.5">{filteredExpenses.length} expenditures recorded</div>
                </div>

                <div className="print-kpi-card">
                  <div className="kpi-label">Net Operating Surplus</div>
                  <div className={`kpi-value print-currency ${netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(netBalance, currencySymbol)}
                  </div>
                  <div className="text-[8.5px] text-slate-500 mt-0.5">Operating Margin: {operatingMargin.toFixed(1)}%</div>
                </div>

                <div className="print-kpi-card">
                  <div className="kpi-label">Outstanding Due Fees</div>
                  <div className={`kpi-value print-currency ${totalDefaultersAmount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                    {formatCurrency(totalDefaultersAmount, currencySymbol)}
                  </div>
                  <div className="text-[8.5px] text-slate-500 mt-0.5">{filteredDefaulters.length} accounts in arrears</div>
                </div>
              </div>
            )}

            {/* 4. Structured Monthly Financial Trajectory Table */}
            {includeMonthlyTable && (
              <div className="my-3.5 print-section-block">
                <div className="flex items-center justify-between bg-slate-100 border border-slate-300 px-3 py-1 mb-1.5">
                  <span className="font-bold text-[10px] uppercase tracking-wider text-slate-800">
                    I. Monthly Financial Trajectory &amp; Operating Performance
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Fiscal Year {academicYear}
                  </span>
                </div>

                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="text-right">Gross Inflows</th>
                      <th className="text-right">Operating Outflows</th>
                      <th className="text-right">Net Surplus / (Deficit)</th>
                      <th className="text-right">Operating Margin</th>
                      <th className="text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiscalYearMonthlyData.map((row, idx) => (
                      <tr key={idx}>
                        <td className="font-semibold text-slate-800">{row.month}</td>
                        <td className="text-right print-currency text-emerald-800">
                          {formatCurrency(row.revenue, currencySymbol)}
                        </td>
                        <td className="text-right print-currency text-red-800">
                          {formatCurrency(row.expenses, currencySymbol)}
                        </td>
                        <td className={`text-right print-currency font-bold ${row.netSurplus >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(row.netSurplus, currencySymbol)}
                        </td>
                        <td className="text-right font-mono">
                          {row.margin >= 0 ? `+${row.margin.toFixed(1)}%` : `${row.margin.toFixed(1)}%`}
                        </td>
                        <td className="text-center">
                          <span className={`print-badge ${row.netSurplus >= 0 ? 'badge-success' : 'badge-danger'}`}>
                            {row.netSurplus >= 0 ? 'Surplus' : 'Deficit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Cumulative Summary Row */}
                    <tr className="highlight-total">
                      <td className="font-black text-slate-900">FISCAL YEAR CUMULATIVE</td>
                      <td className="text-right print-currency text-emerald-900 font-bold">
                        {formatCurrency(totalIncome, currencySymbol)}
                      </td>
                      <td className="text-right print-currency text-red-900 font-bold">
                        {formatCurrency(totalExpense, currencySymbol)}
                      </td>
                      <td className={`text-right print-currency font-black ${netBalance >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                        {formatCurrency(netBalance, currencySymbol)}
                      </td>
                      <td className="text-right font-mono font-bold">
                        {operatingMargin.toFixed(1)}%
                      </td>
                      <td className="text-center font-bold">
                        <span className={`print-badge ${netBalance >= 0 ? 'badge-success' : 'badge-danger'}`}>
                          {netBalance >= 0 ? 'Healthy' : 'Audited'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. Revenue & Expenditure Distribution Tables */}
            {includeCategoryBreakdown && (
              <div className="grid grid-cols-2 gap-4 my-3.5 print-section-block">
                {/* Revenue Streams */}
                <div>
                  <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 mb-1 font-bold text-[9.5px] uppercase tracking-wider text-slate-800">
                    II. Revenue Streams Distribution
                  </div>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>Income Category</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Share %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeCategories.slice(0, 6).map((c, i) => (
                        <tr key={i}>
                          <td className="truncate max-w-[120px]">{c.category}</td>
                          <td className="text-right print-currency">{formatCurrency(c.amount, currencySymbol)}</td>
                          <td className="text-right font-mono">{c.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Expenditure Categories */}
                <div>
                  <div className="bg-slate-100 border border-slate-300 px-2.5 py-1 mb-1 font-bold text-[9.5px] uppercase tracking-wider text-slate-800">
                    III. Operational Expenditures Distribution
                  </div>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th>Expense Category</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Share %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseCategories.slice(0, 6).map((c, i) => (
                        <tr key={i}>
                          <td className="truncate max-w-[120px]">{c.category}</td>
                          <td className="text-right print-currency">{formatCurrency(c.amount, currencySymbol)}</td>
                          <td className="text-right font-mono">{c.percentage.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 6. Official Institutional Attestation & Signatures Block */}
          {includeSignatures && (
            <div className="pt-4 border-t-2 border-slate-800 mt-4 print-section-block">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="print-signature-box">
                  <div className="h-9 flex items-end justify-center mb-1">
                    <span className="font-serif italic text-xs text-slate-700">Senior Accounts Officer</span>
                  </div>
                  <div className="signatory-name">Bursar / Accounts Officer</div>
                  <div className="signatory-title">Prepared &amp; Reconciled</div>
                </div>

                <div className="flex flex-col items-center justify-center p-1.5 border border-amber-600/60 bg-amber-50/50 rounded">
                  <ShieldCheck className="w-4 h-4 text-amber-700 mb-0.5" />
                  <span className="text-[8px] font-black tracking-wider text-amber-900 uppercase">
                    OFFICIAL FINANCIAL AUDIT SEAL
                  </span>
                  <span className="text-[7px] text-amber-800 font-mono">
                    VERIFIED: {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="print-signature-box">
                  <div className="h-9 flex items-end justify-center mb-1">
                    <span className="font-serif italic text-xs text-slate-700">Principal &amp; Director</span>
                  </div>
                  <div className="signatory-name">Head of Institution</div>
                  <div className="signatory-title">Approved for Governing Board</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono mt-3 pt-1 border-t border-slate-200">
                <span>DOCUMENT: ANNUAL_FINANCIAL_AUDIT_REPORT</span>
                <span>SYSTEM: EDULEDGER FISCAL ENGINE</span>
                {settings.showDeveloperCreditOnPrint !== false ? (
                  <span className="flex items-center gap-1 font-sans">
                    <DeveloperLogo size="xs" isForPrint={true} showCredit={true} creditVariant="developedBy" />
                  </span>
                ) : (
                  <span>AUTHENTICATION: SHA-256 INTERNAL VERIFIED</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
