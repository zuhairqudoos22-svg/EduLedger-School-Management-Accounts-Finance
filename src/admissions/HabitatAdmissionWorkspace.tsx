import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Download,
  FileStack,
  FileText,
  Loader2,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useSchool } from '../context/SchoolContext';
import { useAuth } from '../context/AuthContext';
import { canUserAdmissionAction, Student } from '../types';
import {
  createEmptyHabitatDraft,
  HabitatAdmissionDraft,
  habitatDraftToStudentPayload,
  resolveAdmissionFormSettings,
  studentToHabitatDraft,
} from './admissionTemplates';
import {
  compressStudentPassportPhoto,
  DuplicateMatch,
  formatCnicBForm,
  formatPakPhone,
  validateHabitatAdmission,
} from './admissionValidation';
import { HabitatAdmissionCanvas, HabitatRenderMode } from './HabitatAdmissionCanvas';
import {
  buildAdmissionFilename,
  exportBlankHabitatCopiesPdf,
  exportBulkFilledHabitatPdf,
  exportHabitatAdmissionPdf,
  printHabitatAdmissionElement,
} from './admissionExportEngine';

export interface HabitatAdmissionWorkspaceProps {
  draft: HabitatAdmissionDraft;
  onDraftChange: React.Dispatch<React.SetStateAction<HabitatAdmissionDraft>>;
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  onStudentSaved?: (saved: Student, isUpdate: boolean) => void;
  logoUrlOverride?: string | null;
}

/**
 * Interactive boxed dd / mm / yyyy date input with automatic focus advance
 * and backspace navigation between the 3 date groups.
 */
const BoxedDateInput: React.FC<{
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  error?: string;
  idPrefix: string;
}> = ({ value, onChange, error, idPrefix }) => {
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');

  const mmRef = useRef<HTMLInputElement | null>(null);
  const yyyyRef = useRef<HTMLInputElement | null>(null);
  const ddRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const m = (value || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      setYyyy(m[1]);
      setMm(m[2].padStart(2, '0'));
      setDd(m[3].padStart(2, '0'));
    } else if (!value) {
      setDd('');
      setMm('');
      setYyyy('');
    }
  }, [value]);

  const emitIfComplete = (d: string, m: string, y: string) => {
    if (!d && !m && !y) {
      onChange('');
      return;
    }
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const dn = Number(d);
      const mn = Number(m);
      const yn = Number(y);
      if (mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31 && yn >= 1900 && yn <= 2100) {
        onChange(`${y}-${m}-${d}`);
      }
    }
  };

  const baseBox = `text-center font-mono font-bold text-sm rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 ${
    error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700'
  }`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <input
        ref={ddRef}
        id={`${idPrefix}-dd`}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="DD"
        aria-label="Day"
        value={dd}
        onChange={e => {
          const clean = e.target.value.replace(/\D/g, '').slice(0, 2);
          setDd(clean);
          emitIfComplete(clean, mm, yyyy);
          if (clean.length === 2) mmRef.current?.focus();
        }}
        className={`${baseBox} w-12`}
      />
      <span className="text-slate-400 font-bold">/</span>
      <input
        ref={mmRef}
        id={`${idPrefix}-mm`}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="MM"
        aria-label="Month"
        value={mm}
        onKeyDown={e => {
          if (e.key === 'Backspace' && !mm) ddRef.current?.focus();
        }}
        onChange={e => {
          const clean = e.target.value.replace(/\D/g, '').slice(0, 2);
          setMm(clean);
          emitIfComplete(dd, clean, yyyy);
          if (clean.length === 2) yyyyRef.current?.focus();
        }}
        className={`${baseBox} w-12`}
      />
      <span className="text-slate-400 font-bold">/</span>
      <input
        ref={yyyyRef}
        id={`${idPrefix}-yyyy`}
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="YYYY"
        aria-label="Year"
        value={yyyy}
        onKeyDown={e => {
          if (e.key === 'Backspace' && !yyyy) mmRef.current?.focus();
        }}
        onChange={e => {
          const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
          setYyyy(clean);
          emitIfComplete(dd, mm, clean);
        }}
        className={`${baseBox} w-16`}
      />
      {/* Native date picker shortcut for fast calendar selection */}
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        aria-label="Pick date from calendar"
        title="Pick date from calendar"
        className="w-8 h-9 px-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs cursor-pointer"
      />
    </div>
  );
};

