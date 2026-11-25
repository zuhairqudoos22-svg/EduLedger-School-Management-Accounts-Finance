import React, { useMemo, useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency, formatDate, getTodayDateString } from '../../utils/formatters';
import {
  Receipt,
  ArrowUpRight,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  BadgePercent,
  Plus,
} from 'lucide-react';
import { PaymentMode } from '../../types';

const MODE_BADGE_MAP: Record<PaymentMode, { bg: string; icon: React.ReactNode }> = {
  Cash: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    icon: <Banknote className="w-3 h-3" />,
  },
  'Bank Transfer': {
    bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    icon: <Building2 className="w-3 h-3" />,
  },
  'Online/UPI': {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    icon: <Smartphone className="w-3 h-3" />,
  },
  Card: {
    bg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
    icon: <CreditCard className="w-3 h-3" />,
  },
  Cheque: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    icon: <FileCheck2 className="w-3 h-3" />,
  },
  Other: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    icon: <Receipt className="w-3 h-3" />,
  },
};

export const RecentFeePaymentsWidget: React.FC = () => {
  const {
    feePayments,
    settings,
    setActiveTab,
    setSelectedStudentIdForDetail,
  } = useSchool();

  const [filterScope, setFilterScope] = useState<'all' | 'today'>('all');
  const [expanded, setExpanded] = useState(false);

  const today = getTodayDateString();

  const sortedPayments = useMemo(() => {
    return [...feePayments].sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [feePayments]);

  const todaysStats = useMemo(() => {
    const todays = sortedPayments.filter(p => p.date === today);
    const total = todays.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);
    return { count: todays.length, total };
  }, [sortedPayments, today]);

  const filteredPayments = useMemo(() => {
    if (filterScope === 'today') {
      return sortedPayments.filter(p => p.date === today);
    }
    return sortedPayments;
  }, [sortedPayments, filterScope, today]);

  const displayedPayments = expanded ? filteredPayments.slice(0, 12) : filteredPayments.slice(0, 5);

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Fee Payments
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Today: {todaysStats.count} ({formatCurrency(todaysStats.total, settings.currencySymbol)})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Latest student tuition receipts and fee transactions recorded in the ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs">
            <button
              type="button"
              onClick={() => setFilterScope('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              All ({sortedPayments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterScope('today')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                filterScope === 'today'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Today ({todaysStats.count})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('fee-collection')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Collect Fee</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fee-collection')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {displayedPayments.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {filterScope === 'today'
              ? 'No Fee Payments Recorded Today'
              : 'No Fee Payments Recorded Yet'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 mb-3">
            {filterScope === 'today'
              ? 'Switch to All to review recent transactions or record a new fee payment.'
              : 'Student fee receipts and payment modes will appear here as soon as fees are collected.'}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab('fee-collection')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Open Fee Collection
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Receipt</th>
                <th className="py-2.5 px-3">Student &amp; Class</th>
                <th className="py-2.5 px-3">Billing Period</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {displayedPayments.map(payment => {
                const modeStyle = MODE_BADGE_MAP[payment.paymentMode] || MODE_BADGE_MAP.Other;
                const hasDiscount = (payment.discount_amount || 0) > 0;

                return (
                  <tr
                    key={payment.id}
                    onClick={() => {
                      if (payment.studentId) {
                        setSelectedStudentIdForDetail(payment.studentId);
                      }
                      setActiveTab('fee-collection');
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                    title="Click to open student fee collection ledger"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {payment.receiptNumber || '—'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white leading-tight">
                        {payment.studentName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {payment.className}
                        {payment.section ? ` - ${payment.section}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                      {payment.monthFor || payment.category || 'Tuition Fee'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {formatDate(payment.date)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${modeStyle.bg}`}
                      >
                        {modeStyle.icon}
                        <span>{payment.paymentMode}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payment.totalAmount, settings.currencySymbol)}
                      </span>
                      {hasDiscount && (
                        <span
                          className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                          title={`Discount applied: ${formatCurrency(payment.discount_amount || 0, settings.currencySymbol)}`}
                        >
                          <BadgePercent className="w-3 h-3" />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Expand/Collapse Footer */}
      {filteredPayments.length > 5 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            <span>
              {expanded
                ? 'Show Latest 5 Payments'
                : `Show More (${Math.min(filteredPayments.length, 12)} of ${filteredPayments.length})`}
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
};
