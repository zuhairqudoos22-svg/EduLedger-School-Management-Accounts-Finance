import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import {
  CertificateDesignId,
  CertificateQuality,
  CertificateTheme,
  CertificateType,
  IssuedCertificate,
  SchoolSettings,
  Staff,
  Student,
  canUserCertificateAction,
} from '../../types';
import {
  A4_LANDSCAPE_PX,
  CERTIFICATE_TEMPLATES,
  DEFAULT_CERTIFICATE_SCHOOL_FALLBACK,
  getCertificateTemplate,
} from '../../certificates/certificateTemplates';
import {
  CERTIFICATE_TYPE_PRESETS,
  EXTRACURRICULAR_ACTIVITIES,
  SavedWordingPreset,
  deleteSavedWordingPreset,
  getCertificateTypePreset,
  loadSavedWordingPresets,
  saveWordingPreset,
} from '../../certificates/certificatePresets';
import { CertificateCanvas } from '../../certificates/CertificateCanvas';
import {
  exportSingleCertificatePdf,
  printCertificateElement,
  runChunkedBulkCertificateExport,
} from '../../certificates/certificateExportEngine';
import {
  previewNextCertificateNumber,
  reserveCertificateNumbers,
} from '../../services/certificateNumberService';
import { generateCertificatePdf } from '../../utils/certificatePdf';
import { CertificateRegisterTab } from './CertificateRegisterTab';
import QRCode from 'qrcode';
import {
  Award,
  Download,
  Printer,
  Sparkles,
  FileCheck2,
  Upload,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  UserCheck,
  Users,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileArchive,
  FileText,
  Save,
  Bookmark,
  RotateCcw,
  X,
  Loader2,
  Lock,
  CheckSquare,
  Square,
  SlidersHorizontal,
  QrCode as QrCodeIcon,
  Palette,
  Languages,
} from 'lucide-react';

interface BulkOverrideRow {
  position: string;
  event: string;
  activity: string;
  remarks: string;
}

const ACCENT_SWATCHES = [
  { label: 'Default Design Palette', value: '' },
  { label: 'Emerald Green', value: '#118A3B' },
  { label: 'Royal Navy', value: '#1E3A8A' },
  { label: 'Classic Burgundy', value: '#881337' },
  { label: 'Deep Teal', value: '#0F766E' },
  { label: 'Charcoal Slate', value: '#1E293B' },
];

const PLACEHOLDER_CHIPS = [
  '{name}',
  '{fatherName}',
  '{class}',
  '{rollNo}',
  '{event}',
  '{position}',
  '{year}',
  '{date}',
  '{schoolName}',
  '{duration}',
  '{designation}',
  '{activity}',
  '{admissionNo}',
];

/**
 * Memoized scaled live thumbnail card for the 3 built-in vector designs.
 * Renders once per design/school/type update so the Design Gallery stays instant.
 */
