import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  FileCheck,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { PayrollAuditLog, SchoolSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

interface PayrollAuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: PayrollAuditLog[];
  settings: SchoolSettings;
}

export const PayrollAuditLogModal: React.FC<PayrollAuditLogModalProps> = ({
  isOpen,
  onClose,
  auditLogs,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');

  // Distinct users in logs
  const distinctUsers = useMemo(() => {
    const map = new Map<string, { id?: string; name: string; role: string }>();
    auditLogs.forEach(log => {
      const key = log.userId || log.userName;
      if (!map.has(key)) {
        map.set(key, { id: log.userId, name: log.userName, role: log.userRole });
      }
    });
    return Array.from(map.values());
  }, [auditLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Action filter
      if (filterAction === 'status_changes') {
        const isStatusChange =
          log.action === 'run_created' ||
          log.action === 'run_processed' ||
          log.action === 'run_approved' ||
          log.action === 'salary_paid' ||
          log.action === 'run_unlocked' ||
          log.action === 'run_deleted' ||
          !!log.fromStatus ||
          !!log.toStatus;
        if (!isStatusChange) return false;
      } else if (filterAction !== 'all') {
        if (log.action !== filterAction) return false;
      }

      // User filter
      if (filterUser !== 'all') {
        if (log.userId !== filterUser && log.userName !== filterUser) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = log.title?.toLowerCase().includes(query);
        const matchesDetails = log.details?.toLowerCase().includes(query);
        const matchesUser = log.userName?.toLowerCase().includes(query);
        const matchesUserId = log.userId?.toLowerCase().includes(query);
        const matchesTarget = log.targetName?.toLowerCase().includes(query) || log.targetId?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDetails && !matchesUser && !matchesUserId && !matchesTarget) {
          return false;
        }
      }

      return true;
    });
  }, [auditLogs, filterAction, filterUser, searchQuery]);

  // Export filtered logs to CSV
  const handleExportCSV = () => {
    const headers = [
      'Timestamp (ISO)',
      'Action Type',
      'From Status',
      'To Status',
      'User ID',
      'User Name',
      'User Role',
      'Target Run / Cycle',
      'Amount (PKR)',
      'Title',
      'Details',
    ];

    const rows = filteredLogs.map(log => [
      `"${log.timestamp}"`,
      `"${log.action}"`,
      `"${log.fromStatus || ''}"`,
      `"${log.toStatus || ''}"`,
      `"${log.userId || ''}"`,
      `"${log.userName}"`,
      `"${log.userRole}"`,
      `"${log.targetName || log.targetId || ''}"`,
      log.amount || '',
      `"${log.title.replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Status_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusTransitionBadge = (log: PayrollAuditLog) => {
    const from = log.fromStatus || (
      log.action === 'run_created' ? 'none' :
      log.action === 'run_processed' ? 'draft' :
      log.action === 'run_approved' ? 'processed' :
      log.action === 'salary_paid' ? 'approved' :
      log.action === 'run_unlocked' ? 'approved' : undefined
    );

    const to = log.toStatus || (
      log.action === 'run_created' ? 'draft' :
      log.action === 'run_processed' ? 'processed' :
      log.action === 'run_approved' ? 'approved' :
      log.action === 'salary_paid' ? 'paid' :
      log.action === 'run_unlocked' ? 'draft' :
      log.action === 'run_deleted' ? 'deleted' : undefined
    );

    if (!to) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {log.action.replace(/_/g, ' ').toUpperCase()}
        </span>
      );
    }

    const getStatusStyle = (st: string) => {
      switch (st.toLowerCase()) {
        case 'paid':
          return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300';
        case 'approved':
          return 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300';
        case 'processed':
          return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300';
        case 'draft':
          return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300';
        case 'deleted':
        case 'rejected':
          return 'bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300';
        default:
          return 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300';
      }
    };

    return (
      <div className="inline-flex items-center gap-1 font-mono text-[11px] font-black">
        {from && from !== 'none' && (
          <>
            <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold ${getStatusStyle(from)}`}>
              {from}
            </span>
            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          </>
        )}
        <span className={`px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold shadow-2xs ${getStatusStyle(to)}`}>
          {to}
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Payroll Status &amp; Workflow Audit Trail
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {filteredLogs.length} Records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Immutable historical register recording every status change (Draft &rarr; Processed &rarr; Approved &rarr; Paid), timestamps, and actor User IDs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Download CSV Audit Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by User ID (e.g., usr-admin-1), User Name, Action, or Month..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-indigo-500 text-slate-900 dark:text-white font-medium shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500">Filter Event:</span>
              <select
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Audit Events</option>
                <option value="status_changes">Status Transitions Only</option>
                <option value="run_created">Draft Created</option>
                <option value="run_processed">Processed &amp; Locked</option>
                <option value="run_approved">Approved (Admin)</option>
                <option value="salary_paid">Disbursed (Paid)</option>
                <option value="run_unlocked">Unlocked / Reverted</option>
                <option value="run_deleted">Deleted Cycles</option>
              </select>
            </div>

            {/* Filter User */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-bold text-slate-500">Actor:</span>
              <select
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                className="bg-transparent font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Users</option>
                {distinctUsers.map(u => (
                  <option key={u.id || u.name} value={u.id || u.name}>
                    {u.name} {u.id ? `(${u.id})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table Content */}
        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">No Matching Audit Entries</p>
              <p className="text-slate-400 mt-1">Try resetting search keywords or filter criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 backdrop-blur-xs z-10">
                <tr>
                  <th className="py-3 px-4 w-44">Date &amp; Timestamp</th>
                  <th className="py-3 px-4">Status Transition / Action</th>
                  <th className="py-3 px-4">Actor (User ID &amp; Name)</th>
                  <th className="py-3 px-4">Target Cycle</th>
                  <th className="py-3 px-4">Event Details &amp; Reason</th>
                  <th className="py-3 px-4 text-right">Liability</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map(log => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-mono text-[11px] font-bold">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTime(log.timestamp)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block pl-5 mt-0.5">
                        {log.timestamp}
                      </span>
                    </td>

                    {/* Status Transition */}
                    <td className="py-3 px-4 align-top">
                      {renderStatusTransitionBadge(log)}
                      <span className="text-[10px] font-bold text-slate-400 block mt-1">
                        {log.title}
                      </span>
                    </td>

                    {/* Actor User ID & Name */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {log.userName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {log.userRole}
                        </span>
                      </div>
                      {/* Explicit User ID badge */}
                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-mono">User ID:</span>
                        <code className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono border border-indigo-200 dark:border-indigo-800">
                          {log.userId || 'usr-system'}
                        </code>
                      </div>
                    </td>

                    {/* Target Cycle */}
                    <td className="py-3 px-4 align-top font-bold text-slate-800 dark:text-slate-200">
                      {log.targetName || log.targetId || 'All Staff'}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-4 align-top text-slate-600 dark:text-slate-400 max-w-xs sm:max-w-md">
                      <p className="line-clamp-2 hover:line-clamp-none transition-all">{log.details}</p>
                    </td>

                    {/* Liability Amount */}
                    <td className="py-3 px-4 align-top text-right font-mono font-bold text-slate-900 dark:text-white">
                      {log.amount !== undefined ? (
                        formatCurrency(log.amount, settings.currencySymbol)
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Audit trail automatically synchronizes across IndexedDB and local encrypted storage.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 cursor-pointer"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
