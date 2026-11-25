import React, { useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { formatCurrency, formatDate, exportToCSV, exportToExcel, getTodayDateString } from '../../utils/formatters';
import { formatDefaultersForExport } from '../../utils/exportUtils';
import { ExportDropdown } from '../common/ExportDropdown';
import { generateDueFeesAuditPdf } from '../../utils/financialPdf';
import { AlertTriangle, Search, Filter, Download, Phone, Mail, DollarSign, Layers, FileText, CheckCircle } from 'lucide-react';

export const DueFeesView: React.FC = () => {
  const {
    students,
    settings,
    getStudentPendingFee,
    getDefaultersList,
    setActiveTab,
    setSelectedStudentIdForDetail,
  } = useSchool();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('All');
  const [minDueAmount, setMinDueAmount] = useState<number>(0);

  const defaulters = getDefaultersList();

  const filteredDefaulters = defaulters.filter(({ student, pendingAmount }) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.guardianName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClass === 'All' || student.className === selectedClass;
    const matchesAmount = pendingAmount >= minDueAmount;

    return matchesSearch && matchesClass && matchesAmount;
  });

  const totalOutstanding = filteredDefaulters.reduce(
    (sum, item) => sum + item.pendingAmount,
    0
  );

  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => setNoticeMsg(null), 3500);
  };

  const handleExportCSV = () => {
    if (filteredDefaulters.length === 0) return;
    const rows = formatDefaultersForExport(filteredDefaulters, settings.currencySymbol || '$');
    exportToCSV(`Defaulters_Pending_Fees_${getTodayDateString()}`, rows);
    showNotice(`Exported ${filteredDefaulters.length} defaulter records to CSV.`);
  };

  const handleExportExcel = () => {
    if (filteredDefaulters.length === 0) return;
    const rows = formatDefaultersForExport(filteredDefaulters, settings.currencySymbol || '$');
    exportToExcel(`Defaulters_Pending_Fees`, 'Defaulters', rows);
    showNotice(`Exported ${filteredDefaulters.length} defaulter records to Excel (.xlsx).`);
  };

  const handleDownloadPdf = () => {
    if (filteredDefaulters.length === 0) {
      showNotice('No delinquent records found to export as PDF.');
      return;
    }
    generateDueFeesAuditPdf(settings, filteredDefaulters, {
      title: 'OFFICIAL PENDING DUES & RECOVERY AUDIT REPORT',
      className: selectedClass === 'All' ? 'All Classes' : `Class: ${selectedClass}`,
    });
    showNotice('Downloaded pending dues audit report PDF.');
  };

  const handleCollect = (studentId: string) => {
    setSelectedStudentIdForDetail(studentId);
    setActiveTab('fee-collection');
  };

  return (
    <div className="space-y-6">
      {noticeMsg && (
        <div className="p-3.5 rounded-xl bg-amber-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span>Pending Fees &amp; Defaulters Registry</span>
          </h2>
          <p className="text-xs text-slate-500">
            Monitor accounts with pending dues, outstanding balances by class, and prioritize recovery actions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Download printable official pending dues audit report PDF"
          >
            <FileText className="w-4 h-4 text-amber-500" />
            <span>Download PDF</span>
          </button>

          <ExportDropdown
            label="Export Defaulters"
            totalCount={filteredDefaulters.length}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            variant="emerald"
            size="md"
          />

          <button
            type="button"
            onClick={() => setActiveTab('fee-collection')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Open Batch Processing Utility in Fee Collection to record payments and generate vouchers for multiple students"
          >
            <Layers className="w-4 h-4" />
            <span>Batch Collect Dues</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Outstanding Balance</p>
          <p className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(totalOutstanding, settings.currencySymbol)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Delinquent Student Accounts</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {filteredDefaulters.length} Students
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Average Pending per Account</p>
          <p className="text-2xl font-black font-mono text-slate-800 dark:text-slate-200 mt-1">
            {filteredDefaulters.length > 0
              ? formatCurrency(
                  Math.round(totalOutstanding / filteredDefaulters.length),
                  settings.currencySymbol
                )
              : '$0.00'}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, roll no, or guardian..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">Class:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Classes</option>
              {settings.standardClasses?.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-medium">Min Due:</span>
            <select
              value={minDueAmount}
              onChange={e => setMinDueAmount(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value={0}>Any amount (&gt; $0)</option>
              <option value={200}>&gt; $200</option>
              <option value={400}>&gt; $400</option>
              <option value={500}>&gt; $500</option>
            </select>
          </div>
        </div>
      </div>

      {/* Defaulter Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Class & Sec</th>
                <th className="py-3 px-4">Parent / Contact Info</th>
                <th className="py-3 px-4">Last Payment Date</th>
                <th className="py-3 px-4 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDefaulters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No overdue accounts found matching the filter!
                  </td>
                </tr>
              ) : (
                filteredDefaulters.map(({ student, pendingAmount, lastPaymentDate }) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                      {student.rollNo}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {student.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {student.className} - {student.section}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{student.guardianName} ({student.contactNumber})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{student.address}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {lastPaymentDate ? formatDate(lastPaymentDate) : 'No prior payment'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {formatCurrency(pendingAmount, settings.currencySymbol)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCollect(student.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 font-semibold text-xs transition"
                      >
                        Collect Fee
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
