import React, { useEffect, useMemo, useState } from 'react';
import {
  CertificateQuality,
  IssuedCertificate,
  SchoolSettings,
  User,
  canUserCertificateAction,
} from '../../types';
import {
  CERTIFICATE_TYPE_PRESETS,
  formatCertificateDate,
  getCertificateTypePreset,
} from '../../certificates/certificatePresets';
import {
  CERTIFICATE_TEMPLATES,
  A4_LANDSCAPE_PX,
  getCertificateTemplate,
} from '../../certificates/certificateTemplates';
import {
  CertificateCounterStatus,
  syncCertificateCounterWithCloud,
} from '../../services/certificateNumberService';
import { CertificateCanvas } from '../../certificates/CertificateCanvas';
import {
  Search,
  Download,
  Printer,
  Eye,
  RotateCcw,
  Ban,
  FileSpreadsheet,
  X,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Database,
  Cloud,
  Calendar,
  SlidersHorizontal,
  FileArchive,
  FileText,
  CheckSquare,
  Square,
  Hash,
} from 'lucide-react';

interface CertificateRegisterTabProps {
  certificates: IssuedCertificate[];
  settings: SchoolSettings;
  currentUser: User | null;
  quality: CertificateQuality;
  onChangeQuality: (q: CertificateQuality) => void;
  onRedownloadPdf: (cert: IssuedCertificate) => Promise<void>;
  onReprintCert: (cert: IssuedCertificate) => Promise<void>;
  onBulkRedownload: (certs: IssuedCertificate[], mode: 'merged_pdf' | 'zip') => Promise<void>;
  onReissueCert: (cert: IssuedCertificate) => void;
  onCancelCert: (cert: IssuedCertificate, reason: string) => Promise<boolean>;
  busyCertId: string | null;
  isBulkBusy?: boolean;
}

type RegistrySortOption =
  | 'date_desc'
  | 'date_asc'
  | 'number_desc'
  | 'number_asc'
  | 'name_asc';

