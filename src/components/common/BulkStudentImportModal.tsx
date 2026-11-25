import React, { useState, useRef, useMemo } from 'react';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  X,
  ShieldCheck,
  Users,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  parseAndValidateStudentCsv,
  downloadStudentCsvTemplate,
  StudentCsvParseSummary,
} from '../../utils/studentCsvImport';

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted?: (count: number) => void;
}

export const BulkStudentImportModal: React.FC<BulkStudentImportModalProps> = ({
  isOpen,
  onClose,
  onImportCompleted,
}) => {
  const { students, settings, bulkAddStudents, addMultipleClasses } = useSchool();
  const { isAdmin, currentUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [parseSummary, setParseSummary] = useState<StudentCsvParseSummary | null>(null);

  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'errors' | 'warnings'>('all');
  const [autoAddNewClasses, setAutoAddNewClasses] = useState<boolean>(true);
  const [skipErrors, setSkipErrors] = useState<boolean>(true);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    addedCount: number;
    classesAdded: string[];
    skippedCount: number;
  } | null>(null);

  const availableClasses = useMemo(() => {
    return settings.standardClasses || [];
  }, [settings.standardClasses]);

  const availableSections = useMemo(() => {
    return settings.standardSections || ['A', 'B', 'C'];
  }, [settings.standardSections]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setFileContent(content);
      const summary = parseAndValidateStudentCsv(
        content,
        students,
        availableClasses,
        availableSections
      );
      setParseSummary(summary);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = ev => {
      const content = ev.target?.result as string;
      setFileContent(content);
      const summary = parseAndValidateStudentCsv(
        content,
        students,
        availableClasses,
        availableSections
      );
      setParseSummary(summary);
    };
    reader.readAsText(file);
  };

  const handleResetFile = () => {
    setUploadedFileName('');
    setFileContent('');
    setParseSummary(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredPreviewRows = useMemo(() => {
    if (!parseSummary) return [];
    if (previewFilter === 'valid') {
      return parseSummary.rows.filter(r => r.isValid);
    }
    if (previewFilter === 'errors') {
      return parseSummary.rows.filter(r => !r.isValid);
    }
    if (previewFilter === 'warnings') {
      return parseSummary.rows.filter(r => r.warnings.length > 0);
    }
    return parseSummary.rows;
  }, [parseSummary, previewFilter]);

  const validRowsToImport = useMemo(() => {
    if (!parseSummary) return [];
    if (skipErrors) {
      return parseSummary.rows.filter(r => r.isValid);
    }
    return parseSummary.errorCount === 0 ? parseSummary.rows : [];
  }, [parseSummary, skipErrors]);

  const handleExecuteImport = async () => {
    if (!isAdmin) {
      alert('Administrator authority is required to import student records.');
      return;
    }
    if (!parseSummary || validRowsToImport.length === 0) return;

    setIsProcessing(true);

    try {
      let classesAdded: string[] = [];

      // 1. If any new classes were discovered and autoAddNewClasses is checked, create them
      if (autoAddNewClasses && parseSummary.newClassesFound.length > 0 && addMultipleClasses) {
        const res = await addMultipleClasses(parseSummary.newClassesFound);
        classesAdded = res.added;
      }

      // 2. Prepare payload
      const studentsPayload = validRowsToImport.map(r => r.data);

      // 3. Bulk insert to IndexedDB
      const result = await bulkAddStudents(studentsPayload);

      setImportResult({
        success: true,
        addedCount: result.addedCount,
        classesAdded,
        skippedCount: parseSummary.totalRows - result.addedCount,
      });

      if (onImportCompleted) {
        onImportCompleted(result.addedCount);
      }
    } catch (err) {
      console.error('Import error:', err);
      alert('An error occurred during bulk import. Please check your data.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Bulk Student Import
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" />
                    Admin Authority
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    Admin Permission Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Quickly import hundreds of student enrollment profiles at once using Microsoft Excel or CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Notice Banner */}
        <div className="px-6 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              {isAdmin ? (
                <>
                  Logged in as <strong className="font-bold">{currentUser?.fullName || 'Administrator'}</strong>. CSV records will be validated and enrolled into the institutional database.
                </>
              ) : (
                <>
                  Bulk student import is restricted to System Administrators. Please log in as an administrator.
                </>
              )}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
            Current Enrolled: {students.length} students
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SUCCESS SCREEN */}
          {importResult && (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-100">
                  Bulk Import Successful!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                  Successfully imported <strong>{importResult.addedCount} student record(s)</strong> into EduLedger Academy.
                  {importResult.classesAdded.length > 0 && (
                    <>
                      <br />
                      Automatically added {importResult.classesAdded.length} new class(es):{' '}
                      <strong>{importResult.classesAdded.join(', ')}</strong>.
                    </>
                  )}
                  {importResult.skippedCount > 0 && (
                    <>
                      <br />
                      Skipped {importResult.skippedCount} invalid or duplicate row(s).
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetFile}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition"
                >
                  View Enrolled Students
                </button>
              </div>
            </div>
          )}

          {!importResult && (
            <>
              {/* STEP 1: CSV TEMPLATE DOWNLOAD */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Step 1 • CSV Template
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      Download Official CSV Import Template
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Includes pre-formatted column headers, UTF-8 Byte Order Mark for Excel compatibility, and sample rows.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => downloadStudentCsvTemplate(true, availableClasses)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                      title="Download template pre-filled with sample student records"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Template with Sample Data</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadStudentCsvTemplate(false, availableClasses)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
                      title="Download blank template with exact column headers"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Blank Template</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Auto-detects headers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Checks duplicate Roll #</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Auto-creates new classes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Excel &amp; Google Sheets ready</span>
                  </div>
                </div>
              </div>

              {/* STEP 2: FILE UPLOAD ZONE */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Step 2 • Upload File
                </span>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!uploadedFileName ? (
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 sm:p-10 border-2 border-dashed border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl bg-indigo-50/30 dark:bg-indigo-950/20 text-center cursor-pointer transition group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Click to choose CSV file or drag and drop here
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Supports comma-separated (.csv) files up to 5,000 records
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {uploadedFileName}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {fileContent.length > 1024
                            ? `${(fileContent.length / 1024).toFixed(1)} KB`
                            : `${fileContent.length} bytes`}
                          {' • '}
                          {parseSummary?.totalRows ?? 0} rows detected
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      >
                        Change File
                      </button>
                      <button
                        type="button"
                        onClick={handleResetFile}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 3: VALIDATION STATS & LIVE PREVIEW TABLE */}
              {parseSummary && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Step 3 • Validation &amp; Verification
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        Import Verification Summary
                      </h4>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          previewFilter === 'all'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        All ({parseSummary.totalRows})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('valid')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          previewFilter === 'valid'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Valid ({parseSummary.validCount})
                      </button>
                      {parseSummary.errorCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('errors')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition ${
                            previewFilter === 'errors'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          Errors ({parseSummary.errorCount})
                        </button>
                      )}
                      {parseSummary.warningCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('warnings')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition ${
                            previewFilter === 'warnings'
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-amber-600 hover:bg-amber-50'
                          }`}
                        >
                          Warnings ({parseSummary.warningCount})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-400 block text-[11px] font-bold">Total In File</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {parseSummary.totalRows}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
                      <span className="text-emerald-700 dark:text-emerald-300 block text-[11px] font-bold">
                        Ready To Import
                      </span>
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                        {parseSummary.validCount}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80">
                      <span className="text-rose-700 dark:text-rose-300 block text-[11px] font-bold">
                        Blocking Errors
                      </span>
                      <span className="text-lg font-black text-rose-700 dark:text-rose-300">
                        {parseSummary.errorCount}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80">
                      <span className="text-indigo-700 dark:text-indigo-300 block text-[11px] font-bold">
                        New Classes
                      </span>
                      <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                        {parseSummary.newClassesFound.length}
                      </span>
                    </div>
                  </div>

                  {/* New Classes Notice & Option */}
                  {parseSummary.newClassesFound.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-indigo-950 dark:text-indigo-200">
                          New class(es) detected in CSV:{' '}
                          <strong className="font-bold">
                            {parseSummary.newClassesFound.join(', ')}
                          </strong>
                        </span>
                      </div>
                      <label className="flex items-center gap-2 font-semibold text-indigo-900 dark:text-indigo-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAddNewClasses}
                          onChange={e => setAutoAddNewClasses(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Auto-create missing classes in curriculum</span>
                      </label>
                    </div>
                  )}

                  {/* Skip Errors Option */}
                  {parseSummary.errorCount > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>
                          {parseSummary.errorCount} row(s) contain validation errors (e.g. duplicate Roll No or missing names).
                        </span>
                      </div>
                      <label className="flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={skipErrors}
                          onChange={e => setSkipErrors(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Skip invalid rows and import {parseSummary.validCount} valid record(s)</span>
                      </label>
                    </div>
                  )}

                  {/* Live Preview Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">Row</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 font-mono">Roll No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Class &amp; Sec</th>
                            <th className="py-2.5 px-3">Guardian &amp; Phone</th>
                            <th className="py-2.5 px-3">Validation Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredPreviewRows.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-400">
                                No rows matching the selected filter.
                              </td>
                            </tr>
                          ) : (
                            filteredPreviewRows.map(row => (
                              <tr
                                key={row.index}
                                className={
                                  !row.isValid
                                    ? 'bg-rose-50/50 dark:bg-rose-950/20'
                                    : row.warnings.length > 0
                                    ? 'bg-amber-50/40 dark:bg-amber-950/10'
                                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                                }
                              >
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                  #{row.index}
                                </td>
                                <td className="py-2.5 px-3">
                                  {row.isValid ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                      <Check className="w-3 h-3" /> Valid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                      <X className="w-3 h-3" /> Error
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                                  {row.data.rollNo || <span className="text-rose-500">Missing</span>}
                                  {row.isDuplicateRoll && (
                                    <span className="ml-1 text-[9px] px-1 py-0.2 bg-rose-200 text-rose-800 rounded font-semibold">
                                      Duplicate
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                  {row.data.fullName || <span className="text-rose-500">Missing</span>}
                                  <span className="block text-[10px] text-slate-400 font-normal">
                                    {row.data.gender} • DOB: {row.data.dateOfBirth}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {row.data.className}
                                  </span>
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">
                                    Sec {row.data.section}
                                  </span>
                                  {row.isNewClass && (
                                    <span className="block text-[9px] text-indigo-600 font-bold">
                                      New Class
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                  <span>{row.data.guardianName}</span>
                                  <span className="block text-[10px] text-slate-400">
                                    {row.data.contactNumber}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[11px]">
                                  {row.errors.length > 0 ? (
                                    <span className="text-rose-600 dark:text-rose-400 font-medium">
                                      {row.errors.join('; ')}
                                    </span>
                                  ) : row.warnings.length > 0 ? (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      {row.warnings.join('; ')}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                      Passed all schema validations
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {parseSummary && (
              <span>
                {validRowsToImport.length} valid student profile(s) ready to be written to database.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50"
            >
              Cancel
            </button>

            {parseSummary && !importResult && (
              <button
                type="button"
                disabled={validRowsToImport.length === 0 || isProcessing || !isAdmin}
                onClick={handleExecuteImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importing {validRowsToImport.length} Records...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Execute Bulk Import ({validRowsToImport.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
