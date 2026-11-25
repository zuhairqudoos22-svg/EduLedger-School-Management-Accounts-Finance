import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { ActivityLog, ActivityLogCategory, ActivityLogSeverity } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  DollarSign,
  CalendarCheck,
  UserCheck,
  User,
  Shield,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Plus,
  FileText,
  FileSpreadsheet,
  X,
  Layers,
  ChevronDown,
} from 'lucide-react';

export const ActivityLogView: React.FC = () => {
  const { activityLogs, logActivity, clearActivityLogs, settings } = useSchool();
  const { currentUser, isAdmin } = useAuth();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Manual log state for recording custom audit events
  const [manualCategory, setManualCategory] = useState<ActivityLogCategory>('fee_deletion');
  const [manualSeverity, setManualSeverity] = useState<ActivityLogSeverity>('critical');
  const [manualAction, setManualAction] = useState('');
  const [manualEntityName, setManualEntityName] = useState('');
  const [manualDetails, setManualDetails] = useState('');
  const [manualPrevValue, setManualPrevValue] = useState('');
  const [manualNewValue, setManualNewValue] = useState('');

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 4000);
  };

  // Distinct users in logs
  const distinctUsers = useMemo(() => {
    const set = new Set<string>();
    activityLogs.forEach(l => {
      if (l.userName) set.add(l.userName);
    });
    return Array.from(set).sort();
  }, [activityLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return activityLogs.filter(log => {
      // Category filter
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;

      // Severity filter
      if (severityFilter !== 'all' && log.severity !== severityFilter) return false;

      // User filter
      if (userFilter !== 'all' && log.userName !== userFilter) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const logDate = log.timestamp.split('T')[0];
        if (dateFilter === 'today' && logDate !== todayStr) return false;
        if (dateFilter === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (new Date(log.timestamp) < sevenDaysAgo) return false;
        }
        if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          if (new Date(log.timestamp) < thirtyDaysAgo) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAction = log.action.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        const matchUser = log.userName.toLowerCase().includes(q);
        const matchEntity = log.entityName ? log.entityName.toLowerCase().includes(q) : false;
        const matchPrev = log.previousValue ? log.previousValue.toLowerCase().includes(q) : false;
        const matchNew = log.newValue ? log.newValue.toLowerCase().includes(q) : false;
        return matchAction || matchDetails || matchUser || matchEntity || matchPrev || matchNew;
      }

      return true;
    });
  }, [activityLogs, categoryFilter, severityFilter, userFilter, dateFilter, searchQuery]);

  // KPI Calculations
  const totalCount = activityLogs.length;
  const feeDeletionsCount = activityLogs.filter(l => l.category === 'fee_deletion').length;
  const salaryModsCount = activityLogs.filter(l => l.category === 'salary_modification').length;
  const attendanceOverridesCount = activityLogs.filter(l => l.category === 'attendance_override').length;
  const criticalCount = activityLogs.filter(l => l.severity === 'critical').length;

  const handleCreateManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAction.trim() || !manualDetails.trim()) {
      alert('Please fill out required action and details fields.');
      return;
    }

    await logActivity({
      userName: currentUser ? currentUser.fullName : 'Administrator',
      userRole: currentUser ? currentUser.role : 'admin',
      category: manualCategory,
      severity: manualSeverity,
      action: manualAction.trim(),
      details: manualDetails.trim(),
      entityName: manualEntityName.trim() || undefined,
      previousValue: manualPrevValue.trim() || undefined,
      newValue: manualNewValue.trim() || undefined,
    });

    setIsRecordModalOpen(false);
    setManualAction('');
    setManualEntityName('');
    setManualDetails('');
    setManualPrevValue('');
    setManualNewValue('');
    showNotice('Sensitive administrative action successfully recorded in audit trail.');
  };

  const handleClearLogsConfirm = async () => {
    if (!isAdmin) {
      alert('Only administrators can clear activity logs.');
      return;
    }
    const confirmed = window.confirm(
      'Are you sure you want to permanently clear the activity log history? This action is irreversible.'
    );
    if (!confirmed) return;

    const ok = await clearActivityLogs();
    if (ok) {
      showNotice('Activity logs cleared successfully.');
    }
  };

  const exportLogsToCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No activity logs to export.');
      return;
    }

    const headers = [
      'Log ID',
      'Timestamp (ISO)',
      'Date & Time',
      'User Name',
      'User Role',
      'Category',
      'Severity',
      'Action Title',
      'Affected Entity',
      'Audit Details',
      'Previous State / Value',
      'New State / Value',
      'Client IP / Source',
    ];

    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp}"`,
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.userName.replace(/"/g, '""')}"`,
      `"${l.userRole}"`,
      `"${l.category}"`,
      `"${l.severity}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      `"${(l.entityName || '').replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${(l.previousValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${(l.ipAddress || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Activity_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('Activity audit log exported to CSV.');
  };

  const getCategoryBadge = (category: ActivityLogCategory) => {
    switch (category) {
      case 'fee_deletion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <Trash2 className="w-3 h-3" /> Fee Deletion
          </span>
        );
      case 'fee_modification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <DollarSign className="w-3 h-3" /> Fee Modification
          </span>
        );
      case 'salary_modification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <DollarSign className="w-3 h-3" /> Salary Modification
          </span>
        );
      case 'attendance_override':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <CalendarCheck className="w-3 h-3" /> Attendance Override
          </span>
        );
      case 'user_security':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
            <Shield className="w-3 h-3" /> Security &amp; Roles
          </span>
        );
      case 'student_deletion':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <Trash2 className="w-3 h-3" /> Student Deletion
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Layers className="w-3 h-3" /> System Action
          </span>
        );
    }
  };

  const getSeverityBadge = (severity: ActivityLogSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" /> Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Warning
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> Info
          </span>
        );
    }
  };

  const formatTimestampDisplay = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timeStr: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
    } catch {
      return { dateStr: iso, timeStr: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button onClick={() => setNoticeMessage(null)} className="text-white/80 hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Forensic Audit Engine
            </span>
            <span className="text-xs text-indigo-200">
              {settings.schoolName || 'EduLedger'} • Academic Year {settings.currentAcademicYear || '2026-2027'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            System Activity Log &amp; Audit Trail
          </h2>
          <p className="text-xs text-indigo-200 max-w-2xl mt-1 leading-relaxed">
            Real-time immutable tracking of sensitive operational actions: fee cancellations &amp; deletions,
            faculty salary package modifications, and attendance overrides, complete with user credentials, previous values, and exact timestamps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Audit Action</span>
          </button>

          <button
            onClick={exportLogsToCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
            title="Download CSV audit log"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
            title="Print Audit Report"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Print Report</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleClearLogsConfirm}
              className="p-2 rounded-xl text-rose-300 hover:text-white hover:bg-rose-900/40 border border-rose-800/40 transition cursor-pointer"
              title="Clear activity log history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Total Logged Actions</span>
            <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Recorded in session</p>
        </div>

        <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 shadow-2xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Fee Deletions</span>
            <Trash2 className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-300 font-mono">
            {feeDeletionsCount}
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Vouchers voided/removed</p>
        </div>

        <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 shadow-2xs">
          <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Salary Adjustments</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
            {salaryModsCount}
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-0.5">Base pay &amp; allowances</p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 shadow-2xs">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Attendance Overrides</span>
            <CalendarCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono">
            {attendanceOverridesCount}
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Excused &amp; roll overrides</p>
        </div>

        <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-[10px]">Critical Severity</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
            {criticalCount}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">High-impact events</p>
        </div>
      </div>

      {/* Search, Filter & Quick Options Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by user, action, student/staff name, receipt #..."
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Categories</option>
              <option value="fee_deletion">Fee Deletions &amp; Voids</option>
              <option value="fee_modification">Fee Modifications</option>
              <option value="salary_modification">Salary Modifications</option>
              <option value="attendance_override">Attendance Overrides</option>
              <option value="user_security">Security &amp; Roles</option>
              <option value="student_deletion">Student Deletions</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical Only</option>
              <option value="warning">Warning Only</option>
              <option value="info">Info Only</option>
            </select>
          </div>

          {/* User Filter */}
          <div>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Users</option>
              {distinctUsers.map((u, i) => (
                <option key={i} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filter Badges */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Timeframe:</span>
            {(['all', 'today', '7days', '30days'] as const).map(df => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  dateFilter === df
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {df === 'all' && 'All Records'}
                {df === 'today' && 'Today Only'}
                {df === '7days' && 'Last 7 Days'}
                {df === '30days' && 'Last 30 Days'}
              </button>
            ))}
          </div>

          <div className="text-slate-500 font-medium">
            Showing <strong className="text-slate-900 dark:text-white font-mono">{filteredLogs.length}</strong> of{' '}
            <span className="font-mono">{activityLogs.length}</span> actions
          </div>
        </div>
      </div>

      {/* Main Activity Log Feed / Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Matching Activity Logs Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No sensitive actions match your current search terms and filter criteria. Adjust filters or record a new log.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLogs.map(log => {
              const { dateStr, timeStr } = formatTimestampDisplay(log.timestamp);
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition space-y-2.5"
                >
                  {/* Top Row: Badges, User, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getCategoryBadge(log.category)}
                      {getSeverityBadge(log.severity)}
                      {log.entityName && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          Target: {log.entityName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                          {log.userName.charAt(0)}
                        </div>
                        <span>{log.userName}</span>
                        <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                          ({log.userRole})
                        </span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr} {timeStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Title & Full Description */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {log.action}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {log.details}
                    </p>
                  </div>

                  {/* Previous State vs New State Snapshot (Diff Box) */}
                  {(log.previousValue || log.newValue) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                      {log.previousValue && (
                        <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-0.5">
                            State Before Modification:
                          </span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {log.previousValue}
                          </span>
                        </div>
                      )}
                      {log.newValue && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                            State After Modification:
                          </span>
                          <span className="font-mono text-slate-800 dark:text-slate-200">
                            {log.newValue}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Client Metadata Footer */}
                  {log.ipAddress && (
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 pt-0.5">
                      <span>Source:</span>
                      <span>{log.ipAddress}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual / Sensitive Action Logging Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Record Sensitive Administrative Action
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Log an official override, deletion, or salary exception for regulatory audit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManualLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Action Category *
                  </label>
                  <select
                    value={manualCategory}
                    onChange={e => setManualCategory(e.target.value as ActivityLogCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="fee_deletion">Fee Deletion / Void</option>
                    <option value="salary_modification">Salary Modification</option>
                    <option value="attendance_override">Attendance Override</option>
                    <option value="fee_modification">Fee Concession / Discount</option>
                    <option value="user_security">Security &amp; Permissions</option>
                    <option value="student_deletion">Student Removal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity Level *
                  </label>
                  <select
                    value={manualSeverity}
                    onChange={e => setManualSeverity(e.target.value as ActivityLogSeverity)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  >
                    <option value="critical">Critical (Permanent Deletion / Void)</option>
                    <option value="warning">Warning (Compensation / Override)</option>
                    <option value="info">Info (Audit Note / Policy Check)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Action Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={manualAction}
                  onChange={e => setManualAction(e.target.value)}
                  placeholder="e.g. Cancelled Fee Voucher #REC-2026-095"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Entity / Person Name
                </label>
                <input
                  type="text"
                  value={manualEntityName}
                  onChange={e => setManualEntityName(e.target.value)}
                  placeholder="e.g. Student Ethan Miller (10-B) or Staff Sarah Jenkins"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Audit Explanation &amp; Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={manualDetails}
                  onChange={e => setManualDetails(e.target.value)}
                  placeholder="Explain why this action was performed, authorization references, or physician notes..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Previous Value / State
                  </label>
                  <input
                    type="text"
                    value={manualPrevValue}
                    onChange={e => setManualPrevValue(e.target.value)}
                    placeholder="e.g. Base Salary: $3,200 or Status: Absent"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Value / State
                  </label>
                  <input
                    type="text"
                    value={manualNewValue}
                    onChange={e => setManualNewValue(e.target.value)}
                    placeholder="e.g. Base Salary: $3,500 or Status: Excused"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm cursor-pointer"
                >
                  Save to Audit Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