function csvEscape(value: string | number | boolean | undefined | null): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const CertificateRegisterTab: React.FC<CertificateRegisterTabProps> = ({
  certificates,
  settings,
  currentUser,
  quality,
  onChangeQuality,
  onRedownloadPdf,
  onReprintCert,
  onBulkRedownload,
  onReissueCert,
  onCancelCert,
  busyCertId,
  isBulkBusy = false,
}) => {
  // Search, multi-filters & sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [designFilter, setDesignFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<RegistrySortOption>('date_desc');

  // Instant ID Verification Lookup
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyQueried, setVerifyQueried] = useState<string>('');

  // Multi-select for Bulk Re-Download from Registry
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live Atomic Counter Status (Firestore transaction vs offline local sequence)
  const [counterStatus, setCounterStatus] = useState<CertificateCounterStatus | null>(null);
  const [isSyncingCounter, setIsSyncingCounter] = useState(false);

  const refreshCounterStatus = async () => {
    setIsSyncingCounter(true);
    try {
      const status = await syncCertificateCounterWithCloud({
        prefix: settings.certificatePrefix || 'CERT',
        settings,
        existingCertificates: certificates,
      });
      setCounterStatus(status);
    } finally {
      setIsSyncingCounter(false);
    }
  };

  useEffect(() => {
    refreshCounterStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certificates.length, settings.certificatePrefix, settings.schoolName, settings.schoolId]);

  // Preview & Cancel modals
  const [previewCert, setPreviewCert] = useState<IssuedCertificate | null>(null);
  const [cancelTarget, setCancelTarget] = useState<IssuedCertificate | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const canGenerate = canUserCertificateAction(currentUser, 'generate', {
    allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
  });
  const canCancel = canUserCertificateAction(currentUser, 'cancel');

  const stats = useMemo(() => {
    const total = certificates.length;
    const issued = certificates.filter((c) => (c.status || 'Issued') === 'Issued').length;
    const reissued = certificates.filter((c) => c.status === 'Re-issued').length;
    const cancelled = certificates.filter((c) => c.status === 'Cancelled').length;
    return { total, issued, reissued, cancelled };
  }, [certificates]);

  // Instant ID lookup match
  const verifiedCertResult = useMemo(() => {
    const clean = verifyQueried.trim().toLowerCase();
    if (!clean) return null;
    const found = certificates.find(
      (c) => (c.certificateNumber || '').trim().toLowerCase() === clean
    );
    return { queried: verifyQueried.trim(), cert: found || null };
  }, [verifyQueried, certificates]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      typeFilter !== 'all' ||
      audienceFilter !== 'all' ||
      designFilter !== 'all' ||
      statusFilter !== 'all' ||
      dateFrom ||
      dateTo
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setAudienceFilter('all');
    setDesignFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setSortBy('date_desc');
  };

  const filteredCertificates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = certificates.filter((cert) => {
      const certStatus = cert.status || 'Issued';
      if (typeFilter !== 'all' && cert.type !== typeFilter) return false;
      if (audienceFilter !== 'all' && cert.recipientType !== audienceFilter) return false;
      if (designFilter !== 'all') {
        const dId = cert.designId || 'legacy';
        if (dId !== designFilter) return false;
      }
      if (statusFilter !== 'all' && certStatus !== statusFilter) return false;

      if (dateFrom && (cert.issueDate || '') < dateFrom) return false;
      if (dateTo && (cert.issueDate || '') > dateTo) return false;

      if (!q) return true;
      return (
        (cert.certificateNumber || '').toLowerCase().includes(q) ||
        (cert.recipientName || '').toLowerCase().includes(q) ||
        (cert.rollNo || '').toLowerCase().includes(q) ||
        (cert.admissionNo || '').toLowerCase().includes(q) ||
        (cert.employeeCode || '').toLowerCase().includes(q) ||
        (cert.classEnrolled || '').toLowerCase().includes(q) ||
        (cert.department || '').toLowerCase().includes(q) ||
        (cert.certificateTitle || '').toLowerCase().includes(q) ||
        (cert.competitionOrEvent || '').toLowerCase().includes(q) ||
        (cert.issuedBy || '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return (a.issueDate || a.createdAt || '').localeCompare(b.issueDate || b.createdAt || '');
        case 'number_desc':
          return (b.certificateNumber || '').localeCompare(a.certificateNumber || '');
        case 'number_asc':
          return (a.certificateNumber || '').localeCompare(b.certificateNumber || '');
        case 'name_asc':
          return (a.recipientName || '').localeCompare(b.recipientName || '');
        case 'date_desc':
        default: {
          const cmp = (b.issueDate || '').localeCompare(a.issueDate || '');
          if (cmp !== 0) return cmp;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
      }
    });
  }, [
    certificates,
    searchQuery,
    typeFilter,
    audienceFilter,
    designFilter,
    statusFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const selectedCertificates = useMemo(
    () => filteredCertificates.filter((c) => selectedIds.includes(c.id)),
    [filteredCertificates, selectedIds]
  );

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (
      filteredCertificates.length > 0 &&
      selectedCertificates.length === filteredCertificates.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCertificates.map((c) => c.id));
    }
  };

  const handleCopyCertId = async (certNumber: string) => {
    try {
      await navigator.clipboard.writeText(certNumber);
      setCopiedId(certNumber);
      window.setTimeout(() => setCopiedId((prev) => (prev === certNumber ? null : prev)), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Certificate No',
      'Status',
      'Type',
      'Design',
      'Recipient Type',
      'Recipient Name',
      'Class / Department',
      'Roll / Emp No',
      'Event / Achievement',
      'Position / Grade',
      'Issue Date',
      'Issued By',
      'Re-issued From',
      'Cancelled At',
      'Cancelled By',
      'Cancel Reason',
    ];

    const rows = filteredCertificates.map((c) => {
      const preset = getCertificateTypePreset(c.type);
      const designName = c.designId
        ? `Design ${getCertificateTemplate(c.designId).code} (${getCertificateTemplate(c.designId).name})`
        : `Legacy (${c.theme})`;
      const classOrDept =
        c.recipientType === 'employee'
          ? [c.designation, c.department].filter(Boolean).join(' • ')
          : [c.classEnrolled, c.section ? `Sec ${c.section}` : ''].filter(Boolean).join(' ');
      return [
        c.certificateNumber,
        c.status || 'Issued',
        preset.shortLabel,
        designName,
        c.recipientType,
        c.recipientName,
        classOrDept,
        c.recipientType === 'employee' ? c.employeeCode || '' : c.rollNo || c.admissionNo || '',
        c.competitionOrEvent || c.achievementTitle || '',
        c.rankOrGrade || '',
        c.issueDate || '',
        c.issuedBy || '',
        c.reissuedFrom || '',
        c.cancelledAt || '',
        c.cancelledBy || '',
        c.cancelReason || '',
      ]
        .map(csvEscape)
        .join(',');
    });

    const csv = '\uFEFF' + [headers.map(csvEscape).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduLedger_Certificate_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    if (!canUserCertificateAction(currentUser, 'cancel')) {
      setCancelError('You do not have permission to cancel issued certificates.');
      return;
    }
    const trimmed = cancelReason.trim();
    if (trimmed.length < 3) {
      setCancelError('Please enter a clear cancellation reason (at least 3 characters).');
      return;
    }
    setIsCancelling(true);
    setCancelError('');
    try {
      const ok = await onCancelCert(cancelTarget, trimmed);
      if (ok) {
        setCancelTarget(null);
        setCancelReason('');
      }
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Unique ID Concurrency & Instant Verification Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Atomic Sequence Status */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Next Atomic Unique ID
                </div>
                <div className="font-mono text-base font-bold text-slate-900 dark:text-white truncate">
                  {counterStatus?.nextNumber || `${settings.certificatePrefix || 'CERT'}-${new Date().getFullYear()}-00001`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={refreshCounterStatus}
              disabled={isSyncingCounter}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              title="Sync monotonic counter with Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCounter ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            {counterStatus?.mode === 'firestore_transaction' ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <Cloud className="w-3.5 h-3.5" />
                Firestore Transaction Concurrency Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                <Database className="w-3.5 h-3.5" />
                Offline Monotonic Local Counter
              </span>
            )}
            <span className="text-slate-400 font-mono">
              Seq #{counterStatus?.currentSeq ?? 0} ({counterStatus?.year ?? new Date().getFullYear()})
            </span>
          </div>
        </div>

        {/* Instant Certificate ID Verification Lookup */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Verify Certificate ID</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Check authenticity & status instantly
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setVerifyQueried(verifyInput);
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder={`Enter Certificate ID (e.g. ${settings.certificatePrefix || 'CERT'}-${new Date().getFullYear()}-00001)`}
                className="w-full pl-8 pr-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              Verify ID
            </button>
            {verifyQueried && (
              <button
                type="button"
                onClick={() => {
                  setVerifyInput('');
                  setVerifyQueried('');
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800"
                title="Clear verification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {verifiedCertResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                !verifiedCertResult.cert
                  ? 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  : (verifiedCertResult.cert.status || 'Issued') === 'Cancelled'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {!verifiedCertResult.cert ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>
                    No record found matching{' '}
                    <strong className="font-mono">{verifiedCertResult.queried}</strong>.
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 min-w-0">
                    {(verifiedCertResult.cert.status || 'Issued') === 'Cancelled' ? (
                      <Ban className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold">
                        {verifiedCertResult.cert.certificateNumber} —{' '}
                        {(verifiedCertResult.cert.status || 'Issued') === 'Cancelled'
                          ? 'REVOKED / CANCELLED'
                          : `VERIFIED (${verifiedCertResult.cert.status || 'Issued'})`}
                      </div>
                      <div className="text-[11px] opacity-90">
                        {verifiedCertResult.cert.recipientName} •{' '}
                        {getCertificateTypePreset(verifiedCertResult.cert.type).shortLabel} • Issued{' '}
                        {formatCertificateDate(verifiedCertResult.cert.issueDate) ||
                          verifiedCertResult.cert.issueDate}
                        {verifiedCertResult.cert.cancelReason
                          ? ` • Reason: ${verifiedCertResult.cert.cancelReason}`
                          : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewCert(verifiedCertResult.cert)}
                      className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-current/20 text-[11px] font-semibold"
                    >
                      Inspect
                    </button>
                    <button
                      type="button"
                      onClick={() => onRedownloadPdf(verifiedCertResult.cert!)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onReprintCert(verifiedCertResult.cert!)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold"
                    >
                      Print
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Strip (Interactive Status Quick-Filters) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm transition-all ${
            statusFilter === 'all'
              ? 'border-amber-400 ring-2 ring-amber-400/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Registered
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {stats.total}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Issued' ? 'all' : 'Issued')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm transition-all ${
            statusFilter === 'Issued'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Active (Issued)
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {stats.issued}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Re-issued' ? 'all' : 'Re-issued')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm transition-all ${
            statusFilter === 'Re-issued'
              ? 'border-blue-500 ring-2 ring-blue-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Re-Issued
          </div>
          <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.reissued}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'Cancelled' ? 'all' : 'Cancelled')}
          className={`text-left bg-white dark:bg-slate-900 rounded-2xl border p-4 shadow-sm transition-all ${
            statusFilter === 'Cancelled'
              ? 'border-rose-500 ring-2 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="text-xs font-medium text-rose-600 dark:text-rose-400">
            Cancelled (Archived)
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300">
            {stats.cancelled}
          </div>
        </button>
      </div>

      {/* Search, Multi-Criteria Filter & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Certificate ID (CERT-2026-...), recipient, roll/emp no, class, event, or issuer..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quality Toggle for Re-Downloads */}
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => onChangeQuality('standard')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  quality === 'standard'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Standard 2x PDF resolution"
              >
                Standard PDF
              </button>
              <button
                type="button"
                onClick={() => onChangeQuality('high')}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  quality === 'high'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
                title="High 3x PDF resolution"
              >
                High 3x
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredCertificates.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV ({filteredCertificates.length})</span>
            </button>
          </div>
        </div>

        {/* Second Filter Row: Type, Audience, Design, Status, Date Range, Sort */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters:
          </span>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Issued">Issued</option>
            <option value="Re-issued">Re-issued</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">All Types</option>
            {CERTIFICATE_TYPE_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.shortLabel}
              </option>
            ))}
          </select>

          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">All Recipients</option>
            <option value="student">Students</option>
            <option value="employee">Staff / Faculty</option>
            <option value="custom">Custom</option>
          </select>

          <select
            value={designFilter}
            onChange={(e) => setDesignFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">All Designs</option>
            {CERTIFICATE_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                Design {tpl.code}: {tpl.name}
              </option>
            ))}
            <option value="legacy">Legacy Classic (v1)</option>
          </select>

          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="Issued From Date"
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Issued To Date"
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as RegistrySortOption)}
            className="ml-auto px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="date_desc">Sort: Newest First</option>
            <option value="date_asc">Sort: Oldest First</option>
            <option value="number_desc">Sort: ID (Z → A)</option>
            <option value="number_asc">Sort: ID (A → Z)</option>
            <option value="name_asc">Sort: Recipient (A → Z)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              Reset
            </button>
          )}
        </div>

        {/* Bulk Re-Download Selection Bar */}
        {selectedCertificates.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              {selectedCertificates.length} certificate(s) selected for batch re-download
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isBulkBusy}
                onClick={() => onBulkRedownload(selectedCertificates, 'merged_pdf')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                <FileText className="w-3.5 h-3.5" />
                Re-Download Merged PDF
              </button>
              <button
                type="button"
                disabled={isBulkBusy}
                onClick={() => onBulkRedownload(selectedCertificates, 'zip')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold"
              >
                <FileArchive className="w-3.5 h-3.5" />
                Re-Download ZIP
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredCertificates.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <FileCheck2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No certificates match your current filter
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Issue a certificate from the Designer & Studio tab or reset your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-4 pr-2 w-8">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-slate-500 hover:text-amber-600"
                      title="Select all filtered rows"
                    >
                      {selectedCertificates.length === filteredCertificates.length &&
                      filteredCertificates.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Certificate ID</th>
                  <th className="py-3 px-4">Recipient & Class / Dept</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Design</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Issued By</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredCertificates.map((cert) => {
                  const status = cert.status || 'Issued';
                  const preset = getCertificateTypePreset(cert.type);
                  const template = cert.designId ? getCertificateTemplate(cert.designId) : null;
                  const isBusy = busyCertId === cert.id;
                  const isChecked = selectedIds.includes(cert.id);

                  return (
                    <tr
                      key={cert.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        status === 'Cancelled' ? 'opacity-75' : ''
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2 align-top">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectRow(cert.id)}
                          className="mt-0.5 text-slate-400 hover:text-amber-600"
                          aria-label={`Select ${cert.certificateNumber}`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewCert(cert)}
                            className="font-mono text-xs font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400"
                            title="Inspect certificate details"
                          >
                            {cert.certificateNumber}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyCertId(cert.certificateNumber)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            title="Copy Certificate ID"
                          >
                            {copiedId === cert.certificateNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {cert.reissuedFrom && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                            Replaces {cert.reissuedFrom}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {cert.recipientName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {cert.recipientType === 'employee'
                            ? [cert.designation, cert.department].filter(Boolean).join(' • ') ||
                              'Staff'
                            : [
                                cert.classEnrolled,
                                cert.section ? `Sec ${cert.section}` : '',
                                cert.rollNo ? `Roll #${cert.rollNo}` : '',
                              ]
                                .filter(Boolean)
                                .join(' • ') || 'Student'}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {preset.shortLabel}
                        </div>
                        {cert.competitionOrEvent && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                            {cert.competitionOrEvent}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top">
                        {template ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: template.palette.primary }}
                            />
                            Design {template.code}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Legacy ({cert.theme})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatCertificateDate(cert.issueDate) || cert.issueDate}
                      </td>

                      <td className="py-3 px-4 align-top text-xs text-slate-600 dark:text-slate-300">
                        {cert.issuedBy || 'Administration'}
                      </td>

                      <td className="py-3 px-4 align-top">
                        {status === 'Cancelled' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                              <Ban className="w-3 h-3" />
                              Cancelled
                            </span>
                            {cert.cancelReason && (
                              <div
                                className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 max-w-[180px] truncate"
                                title={`Cancelled by ${cert.cancelledBy || 'Admin'}: ${cert.cancelReason}`}
                              >
                                {cert.cancelReason}
                              </div>
                            )}
                          </div>
                        ) : status === 'Re-issued' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            <RotateCcw className="w-3 h-3" />
                            Re-issued
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Issued
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewCert(cert)}
                            title="Preview & Audit Details"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onRedownloadPdf(cert)}
                            title="Re-Download A4 Landscape PDF"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 disabled:opacity-50 transition-colors"
                          >
                            {isBusy ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => onReprintCert(cert)}
                            title="Re-Print Certificate (A4 Landscape)"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 disabled:opacity-50 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {canGenerate && (
                            <button
                              type="button"
                              onClick={() => onReissueCert(cert)}
                              title="Re-Issue with New Unique ID"
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {canCancel && status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelTarget(cert);
                                setCancelReason('');
                                setCancelError('');
                              }}
                              title="Cancel Certificate (Soft-Cancel with Reason)"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Preview & Audit Details Modal */}
      {previewCert && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                  <span className="font-mono">{previewCert.certificateNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyCertId(previewCert.certificateNumber)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Copy Certificate ID"
                  >
                    {copiedId === previewCert.certificateNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span className="text-slate-400">•</span>
                  <span>{previewCert.recipientName}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getCertificateTypePreset(previewCert.type).label} — Issued{' '}
                  {formatCertificateDate(previewCert.issueDate) || previewCert.issueDate} by{' '}
                  {previewCert.issuedBy || 'Administration'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRedownloadPdf(previewCert)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="w-3.5 h-3.5" />
                  Re-Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => onReprintCert(previewCert)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Re-Print
                </button>
                {canCancel && (previewCert.status || 'Issued') !== 'Cancelled' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCancelTarget(previewCert);
                      setPreviewCert(null);
                      setCancelReason('');
                      setCancelError('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewCert(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {previewCert.status === 'Cancelled' && (
              <div className="px-5 py-2.5 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Cancelled</strong> by {previewCert.cancelledBy || 'Admin'}
                  {previewCert.cancelledAt
                    ? ` on ${new Date(previewCert.cancelledAt).toLocaleString()}`
                    : ''}
                  : {previewCert.cancelReason}
                </span>
              </div>
            )}

            {/* Audit Metadata Strip */}
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span>
                <strong>Status:</strong> {previewCert.status || 'Issued'}
              </span>
              <span>
                <strong>Design:</strong>{' '}
                {previewCert.designId
                  ? `Design ${getCertificateTemplate(previewCert.designId).code} (${getCertificateTemplate(previewCert.designId).name})`
                  : `Legacy (${previewCert.theme})`}
              </span>
              {previewCert.reissuedFrom && (
                <span>
                  <strong>Re-issued From:</strong>{' '}
                  <span className="font-mono">{previewCert.reissuedFrom}</span>
                </span>
              )}
              {previewCert.createdAt && (
                <span>
                  <strong>Recorded:</strong> {new Date(previewCert.createdAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
              <div
                className="shadow-xl rounded-sm overflow-hidden bg-white"
                style={{
                  width: A4_LANDSCAPE_PX.width * 0.72,
                  height: A4_LANDSCAPE_PX.height * 0.72,
                }}
              >
                <div
                  style={{
                    width: A4_LANDSCAPE_PX.width,
                    height: A4_LANDSCAPE_PX.height,
                    transform: 'scale(0.72)',
                    transformOrigin: 'top left',
                  }}
                >
                  <CertificateCanvas cert={previewCert} settings={settings} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Soft-Cancel Certificate Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmCancel}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cancel Issued Certificate
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  For audit integrity, certificates are never permanently deleted. This record will be marked as{' '}
                  <strong>Cancelled</strong> with your reason logged.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500">Certificate ID:</span>{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {cancelTarget.certificateNumber}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Recipient:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {cancelTarget.recipientName}
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Spelling correction required in student name; re-issuing corrected copy."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                required
              />
              {cancelError && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{cancelError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Keep Active
              </button>
              <button
                type="submit"
                disabled={isCancelling}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-60"
              >
                {isCancelling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Ban className="w-3.5 h-3.5" />
                )}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
