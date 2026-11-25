import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, X, Clock, ArrowRight } from 'lucide-react';
import {
  DateRange,
  DateRangePreset,
  calculateDateRange,
  formatDateRangeDisplay,
} from '../../utils/dateRangeUtils';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  academicYear?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  academicYear = '2026-2027',
  size = 'md',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(value.preset === 'custom');
  const [customStart, setCustomStart] = useState(value.startDate || '');
  const [customEnd, setCustomEnd] = useState(value.endDate || '');

  const presets: { id: DateRangePreset; title: string; subtitle?: string }[] = [
    { id: 'last_3_months', title: 'Last 3 Months', subtitle: 'Recent quarter disbursements' },
    { id: 'this_academic_year', title: 'This Academic Year', subtitle: `FY ${academicYear} (Jul – Jun)` },
    { id: 'this_month', title: 'This Month', subtitle: 'Current calendar billing month' },
    { id: 'last_month', title: 'Last Month', subtitle: 'Previous calendar billing month' },
    { id: 'last_6_months', title: 'Last 6 Months', subtitle: 'Mid-term operational cycle' },
    { id: 'last_12_months', title: 'Last 12 Months', subtitle: 'Annual rolling expenditure' },
    { id: 'this_year', title: 'This Calendar Year', subtitle: `Full calendar year` },
    { id: 'all', title: 'All Time', subtitle: 'Complete historical registry' },
    { id: 'custom', title: 'Custom Date Range...', subtitle: 'Select specific calendar dates' },
  ];

  const handleSelectPreset = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setIsCustomMode(true);
      return;
    }
    setIsCustomMode(false);
    const newRange = calculateDateRange(preset, academicYear);
    onChange(newRange);
    setIsOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart && !customEnd) {
      handleSelectPreset('all');
      return;
    }
    const newRange = calculateDateRange('custom', academicYear, customStart, customEnd);
    onChange(newRange);
    setIsOpen(false);
  };

  const handleResetToAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectPreset('all');
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 font-semibold transition cursor-pointer"
          title="Change date range filter"
        >
          <Calendar className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span className="font-bold">{value.label}</span>
          <span className="text-[11px] text-slate-400 font-normal hidden sm:inline">
            ({formatDateRangeDisplay(value)})
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {value.preset !== 'all' && (
          <button
            type="button"
            onClick={handleResetToAll}
            className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Reset to All Time"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 z-50 w-80 sm:w-88 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 animate-in fade-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Select Time Horizon</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {academicYear}
              </span>
            </div>

            {/* Presets List */}
            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {presets.map(p => {
                const isSelected = value.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold border border-red-200/60 dark:border-red-900/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      {p.subtitle && (
                        <p className="text-[10px] text-slate-400 font-normal">
                          {p.subtitle}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Range Drawer */}
            {isCustomMode && (
              <form
                onSubmit={handleApplyCustom}
                className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs animate-in fade-in"
              >
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={e => setCustomStart(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <span>Apply Range</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
};