const DesignThumbnailCard = React.memo<{
  designId: CertificateDesignId;
  sampleCert: IssuedCertificate;
  settings: SchoolSettings;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: (id: CertificateDesignId) => void;
}>(({ designId, sampleCert, settings, isSelected, isRecommended, onSelect }) => {
  const tpl = getCertificateTemplate(designId);
  const thumbWidth = 288;
  const scale = thumbWidth / A4_LANDSCAPE_PX.width;
  const thumbHeight = Math.round(A4_LANDSCAPE_PX.height * scale);

  const thumbCert = useMemo<IssuedCertificate>(
    () => ({
      ...sampleCert,
      designId,
      showQrCode: false,
    }),
    [sampleCert, designId]
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(designId)}
      className={`group text-left rounded-2xl border-2 p-3 transition-all bg-white dark:bg-slate-900 flex flex-col gap-2.5 ${
        isSelected
          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
          : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
      }`}
    >
      <div className="w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-1.5">
        <div
          className="relative overflow-hidden shadow-xs bg-white"
          style={{ width: thumbWidth, height: thumbHeight, maxWidth: '100%' }}
        >
          <div
            style={{
              width: A4_LANDSCAPE_PX.width,
              height: A4_LANDSCAPE_PX.height,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          >
            <CertificateCanvas cert={thumbCert} settings={settings} isThumbnail />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Design {tpl.code}: {tpl.name}
          </span>
          <div className="flex items-center gap-1">
            {isRecommended && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Best Fit
              </span>
            )}
            {isSelected && (
              <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}
          </div>
        </div>
        <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
          {tpl.description}
        </p>
      </div>
    </button>
  );
});

DesignThumbnailCard.displayName = 'DesignThumbnailCard';

export interface CertificatesViewProps {
  initialSubTab?: 'studio' | 'registry';
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({
  initialSubTab = 'studio',
}) => {
  const {
    classes,
    students,
    staff,
    settings,
    certificates,
    addCertificate,
    cancelCertificate,
    bulkAddCertificates,
    logCertificateEvent,
  } = useSchool();
  const { currentUser } = useAuth();
  const logoInputId = useId();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Top-level sub-tabs (synced when navigated directly via Sidebar)
  const [activeSubTab, setActiveSubTab] = useState<'studio' | 'registry'>(initialSubTab);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // 4-Step Studio Stepper (1: Type, 2: Design, 3: Recipients, 4: Preview & Download)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Permission flags (also re-checked inside every handler function)
  const canView = canUserCertificateAction(currentUser, 'view', {
    allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
  });
  const canGenerate = canUserCertificateAction(currentUser, 'generate', {
    allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
  });
  const canBulkGenerate = canUserCertificateAction(currentUser, 'bulk_generate', {
    allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
  });
  const canEditTemplates = canUserCertificateAction(currentUser, 'edit_templates');

  // Toast notifications
  const [toast, setToast] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const showToast = useCallback(
    (text: string, type: 'success' | 'info' | 'error' = 'success') => {
      setToast({ text, type });
      window.setTimeout(() => {
        setToast((prev) => (prev?.text === text ? null : prev));
      }, 4200);
    },
    []
  );

  // Active school profile defaults (fallback text used ONLY when Settings > School Profile is empty)
  const resolvedSchoolName =
    (settings.schoolName || '').trim() || DEFAULT_CERTIFICATE_SCHOOL_FALLBACK.schoolName;
  const resolvedSchoolAddress =
    (settings.schoolAddress || '').trim() || DEFAULT_CERTIFICATE_SCHOOL_FALLBACK.schoolAddress;
  const resolvedSchoolLogo = (settings.logoUrl || '').trim();
  const certPrefix = settings.certificatePrefix || 'CERT';

  // Initial certificate state
  const buildDefaultCert = useCallback((): IssuedCertificate => {
    const today = new Date().toISOString().split('T')[0];
    const preset = getCertificateTypePreset('sports_festival');
    const firstStudent = students.find((s) => s.status === 'active') || students[0];

    return {
      id: `draft-${Date.now()}`,
      certificateNumber: previewNextCertificateNumber(certPrefix, certificates, settings),
      type: preset.id,
      recipientType: 'student',
      recipientId: firstStudent?.id || '',
      recipientName: firstStudent?.fullName || 'Student Name',
      schoolName: resolvedSchoolName,
      schoolTagline: settings.schoolTagline || '',
      schoolAddress: resolvedSchoolAddress,
      schoolAffiliation: '',
      schoolLogo: resolvedSchoolLogo,
      logoPreset: resolvedSchoolLogo ? 'none' : 'crest',
      logoSize: 'md',
      logoPosition: 'center',
      certificateTitle: preset.en.title,
      subtitle: preset.en.subtitle,
      academicYear: settings.currentAcademicYear || String(new Date().getFullYear()),
      achievementTitle: preset.en.event,
      competitionOrEvent: preset.en.event,
      rankOrGrade: preset.en.position,
      activityName: 'Debate Competition',
      citationText: preset.en.paragraph1,
      secondParagraph: preset.en.paragraph2,
      admissionNo: firstStudent?.rollNo ? `ADM-${firstStudent.rollNo}` : '',
      rollNo: firstStudent?.rollNo || '',
      classEnrolled: firstStudent?.className || '',
      section: firstStudent?.section || '',
      guardianName: firstStudent?.fatherName || firstStudent?.guardianName || '',
      guardianRelation: firstStudent?.guardianRelation || 'Father',
      dateOfBirth: firstStudent?.dateOfBirth || '',
      dateOfAdmission: firstStudent?.admissionDate || '',
      dateOfLeaving: today,
      classLeaving: firstStudent
        ? `${firstStudent.className}${firstStudent.section ? ` - ${firstStudent.section}` : ''}`
        : '',
      reasonForLeaving: 'Parental relocation / course completion',
      generalConduct: 'Exemplary & Good',
      duesCleared: true,
      remarks: 'All institutional dues cleared in full.',
      employeeCode: '',
      designation: '',
      department: '',
      tenureDates: '',
      theme: 'royal_gold',
      designId: preset.recommendedDesign,
      accentColorOverride: '',
      language: 'en',
      sealColor: 'gold',
      showQrCode: false,
      signatory1Title: preset.en.signatory1Title,
      signatory1Name: '',
      signatory2Title: preset.en.signatory2Title,
      signatory2Name: '',
      signatory3Title: preset.en.signatory3Title,
      signatory3Name: '',
      issueDate: today,
      issuedBy: currentUser?.fullName || currentUser?.username || 'Administration',
      status: 'Issued',
      createdAt: new Date().toISOString(),
    };
  }, [
    certPrefix,
    certificates,
    currentUser,
    resolvedSchoolAddress,
    resolvedSchoolLogo,
    resolvedSchoolName,
    settings.currentAcademicYear,
    settings.schoolTagline,
    students,
  ]);

  const [activeCert, setActiveCert] = useState<IssuedCertificate>(() => buildDefaultCert());

  // Sync preview certificate number & School Profile updates gently
  useEffect(() => {
    setActiveCert((prev) => ({
      ...prev,
      schoolName: resolvedSchoolName,
      schoolAddress: resolvedSchoolAddress,
      schoolLogo: prev.schoolLogo || resolvedSchoolLogo,
    }));
  }, [resolvedSchoolName, resolvedSchoolAddress, resolvedSchoolLogo]);

  // Saved custom wording presets
  const [savedPresets, setSavedPresets] = useState<SavedWordingPreset[]>(() =>
    loadSavedWordingPresets()
  );
  const [newPresetName, setNewPresetName] = useState('');
  const [showLegacyPanel, setShowLegacyPanel] = useState(false);

  // Quality & Zoom state
  const [quality, setQuality] = useState<CertificateQuality>('standard');
  const [manualZoom, setManualZoom] = useState<number | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [autoFitZoom, setAutoFitZoom] = useState<number>(0.55);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const updateScale = () => {
      const avail = Math.max(260, el.clientWidth - 24);
      const next = Math.min(1, Number((avail / A4_LANDSCAPE_PX.width).toFixed(3)));
      setAutoFitZoom(next);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [currentStep, activeSubTab]);

  const effectiveZoom = manualZoom ?? autoFitZoom;

  // Layout collision/overflow warning from CertificateCanvas
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null);

  // Optional QR code data URL (extension point for public verification page)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  useEffect(() => {
    if (!activeCert.showQrCode) {
      setQrCodeDataUrl('');
      return;
    }
    let cancelled = false;
    const payload = JSON.stringify({
      certNo: activeCert.certificateNumber,
      name: activeCert.recipientName,
      type: activeCert.type,
      date: activeCert.issueDate,
      school: activeCert.schoolName,
    });
    QRCode.toDataURL(payload, { margin: 1, width: 120 })
      .then((url) => {
        if (!cancelled) setQrCodeDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeCert.showQrCode,
    activeCert.certificateNumber,
    activeCert.recipientName,
    activeCert.type,
    activeCert.issueDate,
    activeCert.schoolName,
  ]);

  // =========================================================================
  // OFF-SCREEN CAPTURE PORTAL (Used for single PDF, bulk PDF/ZIP, and Register)
  // =========================================================================
  const [captureCert, setCaptureCert] = useState<IssuedCertificate | null>(null);
  const [captureQr, setCaptureQr] = useState<string>('');
  const captureWrapperRef = useRef<HTMLDivElement>(null);
  const captureResolveRef = useRef<((el: HTMLElement) => void) | null>(null);

  useEffect(() => {
    if (!captureCert || !captureResolveRef.current) return;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const host = captureWrapperRef.current;
        const canvasNode = host?.querySelector<HTMLElement>('[data-cert-canvas]');
        if (canvasNode && captureResolveRef.current) {
          const resolve = captureResolveRef.current;
          captureResolveRef.current = null;
          resolve(canvasNode);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [captureCert, captureQr]);

  const renderCertificateForCapture = useCallback(
    async (cert: IssuedCertificate): Promise<HTMLElement> => {
      let qr = '';
      if (cert.showQrCode) {
        try {
          qr = await QRCode.toDataURL(
            JSON.stringify({
              certNo: cert.certificateNumber,
              name: cert.recipientName,
              type: cert.type,
              date: cert.issueDate,
              school: cert.schoolName,
            }),
            { margin: 1, width: 120 }
          );
        } catch {
          qr = '';
        }
      }
      return new Promise<HTMLElement>((resolve) => {
        captureResolveRef.current = resolve;
        setCaptureQr(qr);
        setCaptureCert({ ...cert });
      });
    },
    []
  );

  // =========================================================================
  // STEP 1 HANDLERS: TYPE, LANGUAGE & WORDING PRESETS
  // =========================================================================
  const handleSelectType = (typeId: CertificateType) => {
    const preset = getCertificateTypePreset(typeId);
    const lang = activeCert.language || 'en';
    const block = lang === 'ur' ? preset.ur : preset.en;
    const nextRecipientType =
      preset.audience === 'employee'
        ? 'employee'
        : preset.audience === 'student'
        ? 'student'
        : activeCert.recipientType;

    setActiveCert((prev) => ({
      ...prev,
      type: typeId,
      recipientType: nextRecipientType,
      designId: prev.designId || preset.recommendedDesign,
      certificateTitle: block.title,
      subtitle: block.subtitle,
      competitionOrEvent: block.event,
      achievementTitle: block.event,
      rankOrGrade: block.position,
      citationText: block.paragraph1,
      secondParagraph: block.paragraph2,
      signatory1Title: block.signatory1Title,
      signatory2Title: block.signatory2Title,
      signatory3Title: block.signatory3Title,
      reissuedFrom: undefined,
    }));
    // Clear bulk selections if switching between student & employee audience
    if (nextRecipientType !== activeCert.recipientType) {
      setSelectedRecipientIds([]);
    }
    showToast(`Applied "${preset.shortLabel}" preset wording.`, 'info');
  };

  const handleToggleLanguage = (lang: 'en' | 'ur') => {
    const preset = getCertificateTypePreset(activeCert.type);
    const block = lang === 'ur' ? preset.ur : preset.en;
    setActiveCert((prev) => ({
      ...prev,
      language: lang,
      certificateTitle: block.title,
      subtitle: block.subtitle,
      competitionOrEvent: block.event,
      achievementTitle: block.event,
      rankOrGrade: block.position,
      citationText: block.paragraph1,
      secondParagraph: block.paragraph2,
      signatory1Title: block.signatory1Title,
      signatory2Title: block.signatory2Title,
      signatory3Title: block.signatory3Title,
    }));
  };

  const handleInsertPlaceholder = (token: string, field: 'citationText' | 'secondParagraph') => {
    setActiveCert((prev) => ({
      ...prev,
      [field]: `${prev[field] || ''}${prev[field] ? ' ' : ''}${token}`,
    }));
  };

  const handleSaveCustomPreset = () => {
    if (!canUserCertificateAction(currentUser, 'edit_templates')) {
      showToast('You do not have permission to save wording presets.', 'error');
      return;
    }
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      showToast('Enter a name for your wording preset first.', 'error');
      return;
    }
    const preset: SavedWordingPreset = {
      id: `preset-${Date.now()}`,
      name: trimmed,
      type: activeCert.type,
      language: activeCert.language || 'en',
      title: activeCert.certificateTitle || '',
      subtitle: activeCert.subtitle || '',
      event: activeCert.competitionOrEvent || '',
      position: activeCert.rankOrGrade || '',
      activityName: activeCert.activityName || '',
      paragraph1: activeCert.citationText || '',
      paragraph2: activeCert.secondParagraph || '',
      signatory1Title: activeCert.signatory1Title || '',
      signatory2Title: activeCert.signatory2Title || '',
      createdAt: new Date().toISOString(),
    };
    const next = saveWordingPreset(preset);
    setSavedPresets(next);
    setNewPresetName('');
    showToast(`Saved wording preset "${trimmed}".`);
  };

  const handleApplySavedPreset = (preset: SavedWordingPreset) => {
    setActiveCert((prev) => ({
      ...prev,
      type: preset.type,
      language: preset.language,
      certificateTitle: preset.title,
      subtitle: preset.subtitle,
      competitionOrEvent: preset.event,
      achievementTitle: preset.event,
      rankOrGrade: preset.position,
      activityName: preset.activityName || prev.activityName,
      citationText: preset.paragraph1,
      secondParagraph: preset.paragraph2,
      signatory1Title: preset.signatory1Title,
      signatory2Title: preset.signatory2Title,
    }));
    showToast(`Loaded saved preset "${preset.name}".`, 'info');
  };

  const handleDeleteCustomPreset = (id: string) => {
    if (!canUserCertificateAction(currentUser, 'edit_templates')) {
      showToast('You do not have permission to modify wording presets.', 'error');
      return;
    }
    setSavedPresets(deleteSavedWordingPreset(id));
    showToast('Removed saved wording preset.', 'info');
  };

  // =========================================================================
  // STEP 3: RECIPIENTS (SINGLE + BULK UNIFIED DIRECTORY PICKER)
  // =========================================================================
  const [recipientSearch, setRecipientSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<boolean>(true);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [bulkOverrides, setBulkOverrides] = useState<Record<string, BulkOverrideRow>>({});

  // Sorted dynamic class list from SchoolContext
  const sortedClasses = useMemo(() => {
    return [...classes]
      .filter((c) => c.status === 'active')
      .sort((a, b) => a.display_order - b.display_order);
  }, [classes]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (classFilter === 'all' || s.className === classFilter) {
        if (s.section) set.add(s.section);
      }
    });
    return Array.from(set).sort();
  }, [students, classFilter]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    staff.forEach((m) => {
      if (m.department) set.add(m.department);
    });
    return Array.from(set).sort();
  }, [staff]);

  // Teacher own-class restriction
  const teacherAssignedClasses = useMemo(() => {
    if (
      currentUser?.role === 'teacher' &&
      Array.isArray(currentUser.assignedClasses) &&
      currentUser.assignedClasses.length > 0
    ) {
      return currentUser.assignedClasses.map((c) => c.trim().toLowerCase());
    }
    return null;
  }, [currentUser]);

  const filteredStudents = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    return students.filter((s) => {
      if (activeOnlyFilter && s.status !== 'active') return false;
      if (teacherAssignedClasses) {
        if (!teacherAssignedClasses.includes((s.className || '').trim().toLowerCase())) {
          return false;
        }
      }
      if (classFilter !== 'all' && s.className !== classFilter) return false;
      if (sectionFilter !== 'all' && (s.section || '') !== sectionFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        (s.rollNo || '').toLowerCase().includes(q) ||
        (s.className || '').toLowerCase().includes(q) ||
        (s.guardianName || '').toLowerCase().includes(q) ||
        (s.fatherName || '').toLowerCase().includes(q)
      );
    });
  }, [students, recipientSearch, classFilter, sectionFilter, activeOnlyFilter, teacherAssignedClasses]);

  const filteredStaff = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    return staff.filter((m) => {
      if (activeOnlyFilter && m.status !== 'active') return false;
      if (departmentFilter !== 'all' && m.department !== departmentFilter) return false;
      if (!q) return true;
      return (
        m.fullName.toLowerCase().includes(q) ||
        (m.employeeCode || '').toLowerCase().includes(q) ||
        (m.designation || '').toLowerCase().includes(q) ||
        (m.department || '').toLowerCase().includes(q)
      );
    });
  }, [staff, recipientSearch, departmentFilter, activeOnlyFilter]);

  const applyStudentToCert = useCallback((student: Student, base: IssuedCertificate): IssuedCertificate => {
    const today = base.issueDate || new Date().toISOString().split('T')[0];
    return {
      ...base,
      recipientType: 'student',
      recipientId: student.id,
      recipientName: student.fullName,
      admissionNo: student.rollNo ? `ADM-${student.rollNo}` : base.admissionNo || '',
      rollNo: student.rollNo || '',
      classEnrolled: student.className || '',
      section: student.section || '',
      guardianName: student.fatherName || student.guardianName || '',
      guardianRelation: student.guardianRelation || 'Father',
      dateOfBirth: student.dateOfBirth || '',
      dateOfAdmission: student.admissionDate || '',
      dateOfLeaving: base.dateOfLeaving || today,
      classLeaving: `${student.className}${student.section ? ` - ${student.section}` : ''}`,
    };
  }, []);

  const applyStaffToCert = useCallback((member: Staff, base: IssuedCertificate): IssuedCertificate => {
    return {
      ...base,
      recipientType: 'employee',
      recipientId: member.id,
      recipientName: member.fullName,
      employeeCode: member.employeeCode || `EMP-${member.id.slice(-4)}`,
      designation: member.designation || '',
      department: member.department || '',
      tenureDates: member.joiningDate ? `${member.joiningDate} to Present` : 'Current Tenure',
    };
  }, []);

  const handleClickStudentRow = (student: Student) => {
    setActiveCert((prev) => applyStudentToCert(student, prev));
  };

  const handleClickStaffRow = (member: Staff) => {
    setActiveCert((prev) => applyStaffToCert(member, prev));
  };

  const handleToggleRecipientCheckbox = (id: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (activeCert.recipientType === 'employee') {
      setSelectedRecipientIds(filteredStaff.map((m) => m.id));
    } else {
      setSelectedRecipientIds(filteredStudents.map((s) => s.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedRecipientIds([]);
    setBulkOverrides({});
  };

  const updateBulkOverride = (
    recipientId: string,
    field: keyof BulkOverrideRow,
    value: string
  ) => {
    setBulkOverrides((prev) => {
      const existing = prev[recipientId] || {
        position: activeCert.rankOrGrade || '',
        event: activeCert.competitionOrEvent || '',
        activity: activeCert.activityName || '',
        remarks: activeCert.remarks || '',
      };
      return {
        ...prev,
        [recipientId]: { ...existing, [field]: value },
      };
    });
  };

  // Selected recipient records for bulk preview/generation
  const selectedRecords = useMemo(() => {
    if (activeCert.recipientType === 'employee') {
      return staff.filter((m) => selectedRecipientIds.includes(m.id));
    }
    return students.filter((s) => selectedRecipientIds.includes(s.id));
  }, [activeCert.recipientType, staff, students, selectedRecipientIds]);

  // Duplicate issuance detector (same recipientId + same type + same event + same year, non-cancelled)
  const detectDuplicateForRecipient = useCallback(
    (recipientId: string | undefined, type: CertificateType, eventName: string, yearStr: string) => {
      if (!recipientId) return null;
      const normEvent = (eventName || '').trim().toLowerCase();
      const normYear = (yearStr || '').trim().toLowerCase();
      return (
        certificates.find((c) => {
          if ((c.status || 'Issued') === 'Cancelled') return false;
          if (c.recipientId !== recipientId) return false;
          if (c.type !== type) return false;
          const cEvent = (c.competitionOrEvent || c.achievementTitle || '').trim().toLowerCase();
          const cYear = (c.academicYear || (c.issueDate || '').slice(0, 4)).trim().toLowerCase();
          return cEvent === normEvent && cYear === normYear;
        }) || null
      );
    },
    [certificates]
  );

  const singleDuplicateMatch = useMemo(() => {
    const yearStr = activeCert.academicYear || (activeCert.issueDate || '').slice(0, 4);
    return detectDuplicateForRecipient(
      activeCert.recipientId,
      activeCert.type,
      activeCert.competitionOrEvent || activeCert.achievementTitle || '',
      yearStr
    );
  }, [activeCert, detectDuplicateForRecipient]);

  const bulkDuplicateMatches = useMemo(() => {
    const yearStr = activeCert.academicYear || (activeCert.issueDate || '').slice(0, 4);
    const hits: { name: string; existingNo: string }[] = [];
    for (const rec of selectedRecords) {
      const ov = bulkOverrides[rec.id];
      const ev = ov?.event || activeCert.competitionOrEvent || activeCert.achievementTitle || '';
      const match = detectDuplicateForRecipient(rec.id, activeCert.type, ev, yearStr);
      if (match) {
        hits.push({ name: rec.fullName, existingNo: match.certificateNumber });
      }
    }
    return hits;
  }, [selectedRecords, bulkOverrides, activeCert, detectDuplicateForRecipient]);

  // Missing-field validation highlights
  const missingFields = useMemo(() => {
    const issues: string[] = [];
    if (!(activeCert.recipientName || '').trim()) {
      issues.push('Recipient Name');
    }
    if (!activeCert.issueDate) {
      issues.push('Issue Date');
    }
    if (activeCert.type === 'school_leaving') {
      if (!(activeCert.admissionNo || '').trim()) issues.push('Admission No');
      if (!(activeCert.guardianName || '').trim()) issues.push('Father / Guardian Name');
      if (!(activeCert.classLeaving || activeCert.classEnrolled || '').trim()) {
        issues.push('Last Class Attended');
      }
    }
    return issues;
  }, [activeCert]);

  // =========================================================================
  // LOGO UPLOAD (TEMPORARY OVERRIDE WITHOUT ALTERING SCHOOL SETTINGS)
  // =========================================================================
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo image must be under 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setActiveCert((prev) => ({ ...prev, schoolLogo: dataUrl, logoPreset: 'none' }));
        showToast('Temporary certificate logo loaded.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = () => {
    setActiveCert((prev) => ({ ...prev, schoolLogo: '' }));
    if (logoInputRef.current) logoInputRef.current.value = '';
    showToast('Logo cleared — certificate renders cleanly in text-only header mode.', 'info');
  };

  // =========================================================================
  // SINGLE ISSUE, DOWNLOAD PDF & PRINT HANDLERS
  // =========================================================================
  const [isSingleBusy, setIsSingleBusy] = useState(false);

  const handleIssueAndDownloadSingle = async () => {
    // Enforce permission inside handler
    if (
      !canUserCertificateAction(currentUser, 'generate', {
        allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
        targetClassName: activeCert.classEnrolled,
      })
    ) {
      showToast('You do not have permission to issue certificates for this recipient.', 'error');
      return;
    }

    if (!(activeCert.recipientName || '').trim()) {
      showToast('Please select or enter a recipient name before issuing.', 'error');
      return;
    }

    setIsSingleBusy(true);
    try {
      const { numbers, source } = await reserveCertificateNumbers({
        count: 1,
        prefix: certPrefix,
        settings,
        existingCertificates: certificates,
      });
      const assignedNo = numbers[0];

      const issuedCert: IssuedCertificate = {
        ...activeCert,
        id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        certificateNumber: assignedNo,
        status: activeCert.reissuedFrom ? 'Re-issued' : 'Issued',
        issuedBy: currentUser?.fullName || currentUser?.username || 'Administration',
        createdAt: new Date().toISOString(),
      };

      // Persist metadata to IndexedDB + Firestore sync
      await addCertificate(issuedCert);
      setActiveCert(issuedCert);

      // Capture exact 1123x794 off-screen DOM node & download A4 Landscape PDF
      const node = await renderCertificateForCapture(issuedCert);
      await exportSingleCertificatePdf(node, issuedCert, quality);
      setCaptureCert(null);

      await logCertificateEvent(
        issuedCert.reissuedFrom ? 'Certificate Re-Issued & Downloaded' : 'Certificate Issued & Downloaded',
        `Issued ${issuedCert.certificateNumber} (${getCertificateTypePreset(issuedCert.type).shortLabel}) for ${issuedCert.recipientName} using Design ${getCertificateTemplate(issuedCert.designId).code}.`,
        currentUser?.fullName || currentUser?.username,
        currentUser?.role,
        issuedCert.id
      );

      showToast(
        `Issued & downloaded ${issuedCert.certificateNumber} (${
          source === 'firestore_transaction' ? 'Firestore atomic ID' : 'local sequential ID'
        }) for ${issuedCert.recipientName}!`
      );
    } catch (err) {
      console.error('[Certificates] Single issue/export error:', err);
      showToast('Failed to generate A4 PDF. Please try again.', 'error');
    } finally {
      setIsSingleBusy(false);
    }
  };

  const handleDownloadPreviewOnly = async () => {
    if (!canUserCertificateAction(currentUser, 'view')) {
      showToast('Permission denied.', 'error');
      return;
    }
    setIsSingleBusy(true);
    try {
      const node = await renderCertificateForCapture(activeCert);
      await exportSingleCertificatePdf(node, activeCert, quality);
      setCaptureCert(null);
      showToast('Preview PDF downloaded (not saved to Register).', 'info');
    } catch (err) {
      console.error('[Certificates] Preview PDF error:', err);
      showToast('Failed to export preview PDF.', 'error');
    } finally {
      setIsSingleBusy(false);
    }
  };

  const handleDownloadLegacyPdf = async () => {
    setIsSingleBusy(true);
    try {
      await generateCertificatePdf(activeCert, settings);
      showToast('Legacy Classic PDF downloaded successfully!');
    } catch (err) {
      console.error('[Certificates] Legacy PDF error:', err);
      showToast('Failed to generate legacy PDF.', 'error');
    } finally {
      setIsSingleBusy(false);
    }
  };

  const handlePrintCurrent = async () => {
    const target = document.getElementById('certificate-print-target');
    await printCertificateElement(target);
    await logCertificateEvent(
      'Printed Certificate',
      `Printed certificate ${activeCert.certificateNumber} for ${activeCert.recipientName}.`,
      currentUser?.fullName || currentUser?.username,
      currentUser?.role,
      activeCert.id
    );
  };

  // =========================================================================
  // BULK GENERATION (CONFIRMATION MODAL + CHUNKED ENGINE + PROGRESS + CANCEL)
  // =========================================================================
  const [bulkConfirmMode, setBulkConfirmMode] = useState<'merged_pdf' | 'zip' | null>(null);
  const [bulkProgress, setBulkProgress] = useState<{
    running: boolean;
    completed: number;
    total: number;
    currentName: string;
    mode: 'merged_pdf' | 'zip';
  } | null>(null);
  const bulkCancelledRef = useRef<boolean>(false);

  const handleRequestBulkExport = (mode: 'merged_pdf' | 'zip') => {
    if (
      !canUserCertificateAction(currentUser, 'bulk_generate', {
        allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
      })
    ) {
      showToast('You do not have permission for bulk certificate generation.', 'error');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast('Select at least one recipient using the checkboxes first.', 'error');
      return;
    }
    setBulkConfirmMode(mode);
  };

  const handleConfirmBulkExport = async () => {
    const mode = bulkConfirmMode;
    if (!mode) return;
    if (
      !canUserCertificateAction(currentUser, 'bulk_generate', {
        allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
      })
    ) {
      showToast('You do not have permission for bulk certificate generation.', 'error');
      setBulkConfirmMode(null);
      return;
    }

    setBulkConfirmMode(null);
    bulkCancelledRef.current = false;

    const total = selectedRecords.length;
    setBulkProgress({
      running: true,
      completed: 0,
      total,
      currentName: 'Reserving sequential certificate numbers...',
      mode,
    });

    try {
      // 1. Atomically reserve sequential numbers for the entire batch via Firestore transaction
      const { numbers } = await reserveCertificateNumbers({
        count: total,
        prefix: certPrefix,
        settings,
        existingCertificates: certificates,
      });

      const nowIso = new Date().toISOString();
      const actorName = currentUser?.fullName || currentUser?.username || 'Administration';

      // 2. Build personalized certificate objects for every recipient
      const batchCerts: IssuedCertificate[] = selectedRecords.map((rec, idx) => {
        const populated =
          activeCert.recipientType === 'employee'
            ? applyStaffToCert(rec as Staff, activeCert)
            : applyStudentToCert(rec as Student, activeCert);

        const ov = bulkOverrides[rec.id];
        return {
          ...populated,
          id: `cert-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          certificateNumber: numbers[idx],
          rankOrGrade: ov?.position !== undefined ? ov.position : populated.rankOrGrade,
          competitionOrEvent: ov?.event !== undefined ? ov.event : populated.competitionOrEvent,
          achievementTitle: ov?.event !== undefined ? ov.event : populated.achievementTitle,
          activityName: ov?.activity !== undefined ? ov.activity : populated.activityName,
          remarks: ov?.remarks !== undefined ? ov.remarks : populated.remarks,
          status: 'Issued',
          issuedBy: actorName,
          createdAt: nowIso,
        };
      });

      // 3. Run chunked (10-at-a-time) PDF or ZIP capture
      const result = await runChunkedBulkCertificateExport({
        certificates: batchCerts,
        mode,
        quality,
        chunkSize: 10,
        callbacks: {
          renderCertificateForCapture,
          onProgress: (completed, tot, currentName) => {
            setBulkProgress({ running: true, completed, total: tot, currentName, mode });
          },
          isCancelled: () => bulkCancelledRef.current,
        },
      });

      setCaptureCert(null);

      if (result.cancelled) {
        showToast(
          `Bulk generation cancelled after ${result.completed} of ${total}. No partial batch was registered.`,
          'info'
        );
        return;
      }

      // 4. Save batch metadata to Certificate Register (IndexedDB + Firestore sync + Audit log)
      await bulkAddCertificates(batchCerts, actorName, currentUser?.role);

      showToast(
        `Successfully generated & registered ${batchCerts.length} certificates (${
          mode === 'merged_pdf' ? 'Merged A4 PDF' : 'ZIP Archive'
        })!`
      );
      setSelectedRecipientIds([]);
      setBulkOverrides({});
    } catch (err) {
      console.error('[Certificates] Bulk generation error:', err);
      showToast('Bulk generation failed. Check browser memory or retry with Standard quality.', 'error');
    } finally {
      setBulkProgress(null);
      setCaptureCert(null);
    }
  };

  // =========================================================================
  // REGISTER TAB ACTION HANDLERS
  // =========================================================================
  const [busyRegisterCertId, setBusyRegisterCertId] = useState<string | null>(null);

  const handleRegisterRedownload = async (cert: IssuedCertificate) => {
    setBusyRegisterCertId(cert.id);
    try {
      if (!cert.designId) {
        await generateCertificatePdf(cert, settings);
      } else {
        const node = await renderCertificateForCapture(cert);
        await exportSingleCertificatePdf(node, cert, quality);
        setCaptureCert(null);
      }
      await logCertificateEvent(
        'Re-Downloaded Certificate PDF',
        `Re-downloaded A4 PDF for ${cert.certificateNumber} (${cert.recipientName}).`,
        currentUser?.fullName || currentUser?.username,
        currentUser?.role,
        cert.id
      );
      showToast(`Re-downloaded ${cert.certificateNumber}.`);
    } catch (err) {
      console.error('[Certificates] Register re-download error:', err);
      showToast('Failed to re-download certificate PDF.', 'error');
    } finally {
      setBusyRegisterCertId(null);
    }
  };

  const handleRegisterReprint = async (cert: IssuedCertificate) => {
    setBusyRegisterCertId(cert.id);
    try {
      const node = await renderCertificateForCapture(cert);
      await logCertificateEvent(
        'Re-Printed Certificate',
        `Initiated re-print for ${cert.certificateNumber} (${cert.recipientName}).`,
        currentUser?.fullName || currentUser?.username,
        currentUser?.role,
        cert.id
      );
      await printCertificateElement(node);
      window.setTimeout(() => {
        setCaptureCert(null);
      }, 1600);
    } catch (err) {
      console.error('[Certificates] Register re-print error:', err);
      showToast('Failed to prepare certificate for printing.', 'error');
      setCaptureCert(null);
    } finally {
      setBusyRegisterCertId(null);
    }
  };

  const handleRegisterBulkRedownload = async (
    certs: IssuedCertificate[],
    mode: 'merged_pdf' | 'zip'
  ) => {
    if (certs.length === 0) return;
    bulkCancelledRef.current = false;
    setBulkProgress({
      running: true,
      completed: 0,
      total: certs.length,
      currentName: 'Preparing selected registry certificates...',
      mode,
    });
    try {
      const result = await runChunkedBulkCertificateExport({
        certificates: certs,
        mode,
        quality,
        chunkSize: 10,
        callbacks: {
          renderCertificateForCapture,
          onProgress: (completed, tot, currentName) => {
            setBulkProgress({ running: true, completed, total: tot, currentName, mode });
          },
          isCancelled: () => bulkCancelledRef.current,
        },
      });
      setCaptureCert(null);
      if (result.cancelled) {
        showToast(`Registry batch export cancelled after ${result.completed} of ${certs.length}.`, 'info');
        return;
      }
      await logCertificateEvent(
        'Bulk Re-Downloaded Registry Certificates',
        `Re-downloaded ${certs.length} registered certificates as ${
          mode === 'merged_pdf' ? 'Merged A4 PDF' : 'ZIP Archive'
        }.`,
        currentUser?.fullName || currentUser?.username,
        currentUser?.role
      );
      showToast(
        `Re-downloaded ${certs.length} registered certificate(s) (${
          mode === 'merged_pdf' ? 'Merged A4 PDF' : 'ZIP Archive'
        }).`
      );
    } catch (err) {
      console.error('[Certificates] Registry bulk re-download error:', err);
      showToast('Failed to export selected registry certificates.', 'error');
    } finally {
      setBulkProgress(null);
      setCaptureCert(null);
    }
  };

  const handleRegisterReissue = (cert: IssuedCertificate) => {
    if (
      !canUserCertificateAction(currentUser, 'generate', {
        allowTeacherOwnClass: settings.allowTeacherOwnClassCertificates,
        targetClassName: cert.classEnrolled,
      })
    ) {
      showToast('You do not have permission to re-issue certificates.', 'error');
      return;
    }
    setActiveCert({
      ...cert,
      id: `draft-reissue-${Date.now()}`,
      certificateNumber: previewNextCertificateNumber(certPrefix, certificates, settings),
      reissuedFrom: cert.certificateNumber,
      status: 'Re-issued',
      issueDate: new Date().toISOString().split('T')[0],
      cancelledAt: undefined,
      cancelledBy: undefined,
      cancelReason: undefined,
    });
    setActiveSubTab('studio');
    setCurrentStep(4);
    showToast(
      `Loaded ${cert.certificateNumber} for re-issue. A fresh certificate number will be assigned when you click Issue & Download.`,
      'info'
    );
  };

  const handleRegisterCancel = async (cert: IssuedCertificate, reason: string): Promise<boolean> => {
    if (!canUserCertificateAction(currentUser, 'cancel')) {
      showToast('You do not have permission to cancel certificates.', 'error');
      return false;
    }
    const ok = await cancelCertificate(
      cert.id,
      reason,
      currentUser?.fullName || currentUser?.username,
      currentUser?.role
    );
    if (ok) {
      showToast(`Certificate ${cert.certificateNumber} marked as Cancelled.`);
    }
    return ok;
  };

  // Access guard if user lacks view permission
  if (!canView) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3 shadow-sm">
        <Lock className="w-10 h-10 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Your current account role does not have permission to access the Official Certification & Credential Studio. Contact your school administrator to update permissions.
        </p>
      </div>
    );
  }

  const activePreset = getCertificateTypePreset(activeCert.type);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border text-white max-w-md ${
            toast.type === 'error'
              ? 'bg-rose-600 border-rose-500'
              : toast.type === 'info'
              ? 'bg-blue-600 border-blue-500'
              : 'bg-emerald-600 border-emerald-500'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header & Top Sub-Tab Switcher (Preserving Exact EduLedger Design Language) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Official Certification & Credential Studio
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  A4 Landscape
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Auto-fill and generate print-ready certificates from your Student & Staff lists using 3 built-in vector designs — single or bulk PDF & ZIP.
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveSubTab('studio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === 'studio'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Designer & Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('registry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === 'registry'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-emerald-500" />
              <span>Certificate Register ({certificates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: STUDIO (4-STEP FLOW + LIVE A4 PREVIEW)                       */}
      {/* =================================================================== */}
      {activeSubTab === 'studio' && (
        <div className="space-y-5">
          {/* Compact 4-Step Interactive Stepper */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(
                [
                  { step: 1, title: '1. Certificate Type', sub: activePreset.shortLabel },
                  {
                    step: 2,
                    title: '2. Design Gallery',
                    sub: `Design ${getCertificateTemplate(activeCert.designId).code}`,
                  },
                  {
                    step: 3,
                    title: '3. Pick Recipients',
                    sub:
                      selectedRecipientIds.length > 1
                        ? `${selectedRecipientIds.length} Selected (Bulk)`
                        : activeCert.recipientName || 'Select Student / Staff',
                  },
                  {
                    step: 4,
                    title: '4. Preview & Download',
                    sub: quality === 'high' ? 'High (3x) A4 PDF' : 'Standard (2x) A4 PDF',
                  },
                ] as const
              ).map((item) => {
                const isActive = currentStep === item.step;
                const isDone = currentStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setCurrentStep(item.step)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left border transition-all min-w-0 ${
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600'
                        : isDone
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isActive
                          ? 'bg-amber-500 text-white'
                          : isDone
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : item.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main 12-Column Split: Left Step Workspace + Right Sticky Live A4 Preview */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: ACTIVE STEP CONTROLS */}
            <div className="xl:col-span-5 space-y-5 min-w-0">
              {/* -------------------- STEP 1: TYPE & WORDING -------------------- */}
              {currentStep === 1 && (
                <div className="space-y-5">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                          Step 1 — Choose Certificate Type
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click any certificate type to load editable wording with dynamic placeholders.
                        </p>
                      </div>

                      {/* English / Urdu Wording Switcher */}
                      <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleLanguage('en')}
                          className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                            (activeCert.language || 'en') === 'en'
                              ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <Languages className="w-3.5 h-3.5" />
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLanguage('ur')}
                          className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                            activeCert.language === 'ur'
                              ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          اردو (Urdu)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CERTIFICATE_TYPE_PRESETS.map((preset) => {
                        const selected = activeCert.type === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectType(preset.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              selected
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 shadow-xs'
                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {preset.shortLabel}
                              </span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {preset.audience === 'employee'
                                  ? 'Staff'
                                  : preset.audience === 'student'
                                  ? 'Student'
                                  : 'Both'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {preset.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wording & Dynamic Placeholders Editor */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Certificate Wording & Placeholders
                      </h3>
                      <span className="text-[11px] text-slate-400">Live auto-fill</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Main Heading
                        </label>
                        <input
                          type="text"
                          value={activeCert.certificateTitle}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              certificateTitle: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Sub-Heading
                        </label>
                        <input
                          type="text"
                          value={activeCert.subtitle}
                          onChange={(e) =>
                            setActiveCert((prev) => ({ ...prev, subtitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Event / Occasion Name
                        </label>
                        <input
                          type="text"
                          value={activeCert.competitionOrEvent || ''}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              competitionOrEvent: e.target.value,
                              achievementTitle: e.target.value,
                            }))
                          }
                          placeholder="e.g. ANNUAL SPORTS FESTIVAL"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Position / Distinction
                        </label>
                        <input
                          type="text"
                          value={activeCert.rankOrGrade || ''}
                          onChange={(e) =>
                            setActiveCert((prev) => ({ ...prev, rankOrGrade: e.target.value }))
                          }
                          placeholder="e.g. 1st Position"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    {activePreset.hasActivityField && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/70 dark:border-amber-800/40">
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                            Activity Preset
                          </label>
                          <select
                            value={
                              EXTRACURRICULAR_ACTIVITIES.includes(
                                (activeCert.activityName || '') as any
                              )
                                ? activeCert.activityName
                                : 'Other Activity'
                            }
                            onChange={(e) =>
                              setActiveCert((prev) => ({
                                ...prev,
                                activityName:
                                  e.target.value === 'Other Activity' ? '' : e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                          >
                            {EXTRACURRICULAR_ACTIVITIES.map((act) => (
                              <option key={act} value={act}>
                                {act}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                            Activity Name (Editable)
                          </label>
                          <input
                            type="text"
                            value={activeCert.activityName || ''}
                            onChange={(e) =>
                              setActiveCert((prev) => ({
                                ...prev,
                                activityName: e.target.value,
                              }))
                            }
                            placeholder="e.g. Inter-House Debate"
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Placeholder Helper Chips */}
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                        Click a placeholder to insert into Citation Paragraph 1:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDER_CHIPS.map((token) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => handleInsertPlaceholder(token, 'citationText')}
                            className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-slate-100 hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-900/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                          >
                            {token}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Citation / Recognition Paragraph 1
                      </label>
                      <textarea
                        rows={3}
                        dir={activeCert.language === 'ur' ? 'rtl' : 'ltr'}
                        value={activeCert.citationText}
                        onChange={(e) =>
                          setActiveCert((prev) => ({ ...prev, citationText: e.target.value }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Closing Paragraph 2 (Used in Design A & Optional Footer)
                      </label>
                      <textarea
                        rows={2}
                        dir={activeCert.language === 'ur' ? 'rtl' : 'ltr'}
                        value={activeCert.secondParagraph || ''}
                        onChange={(e) =>
                          setActiveCert((prev) => ({
                            ...prev,
                            secondParagraph: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Signatories */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Right Signatory Label
                        </label>
                        <input
                          type="text"
                          value={activeCert.signatory1Title}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              signatory1Title: e.target.value,
                            }))
                          }
                          placeholder="Principal"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Principal / Signatory Name (Optional)
                        </label>
                        <input
                          type="text"
                          value={activeCert.signatory1Name}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              signatory1Name: e.target.value,
                            }))
                          }
                          placeholder="Leave blank for hand signature"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Left Signatory Label (Design B)
                        </label>
                        <input
                          type="text"
                          value={activeCert.signatory2Title}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              signatory2Title: e.target.value,
                            }))
                          }
                          placeholder="Sports In-charge"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={activeCert.issueDate}
                          onChange={(e) =>
                            setActiveCert((prev) => ({ ...prev, issueDate: e.target.value }))
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Reusable Custom Wording Presets */}
                    {canEditTemplates && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder="Save this wording as reusable preset..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleSaveCustomPreset}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save
                          </button>
                        </div>

                        {savedPresets.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                              <Bookmark className="w-3 h-3 text-amber-500" />
                              Saved School Presets
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {savedPresets.map((sp) => (
                                <div
                                  key={sp.id}
                                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleApplySavedPreset(sp)}
                                    className="font-medium text-amber-900 dark:text-amber-200 hover:underline"
                                  >
                                    {sp.name}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCustomPreset(sp.id)}
                                    className="p-0.5 text-amber-600 hover:text-rose-600"
                                    title="Delete preset"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* -------------------- STEP 2: DESIGN GALLERY -------------------- */}
              {currentStep === 2 && (
                <div className="space-y-5">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        Step 2 — Built-In A4 Vector Design Gallery
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Select any of the 3 editable vector designs. Every text field, school logo, and signature line updates dynamically.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      {CERTIFICATE_TEMPLATES.map((tpl) => (
                        <DesignThumbnailCard
                          key={tpl.id}
                          designId={tpl.id}
                          sampleCert={activeCert}
                          settings={settings}
                          isSelected={(activeCert.designId || 'geometric_triangles') === tpl.id}
                          isRecommended={activePreset.recommendedDesign === tpl.id}
                          onSelect={(id) =>
                            setActiveCert((prev) => ({ ...prev, designId: id }))
                          }
                        />
                      ))}
                    </div>
                  </div>

                  {/* Optional Accent Color & QR Toggle */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                        <Palette className="w-4 h-4 text-amber-500" />
                        Optional Accent Color Override
                      </div>
                      {activeCert.accentColorOverride && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveCert((prev) => ({ ...prev, accentColorOverride: '' }))
                          }
                          className="text-[11px] font-semibold text-amber-600 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset to Sample Colors
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {ACCENT_SWATCHES.map((sw) => {
                        const active = (activeCert.accentColorOverride || '') === sw.value;
                        return (
                          <button
                            key={sw.label}
                            type="button"
                            onClick={() =>
                              setActiveCert((prev) => ({
                                ...prev,
                                accentColorOverride: sw.value,
                              }))
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                              active
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300"
                              style={{
                                backgroundColor:
                                  sw.value ||
                                  getCertificateTemplate(activeCert.designId).palette.primary,
                              }}
                            />
                            <span>{sw.label}</span>
                          </button>
                        );
                      })}
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                        <span>Custom</span>
                        <input
                          type="color"
                          value={
                            activeCert.accentColorOverride ||
                            getCertificateTemplate(activeCert.designId).palette.primary
                          }
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              accentColorOverride: e.target.value,
                            }))
                          }
                          className="w-5 h-5 border-0 bg-transparent cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <QrCodeIcon className="w-4 h-4 text-slate-500" />
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Verification QR Slot (Optional)
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Embeds certificate metadata QR in the reserved corner slot.
                          </div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(activeCert.showQrCode)}
                        onChange={(e) =>
                          setActiveCert((prev) => ({
                            ...prev,
                            showQrCode: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Legacy v1 Classic Themes Accordion (Backward Compatibility) */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setShowLegacyPanel((v) => !v)}
                        className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      >
                        <span className="flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          Legacy Classic Themes (v1 Direct jsPDF)
                        </span>
                        <span>{showLegacyPanel ? 'Hide' : 'Show'}</span>
                      </button>

                      {showLegacyPanel && (
                        <div className="mt-3 space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                          <div className="flex flex-wrap gap-1.5">
                            {(
                              [
                                'royal_gold',
                                'sapphire_navy',
                                'emerald_honors',
                                'burgundy_vintage',
                                'modern_minimal',
                              ] as CertificateTheme[]
                            ).map((th) => (
                              <button
                                key={th}
                                type="button"
                                onClick={() =>
                                  setActiveCert((prev) => ({ ...prev, theme: th }))
                                }
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border capitalize ${
                                  activeCert.theme === th
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {th.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={isSingleBusy}
                            onClick={handleDownloadLegacyPdf}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Legacy v1 PDF
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- STEP 3: PICK RECIPIENTS -------------------- */}
              {currentStep === 3 && (
                <div className="space-y-5">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-blue-500" />
                          Step 3 — Pick Recipients (Single or Bulk)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Click any row for instant single preview, or check multiple rows for bulk PDF / ZIP generation.
                        </p>
                      </div>

                      {/* Source Toggle: Students / Staff / Custom */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
                        {(['student', 'employee', 'custom'] as const).map((rt) => (
                          <button
                            key={rt}
                            type="button"
                            onClick={() => {
                              setActiveCert((prev) => ({ ...prev, recipientType: rt }));
                              setSelectedRecipientIds([]);
                            }}
                            className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                              activeCert.recipientType === rt
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {rt === 'employee' ? 'Staff' : rt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {teacherAssignedClasses && activeCert.recipientType === 'student' && (
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                        Teacher Scope Active: Showing students from your assigned class(es):{' '}
                        <strong>{currentUser?.assignedClasses?.join(', ')}</strong>.
                      </div>
                    )}

                    {activeCert.recipientType === 'custom' ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Recipient Full Name
                          </label>
                          <input
                            type="text"
                            value={activeCert.recipientName}
                            onChange={(e) =>
                              setActiveCert((prev) => ({
                                ...prev,
                                recipientId: '',
                                recipientName: e.target.value,
                              }))
                            }
                            placeholder="Enter recipient name (English or Urdu)"
                            className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Class / Designation
                            </label>
                            <input
                              type="text"
                              value={activeCert.classEnrolled || activeCert.designation || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  classEnrolled: e.target.value,
                                  designation: e.target.value,
                                }))
                              }
                              placeholder="e.g. Grade 8 or Guest Speaker"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Father / Guardian Name
                            </label>
                            <input
                              type="text"
                              value={activeCert.guardianName || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  guardianName: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Search & Directory Filters */}
                        <div className="space-y-2.5">
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={recipientSearch}
                              onChange={(e) => setRecipientSearch(e.target.value)}
                              placeholder={
                                activeCert.recipientType === 'employee'
                                  ? 'Search staff by name, employee code, designation...'
                                  : 'Search students by name, roll no, class, father name...'
                              }
                              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {activeCert.recipientType === 'student' ? (
                              <>
                                <select
                                  value={classFilter}
                                  onChange={(e) => {
                                    setClassFilter(e.target.value);
                                    setSectionFilter('all');
                                  }}
                                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                                >
                                  <option value="all">All Classes</option>
                                  {sortedClasses.map((cls) => (
                                    <option key={cls.id} value={cls.name}>
                                      {cls.name}
                                    </option>
                                  ))}
                                </select>
                                {availableSections.length > 0 && (
                                  <select
                                    value={sectionFilter}
                                    onChange={(e) => setSectionFilter(e.target.value)}
                                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                                  >
                                    <option value="all">All Sections</option>
                                    {availableSections.map((sec) => (
                                      <option key={sec} value={sec}>
                                        Section {sec}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </>
                            ) : (
                              <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                              >
                                <option value="all">All Departments</option>
                                {availableDepartments.map((dep) => (
                                  <option key={dep} value={dep}>
                                    {dep}
                                  </option>
                                ))}
                              </select>
                            )}

                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer ml-auto">
                              <input
                                type="checkbox"
                                checked={activeOnlyFilter}
                                onChange={(e) => setActiveOnlyFilter(e.target.checked)}
                                className="accent-amber-500"
                              />
                              Active only
                            </label>
                          </div>

                          {/* Bulk Selection Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSelectAllFiltered}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Select all (
                                {activeCert.recipientType === 'employee'
                                  ? filteredStaff.length
                                  : filteredStudents.length}
                                )
                              </button>
                              {selectedRecipientIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={handleClearSelection}
                                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:underline"
                                >
                                  Clear ({selectedRecipientIds.length})
                                </button>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Click row = preview • Checkbox = bulk
                            </span>
                          </div>
                        </div>

                        {/* Recipient List */}
                        <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                          {activeCert.recipientType === 'employee' ? (
                            filteredStaff.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-500">
                                No staff members match your filters.
                              </div>
                            ) : (
                              filteredStaff.map((member) => {
                                const checked = selectedRecipientIds.includes(member.id);
                                const isActiveRow = activeCert.recipientId === member.id;
                                return (
                                  <div
                                    key={member.id}
                                    onClick={() => handleClickStaffRow(member)}
                                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                      isActiveRow
                                        ? 'bg-amber-50/90 dark:bg-amber-950/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleRecipientCheckbox(member.id);
                                      }}
                                      className="text-amber-600 dark:text-amber-400 flex-shrink-0"
                                      aria-label={`Select ${member.fullName}`}
                                    >
                                      {checked ? (
                                        <CheckSquare className="w-4 h-4" />
                                      ) : (
                                        <Square className="w-4 h-4 text-slate-400" />
                                      )}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {member.fullName}
                                      </div>
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        {member.designation} • {member.department} ({member.employeeCode})
                                      </div>
                                    </div>
                                    {isActiveRow && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                        Previewing
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )
                          ) : filteredStudents.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-500">
                              No students match your filters.
                            </div>
                          ) : (
                            filteredStudents.map((student) => {
                              const checked = selectedRecipientIds.includes(student.id);
                              const isActiveRow = activeCert.recipientId === student.id;
                              return (
                                <div
                                  key={student.id}
                                  onClick={() => handleClickStudentRow(student)}
                                  className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                    isActiveRow
                                      ? 'bg-amber-50/90 dark:bg-amber-950/30'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleRecipientCheckbox(student.id);
                                    }}
                                    className="text-amber-600 dark:text-amber-400 flex-shrink-0"
                                    aria-label={`Select ${student.fullName}`}
                                  >
                                    {checked ? (
                                      <CheckSquare className="w-4 h-4" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {student.fullName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {student.className}
                                      {student.section ? `-${student.section}` : ''} • Roll #
                                      {student.rollNo || 'N/A'}
                                      {student.fatherName || student.guardianName
                                        ? ` • S/D of ${student.fatherName || student.guardianName}`
                                        : ''}
                                    </div>
                                  </div>
                                  {isActiveRow && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                      Previewing
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* BULK GENERATION & PER-RECIPIENT OVERRIDES PANEL */}
                  {selectedRecords.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-blue-200 dark:border-blue-900/70 p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                            Bulk Generation ({selectedRecords.length} Recipients Selected)
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Customize individual positions or events below, then export as ONE merged A4 PDF or a ZIP of individual PDFs.
                          </p>
                        </div>
                      </div>

                      {bulkDuplicateMatches.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong>Duplicate Issuance Warning:</strong> {bulkDuplicateMatches.length}{' '}
                            selected recipient(s) already received this certificate type for the same event & year (
                            {bulkDuplicateMatches
                              .slice(0, 3)
                              .map((d) => `${d.name}: ${d.existingNo}`)
                              .join(', ')}
                            {bulkDuplicateMatches.length > 3 ? '...' : ''}).
                          </div>
                        </div>
                      )}

                      {/* Editable Per-Recipient Overrides Table */}
                      <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] uppercase text-slate-500 sticky top-0">
                            <tr>
                              <th className="py-2 px-2.5">Recipient</th>
                              <th className="py-2 px-2.5">Position / Distinction</th>
                              <th className="py-2 px-2.5">Event / Activity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {selectedRecords.map((rec) => {
                              const ov = bulkOverrides[rec.id];
                              return (
                                <tr key={rec.id}>
                                  <td className="py-1.5 px-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                    {rec.fullName}
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <input
                                      type="text"
                                      value={
                                        ov?.position !== undefined
                                          ? ov.position
                                          : activeCert.rankOrGrade || ''
                                      }
                                      onChange={(e) =>
                                        updateBulkOverride(rec.id, 'position', e.target.value)
                                      }
                                      placeholder="e.g. 1st Position"
                                      className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                    />
                                  </td>
                                  <td className="py-1.5 px-2">
                                    <input
                                      type="text"
                                      value={
                                        ov?.event !== undefined
                                          ? ov.event
                                          : activeCert.competitionOrEvent || ''
                                      }
                                      onChange={(e) =>
                                        updateBulkOverride(rec.id, 'event', e.target.value)
                                      }
                                      placeholder="Event / Activity"
                                      className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Bulk Action Triggers */}
                      {canBulkGenerate ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={Boolean(bulkProgress?.running)}
                            onClick={() => handleRequestBulkExport('merged_pdf')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Merged A4 PDF ({selectedRecords.length})</span>
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(bulkProgress?.running)}
                            onClick={() => handleRequestBulkExport('zip')}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors"
                          >
                            <FileArchive className="w-4 h-4" />
                            <span>ZIP of PDFs ({selectedRecords.length})</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-400" />
                          Your role does not have bulk generation permission.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* -------------------- STEP 4: FINE-TUNE & DOWNLOAD -------------------- */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  {/* School Profile Sync Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          School Profile & Logo
                        </h3>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Auto-loaded from Settings
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1.5 flex-shrink-0">
                        {activeCert.schoolLogo ? (
                          <img
                            src={activeCert.schoolLogo}
                            alt="School Logo"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 text-center">
                            Text Only
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {activeCert.schoolName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {activeCert.schoolAddress}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id={logoInputId}
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                          >
                            <Upload className="w-3 h-3" />
                            Temporary Logo
                          </button>
                          {activeCert.schoolLogo && (
                            <button
                              type="button"
                              onClick={handleClearLogo}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Quick Edit + School Leaving (TC) Fields */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Final Check & Fine-Tune
                        </h3>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-slate-500">
                        Next: {activeCert.certificateNumber}
                      </span>
                    </div>

                    {activeCert.reissuedFrom && (
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                        Re-issuing replacement for <strong>{activeCert.reissuedFrom}</strong>. A fresh sequential number will be reserved on Issue.
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Recipient Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={activeCert.recipientName}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              recipientName: e.target.value,
                            }))
                          }
                          className={`w-full px-3 py-2 text-sm font-semibold rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 ${
                            !(activeCert.recipientName || '').trim()
                              ? 'border-rose-400 ring-1 ring-rose-300'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Academic Year / Session
                        </label>
                        <input
                          type="text"
                          value={activeCert.academicYear || ''}
                          onChange={(e) =>
                            setActiveCert((prev) => ({
                              ...prev,
                              academicYear: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Issue Date
                        </label>
                        <input
                          type="date"
                          value={activeCert.issueDate}
                          onChange={(e) =>
                            setActiveCert((prev) => ({ ...prev, issueDate: e.target.value }))
                          }
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Structured School Leaving (TC) Fields */}
                    {activeCert.type === 'school_leaving' && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          School Leaving Certificate (TC) Official Record Fields
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Admission No
                            </label>
                            <input
                              type="text"
                              value={activeCert.admissionNo || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  admissionNo: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Father / Guardian Name
                            </label>
                            <input
                              type="text"
                              value={activeCert.guardianName || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  guardianName: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              value={activeCert.dateOfBirth || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  dateOfBirth: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Date of Admission
                            </label>
                            <input
                              type="date"
                              value={activeCert.dateOfAdmission || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  dateOfAdmission: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Date of Leaving
                            </label>
                            <input
                              type="date"
                              value={activeCert.dateOfLeaving || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  dateOfLeaving: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Last Class Attended
                            </label>
                            <input
                              type="text"
                              value={activeCert.classLeaving || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  classLeaving: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              General Conduct
                            </label>
                            <input
                              type="text"
                              value={activeCert.generalConduct || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  generalConduct: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                              Reason for Leaving
                            </label>
                            <input
                              type="text"
                              value={activeCert.reasonForLeaving || ''}
                              onChange={(e) =>
                                setActiveCert((prev) => ({
                                  ...prev,
                                  reasonForLeaving: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-between pt-1">
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={activeCert.duesCleared !== false}
                                onChange={(e) =>
                                  setActiveCert((prev) => ({
                                    ...prev,
                                    duesCleared: e.target.checked,
                                  }))
                                }
                                className="accent-emerald-600"
                              />
                              All School Dues Cleared in Full
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Primary Single Export Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                      {canGenerate ? (
                        <button
                          type="button"
                          disabled={isSingleBusy}
                          onClick={handleIssueAndDownloadSingle}
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold shadow-md shadow-amber-500/20 transition-all"
                        >
                          {isSingleBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span>
                            {activeCert.reissuedFrom
                              ? 'Re-Issue & Download A4 PDF'
                              : 'Issue, Register & Download A4 PDF'}
                          </span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-slate-400" />
                          View-only mode: contact Admin for certificate issuance permission.
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          disabled={isSingleBusy}
                          onClick={handleDownloadPreviewOnly}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Preview PDF Only
                        </button>
                        <button
                          type="button"
                          onClick={handlePrintCurrent}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Print (A4 Landscape)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Back / Next Navigation Bar */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={currentStep === 1}
                  onClick={() =>
                    setCurrentStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous Step
                </button>
                {currentStep < 4 && (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s))
                    }
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white text-xs font-semibold shadow-sm"
                  >
                    <span>
                      Next:{' '}
                      {currentStep === 1
                        ? 'Design Gallery'
                        : currentStep === 2
                        ? 'Pick Recipients'
                        : 'Preview & Download'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: STICKY LIVE A4 PREVIEW STAGE */}
            <div className="xl:col-span-7 space-y-4 min-w-0 xl:sticky xl:top-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Preview Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      Live A4 Landscape Preview
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                      297 × 210 mm
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* PDF Quality Selector */}
                    <div className="inline-flex items-center bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setQuality('standard')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                          quality === 'standard'
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                        title="Crisp 2x print quality (~350–650 KB)"
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuality('high')}
                        className={`px-2 py-1 rounded-md transition-colors ${
                          quality === 'high'
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                        title="Ultra-sharp 3x print quality (~700 KB–1.2 MB)"
                      >
                        High
                      </button>
                    </div>

                    {/* Zoom Controls */}
                    <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() =>
                          setManualZoom(
                            Math.max(0.35, Number((effectiveZoom - 0.1).toFixed(2)))
                          )
                        }
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        title="Zoom Out"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualZoom(null)}
                        className="px-1.5 text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-200"
                        title="Reset to Auto-Fit"
                      >
                        {Math.round(effectiveZoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setManualZoom(
                            Math.min(1.25, Number((effectiveZoom + 0.1).toFixed(2)))
                          )
                        }
                        className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        title="Zoom In"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Print & Download Shortcuts */}
                    <button
                      type="button"
                      onClick={handlePrintCurrent}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                      title="Print A4 Landscape"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                    {canGenerate && (
                      <button
                        type="button"
                        disabled={isSingleBusy}
                        onClick={handleIssueAndDownloadSingle}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold"
                        title="Issue & Download A4 PDF"
                      >
                        {isSingleBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Issue PDF</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Validation & Layout Safety Alerts */}
                {(layoutWarning || missingFields.length > 0 || singleDuplicateMatch) && (
                  <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/60 space-y-1 text-xs">
                    {layoutWarning && (
                      <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-semibold">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span>{layoutWarning}</span>
                      </div>
                    )}
                    {missingFields.length > 0 && (
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Missing recommended fields: {missingFields.join(', ')}</span>
                      </div>
                    )}
                    {singleDuplicateMatch && (
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>
                          Duplicate notice: <strong>{activeCert.recipientName}</strong> already has{' '}
                          <strong className="font-mono">{singleDuplicateMatch.certificateNumber}</strong>{' '}
                          for this type, event & year.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scaled Live Canvas Stage */}
                <div
                  ref={previewContainerRef}
                  className="p-4 bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center min-h-[340px]"
                >
                  <div
                    className="shadow-2xl rounded-xs overflow-hidden bg-white flex-shrink-0"
                    style={{
                      width: Math.round(A4_LANDSCAPE_PX.width * effectiveZoom),
                      height: Math.round(A4_LANDSCAPE_PX.height * effectiveZoom),
                    }}
                  >
                    <div
                      style={{
                        width: A4_LANDSCAPE_PX.width,
                        height: A4_LANDSCAPE_PX.height,
                        transform: `scale(${effectiveZoom})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      <CertificateCanvas
                        id="certificate-print-target"
                        cert={activeCert}
                        settings={settings}
                        qrCodeDataUrl={qrCodeDataUrl}
                        onLayoutWarning={setLayoutWarning}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: CERTIFICATE REGISTRY                                         */}
      {/* =================================================================== */}
      {activeSubTab === 'registry' && (
        <CertificateRegisterTab
          certificates={certificates}
          settings={settings}
          currentUser={currentUser}
          quality={quality}
          onChangeQuality={setQuality}
          onRedownloadPdf={handleRegisterRedownload}
          onReprintCert={handleRegisterReprint}
          onBulkRedownload={handleRegisterBulkRedownload}
          onReissueCert={handleRegisterReissue}
          onCancelCert={handleRegisterCancel}
          busyCertId={busyRegisterCertId}
          isBulkBusy={Boolean(bulkProgress?.running)}
        />
      )}

      {/* =================================================================== */}
      {/* BULK CONFIRMATION MODAL                                             */}
      {/* =================================================================== */}
      {bulkConfirmMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                {bulkConfirmMode === 'merged_pdf' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <FileArchive className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirm Bulk Certificate Generation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This will reserve <strong>{selectedRecords.length}</strong> unique sequential certificate numbers, generate exact A4 landscape PDFs in chunks of 10, and record them in the Certificate Register.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500">Certificate Type:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {activePreset.label}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Design:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  Design {getCertificateTemplate(activeCert.designId).code} —{' '}
                  {getCertificateTemplate(activeCert.designId).name}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Output Format:</span>{' '}
                <strong className="text-slate-900 dark:text-white">
                  {bulkConfirmMode === 'merged_pdf'
                    ? '1 Merged Multi-Page A4 PDF'
                    : 'ZIP Archive of Individual A4 PDFs'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">PDF Quality:</span>{' '}
                <strong className="text-slate-900 dark:text-white uppercase">
                  {quality} ({quality === 'high' ? '3x' : '2x'})
                </strong>
              </div>
            </div>

            {bulkDuplicateMatches.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                <strong>Note:</strong> {bulkDuplicateMatches.length} recipient(s) already have an active certificate for this event & year. Proceeding will issue new numbered copies.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkConfirmMode(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkExport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Generate {selectedRecords.length} Certificates</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* BULK PROGRESS MODAL (WITH CANCEL BUTTON)                            */}
      {/* =================================================================== */}
      {bulkProgress?.running && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Generating{' '}
                  {bulkProgress.mode === 'merged_pdf' ? 'Merged A4 PDF' : 'ZIP Archive'}...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {bulkProgress.completed} of {bulkProgress.total} completed —{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {bulkProgress.currentName}
                  </span>
                </p>
              </div>
            </div>

            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-200"
                style={{
                  width: `${Math.round(
                    (bulkProgress.completed / Math.max(1, bulkProgress.total)) * 100
                  )}%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Processing in memory-safe chunks of 10</span>
              <button
                type="button"
                onClick={() => {
                  bulkCancelledRef.current = true;
                }}
                className="px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* HIDDEN OFF-SCREEN 1123x794 CAPTURE STAGE (EXACT A4 PIXEL FIDELITY)  */}
      {/* =================================================================== */}
      <div
        ref={captureWrapperRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: -99999,
          top: 0,
          width: A4_LANDSCAPE_PX.width,
          height: A4_LANDSCAPE_PX.height,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 1,
          zIndex: -1,
        }}
      >
        {captureCert && (
          <CertificateCanvas
            id={activeSubTab === 'registry' ? 'certificate-print-target' : undefined}
            cert={captureCert}
            settings={settings}
            qrCodeDataUrl={captureQr}
          />
        )}
      </div>
    </div>
  );
};
