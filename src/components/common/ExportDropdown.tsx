import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown, Check, Sparkles, Building } from 'lucide-react';

export interface ExportDropdownProps {
  label?: string;
  onExportExcel: () => void;
  onExportCSV: () => void;
  onExportPDF?: () => void;
  onExportExternal?: () => void;
  onExportMaster?: () => void;
  totalCount?: number;
  selectedCount?: number;
  onExportSelectedExcel?: () => void;
  onExportSelectedCSV?: () => void;
  variant?: 'primary' | 'secondary' | 'subtle' | 'emerald';
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  label = 'Export',
  onExportExcel,
  onExportCSV,
  onExportPDF,
  onExportExternal,
  onExportMaster,
  totalCount,
  selectedCount = 0,
  onExportSelectedExcel,
  onExportSelectedCSV,
  variant = 'secondary',
  size = 'sm',
  align = 'right',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentFormat, setRecentFormat] = useState<'excel' | 'csv' | 'pdf' | 'external' | 'master' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void, format: 'excel' | 'csv' | 'pdf' | 'external' | 'master') => {
    callback();
    setRecentFormat(format);
    setTimeout(() => {
      setRecentFormat(null);
      setIsOpen(false);
    }, 400);
  };

  // Button styling variations
  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs border border-indigo-500/30',
    emerald:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border border-emerald-500/30',
    secondary:
      'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs',
    subtle:
      'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-transparent',
  }[variant];

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2',
  }[size];

  const alignStyles = align === 'right' ? 'right-0' : 'left-0';

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center font-medium transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${variantStyles} ${sizeStyles}`}
        title="Export data to Excel or CSV format"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
        {totalCount !== undefined && (
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/10 dark:bg-white/10">
            {totalCount}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute ${alignStyles} mt-1.5 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95`}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Select Export Format
            </span>
            {totalCount !== undefined && (
              <span className="text-[10px] text-slate-500 font-mono">
                {totalCount} {totalCount === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>

          <div className="space-y-1">
            {/* Excel (.xlsx) Option */}
            <button
              type="button"
              onClick={() => handleAction(onExportExcel, 'excel')}
              className="w-full group flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 group-hover:scale-105 transition-transform mt-0.5">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Microsoft Excel
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    .XLSX
                  </span>
                  {recentFormat === 'excel' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in ml-auto" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Spreadsheet with auto-fitted columns &amp; numeric formatting
                </p>
              </div>
            </button>

            {/* CSV (.csv) Option */}
            <button
              type="button"
              onClick={() => handleAction(onExportCSV, 'csv')}
              className="w-full group flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 group-hover:scale-105 transition-transform mt-0.5">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    CSV Document
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    .CSV
                  </span>
                  {recentFormat === 'csv' && (
                    <Check className="w-3.5 h-3.5 text-blue-600 animate-in zoom-in ml-auto" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  UTF-8 comma-separated text for databases &amp; universal tools
                </p>
              </div>
            </button>

            {/* PDF (.pdf) Option */}
            {onExportPDF && (
              <button
                type="button"
                onClick={() => handleAction(onExportPDF, 'pdf')}
                className="w-full group flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 group-hover:scale-105 transition-transform mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      PDF Document
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300">
                      .PDF
                    </span>
                    {recentFormat === 'pdf' && (
                      <Check className="w-3.5 h-3.5 text-rose-600 animate-in zoom-in ml-auto" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    Print-ready vector document with institutional styling
                  </p>
                </div>
              </button>
            )}

            {/* External Reporting Option */}
            {onExportExternal && (
              <button
                type="button"
                onClick={() => handleAction(onExportExternal, 'external')}
                className="w-full group flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 transition cursor-pointer border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1"
              >
                <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 group-hover:scale-105 transition-transform mt-0.5">
                  <Building className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      External Reporting Export
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                      PDF/CSV
                    </span>
                    {recentFormat === 'external' && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 animate-in zoom-in ml-auto" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    Export certified for ministry, auditors &amp; governing boards
                  </p>
                </div>
              </button>
            )}

            {/* Master Audit Workbook if available */}
            {onExportMaster && (
              <button
                type="button"
                onClick={() => handleAction(onExportMaster, 'master')}
                className="w-full group flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 transition cursor-pointer border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1"
              >
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 group-hover:scale-105 transition-transform mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Master School Workbook
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                      Multi-Sheet
                    </span>
                    {recentFormat === 'master' && (
                      <Check className="w-3.5 h-3.5 text-purple-600 animate-in zoom-in ml-auto" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    Complete 6-sheet audit file: Overview, Fees, Expenses, Dues
                  </p>
                </div>
              </button>
            )}

            {/* Selected Cohort Export (if items are selected) */}
            {selectedCount > 0 && (onExportSelectedExcel || onExportSelectedCSV) && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Selected Records ({selectedCount})</span>
                </div>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {onExportSelectedExcel && (
                    <button
                      type="button"
                      onClick={() => handleAction(onExportSelectedExcel, 'excel')}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 transition cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>Excel ({selectedCount})</span>
                    </button>
                  )}
                  {onExportSelectedCSV && (
                    <button
                      type="button"
                      onClick={() => handleAction(onExportSelectedCSV, 'csv')}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 transition cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>CSV ({selectedCount})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
