import React from 'react';
import { BookSale, SchoolSettings } from '../../types';
import { formatDate, formatDateTime, formatCurrency, amountToWords } from '../../utils/formatters';
import { Printer, X, ShoppingBag, CheckCircle2, ShieldCheck } from 'lucide-react';
import { BackButton } from '../common/BackButton';

interface BookSaleReceiptModalProps {
  sale: BookSale | null;
  settings: SchoolSettings;
  onClose: () => void;
}

export const BookSaleReceiptModal: React.FC<BookSaleReceiptModalProps> = ({
  sale,
  settings,
  onClose,
}) => {
  if (!sale) return null;

  const currencyStr = settings.currencyCode || 'PKR';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:static print:bg-transparent print:p-0 print:block">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none">
        
        {/* Navigation & Controls Bar (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2">
            <BackButton onClick={onClose} label="Back" variant="modal" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Receipt: {sale.invoiceNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1e293b] hover:bg-[#0f172a] text-white transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 space-y-5 print:p-0">
          {/* Header */}
          <div className="text-center border-b border-slate-200 pb-4">
            <div className="inline-flex p-2.5 rounded-2xl bg-blue-50 text-blue-600 mb-2">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
              {settings.schoolName || 'St. Augustine International Academy'}
            </h2>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">
              School Bookshop &amp; Stationery Store
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {settings.schoolAddress || 'Campus Boulevard, Education City'} • Tel: {settings.schoolPhone || '+1 555-019-2834'}
            </p>
          </div>

          {/* Receipt Info Ribbon */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Invoice No</span>
              <span className="font-mono font-bold text-slate-900">{sale.invoiceNo}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Date &amp; Time</span>
              <span className="font-semibold text-slate-800">{formatDateTime(sale.timestamp || sale.date)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Customer / Student</span>
              <span className="font-bold text-slate-900">{sale.customerName || 'Walk-in Customer'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Payment Mode</span>
              <span className="font-bold text-emerald-700">{sale.paymentMode}</span>
            </div>
          </div>

          {/* Purchased Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Book Item &amp; Class</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Rate ({currencyStr})</th>
                  <th className="py-2.5 px-3 text-right">Amount ({currencyStr})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                <tr>
                  <td className="py-3 px-3">
                    <span className="font-bold block text-slate-900">{sale.bookTitle}</span>
                    <span className="text-[11px] text-slate-500">Class: {sale.className}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-bold">{sale.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono">{sale.unitPrice.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {sale.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Paid</span>
              <span className="text-xs text-slate-300 italic">
                {amountToWords(sale.totalAmount, currencyStr)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono">
                {currencyStr} {sale.totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer note & verification */}
          <div className="pt-2 text-center text-[10px] text-slate-400 space-y-1 border-t border-slate-100">
            <p className="flex items-center justify-center gap-1 font-semibold text-slate-600">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Served &amp; Verified by: {sale.soldBy || 'Store Incharge'}</span>
            </p>
            <p>Thank you for purchasing from the School Bookshop. Please retain this receipt for warranty or exchange.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