export const HabitatAdmissionWorkspace: React.FC<HabitatAdmissionWorkspaceProps> = ({
  draft,
  onDraftChange,
  selectedStudentId,
  onSelectStudentId,
  onStudentSaved,
  logoUrlOverride,
}) => {
  const {
    settings,
    classes,
    students,
    addStudent,
    updateStudent,
    logAdmissionEvent,
  } = useSchool();
  const { currentUser } = useAuth();

  const effectiveSettings = useMemo(
    () =>
      logoUrlOverride !== undefined
        ? { ...settings, logoUrl: logoUrlOverride || undefined }
        : settings,
    [settings, logoUrlOverride]
  );

  const admSettings = useMemo(() => resolveAdmissionFormSettings(effectiveSettings), [effectiveSettings]);

  // Active classes sorted by displayOrder
  const activeClassNames = useMemo(() => {
    const active = (classes || [])
      .filter(c => c.status === 'active')
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(c => c.name);
    if (active.length > 0) return active;
    return settings.standardClasses || ['Play Group', 'Nursery', 'Prep', 'Grade 1'];
  }, [classes, settings.standardClasses]);

  const sections = useMemo(
    () => (settings.standardSections?.length ? settings.standardSections : ['A', 'B', 'C']),
    [settings.standardSections]
  );

  // UI & Preview state
  const [renderMode, setRenderMode] = useState<HabitatRenderMode>('filled');
  const [printClassAndSection, setPrintClassAndSection] = useState(false); // Default OFF
  const [bilingualLabels, setBilingualLabels] = useState(admSettings.bilingualLabels);
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Preview auto-scaling + manual zoom
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(0.58);
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const effectiveScale = manualZoom ?? fitScale;

  // Off-screen exact 794x1123 print/export canvas refs
  const singleExportRef = useRef<HTMLDivElement | null>(null);
  const printTargetRef = useRef<HTMLDivElement | null>(null);
  const [printCopiesCount, setPrintCopiesCount] = useState(1);
  const [printModeOverride, setPrintModeOverride] = useState<HabitatRenderMode | null>(null);

  // Validation, Duplicate & Confirmation modals
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ageWarnings, setAgeWarnings] = useState<string[]>([]);
  const [duplicateModal, setDuplicateModal] = useState<{
    matches: DuplicateMatch[];
    pendingPrintAfterSave: boolean;
  } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Camera capture modal state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Blank copies modal state
  const [isBlankModalOpen, setIsBlankModalOpen] = useState(false);
  const [blankCopiesInput, setBlankCopiesInput] = useState(5);

  // Bulk filled students modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkClassFilter, setBulkClassFilter] = useState('ALL');
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ completed: number; total: number } | null>(null);
  const bulkCancelRef = useRef(false);
  const [bulkRenderDraft, setBulkRenderDraft] = useState<HabitatAdmissionDraft | null>(null);
  const bulkHiddenRef = useRef<HTMLDivElement | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 5000);
  }, []);

  // Keep bilingual toggle synced if admin updates Settings
  useEffect(() => {
    setBilingualLabels(admSettings.bilingualLabels);
  }, [admSettings.bilingualLabels]);

  // Responsive ResizeObserver for live preview container (guarantees zero horizontal page scroll)
  useEffect(() => {
    const el = previewWrapRef.current;
    if (!el) return;
    const recalc = () => {
      const availW = Math.max(260, el.clientWidth - 24);
      const nextFit = Math.min(1, Math.max(0.32, availW / 794));
      setFitScale(Math.round(nextFit * 100) / 100);
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Cleanup camera stream on unmount
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const updateField = <K extends keyof HabitatAdmissionDraft>(key: K, value: HabitatAdmissionDraft[K]) => {
    onDraftChange(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Load existing saved student into Habitat draft
  const handleLoadStudent = (studentId: string) => {
    onSelectStudentId(studentId);
    if (!studentId) return;
    const found = students.find(s => s.id === studentId);
    if (!found) return;
    onDraftChange(studentToHabitatDraft(found));
    setRenderMode('filled');
    setFieldErrors({});
    setAgeWarnings([]);
    setIsDirty(false);
    showToast('info', `Loaded saved record for "${found.fullName}" (Roll #${found.rollNo}).`);
  };

  // Photo Upload (client-side 4x4 crop + compress to ~20-30 KB base64)
  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { dataUrl, sizeKb } = await compressStudentPassportPhoto(file, 300, 0.75);
      updateField('photoUrl', dataUrl);
      setPhotoSizeKb(sizeKb);
      showToast('success', `Photo cropped to 4×4 passport square (${sizeKb} KB).`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to process photo.');
    }
  };

  // Start Device Camera (free browser getUserMedia)
  const handleStartCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('error', 'Camera API is not supported on this browser or insecure context.');
      return;
    }
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 60);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? `Camera access denied or unavailable: ${err.message}`
          : 'Could not access device camera.'
      );
    }
  };

  const handleCaptureCameraPhoto = async () => {
    if (!videoRef.current) return;
    try {
      const { dataUrl, sizeKb } = await compressStudentPassportPhoto(videoRef.current, 300, 0.75);
      updateField('photoUrl', dataUrl);
      setPhotoSizeKb(sizeKb);
      stopCamera();
      showToast('success', `Captured & cropped 4×4 photo (${sizeKb} KB).`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not capture camera frame.');
    }
  };

  // Core persist helper (enforces permission inside function)
  const commitSaveAdmission = async (printAfter: boolean) => {
    const isEditing = Boolean(draft.editingStudentId);
    const requiredAction = isEditing ? 'edit' : 'add';
    if (!canUserAdmissionAction(currentUser, requiredAction)) {
      showToast(
        'error',
        `Permission denied: Your role does not have permission to ${isEditing ? 'edit' : 'add'} student admissions.`
      );
      return;
    }
    if (printAfter && !canUserAdmissionAction(currentUser, 'print_forms')) {
      showToast('error', 'Permission denied: Your role does not have permission to print admission forms.');
      return;
    }

    setIsBusy(true);
    try {
      const existing = isEditing ? students.find(s => s.id === draft.editingStudentId) || null : null;
      const rollNoFallback =
        draft.rollNo.trim() ||
        `${settings.currentAcademicYear?.slice(0, 4) || '2026'}-${String(students.length + 1).padStart(3, '0')}`;
      const normalizedDraft: HabitatAdmissionDraft = {
        ...draft,
        rollNo: rollNoFallback,
        className: draft.className || activeClassNames[0] || 'Play Group',
        section: draft.section || sections[0] || 'A',
      };

      const payload = habitatDraftToStudentPayload(normalizedDraft, existing);
      let savedStudent: Student;

      if (existing) {
        savedStudent = { ...payload, id: existing.id };
        await updateStudent(savedStudent);
        await logAdmissionEvent(
          'Admission Updated (Habitat Form)',
          `Updated admission record for "${savedStudent.fullName}" (Roll #${savedStudent.rollNo}, ${savedStudent.className}-${savedStudent.section}) using Habitat A4 Portrait template.`,
          currentUser?.fullName,
          currentUser?.role,
          savedStudent.id,
          savedStudent.fullName
        );
      } else {
        savedStudent = await addStudent(payload);
        await logAdmissionEvent(
          'Admission Created (Habitat Form)',
          `Enrolled new student "${savedStudent.fullName}" (Roll #${savedStudent.rollNo}, ${savedStudent.className}-${savedStudent.section}) using Habitat A4 Portrait template.`,
          currentUser?.fullName,
          currentUser?.role,
          savedStudent.id,
          savedStudent.fullName
        );
      }

      onDraftChange({ ...normalizedDraft, editingStudentId: savedStudent.id });
      onSelectStudentId(savedStudent.id);
      setIsDirty(false);
      onStudentSaved?.(savedStudent, Boolean(existing));
      showToast(
        'success',
        existing
          ? `Admission record updated for "${savedStudent.fullName}".`
          : `Student "${savedStudent.fullName}" admitted successfully (Roll #${savedStudent.rollNo}).`
      );

      if (printAfter) {
        setPrintCopiesCount(1);
        setPrintModeOverride('filled');
        await new Promise(r => window.setTimeout(r, 80));
        if (printTargetRef.current) {
          await printHabitatAdmissionElement(printTargetRef.current);
          await logAdmissionEvent(
            'Admission Form Printed',
            `Printed filled Habitat A4 Portrait admission form for "${savedStudent.fullName}" (Roll #${savedStudent.rollNo}).`,
            currentUser?.fullName,
            currentUser?.role,
            savedStudent.id,
            savedStudent.fullName
          );
        }
        setPrintModeOverride(null);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to save admission.');
    } finally {
      setIsBusy(false);
    }
  };

  // Validate + Duplicate check before Save / Save & Print
  const handleSaveRequest = async (printAfter: boolean) => {
    const isEditing = Boolean(draft.editingStudentId);
    if (!canUserAdmissionAction(currentUser, isEditing ? 'edit' : 'add')) {
      showToast('error', 'Permission denied: You do not have permission to save admissions.');
      return;
    }
    if (printAfter && !canUserAdmissionAction(currentUser, 'print_forms')) {
      showToast('error', 'Permission denied: You do not have permission to print admission forms.');
      return;
    }

    const result = validateHabitatAdmission(draft, students, draft.editingStudentId);
    setFieldErrors(result.errors);
    setAgeWarnings(result.warnings);

    if (!result.isValid) {
      const firstErr = Object.values(result.errors)[0] || 'Please fix highlighted form fields.';
      showToast('error', firstErr);
      return;
    }

    if (result.duplicates.length > 0) {
      setDuplicateModal({
        matches: result.duplicates,
        pendingPrintAfterSave: printAfter,
      });
      return;
    }

    await commitSaveAdmission(printAfter);
  };

  // Download single A4 Portrait PDF (supports Filled, Partial, or Blank)
  const handleDownloadPdf = async () => {
    if (!canUserAdmissionAction(currentUser, 'print_forms')) {
      showToast('error', 'Permission denied: Your account does not have Print / Download Forms permission.');
      return;
    }
    if (!singleExportRef.current) return;

    setIsBusy(true);
    try {
      const filename = buildAdmissionFilename(draft.fullName, draft.rollNo, renderMode);
      const { sizeKb } = await exportHabitatAdmissionPdf(singleExportRef.current, filename);
      await logAdmissionEvent(
        'Admission Form PDF Downloaded',
        `Downloaded ${renderMode} Habitat A4 Portrait PDF "${filename}" (${sizeKb} KB).`,
        currentUser?.fullName,
        currentUser?.role,
        draft.editingStudentId,
        draft.fullName || 'Blank/Partial Form'
      );
      showToast('success', `Saved "${filename}" (${sizeKb} KB, A4 Portrait).`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to generate PDF.');
    } finally {
      setIsBusy(false);
    }
  };

  // Print Blank Form Batch (1..50 copies via Browser Print or Merged PDF)
  const handleBlankBatchAction = async (outputType: 'print' | 'pdf') => {
    if (!canUserAdmissionAction(currentUser, 'print_forms')) {
      showToast('error', 'Permission denied: Your account cannot print or export blank admission forms.');
      return;
    }
    const copies = Math.max(1, Math.min(50, Math.floor(blankCopiesInput || 1)));
    setIsBlankModalOpen(false);
    setIsBusy(true);

    try {
      if (outputType === 'pdf') {
        const prevMode = renderMode;
        setRenderMode('blank');
        await new Promise(r => window.setTimeout(r, 90));
        if (singleExportRef.current) {
          const { sizeKb } = await exportBlankHabitatCopiesPdf(singleExportRef.current, copies);
          await logAdmissionEvent(
            'Blank Admission Form Batch Exported (PDF)',
            `Generated ${copies} blank Habitat A4 Portrait admission form copy/copies as PDF (${sizeKb} KB).`,
            currentUser?.fullName,
            currentUser?.role
          );
          showToast('success', `Downloaded ${copies} blank A4 form${copies > 1 ? 's' : ''} (${sizeKb} KB).`);
        }
        setRenderMode(prevMode);
      } else {
        setPrintModeOverride('blank');
        setPrintCopiesCount(copies);
        await new Promise(r => window.setTimeout(r, 120));
        if (printTargetRef.current) {
          await printHabitatAdmissionElement(printTargetRef.current);
          await logAdmissionEvent(
            'Blank Admission Form Batch Printed',
            `Sent ${copies} blank Habitat A4 Portrait admission form copy/copies to printer.`,
            currentUser?.fullName,
            currentUser?.role
          );
        }
        setPrintCopiesCount(1);
        setPrintModeOverride(null);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Blank form batch failed.');
      setPrintCopiesCount(1);
      setPrintModeOverride(null);
    } finally {
      setIsBusy(false);
    }
  };

  // Bulk Filled Forms for selected students -> 1 merged A4 portrait PDF in chunks
  const filteredBulkStudents = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    return students.filter(s => {
      if (bulkClassFilter !== 'ALL' && s.className !== bulkClassFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        (s.fatherName || s.guardianName || '').toLowerCase().includes(q)
      );
    });
  }, [students, bulkSearch, bulkClassFilter]);

  const handleBulkFilledExport = async () => {
    if (!canUserAdmissionAction(currentUser, 'print_forms')) {
      showToast('error', 'Permission denied: Your account does not have Print Forms permission.');
      return;
    }
    const chosen = students.filter(s => bulkSelectedIds.includes(s.id));
    if (chosen.length === 0) {
      showToast('error', 'Select at least one saved student to export.');
      return;
    }

    bulkCancelRef.current = false;
    setBulkProgress({ completed: 0, total: chosen.length });
    setIsBusy(true);

    try {
      const res = await exportBulkFilledHabitatPdf(
        chosen,
        async student => {
          setBulkRenderDraft(studentToHabitatDraft(student));
          await new Promise(r => window.setTimeout(r, 70));
          if (!bulkHiddenRef.current) {
            throw new Error('Bulk PDF renderer not mounted.');
          }
          return bulkHiddenRef.current;
        },
        {
          filename: `Admission_Forms_Bulk_${chosen.length}_Students.pdf`,
          onProgress: (completed, total) => setBulkProgress({ completed, total }),
          shouldCancel: () => bulkCancelRef.current,
        }
      );

      if (res.cancelled) {
        showToast('info', `Bulk export cancelled after ${res.completed} of ${chosen.length} forms.`);
      } else {
        await logAdmissionEvent(
          'Bulk Filled Admission Forms Exported',
          `Exported ${res.completed} filled Habitat A4 Portrait admission forms in 1 merged PDF (${res.sizeKb} KB).`,
          currentUser?.fullName,
          currentUser?.role
        );
        showToast('success', `Exported ${res.completed} student forms in 1 merged PDF (${res.sizeKb} KB).`);
        setIsBulkModalOpen(false);
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Bulk export failed.');
    } finally {
      setBulkProgress(null);
      setBulkRenderDraft(null);
      setIsBusy(false);
    }
  };

  // Clear form with unsaved-changes confirmation
  const performClear = () => {
    const nextRoll = `${settings.currentAcademicYear?.slice(0, 4) || '2026'}-${String(students.length + 1).padStart(3, '0')}`;
    onDraftChange(
      createEmptyHabitatDraft(
        activeClassNames[0] || '',
        sections[0] || 'A',
        nextRoll,
        currentUser?.fullName || ''
      )
    );
    onSelectStudentId('');
    setFieldErrors({});
    setAgeWarnings([]);
    setPhotoSizeKb(null);
    setIsDirty(false);
    setShowClearConfirm(false);
    showToast('info', 'Form cleared for a new admission.');
  };

  const handleRequestClear = () => {
    const hasTypedAnything =
      isDirty || Boolean(draft.fullName.trim() || draft.fatherName.trim() || draft.contactNumber.trim());
    if (hasTypedAnything) {
      setShowClearConfirm(true);
    } else {
      performClear();
    }
  };

  const canSave = canUserAdmissionAction(currentUser, draft.editingStudentId ? 'edit' : 'add');
  const canPrint = canUserAdmissionAction(currentUser, 'print_forms');

  const inputClass = (fieldName?: string) =>
    `w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition ${
      fieldName && fieldErrors[fieldName]
        ? 'border-rose-400 dark:border-rose-500 bg-rose-50/30 dark:bg-rose-950/20'
        : 'border-slate-300 dark:border-slate-700'
    }`;

  const effectivePrintMode = printModeOverride ?? renderMode;

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-clip">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 no-print ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : toast.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : toast.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 shrink-0" />
            )}
            <span className="break-words">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Toolbar: Load Saved Student, Output Mode, Optional Toggles & Action Buttons */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Load Saved Student */}
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-[210px] max-w-xs flex-1">
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <select
                value={selectedStudentId}
                onChange={e => handleLoadStudent(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="">-- New Student Admission --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.className}-{s.section}, #{s.rollNo})
                  </option>
                ))}
              </select>
            </div>

            {/* Output Mode Toggle: Filled / Partial / Blank */}
            <div className="p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 flex items-center text-xs font-bold">
              {(
                [
                  { id: 'filled', label: 'Filled Form' },
                  { id: 'partial', label: 'Partial Form' },
                  { id: 'blank', label: 'Blank Form' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRenderMode(opt.id)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    renderMode === opt.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBusy || !canSave}
              onClick={() => handleSaveRequest(false)}
              title={canSave ? 'Save student admission to database' : 'No Add/Edit Admission permission'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
            >
              {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{draft.editingStudentId ? 'Update Admission' : 'Save Admission'}</span>
            </button>

            <button
              type="button"
              disabled={isBusy || !canSave || !canPrint}
              onClick={() => handleSaveRequest(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Save and Print</span>
            </button>

            <button
              type="button"
              disabled={isBusy || !canPrint}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              disabled={isBusy || !canPrint}
              onClick={() => setIsBlankModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <FileStack className="w-3.5 h-3.5" />
              <span>Print Blank Form</span>
            </button>

            <button
              type="button"
              disabled={isBusy || !canPrint || students.length === 0}
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Bulk Filled Forms</span>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={handleRequestClear}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Secondary Options Row: Print Class/Section toggle (default OFF) + Bilingual Labels toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={printClassAndSection}
                onChange={e => setPrintClassAndSection(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              />
              <span>Print class and section on the form</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={bilingualLabels}
                onChange={e => setBilingualLabels(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
              />
              <span>Bilingual Labels (English + Urdu)</span>
            </label>
          </div>

          {!canPrint && (
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Print &amp; PDF export requires &ldquo;Print Forms&rdquo; permission.
            </span>
          )}
        </div>
      </div>

      {/* Soft Advisory Age Warnings */}
      {ageWarnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2 no-print">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {ageWarnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Main Responsive Split: Left Data Entry Form + Right Live A4 Portrait Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start min-w-0 no-print">
        {/* LEFT COLUMN: Grouped Data Entry (2 cols on sm+, 1 col on mobile) */}
        <div className="xl:col-span-6 space-y-4 min-w-0">
          {/* Card 0: Enrollment Class, Section, Admission No, Registration Date & 4x4 Photo */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Enrollment &amp; Student Photo
              </h3>
              {draft.editingStudentId && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Editing Existing Record
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              {/* Enrollment Fields */}
              <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class
                  </label>
                  <select
                    value={draft.className}
                    onChange={e => updateField('className', e.target.value)}
                    className={inputClass()}
                  >
                    {activeClassNames.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={draft.section}
                    onChange={e => updateField('section', e.target.value)}
                    className={inputClass()}
                  >
                    {sections.map(sec => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Admission / Roll Number
                  </label>
                  <input
                    type="text"
                    value={draft.rollNo}
                    onChange={e => updateField('rollNo', e.target.value)}
                    placeholder="e.g. 2026-001"
                    className={`${inputClass()} font-mono`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Registration (DD / MM / YYYY)
                  </label>
                  <BoxedDateInput
                    idPrefix="reg-date"
                    value={draft.registrationDate}
                    onChange={val => updateField('registrationDate', val)}
                  />
                </div>
              </div>

              {/* 4x4 Passport Student Photo Box */}
              <div className="sm:col-span-4 flex flex-col items-center gap-2">
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 overflow-hidden flex flex-col items-center justify-center relative">
                  {draft.photoUrl ? (
                    <>
                      <img
                        src={draft.photoUrl}
                        alt="Student 4x4"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateField('photoUrl', '');
                          setPhotoSizeKb(null);
                        }}
                        title="Remove photo"
                        className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center px-2">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Student Photo
                      </p>
                      <p className="text-[10px] text-slate-400">4 × 4 Passport</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer transition">
                    <Upload className="w-3 h-3" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 cursor-pointer transition"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Camera</span>
                  </button>
                </div>
                {photoSizeKb !== null && (
                  <span className="text-[10px] text-slate-500">Compressed: {photoSizeKb} KB</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 1: PERSONAL INFORMATION (exact sample order) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-emerald-600 dark:text-emerald-400">PERSONAL </span>
              <span className="text-slate-900 dark:text-white">INFORMATION</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={draft.fullName}
                  onChange={e => updateField('fullName', e.target.value)}
                  placeholder="Student full name (English or اردو)"
                  className={inputClass('fullName')}
                />
                {fieldErrors.fullName && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Father's Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Father&apos;s Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={draft.fatherName}
                  onChange={e => updateField('fatherName', e.target.value)}
                  placeholder="Father's full name"
                  className={inputClass('fatherName')}
                />
                {fieldErrors.fatherName && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.fatherName}</p>
                )}
              </div>

              {/* Guardian Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Guardian Name
                </label>
                <input
                  type="text"
                  value={draft.guardianName}
                  onChange={e => updateField('guardianName', e.target.value)}
                  placeholder="Optional if same as Father's Name"
                  className={inputClass()}
                />
              </div>

              {/* Email & Nationality */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="parent@example.com"
                  className={inputClass('email')}
                />
                {fieldErrors.email && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={draft.nationality}
                  onChange={e => updateField('nationality', e.target.value)}
                  placeholder="Pakistani"
                  className={inputClass()}
                />
              </div>

              {/* Gender Checkboxes & Domicile */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <div
                  className={`flex items-center gap-5 px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 ${
                    fieldErrors.gender
                      ? 'border-rose-400 dark:border-rose-500'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {(['Male', 'Female'] as const).map(g => (
                    <label
                      key={g}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={draft.gender === g}
                        onChange={() => updateField('gender', draft.gender === g ? '' : g)}
                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                      />
                      <span>{g}</span>
                    </label>
                  ))}
                </div>
                {fieldErrors.gender && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.gender}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Domicile
                </label>
                <input
                  type="text"
                  value={draft.domicile}
                  onChange={e => updateField('domicile', e.target.value)}
                  placeholder="e.g. Rahim Yar Khan / Punjab"
                  className={inputClass()}
                />
              </div>

              {/* Date of Birth (Boxed) & Configurable Start Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <BoxedDateInput
                  idPrefix="dob"
                  value={draft.dateOfBirth}
                  onChange={val => updateField('dateOfBirth', val)}
                  error={fieldErrors.dateOfBirth}
                />
                {fieldErrors.dateOfBirth && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {admSettings.startDateLabel || 'Admission Date'}
                </label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={e => updateField('startDate', e.target.value)}
                  className={inputClass()}
                />
              </div>

              {/* Country & Religion */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={draft.country}
                  onChange={e => updateField('country', e.target.value)}
                  placeholder="Pakistan"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Religion
                </label>
                <input
                  type="text"
                  value={draft.religion}
                  onChange={e => updateField('religion', e.target.value)}
                  placeholder="Islam"
                  className={inputClass()}
                />
              </div>

              {/* CNIC / B-Form & Primary Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  CNIC / B.Form
                </label>
                <input
                  type="text"
                  value={draft.idNumber}
                  onChange={e => updateField('idNumber', formatCnicBForm(e.target.value))}
                  placeholder="12345-1234567-1"
                  maxLength={15}
                  className={`${inputClass('idNumber')} font-mono`}
                />
                {fieldErrors.idNumber && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.idNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone (Primary) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={draft.contactNumber}
                  onChange={e => updateField('contactNumber', formatPakPhone(e.target.value))}
                  placeholder="0300-1234567"
                  className={`${inputClass('contactNumber')} font-mono`}
                />
                {fieldErrors.contactNumber && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.contactNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: UNDERTAKING */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              UNDERTAKING &amp; OFFICE VERIFICATION
            </h3>

            {admSettings.showUndertaking && (
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                {admSettings.undertakingText}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.undertakingAccepted}
                  onChange={e => updateField('undertakingAccepted', e.target.checked)}
                  className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                />
                <span>Parent / Guardian Undertaking Accepted</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Officer Name (Optional)
                </label>
                <input
                  type="text"
                  value={draft.officerName}
                  onChange={e => updateField('officerName', e.target.value)}
                  placeholder="Printed above Officer Signature"
                  className={inputClass()}
                />
              </div>
            </div>
          </div>

          {/* Card 3: ADDRESS & GUARDIAN DETAILS */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              ADDRESS
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Present Address (Line 1)
                </label>
                <input
                  type="text"
                  value={draft.address}
                  onChange={e => updateField('address', e.target.value)}
                  placeholder="House / Street / Mohalla (English or اردو)"
                  className={inputClass()}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Present Address (Line 2)
                </label>
                <input
                  type="text"
                  value={draft.addressLine2}
                  onChange={e => updateField('addressLine2', e.target.value)}
                  placeholder="Colony / Town / City"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Occupation
                </label>
                <input
                  type="text"
                  value={draft.occupation}
                  onChange={e => updateField('occupation', e.target.value)}
                  placeholder="e.g. Business / Govt. Servant"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Education
                </label>
                <input
                  type="text"
                  value={draft.education}
                  onChange={e => updateField('education', e.target.value)}
                  placeholder="e.g. Graduate / Masters"
                  className={inputClass()}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone No 1
                </label>
                <input
                  type="tel"
                  value={draft.contactNumber}
                  onChange={e => updateField('contactNumber', formatPakPhone(e.target.value))}
                  placeholder="0300-1234567"
                  className={`${inputClass('contactNumber')} font-mono`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Income ({settings.currencySymbol || 'Rs.'})
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.monthlyIncome}
                  onChange={e => updateField('monthlyIncome', e.target.value)}
                  placeholder="e.g. 85000"
                  className={inputClass('monthlyIncome')}
                />
                {fieldErrors.monthlyIncome && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.monthlyIncome}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Phone No 2 (Alternate)
                </label>
                <input
                  type="tel"
                  value={draft.phone2}
                  onChange={e => updateField('phone2', formatPakPhone(e.target.value))}
                  placeholder="03XX-XXXXXXX"
                  className={`${inputClass('phone2')} font-mono`}
                />
                {fieldErrors.phone2 && (
                  <p className="text-[11px] text-rose-600 mt-1">{fieldErrors.phone2}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Scaled A4 Portrait Paper Preview */}
        <div className="xl:col-span-6 xl:sticky xl:top-4 space-y-3 min-w-0">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Live A4 Portrait Preview
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  210 × 297 mm
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setManualZoom(Math.max(0.3, Math.round((effectiveScale - 0.1) * 100) / 100))}
                  title="Zoom out"
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-1.5 text-slate-700 dark:text-slate-200">
                  {Math.round(effectiveScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setManualZoom(Math.min(1.2, Math.round((effectiveScale + 0.1) * 100) / 100))}
                  title="Zoom in"
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setManualZoom(null)}
                  title="Fit to screen"
                  className="px-1.5 py-0.5 rounded-lg text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-0.5"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Fit</span>
                </button>
              </div>
            </div>

            {layoutWarning && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{layoutWarning}</span>
              </div>
            )}

            {/* Self-contained Scroll/Scale Viewport (never causes horizontal page scroll) */}
            <div
              ref={previewWrapRef}
              className="w-full overflow-auto rounded-xl bg-slate-200/80 dark:bg-slate-950 p-3 flex justify-center"
              style={{ maxHeight: '78vh' }}
            >
              <div
                style={{
                  width: `${Math.round(794 * effectiveScale)}px`,
                  height: `${Math.round(1123 * effectiveScale)}px`,
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                    width: '794px',
                    height: '1123px',
                    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.18)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <HabitatAdmissionCanvas
                    settings={effectiveSettings}
                    draft={draft}
                    mode={renderMode}
                    printClassAndSection={printClassAndSection}
                    bilingualOverride={bilingualLabels}
                    onLayoutWarning={setLayoutWarning}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* OFF-SCREEN UNSCALED CAPTURE & NATIVE PRINT TARGETS                */}
      {/* ================================================================= */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      >
        <div ref={singleExportRef}>
          <HabitatAdmissionCanvas
            settings={effectiveSettings}
            draft={draft}
            mode={renderMode}
            printClassAndSection={printClassAndSection}
            bilingualOverride={bilingualLabels}
          />
        </div>

        {bulkRenderDraft && (
          <div ref={bulkHiddenRef}>
            <HabitatAdmissionCanvas
              settings={effectiveSettings}
              draft={bulkRenderDraft}
              mode="filled"
              printClassAndSection={printClassAndSection}
              bilingualOverride={bilingualLabels}
            />
          </div>
        )}
      </div>

      {/* Native Browser Print Target (hidden on screen, revealed cleanly in @media print) */}
      <div id="habitat-admission-print-target" ref={printTargetRef} className="hidden print:block">
        {Array.from({ length: printCopiesCount }).map((_, idx) => (
          <div key={idx} className="habitat-print-page">
            <HabitatAdmissionCanvas
              settings={effectiveSettings}
              draft={draft}
              mode={effectivePrintMode}
              printClassAndSection={printClassAndSection}
              bilingualOverride={bilingualLabels}
            />
          </div>
        ))}
      </div>

      {/* ================================================================= */}
      {/* MODAL 1: DEVICE CAMERA CAPTURE (getUserMedia, 4x4 square crop)    */}
      {/* ================================================================= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>Capture 4×4 Student Photo</span>
              </h4>
              <button
                type="button"
                onClick={stopCamera}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {cameraError ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                  {cameraError}
                </div>
              ) : (
                <div className="relative aspect-square w-full max-w-[300px] mx-auto rounded-xl overflow-hidden bg-slate-950 border-2 border-emerald-500">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-4 border border-white/50 rounded-lg pointer-events-none" />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                {!cameraError && (
                  <button
                    type="button"
                    onClick={handleCaptureCameraPhoto}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    Capture &amp; Crop 4×4
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: DUPLICATE RECORD WARNING                                 */}
      {/* ================================================================= */}
      {duplicateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 shadow-2xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Possible Duplicate Student Detected
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  An existing student record matches the entered CNIC/B-Form or Name + Father&apos;s Name + Date of Birth:
                </p>
              </div>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {duplicateModal.matches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200"
                >
                  {m.reason}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDuplicateModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Go Back &amp; Review
              </button>
              <button
                type="button"
                onClick={() => {
                  const shouldPrint = duplicateModal.pendingPrintAfterSave;
                  setDuplicateModal(null);
                  commitSaveAdmission(shouldPrint);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Save Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: CLEAR UNSAVED DATA CONFIRMATION                          */}
      {/* ================================================================= */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Clear Unsaved Form Data?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              You have entered information in this admission form. Clearing will discard unsaved inputs.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={performClear}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Clear Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: PRINT / DOWNLOAD BLANK FORM COPIES                       */}
      {/* ================================================================= */}
      {isBlankModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileStack className="w-4 h-4 text-emerald-600" />
                <span>Print / Export Blank Habitat Forms</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsBlankModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generates empty A4 Portrait forms pre-branded with your school header, logo, undertaking, fee note, and documents required for parents to fill by hand.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Number of Blank Copies (1 – 50)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={blankCopiesInput}
                onChange={e => setBlankCopiesInput(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                className={inputClass()}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleBlankBatchAction('pdf')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF ({blankCopiesInput})</span>
              </button>
              <button
                type="button"
                onClick={() => handleBlankBatchAction('print')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Copies ({blankCopiesInput})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: BULK FILLED FORMS FOR SELECTED STUDENTS (1 MERGED PDF)   */}
      {/* ================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 no-print">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Bulk Filled Admission Forms (Merged A4 PDF)</span>
              </h4>
              <button
                type="button"
                disabled={Boolean(bulkProgress)}
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bulkSearch}
                  onChange={e => setBulkSearch(e.target.value)}
                  placeholder="Search student or roll no..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <select
                value={bulkClassFilter}
                onChange={e => setBulkClassFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              >
                <option value="ALL">All Classes</option>
                {activeClassNames.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const visibleIds = filteredBulkStudents.map(s => s.id);
                  const allSelected = visibleIds.every(id => bulkSelectedIds.includes(id));
                  if (allSelected) {
                    setBulkSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
                  } else {
                    setBulkSelectedIds(Array.from(new Set([...bulkSelectedIds, ...visibleIds])));
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Toggle All ({filteredBulkStudents.length})
              </button>
            </div>

            {/* Student Selection List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
              {filteredBulkStudents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">No matching students found.</div>
              ) : (
                filteredBulkStudents.map(s => {
                  const checked = bulkSelectedIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setBulkSelectedIds(prev =>
                              checked ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            )
                          }
                          className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{s.fullName}</p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {s.className}-{s.section} • Roll #{s.rollNo}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">{s.contactNumber}</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Chunked Export Progress Bar */}
            {bulkProgress && (
              <div className="space-y-1.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-800 dark:text-indigo-200">
                  <span>
                    Generating form {bulkProgress.completed} of {bulkProgress.total}...
                  </span>
                  <span>{Math.round((bulkProgress.completed / bulkProgress.total) * 100)}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all"
                    style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500">
                {bulkSelectedIds.length} student{bulkSelectedIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex items-center gap-2">
                {bulkProgress ? (
                  <button
                    type="button"
                    onClick={() => {
                      bulkCancelRef.current = true;
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  >
                    Cancel Export
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      disabled={bulkSelectedIds.length === 0}
                      onClick={handleBulkFilledExport}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Merged PDF ({bulkSelectedIds.length})</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
