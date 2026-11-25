import React, { useState, useEffect, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { AdmissionTemplateId, canUserAdmissionAction, Student } from '../../types';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import {
  AdmissionFormData,
  generateAdmissionFormPdf,
} from '../../utils/admissionFormPdf';
import { validateAdmissionForm } from '../../utils/admissionFormValidation';
import {
  ADMISSION_TEMPLATES,
  createEmptyHabitatDraft,
  getRememberedAdmissionTemplate,
  HabitatAdmissionDraft,
  habitatDraftToStandardForm,
  resolveAdmissionFormSettings,
  setRememberedAdmissionTemplate,
  standardFormToHabitatDraft,
  studentToHabitatDraft,
} from '../../admissions/admissionTemplates';
import { compressSchoolLogo } from '../../admissions/admissionValidation';
import { HabitatAdmissionWorkspace } from '../../admissions/HabitatAdmissionWorkspace';
import {
  Printer,
  Download,
  X,
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  UserPlus,
  RefreshCw,
  Sparkles,
  Info,
  Sliders,
  ZoomIn,
  ZoomOut,
  Layers,
  ShieldCheck,
  Eye,
  Edit3,
  ImagePlus,
  Trash2,
} from 'lucide-react';

export interface AdmissionFormModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  preSelectedStudent?: Student | null;
  isStandaloneView?: boolean;
}

export const AdmissionFormModal: React.FC<AdmissionFormModalProps> = ({
  isOpen = true,
  onClose,
  preSelectedStudent = null,
  isStandaloneView = false,
}) => {
  const { settings, students, addStudent, updateSettings, logAdmissionEvent } = useSchool();
  const { currentUser } = useAuth();

  const admissionSettings = useMemo(() => resolveAdmissionFormSettings(settings), [settings]);

  // Template selector state: remembers last chosen template per user, defaults to school default ('standard')
  const [selectedTemplateId, setSelectedTemplateId] = useState<AdmissionTemplateId>(() =>
    getRememberedAdmissionTemplate(currentUser?.id, admissionSettings.defaultTemplateId)
  );
  const [selectedStudentId, setSelectedStudentId] = useState<string>(preSelectedStudent?.id || '');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Manual School Logo upload state (shared across Standard Form & Habitat Form, print & PDF)
  const CUSTOM_LOGO_STORAGE_KEY = 'eduledger_admission_custom_logo_v1';
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null | undefined>(() => {
    try {
      const saved = window.localStorage.getItem(CUSTOM_LOGO_STORAGE_KEY);
      return saved ? saved : undefined;
    } catch {
      return undefined;
    }
  });
  const [logoStatusMsg, setLogoStatusMsg] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const activeLogoUrl = useMemo(() => {
    if (customLogoUrl !== undefined) return customLogoUrl || '';
    return settings.logoUrl || '';
  }, [customLogoUrl, settings.logoUrl]);

  const effectiveSettings = useMemo(
    () => ({
      ...settings,
      logoUrl: activeLogoUrl || undefined,
    }),
    [settings, activeLogoUrl]
  );

  const canPersistLogoToSchoolProfile = canUserAdmissionAction(currentUser, 'edit_templates');

  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploadingLogo(true);
    setPermissionError(null);
    try {
      const { dataUrl, sizeKb } = await compressSchoolLogo(file, 400);
      setCustomLogoUrl(dataUrl);
      try {
        window.localStorage.setItem(CUSTOM_LOGO_STORAGE_KEY, dataUrl);
      } catch {
        // Ignore quota/storage errors
      }

      if (canPersistLogoToSchoolProfile) {
        await updateSettings({ ...settings, logoUrl: dataUrl });
        await logAdmissionEvent(
          'School Logo Updated on Admission Form',
          `Manually uploaded and saved school logo (${sizeKb} KB) from Student Admission & Registration Form.`,
          currentUser?.fullName,
          currentUser?.role
        );
        setLogoStatusMsg(`School logo saved to School Profile (${sizeKb} KB).`);
      } else {
        setLogoStatusMsg(`School logo applied to this form (${sizeKb} KB).`);
      }
      window.setTimeout(() => setLogoStatusMsg(null), 4000);
    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : 'Failed to upload school logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveSchoolLogo = async () => {
    setCustomLogoUrl('');
    try {
      window.localStorage.removeItem(CUSTOM_LOGO_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    if (canPersistLogoToSchoolProfile && settings.logoUrl) {
      await updateSettings({ ...settings, logoUrl: '' });
      await logAdmissionEvent(
        'School Logo Removed from Admission Form',
        'Removed school logo from Student Admission & Registration Form and School Profile.',
        currentUser?.fullName,
        currentUser?.role
      );
      setLogoStatusMsg('School logo removed.');
    } else {
      setLogoStatusMsg('School logo cleared for this form.');
    }
    window.setTimeout(() => setLogoStatusMsg(null), 3500);
  };

  // Mode: 'fill' (computer entry) vs 'blank' (blank print sheet)
  const [isFormBlank, setIsFormBlank] = useState(false);
  // View Mode: Edit mode vs Print Preview mode
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showOfficialSeal, setShowOfficialSeal] = useState(true);
  const [showPageGuides, setShowPageGuides] = useState(false);
  const [zoomScale, setZoomScale] = useState(0.95);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Habitat Template Draft (synced bidirectionally with Standard Form so switching templates never loses data)
  const [habitatDraft, setHabitatDraft] = useState<HabitatAdmissionDraft>(() =>
    preSelectedStudent
      ? studentToHabitatDraft(preSelectedStudent)
      : createEmptyHabitatDraft(
          settings.standardClasses?.[0] || '',
          settings.standardSections?.[0] || 'A',
          `${settings.currentAcademicYear?.slice(0, 4) || '2026'}-${String(students.length + 1).padStart(3, '0')}`,
          currentUser?.fullName || ''
        )
  );

  // Zod Form Validation States
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<string[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState<AdmissionFormData>({
    formNo: `ADM-${settings.currentAcademicYear?.slice(0, 4) || '2026'}-${String(Math.floor(100 + Math.random() * 900))}`,
    admissionDate: getTodayDateString(),
    fullName: '',
    gender: 'Male',
    dateOfBirth: '2016-04-12',
    placeOfBirth: 'Lahore',
    nationality: 'Pakistani',
    religion: 'Islam',
    bloodGroup: 'B+',
    nationalIdNo: '',
    className: settings.standardClasses?.[0] || '',
    section: settings.standardSections?.[0] || 'A',
    photoUrl: '',

    previousSchool: '',
    previousClass: '',
    previousMarksOrGrade: '',
    previousLeavingCertNo: '',

    guardianName: '',
    guardianRelation: 'Father',
    guardianOccupation: 'Software Engineer',
    guardianEmployer: 'Tech Global Ltd',
    guardianCnic: '',
    contactNumber: '',
    alternateContactNumber: '',
    email: '',
    residentialAddress: '',
    permanentAddress: '',

    hasPhotoAttached: true,
    hasBirthCertAttached: true,
    hasSchoolLeavingCertAttached: false,
    hasGuardianCnicAttached: true,
    hasReportCardAttached: false,
    hasMedicalRecordAttached: true,

    officeStatus: 'Pending',
    officeRollNo: `2026-${String(students.length + 1).padStart(3, '0')}`,
    officeRemarks: 'Eligible for entrance evaluation',
  });

  // Prepopulate if student is provided
  useEffect(() => {
    if (preSelectedStudent) {
      setFormData(prev => ({
        ...prev,
        formNo: `ADM-${preSelectedStudent.rollNo}`,
        admissionDate: preSelectedStudent.admissionDate || getTodayDateString(),
        fullName: preSelectedStudent.fullName || '',
        gender: preSelectedStudent.gender || 'Male',
        dateOfBirth: preSelectedStudent.dateOfBirth || '',
        bloodGroup: preSelectedStudent.bloodGroup || 'O+',
        className: preSelectedStudent.className || settings.standardClasses?.[0] || '',
        section: preSelectedStudent.section || 'A',
        photoUrl: preSelectedStudent.photoUrl || '',
        guardianName: preSelectedStudent.guardianName || '',
        guardianRelation: preSelectedStudent.guardianRelation || 'Father',
        contactNumber: preSelectedStudent.contactNumber || '',
        email: preSelectedStudent.email || '',
        residentialAddress: preSelectedStudent.address || '',
        officeRollNo: preSelectedStudent.rollNo,
        officeStatus: 'Approved',
      }));
      setHabitatDraft(studentToHabitatDraft(preSelectedStudent));
      setSelectedStudentId(preSelectedStudent.id);
    }
  }, [preSelectedStudent, settings.standardClasses]);

  // Switch templates while preserving entered data bidirectionally
  const handleSelectTemplate = (nextId: AdmissionTemplateId) => {
    if (nextId === selectedTemplateId) return;
    if (nextId === 'habitat_a4_portrait') {
      setHabitatDraft(prev => standardFormToHabitatDraft(formData, prev));
    } else {
      setFormData(prev => habitatDraftToStandardForm(habitatDraft, prev));
    }
    setSelectedTemplateId(nextId);
    setRememberedAdmissionTemplate(currentUser?.id, nextId);
    setPermissionError(null);
  };

  if (!isOpen && !isStandaloneView) return null;

  // Handler to load selected student
  const handleSelectExistingStudent = (studentId: string) => {
    if (!studentId) return;
    const stu = students.find(s => s.id === studentId);
    if (!stu) return;

    setFormData(prev => ({
      ...prev,
      formNo: `ADM-${stu.rollNo}`,
      admissionDate: stu.admissionDate || getTodayDateString(),
      fullName: stu.fullName,
      gender: stu.gender,
      dateOfBirth: stu.dateOfBirth,
      bloodGroup: stu.bloodGroup || 'O+',
      className: stu.className,
      section: stu.section,
      photoUrl: stu.photoUrl || '',
      guardianName: stu.guardianName,
      guardianRelation: stu.guardianRelation || 'Father',
      contactNumber: stu.contactNumber,
      email: stu.email || '',
      residentialAddress: stu.address,
      officeRollNo: stu.rollNo,
      officeStatus: 'Approved',
    }));
    setIsFormBlank(false);
  };

  // Demo student photo SVG data URI
  const DEMO_STUDENT_PHOTO_URL =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" width="160" height="200">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4f46e5"/>
            <stop offset="100%" stop-color="#1e1b4b"/>
          </linearGradient>
        </defs>
        <rect width="160" height="200" fill="url(#bg)"/>
        <circle cx="80" cy="74" r="38" fill="#fed7aa"/>
        <circle cx="68" cy="68" r="4" fill="#0f172a"/>
        <circle cx="92" cy="68" r="4" fill="#0f172a"/>
        <path d="M72 84 Q80 92 88 84" stroke="#0f172a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M46 62 Q80 24 114 62 Q80 44 46 62 Z" fill="#1e293b"/>
        <path d="M20 190 C20 134 52 124 80 124 C108 124 140 134 140 190 Z" fill="#ffffff"/>
        <polygon points="80,132 73,168 80,190 87,168" fill="#dc2626"/>
        <rect x="0" y="184" width="160" height="16" fill="#0f172a" opacity="0.85"/>
        <text x="80" y="195" fill="#ffffff" font-size="8" font-family="sans-serif" font-weight="bold" text-anchor="middle">ATTESTED • 2026</text>
      </svg>`
    );

  // Pre-fill sample demo data for quick test
  const handleFillDemoData = () => {
    setFormData({
      formNo: `ADM-2026-084`,
      admissionDate: getTodayDateString(),
      fullName: 'Ayaan Malik',
      gender: 'Male',
      dateOfBirth: '2015-08-14',
      placeOfBirth: 'Islamabad',
      nationality: 'Pakistani',
      religion: 'Islam',
      bloodGroup: 'A+',
      nationalIdNo: '61101-9482910-1',
      className: settings.standardClasses?.[2] || settings.standardClasses?.[0] || '',
      section: 'A',
      photoUrl: DEMO_STUDENT_PHOTO_URL,

      previousSchool: 'Crescent Grammar School',
      previousClass: 'Grade 2',
      previousMarksOrGrade: '94% (A+)',
      previousLeavingCertNo: 'SLC-2025/998',

      guardianName: 'Tariq Malik',
      guardianRelation: 'Father',
      guardianOccupation: 'Senior Project Manager',
      guardianEmployer: 'National Logistics Hub',
      guardianCnic: '61101-1234567-3',
      contactNumber: '+92 300 5551234',
      alternateContactNumber: '+92 321 8889900',
      email: 'tariq.malik@example.com',
      residentialAddress: 'House 42-B, Street 14, Sector F-8/2, Islamabad',
      permanentAddress: 'House 42-B, Sector F-8/2, Islamabad',

      hasPhotoAttached: true,
      hasBirthCertAttached: true,
      hasSchoolLeavingCertAttached: true,
      hasGuardianCnicAttached: true,
      hasReportCardAttached: true,
      hasMedicalRecordAttached: true,

      officeStatus: 'Approved',
      officeRollNo: `2026-084`,
      officeRemarks: 'Passed admission screening test with distinction.',
    });
    setIsFormBlank(false);
    setFormErrors({});
    setValidationSummary([]);
  };

  // Reset to fresh blank application
  const handleResetForm = () => {
    setFormData({
      formNo: `ADM-${settings.currentAcademicYear?.slice(0, 4) || '2026'}-${String(Math.floor(100 + Math.random() * 900))}`,
      admissionDate: getTodayDateString(),
      fullName: '',
      gender: 'Male',
      dateOfBirth: '',
      placeOfBirth: '',
      nationality: 'Pakistani',
      religion: '',
      bloodGroup: 'O+',
      nationalIdNo: '',
      className: settings.standardClasses?.[0] || '',
      section: 'A',
      photoUrl: '',

      previousSchool: '',
      previousClass: '',
      previousMarksOrGrade: '',
      previousLeavingCertNo: '',

      guardianName: '',
      guardianRelation: 'Father',
      guardianOccupation: '',
      guardianEmployer: '',
      guardianCnic: '',
      contactNumber: '',
      alternateContactNumber: '',
      email: '',
      residentialAddress: '',
      permanentAddress: '',

      hasPhotoAttached: false,
      hasBirthCertAttached: false,
      hasSchoolLeavingCertAttached: false,
      hasGuardianCnicAttached: false,
      hasReportCardAttached: false,
      hasMedicalRecordAttached: false,

      officeStatus: 'Pending',
      officeRollNo: `2026-${String(students.length + 1).padStart(3, '0')}`,
      officeRemarks: '',
    });
    setIsFormBlank(false);
  };

  // Handle Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photoUrl: reader.result as string,
          hasPhotoAttached: true,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate form using Zod schema
  const runValidation = (showDialog = true): boolean => {
    // If user explicitly switched to blank printable sheet mode, validation is not required
    if (isFormBlank) {
      setFormErrors({});
      setValidationSummary([]);
      return true;
    }

    const result = validateAdmissionForm(formData);
    setFormErrors(result.errors);
    setValidationSummary(result.errorList);

    if (!result.isValid) {
      setHasAttemptedSubmit(true);
      if (showDialog) {
        setShowErrorModal(true);
      }
      return false;
    }

    return true;
  };

  // Browser Print (Strict 1-Page Portrait Layout)
  const handlePrint = () => {
    if (!canUserAdmissionAction(currentUser, 'print_forms')) {
      setPermissionError('Permission denied: Your account does not have Print Forms permission.');
      return;
    }
    if (!runValidation(true)) {
      return;
    }
    setPermissionError(null);

    document.body.classList.add('print-mode-admission-form');
    window.print();
    void logAdmissionEvent(
      isFormBlank ? 'Blank Admission Form Printed (Standard)' : 'Admission Form Printed (Standard)',
      isFormBlank
        ? 'Printed blank Standard Admission Form.'
        : `Printed Standard Admission Form for "${formData.fullName}" (Form #${formData.formNo}).`,
      currentUser?.fullName,
      currentUser?.role,
      selectedStudentId || undefined,
      formData.fullName || 'Blank Form'
    );
    setTimeout(() => {
      document.body.classList.remove('print-mode-admission-form');
    }, 1000);
  };

  // Save as PDF (Vector-perfect jsPDF A4 Portrait)
  const handleDownloadPdf = () => {
    if (!canUserAdmissionAction(currentUser, 'print_forms')) {
      setPermissionError('Permission denied: Your account does not have Print / Download Forms permission.');
      return;
    }
    if (!runValidation(true)) {
      return;
    }
    setPermissionError(null);

    generateAdmissionFormPdf(effectiveSettings, formData);
    void logAdmissionEvent(
      'Admission Form PDF Downloaded (Standard)',
      `Downloaded Standard Admission Form PDF for "${formData.fullName || 'Blank Form'}" (Form #${formData.formNo}).`,
      currentUser?.fullName,
      currentUser?.role,
      selectedStudentId || undefined,
      formData.fullName || 'Blank Form'
    );
  };

  // Direct enroll into school database
  const handleRegisterAsStudent = async () => {
    if (!canUserAdmissionAction(currentUser, 'add')) {
      setPermissionError('Permission denied: Your account does not have Add Admission permission.');
      return;
    }
    if (!runValidation(true)) {
      return;
    }
    setPermissionError(null);

    try {
      const created = await addStudent({
        rollNo: formData.officeRollNo || `2026-${String(students.length + 1).padStart(3, '0')}`,
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || '2016-01-01',
        className: formData.className || settings.standardClasses?.[0] || '',
        section: formData.section || 'A',
        admissionDate: formData.admissionDate || getTodayDateString(),
        registrationDate: formData.admissionDate || getTodayDateString(),
        guardianName: formData.guardianName || 'Guardian',
        guardianRelation: formData.guardianRelation || 'Father',
        fatherName: formData.guardianRelation?.toLowerCase() === 'father' ? formData.guardianName : undefined,
        contactNumber: formData.contactNumber || 'N/A',
        phone2: formData.alternateContactNumber || undefined,
        email: formData.email || undefined,
        address: formData.residentialAddress || 'N/A',
        photoUrl: formData.photoUrl || undefined,
        status: 'active',
        bloodGroup: formData.bloodGroup || 'O+',
        nationality: formData.nationality || undefined,
        religion: formData.religion || undefined,
        idNumber: formData.nationalIdNo || formData.guardianCnic || undefined,
        occupation: formData.guardianOccupation || undefined,
        formTemplateId: 'standard',
      });

      await logAdmissionEvent(
        'Admission Created (Standard Form)',
        `Enrolled student "${created.fullName}" (Roll #${created.rollNo}, ${created.className}-${created.section}) using Standard Form.`,
        currentUser?.fullName,
        currentUser?.role,
        created.id,
        created.fullName
      );

      setSaveSuccessMsg(`Student "${formData.fullName}" has been successfully enrolled in EduLedger!`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
      setPermissionError('Error registering student: ' + String(err));
    }
  };

  return (
    <div
      className={
        isStandaloneView
          ? 'space-y-6'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto'
      }
    >
      <div
        className={`w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col ${
          isStandaloneView ? 'max-w-6xl mx-auto' : 'max-w-5xl max-h-[96vh]'
        }`}
      >
        {/* Top Control Bar (Non-Printable) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 rounded-t-3xl flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Student Admission &amp; Registration Form
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  Strict 1-Page Portrait
                </span>
                {isPreviewMode && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    Print Preview Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isPreviewMode
                  ? 'Verify high-resolution portrait layout, official seals, and mandatory documentation before sending to printer.'
                  : 'Auto-branded with school info, rules & regulations (10% annual fee increase), requirements checklist, and parent undertaking.'}
              </p>
            </div>
          </div>

          {/* Quick Actions (Standard Form actions shown only when Standard Form is active) */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTemplateId === 'standard' && (
              <>
            {/* View Mode Toggle: Form Editor vs Print Preview */}
            <div className="p-1 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsPreviewMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  !isPreviewMode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Form Editor</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  runValidation(false);
                  setIsPreviewMode(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  isPreviewMode
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Print Preview</span>
              </button>
            </div>

            {/* Blank Sheet vs Fill Mode */}
            <div className="p-1 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setIsFormBlank(false)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  !isFormBlank
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Filled Application
              </button>
              <button
                type="button"
                onClick={() => setIsFormBlank(true)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  isFormBlank
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Blank Paper Sheet
              </button>
            </div>

            {/* Quick Print Preview button when in Form Editor mode */}
            {!isPreviewMode && (
              <button
                type="button"
                onClick={() => {
                  runValidation(false);
                  setIsPreviewMode(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                title="Preview paper layout before printing"
              >
                <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Preview Layout</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              title="Print official 1-page portrait form"
            >
              <Printer className="w-4 h-4" />
              <span>{isPreviewMode ? 'Print Form Now' : 'Print Form'}</span>
            </button>

            {/* Save as PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              title="Download high-resolution vector PDF"
            >
              <Download className="w-4 h-4" />
              <span>Save as PDF</span>
            </button>
              </>
            )}

            {/* Close Modal button (if not standalone) */}
            {!isStandaloneView && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Form Template Selector Bar (Compact Live Mini-Previews; preserves entered data on switch) */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                  Form Template
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Switching templates keeps all entered student data intact
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 max-w-2xl">
              {ADMISSION_TEMPLATES.map(tpl => {
                const isSelected = selectedTemplateId === tpl.id;
                const isDefaultSchoolTpl = admissionSettings.defaultTemplateId === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`flex items-center gap-3 p-2 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Live Mini A4 Portrait Preview Thumbnail */}
                    <div
                      className="w-9 h-12 rounded-md border border-slate-300 dark:border-slate-600 bg-white shrink-0 p-1 flex flex-col justify-between overflow-hidden shadow-2xs"
                      aria-hidden="true"
                    >
                      {tpl.id === 'habitat_a4_portrait' ? (
                        <>
                          <div className="flex items-start justify-between gap-0.5">
                            <div className="flex items-center gap-0.5">
                              <span className="w-2 h-2 rounded-[2px] bg-[#3DB86B] inline-block" />
                              <div className="space-y-0.5">
                                <span className="block w-3.5 h-[2px] bg-[#111827] rounded-full" />
                                <span className="block w-3 h-[2px] bg-[#3DB86B] rounded-full" />
                              </div>
                            </div>
                            <span className="w-2.5 h-2.5 border border-slate-400 rounded-[1px]" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="block w-4 h-[1.5px] bg-[#3DB86B]" />
                            <span className="block w-full h-[2px] border border-slate-300 rounded-[1px]" />
                            <div className="grid grid-cols-2 gap-0.5">
                              <span className="block h-[2px] border border-slate-300 rounded-[1px]" />
                              <span className="block h-[2px] border border-slate-300 rounded-[1px]" />
                            </div>
                            <span className="block w-full h-[2px] border border-slate-300 rounded-[1px]" />
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-200 pt-0.5">
                            <span className="w-2.5 h-[1px] bg-slate-500" />
                            <span className="w-2.5 h-[1px] bg-slate-500" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-2.5 rounded-[2px] bg-indigo-700 w-full flex items-center justify-center">
                            <span className="w-4 h-[2px] bg-white/90 rounded-full" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="block w-full h-[2px] bg-slate-200 rounded-full" />
                            <span className="block w-5/6 h-[2px] bg-slate-200 rounded-full" />
                            <span className="block w-full h-[2px] bg-slate-200 rounded-full" />
                          </div>
                          <div className="flex justify-between">
                            <span className="w-2.5 h-[1.5px] bg-indigo-400" />
                            <span className="w-2.5 h-[1.5px] bg-indigo-400" />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                          {tpl.name}
                        </span>
                        {isDefaultSchoolTpl && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            School Default
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual School Logo Bar (Works across both Standard & Habitat Admission Forms) */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {activeLogoUrl ? (
                  <img
                    src={activeLogoUrl}
                    alt="School Logo"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <Building className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    School Logo
                  </span>
                  {activeLogoUrl ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Active on Form &amp; PDF
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      Not Added
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {logoStatusMsg
                    ? logoStatusMsg
                    : 'Upload PNG, JPG, or WebP school crest to display on both Standard and Habitat admission forms.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer ${
                  isUploadingLogo ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>{isUploadingLogo ? 'Uploading...' : activeLogoUrl ? 'Change School Logo' : 'Add School Logo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleSchoolLogoUpload}
                  className="hidden"
                />
              </label>

              {activeLogoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveSchoolLogo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Remove school logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {permissionError && (
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between gap-2">
              <span>{permissionError}</span>
              <button
                type="button"
                onClick={() => setPermissionError(null)}
                className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {selectedTemplateId === 'habitat_a4_portrait' ? (
          <div className="p-4 sm:p-5 overflow-y-auto">
            <HabitatAdmissionWorkspace
              draft={habitatDraft}
              onDraftChange={setHabitatDraft}
              selectedStudentId={selectedStudentId}
              onSelectStudentId={setSelectedStudentId}
              logoUrlOverride={activeLogoUrl}
              onStudentSaved={saved => {
                setFormData(prev => habitatDraftToStandardForm(studentToHabitatDraft(saved), prev));
              }}
            />
          </div>
        ) : (
          <>
        {/* Secondary Utility Tool-strip */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          {isPreviewMode ? (
            /* Print Preview Specific Control Strip */
            <div className="flex items-center gap-3 flex-wrap w-full justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold text-[11px] border border-indigo-200 dark:border-indigo-800">
                  <Eye className="w-3.5 h-3.5" />
                  <span>A4 Portrait Layout (210×297mm)</span>
                </span>

                {/* Validation Status Badge */}
                {validationSummary.length === 0 ? (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Layout Verified: Ready for Print</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowErrorModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 font-bold text-[11px] border border-amber-300 dark:border-amber-800 hover:bg-amber-100 cursor-pointer"
                    title="Click to view required items"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{validationSummary.length} Mandatory Requirements Incomplete (Click to view)</span>
                  </button>
                )}

                {/* Official Seal Watermark Toggle */}
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={showOfficialSeal}
                    onChange={e => setShowOfficialSeal(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                  <span>Official Registrar Stamp</span>
                </label>

                {/* Page Margin Guides Toggle */}
                <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={showPageGuides}
                    onChange={e => setShowPageGuides(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Page Margin Guides</span>
                </label>
              </div>

              {/* Right Side: Zoom Presets and Back to Editor */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[11px]">
                  <span className="text-slate-400 font-medium mr-1">Zoom:</span>
                  <button
                    type="button"
                    onClick={() => setZoomScale(0.85)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      zoomScale === 0.85
                        ? 'bg-white font-bold text-slate-900 shadow-2xs'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.0)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      zoomScale === 1.0
                        ? 'bg-white font-bold text-slate-900 shadow-2xs'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale(1.15)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      zoomScale === 1.15
                        ? 'bg-white font-bold text-slate-900 shadow-2xs'
                        : 'hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    115%
                  </button>
                  <span className="font-mono ml-1 font-bold">{Math.round(zoomScale * 100)}%</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-bold text-[11px] cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Back to Editor</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Edit Tool-strip */
            <>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Pre-fill existing student dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
                    Pre-fill Student:
                  </span>
                  <select
                    onChange={e => handleSelectExistingStudent(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select Enrolled Student...
                    </option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.rollNo} - {s.fullName} ({s.className})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Demo fill & Clear */}
                <button
                  type="button"
                  onClick={handleFillDemoData}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-[11px] hover:bg-amber-100 transition cursor-pointer"
                  title="Populate complete demo student info for instant testing"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Fill Sample Data</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-[11px] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Clear Form</span>
                </button>
              </div>

              {/* Right side: Register Student to Database & Zoom */}
              <div className="flex items-center gap-2">
                {!isFormBlank && formData.fullName && (
                  <button
                    type="button"
                    onClick={handleRegisterAsStudent}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
                    title="Enroll this applicant directly into the school database"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Save to Database</span>
                  </button>
                )}

                {/* Zoom Controls */}
                <div className="hidden sm:flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setZoomScale(z => Math.max(0.7, z - 0.05))}
                    className="p-0.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono">{Math.round(zoomScale * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomScale(z => Math.min(1.25, z + 0.05))}
                    className="p-0.5 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="m-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-600 hover:text-emerald-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Validation Errors Notice Banner */}
        {!isFormBlank && validationSummary.length > 0 && (
          <div className="mx-3 my-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs no-print flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-800 dark:text-rose-200">
                    Admission Form Incomplete ({validationSummary.length} required{' '}
                    {validationSummary.length === 1 ? 'item' : 'items'} missing)
                  </span>
                  <span className="px-1.5 py-0.2 rounded-md bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-300 text-[10px] font-bold uppercase">
                    Mandatory Checklist
                  </span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  The student photograph and mandatory verification documents (Birth Certificate/B-Form, Guardian CNIC) must be present before this official document can be printed or saved.
                </p>
                <ul className="mt-1.5 space-y-0.5 list-disc list-inside text-[11px] text-rose-800 dark:text-rose-200 font-medium">
                  {validationSummary.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValidationSummary([])}
              className="p-1 text-rose-500 hover:text-rose-800 dark:hover:text-rose-100 transition cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable Printable Sheet Canvas Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-200 dark:bg-slate-950/80 flex justify-center">
          {/* Zoom Wrapper */}
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* Visual Sheet Paper Bounds indicator in Print Preview */}
            {isPreviewMode && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mb-2 px-1 no-print">
                <span className="flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-400">
                  <Eye className="w-3.5 h-3.5" />
                  ISO A4 Portrait (210mm × 297mm)
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Strict 1-Page Layout Verified
                </span>
              </div>
            )}

            {/* The Strict 1-Page Portrait Sheet (A4: 210mm x 297mm) */}
            <div
              id="printable-admission-form"
              className={`print-paper-sheet sheet-portrait bg-white text-slate-900 relative shadow-2xl border ${
                isPreviewMode ? 'border-slate-400 ring-2 ring-slate-300 dark:ring-slate-700' : 'border-slate-300'
              }`}
              style={{
                width: '210mm',
                minHeight: '297mm',
                maxHeight: '297mm',
                padding: '7mm 9mm 7mm 9mm',
                boxSizing: 'border-box',
                fontFamily:
                  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                overflow: 'hidden',
              }}
            >
              {/* Optional page margin guide overlay for layout verification */}
              {isPreviewMode && showPageGuides && (
                <div
                  className="absolute inset-[6mm_8mm_6mm_8mm] border border-dashed border-indigo-400/50 pointer-events-none no-print z-20"
                  title="Printable margin boundary (6mm top/bottom, 8mm left/right)"
                />
              )}

              {/* Outer double border framing for government/official document prestige */}
              <div
                className="w-full h-full border-2 border-slate-700 p-2.5 flex flex-col justify-between"
                style={{ minHeight: '283mm', maxHeight: '283mm' }}
              >
                {/* TOP HEADER SECTION: School account logo, details, photo box */}
                <div>
                  <div className="flex items-start justify-between gap-3 border-b-2 border-slate-800 pb-2">
                    {/* Left: School Crest / Logo (Click to manually upload/change in editor mode) */}
                    <div className="w-20 flex-shrink-0 flex flex-col items-center justify-center">
                      <label
                        className={`relative group flex flex-col items-center justify-center ${
                          !isPreviewMode ? 'cursor-pointer' : ''
                        }`}
                        title={!isPreviewMode ? 'Click to add or change School Logo' : 'School Logo'}
                      >
                        {activeLogoUrl ? (
                          <img
                            src={activeLogoUrl}
                            alt="School Logo"
                            className="w-16 h-16 object-contain"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl border border-slate-800 bg-slate-900 text-white flex flex-col items-center justify-center text-center p-1">
                            <Building className="w-6 h-6 text-amber-300 mb-0.5" />
                            <span className="text-[7px] font-black uppercase tracking-tight">
                              ADD LOGO
                            </span>
                          </div>
                        )}
                        {!isPreviewMode && (
                          <>
                            <span className="no-print absolute inset-0 rounded-xl bg-slate-900/60 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                              {activeLogoUrl ? 'Change' : 'Upload'}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                              onChange={handleSchoolLogoUpload}
                              className="hidden"
                            />
                          </>
                        )}
                      </label>
                      <span className="text-[6.5px] font-bold text-slate-500 uppercase mt-0.5">
                        OFFICIAL CREST
                      </span>
                    </div>

                    {/* Center: School Branding & Contact Info (Taken automatically from School Account) */}
                    <div className="flex-1 text-center px-2">
                      <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase leading-none">
                        {settings.schoolName || 'EduLedger International School'}
                      </h1>
                      {settings.schoolTagline && (
                        <p className="text-[8.5px] italic font-serif text-slate-600 mt-0.5">
                          "{settings.schoolTagline}"
                        </p>
                      )}
                      <p className="text-[7.5px] font-medium text-slate-700 mt-1 leading-tight">
                        <MapPin className="w-2.5 h-2.5 inline mr-0.5" />
                        {settings.schoolAddress || 'Official Administrative Campus, Capital Territory'}
                      </p>
                      <div className="flex items-center justify-center gap-3 text-[7px] font-medium text-slate-600 mt-0.5">
                        <span>
                          <Phone className="w-2 h-2 inline mr-0.5" />
                          {settings.schoolPhone || '+1 (555) 019-2834'}
                        </span>
                        <span>•</span>
                        <span>
                          <Mail className="w-2 h-2 inline mr-0.5" />
                          {settings.schoolEmail || 'admissions@eduledger.ac'}
                        </span>
                        {settings.schoolWebsite && (
                          <>
                            <span>•</span>
                            <span>{settings.schoolWebsite}</span>
                          </>
                        )}
                      </div>
                      <div className="inline-block mt-1 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[7.5px] font-bold text-slate-800">
                        ACADEMIC SESSION: {settings.currentAcademicYear || '2026-2027'} • GOVT / BOARD ACCREDITED
                      </div>
                    </div>

                    {/* Right: 4x4 Photo Frame (Mandatory Requirement) */}
                    <div className="w-24 flex-shrink-0 flex flex-col items-center">
                      {isPreviewMode ? (
                        <div
                          className={`w-20 h-24 rounded-xs border-2 flex flex-col items-center justify-center text-center p-0.5 relative overflow-hidden bg-white shadow-2xs ${
                            !isFormBlank && formData.photoUrl ? 'border-slate-800' : 'border-slate-500'
                          }`}
                        >
                          {!isFormBlank && formData.photoUrl ? (
                            <img
                              src={formData.photoUrl}
                              alt="Student Photograph"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full border border-dashed border-slate-400 flex flex-col items-center justify-center p-1 bg-slate-50">
                              <User className="w-6 h-6 text-slate-400 mb-0.5" />
                              <span className="text-[6.5px] font-black text-slate-700 uppercase">
                                AFFIX PHOTO
                              </span>
                              <span className="text-[5.5px] text-slate-500 font-bold">(4x4 cm)</span>
                              <span className="text-[5px] text-slate-400 mt-0.5">Attested Copy</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <label
                          className={`w-20 h-24 rounded-lg border-2 border-dashed bg-slate-50 flex flex-col items-center justify-center text-center p-1 relative cursor-pointer hover:bg-slate-100 transition overflow-hidden group ${
                            hasAttemptedSubmit && (formErrors['hasPhotoAttached'] || formErrors['photoUrl'])
                              ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-400/40'
                              : 'border-slate-500'
                          }`}
                          title="Click to attach 4x4 / passport photo (Mandatory)"
                        >
                          {!isFormBlank && formData.photoUrl ? (
                            <img
                              src={formData.photoUrl}
                              alt="Student Photograph"
                              className="w-full h-full object-cover rounded-md"
                            />
                          ) : (
                            <>
                              <User
                                className={`w-7 h-7 mb-1 transition ${
                                  hasAttemptedSubmit && (formErrors['hasPhotoAttached'] || formErrors['photoUrl'])
                                    ? 'text-rose-500'
                                    : 'text-slate-400 group-hover:text-indigo-600'
                                }`}
                              />
                              <span className="text-[7px] font-black text-slate-700 leading-tight">
                                AFFIX RECENT
                              </span>
                              <span
                                className={`text-[6.5px] font-black leading-tight ${
                                  hasAttemptedSubmit && (formErrors['hasPhotoAttached'] || formErrors['photoUrl'])
                                    ? 'text-rose-600 font-bold underline'
                                    : 'text-indigo-700'
                                }`}
                              >
                                4x4 cm PHOTO*
                              </span>
                              <span className="text-[5.5px] text-slate-500 mt-0.5 leading-none">
                                (Passport Size)
                              </span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden no-print"
                          />
                        </label>
                      )}
                      <span className="text-[6px] text-slate-500 text-center mt-0.5 leading-none">
                        Self-attested on reverse
                      </span>
                      {!isPreviewMode && hasAttemptedSubmit && (formErrors['hasPhotoAttached'] || formErrors['photoUrl']) && (
                        <span className="text-[6px] font-bold text-rose-600 text-center leading-none mt-0.5 no-print">
                          *Photo Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title Bar Ribbon */}
                  <div className="bg-slate-900 text-white py-1 px-3 text-center uppercase tracking-widest text-[9.5px] font-black flex items-center justify-between mt-1 rounded-sm">
                    <span>APPLICATION FOR ADMISSION &amp; REGISTRATION</span>
                    <span className="text-[8px] font-bold text-amber-300">
                      SESSION {settings.currentAcademicYear || '2026-2027'}
                    </span>
                  </div>

                  {/* Form Metadata Sub-row */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 border border-slate-300 px-2 py-1 text-[8px] font-bold text-slate-800">
                    <div>
                      <span>FORM NO: </span>
                      {isFormBlank ? (
                        <span className="font-normal text-slate-400 underline decoration-slate-300">
                          ADM-2026-_______
                        </span>
                      ) : isPreviewMode ? (
                        <span className="font-mono font-bold text-indigo-900">
                          {formData.formNo}
                        </span>
                      ) : (
                        <input
                          type="text"
                          value={formData.formNo}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, formNo: e.target.value }))
                          }
                          className="bg-transparent font-mono font-bold text-indigo-900 focus:outline-hidden w-28"
                        />
                      )}
                    </div>
                    <div className="text-center">
                      <span>ADMISSION DATE: </span>
                      {isFormBlank ? (
                        <span className="font-normal text-slate-400 underline decoration-slate-300">
                          ____/____/2026
                        </span>
                      ) : isPreviewMode ? (
                        <span className="font-mono font-bold text-slate-900">
                          {formatDate(formData.admissionDate)}
                        </span>
                      ) : (
                        <input
                          type="date"
                          value={formData.admissionDate}
                          onChange={e =>
                            setFormData(prev => ({ ...prev, admissionDate: e.target.value }))
                          }
                          className="bg-transparent font-mono font-bold text-slate-900 focus:outline-hidden text-[8px]"
                        />
                      )}
                    </div>
                    <div className="text-right">
                      <span>CLASS APPLIED: </span>
                      {isFormBlank ? (
                        <span className="font-normal text-slate-400">___________ (Sec: ___)</span>
                      ) : (
                        <span className="font-mono text-indigo-900 font-bold">
                          {formData.className} (Sec: {formData.section})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SECTION 1: STUDENT PERSONAL PARTICULARS */}
                  <div className="mt-1.5 border border-slate-300 rounded-xs overflow-hidden">
                    <div className="bg-slate-200 border-b border-slate-300 px-2 py-0.5 text-[8px] font-black uppercase text-slate-900 tracking-wider">
                      1. STUDENT PERSONAL DETAILS &amp; BIODATA
                    </div>
                    <table className="w-full border-collapse text-[7.5px]">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="w-28 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Full Student Name:
                          </td>
                          <td className="p-1 border-r border-slate-200" colSpan={2}>
                            {isFormBlank ? (
                              <div className="h-4 border-b border-dotted border-slate-400" />
                            ) : isPreviewMode ? (
                              <span className="font-bold text-slate-900 uppercase">
                                {formData.fullName || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Enter full name in block letters"
                                value={formData.fullName}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, fullName: e.target.value }))
                                }
                                className="w-full uppercase font-bold text-slate-900 focus:outline-hidden bg-transparent"
                              />
                            )}
                          </td>
                          <td className="w-20 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Gender:
                          </td>
                          <td className="p-1">
                            {isFormBlank ? (
                              <span>[  ] Male   [  ] Female</span>
                            ) : isPreviewMode ? (
                              <span className="font-bold text-slate-900">{formData.gender}</span>
                            ) : (
                              <select
                                value={formData.gender}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    gender: e.target.value as 'Male' | 'Female' | 'Other',
                                  }))
                                }
                                className="w-full bg-transparent font-semibold focus:outline-hidden"
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            )}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Date of Birth:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <span className="text-slate-400">DD / MM / YYYY</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formatDate(formData.dateOfBirth)}
                              </span>
                            ) : (
                              <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                          <td className="w-24 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Blood Group:
                          </td>
                          <td className="p-1 border-r border-slate-200" colSpan={2}>
                            {isFormBlank ? (
                              <span>_______</span>
                            ) : isPreviewMode ? (
                              <span className="font-bold text-slate-900">{formData.bloodGroup}</span>
                            ) : (
                              <input
                                type="text"
                                value={formData.bloodGroup}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, bloodGroup: e.target.value }))
                                }
                                placeholder="e.g. B+, O+, A+"
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Birth Cert / B-Form:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <span className="text-slate-400">NADRA / Registry Number</span>
                            ) : isPreviewMode ? (
                              <span className="font-mono font-medium text-slate-900">
                                {formData.nationalIdNo || 'N/A'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="B-Form / CNIC number"
                                value={formData.nationalIdNo}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, nationalIdNo: e.target.value }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Place of Birth:
                          </td>
                          <td className="p-1 border-r border-slate-200" colSpan={2}>
                            {isFormBlank ? (
                              <span>_________________</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.placeOfBirth || 'Lahore'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="City / District"
                                value={formData.placeOfBirth}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Nationality / Religion:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <span>Pakistani / ____________</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.nationality} / {formData.religion || 'Islam'}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={formData.nationality}
                                  onChange={e =>
                                    setFormData(prev => ({ ...prev, nationality: e.target.value }))
                                  }
                                  className="w-1/2 bg-transparent font-medium focus:outline-hidden"
                                />
                                <span>/</span>
                                <input
                                  type="text"
                                  placeholder="Religion"
                                  value={formData.religion}
                                  onChange={e =>
                                    setFormData(prev => ({ ...prev, religion: e.target.value }))
                                  }
                                  className="w-1/2 bg-transparent font-medium focus:outline-hidden"
                                />
                              </div>
                            )}
                          </td>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Desired Class:
                          </td>
                          <td className="p-1 border-r border-slate-200" colSpan={2}>
                            {isFormBlank ? (
                              <span>[  ] Morning   [  ] English Medium</span>
                            ) : isPreviewMode ? (
                              <span className="font-bold text-slate-900">
                                {formData.className} (Sec: {formData.section})
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={formData.className}
                                  onChange={e =>
                                    setFormData(prev => ({ ...prev, className: e.target.value }))
                                  }
                                  className="font-bold text-slate-900 bg-transparent focus:outline-hidden"
                                >
                                  {settings.standardClasses?.map(c => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                                <span>Sec:</span>
                                <input
                                  type="text"
                                  value={formData.section}
                                  onChange={e =>
                                    setFormData(prev => ({ ...prev, section: e.target.value }))
                                  }
                                  className="w-10 font-bold bg-transparent focus:outline-hidden"
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* SECTION 2: PREVIOUS ACADEMIC DETAILS */}
                  <div className="mt-1.5 border border-slate-300 rounded-xs overflow-hidden">
                    <div className="bg-slate-200 border-b border-slate-300 px-2 py-0.5 text-[8px] font-black uppercase text-slate-900 tracking-wider">
                      2. PREVIOUS ACADEMIC RECORD (IF APPLICABLE)
                    </div>
                    <table className="w-full border-collapse text-[7.5px]">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="w-28 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Previous School:
                          </td>
                          <td className="p-1 border-r border-slate-200" colSpan={2}>
                            {isFormBlank ? (
                              <div className="h-4 border-b border-dotted border-slate-400" />
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.previousSchool || 'N/A (First Admission)'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Previous school name & city (Leave blank if first admission)"
                                value={formData.previousSchool}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    previousSchool: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                          <td className="w-24 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Class Attended:
                          </td>
                          <td className="p-1">
                            {isFormBlank ? (
                              <span>___________</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.previousClass || 'N/A'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="e.g. Prep / Grade 1"
                                value={formData.previousClass}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    previousClass: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            SLC / Transfer Cert:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <span>TC No: _____________</span>
                            ) : isPreviewMode ? (
                              <span className="font-mono font-medium text-slate-900">
                                {formData.previousLeavingCertNo || 'N/A'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="SLC / TC Certificate No & date"
                                value={formData.previousLeavingCertNo}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    previousLeavingCertNo: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Marks / Grade:
                          </td>
                          <td className="p-1" colSpan={2}>
                            {isFormBlank ? (
                              <span>Grade / %: ________</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.previousMarksOrGrade || 'N/A'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="e.g. 92% / Grade A+"
                                value={formData.previousMarksOrGrade}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    previousMarksOrGrade: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* SECTION 3: PARENT / GUARDIAN DETAILS */}
                  <div className="mt-1.5 border border-slate-300 rounded-xs overflow-hidden">
                    <div className="bg-slate-200 border-b border-slate-300 px-2 py-0.5 text-[8px] font-black uppercase text-slate-900 tracking-wider">
                      3. PARENT / GUARDIAN PARTICULARS
                    </div>
                    <table className="w-full border-collapse text-[7.5px]">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="w-28 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Father / Guardian:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <div className="h-4 border-b border-dotted border-slate-400" />
                            ) : isPreviewMode ? (
                              <span className="font-bold text-slate-900">
                                {formData.guardianName || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Father or legal guardian name"
                                value={formData.guardianName}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, guardianName: e.target.value }))
                                }
                                className="w-full font-bold bg-transparent focus:outline-hidden"
                              />
                            )}
                          </td>
                          <td className="w-24 bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Relationship:
                          </td>
                          <td className="p-1">
                            {isFormBlank ? (
                              <span>[  ] Father  [  ] Mother  [  ] Guardian</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.guardianRelation}
                              </span>
                            ) : (
                              <input
                                type="text"
                                value={formData.guardianRelation}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    guardianRelation: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Occupation &amp; Org:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <span className="text-slate-400">Profession &amp; Employer Name</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.guardianOccupation || 'Self-Employed'} @ {formData.guardianEmployer || 'N/A'}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="Occupation"
                                  value={formData.guardianOccupation}
                                  onChange={e =>
                                    setFormData(prev => ({
                                      ...prev,
                                      guardianOccupation: e.target.value,
                                    }))
                                  }
                                  className="w-1/2 bg-transparent font-medium focus:outline-hidden"
                                />
                                <span>@</span>
                                <input
                                  type="text"
                                  placeholder="Workplace"
                                  value={formData.guardianEmployer}
                                  onChange={e =>
                                    setFormData(prev => ({
                                      ...prev,
                                      guardianEmployer: e.target.value,
                                    }))
                                  }
                                  className="w-1/2 bg-transparent font-medium focus:outline-hidden"
                                />
                              </div>
                            )}
                          </td>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Guardian CNIC / ID:
                          </td>
                          <td className="p-1">
                            {isFormBlank ? (
                              <span>_____-_______-_</span>
                            ) : isPreviewMode ? (
                              <span className="font-mono font-medium text-slate-900">
                                {formData.guardianCnic || 'N/A'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="National ID / CNIC"
                                value={formData.guardianCnic}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, guardianCnic: e.target.value }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>

                        <tr className="border-b border-slate-200">
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Primary Mobile / Phone:
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            {isFormBlank ? (
                              <span>+92 3__ _________</span>
                            ) : isPreviewMode ? (
                              <span className="font-bold text-indigo-900 font-mono">
                                {formData.contactNumber || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Primary contact mobile"
                                value={formData.contactNumber}
                                onChange={e =>
                                  setFormData(prev => ({ ...prev, contactNumber: e.target.value }))
                                }
                                className="w-full font-bold bg-transparent focus:outline-hidden text-indigo-900"
                              />
                            )}
                          </td>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Emergency Phone:
                          </td>
                          <td className="p-1">
                            {isFormBlank ? (
                              <span>Alternate Phone</span>
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900 font-mono">
                                {formData.alternateContactNumber || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="Alternate / WhatsApp No"
                                value={formData.alternateContactNumber}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    alternateContactNumber: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="bg-slate-50 p-1 font-bold border-r border-slate-200 text-slate-700">
                            Residential Address:
                          </td>
                          <td className="p-1" colSpan={3}>
                            {isFormBlank ? (
                              <div className="h-4 border-b border-dotted border-slate-400" />
                            ) : isPreviewMode ? (
                              <span className="font-medium text-slate-900">
                                {formData.residentialAddress || '—'}
                              </span>
                            ) : (
                              <input
                                type="text"
                                placeholder="House / Street / Area / City"
                                value={formData.residentialAddress}
                                onChange={e =>
                                  setFormData(prev => ({
                                    ...prev,
                                    residentialAddress: e.target.value,
                                  }))
                                }
                                className="w-full bg-transparent font-medium focus:outline-hidden"
                              />
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* SECTION 4: REQUIRED DOCUMENTS CHECKLIST */}
                  <div
                    className={`mt-1.5 border rounded-xs overflow-hidden transition ${
                      hasAttemptedSubmit &&
                      (formErrors['hasPhotoAttached'] ||
                        formErrors['hasBirthCertAttached'] ||
                        formErrors['hasGuardianCnicAttached'] ||
                        formErrors['hasSchoolLeavingCertAttached'])
                        ? 'border-rose-400 bg-rose-50/20'
                        : 'border-slate-300'
                    }`}
                  >
                    <div
                      className={`border-b px-2 py-0.5 text-[8px] font-black uppercase tracking-wider flex items-center justify-between ${
                        hasAttemptedSubmit &&
                        (formErrors['hasPhotoAttached'] ||
                          formErrors['hasBirthCertAttached'] ||
                          formErrors['hasGuardianCnicAttached'] ||
                          formErrors['hasSchoolLeavingCertAttached'])
                          ? 'bg-rose-100 text-rose-950 border-rose-300'
                          : 'bg-slate-200 text-slate-900 border-slate-300'
                      }`}
                    >
                      <span>4. MANDATORY ADMISSION REQUIREMENTS &amp; DOCUMENT CHECKLIST</span>
                      <span className="text-[6.5px] font-bold text-rose-700">
                        *MANDATORY DOCUMENTS REQUIRED
                      </span>
                    </div>
                    <div className="p-1.5 bg-slate-50 grid grid-cols-2 gap-x-4 gap-y-1 text-[7px] text-slate-800">
                      {isPreviewMode ? (
                        <div className="flex items-center gap-1.5 p-0.5">
                          <span
                            className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center text-[8px] font-black shrink-0 ${
                              formData.hasPhotoAttached
                                ? 'border-slate-800 bg-slate-900 text-white'
                                : 'border-slate-400 bg-white text-transparent'
                            }`}
                          >
                            {formData.hasPhotoAttached ? '✓' : ''}
                          </span>
                          <span className="font-semibold text-slate-900">
                            1x Recent 4x4 cm / Passport size photograph
                            <span className="text-rose-600 font-black ml-0.5">*</span>
                          </span>
                        </div>
                      ) : (
                        <label
                          className={`flex items-center gap-1.5 cursor-pointer p-0.5 rounded-xs transition ${
                            hasAttemptedSubmit && formErrors['hasPhotoAttached']
                              ? 'bg-rose-100/70 text-rose-900 font-bold ring-1 ring-rose-400'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.hasPhotoAttached}
                            onChange={e =>
                              setFormData(prev => ({ ...prev, hasPhotoAttached: e.target.checked }))
                            }
                            className="w-3 h-3 text-indigo-600 rounded-xs"
                          />
                          <span className="font-semibold">
                            1x Recent 4x4 cm / Passport size photograph
                            <span className="text-rose-600 font-black ml-0.5">*</span>
                          </span>
                        </label>
                      )}

                      {isPreviewMode ? (
                        <div className="flex items-center gap-1.5 p-0.5">
                          <span
                            className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center text-[8px] font-black shrink-0 ${
                              formData.hasBirthCertAttached
                                ? 'border-slate-800 bg-slate-900 text-white'
                                : 'border-slate-400 bg-white text-transparent'
                            }`}
                          >
                            {formData.hasBirthCertAttached ? '✓' : ''}
                          </span>
                          <span className="font-semibold text-slate-900">
                            Official Birth Certificate / NADRA B-Form copy
                            <span className="text-rose-600 font-black ml-0.5">*</span>
                          </span>
                        </div>
                      ) : (
                        <label
                          className={`flex items-center gap-1.5 cursor-pointer p-0.5 rounded-xs transition ${
                            hasAttemptedSubmit && formErrors['hasBirthCertAttached']
                              ? 'bg-rose-100/70 text-rose-900 font-bold ring-1 ring-rose-400'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.hasBirthCertAttached}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                hasBirthCertAttached: e.target.checked,
                              }))
                            }
                            className="w-3 h-3 text-indigo-600 rounded-xs"
                          />
                          <span>
                            Official Birth Certificate / NADRA B-Form copy
                            <span className="text-rose-600 font-black ml-0.5">*</span>
                          </span>
                        </label>
                      )}

                      {isPreviewMode ? (
                        <div className="flex items-center gap-1.5 p-0.5">
                          <span
                            className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center text-[8px] font-black shrink-0 ${
                              formData.hasSchoolLeavingCertAttached
                                ? 'border-slate-800 bg-slate-900 text-white'
                                : 'border-slate-400 bg-white text-transparent'
                            }`}
                          >
                            {formData.hasSchoolLeavingCertAttached ? '✓' : ''}
                          </span>
                          <span>
                            Previous School Leaving Certificate (SLC/TC)
                            {formData.previousSchool && <span className="text-rose-600 font-black ml-0.5">*</span>}
                          </span>
                        </div>
                      ) : (
                        <label
                          className={`flex items-center gap-1.5 cursor-pointer p-0.5 rounded-xs transition ${
                            hasAttemptedSubmit && formErrors['hasSchoolLeavingCertAttached']
                              ? 'bg-rose-100/70 text-rose-900 font-bold ring-1 ring-rose-400'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.hasSchoolLeavingCertAttached}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                hasSchoolLeavingCertAttached: e.target.checked,
                              }))
                            }
                            className="w-3 h-3 text-indigo-600 rounded-xs"
                          />
                          <span>
                            Previous School Leaving Certificate (SLC/TC)
                            {formData.previousSchool && <span className="text-rose-600 font-black ml-0.5">*</span>}
                          </span>
                        </label>
                      )}

                      {isPreviewMode ? (
                        <div className="flex items-center gap-1.5 p-0.5">
                          <span
                            className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center text-[8px] font-black shrink-0 ${
                              formData.hasGuardianCnicAttached
                                ? 'border-slate-800 bg-slate-900 text-white'
                                : 'border-slate-400 bg-white text-transparent'
                            }`}
                          >
                            {formData.hasGuardianCnicAttached ? '✓' : ''}
                          </span>
                          <span className="font-semibold text-slate-900">
                            Attested copy of Father/Guardian CNIC
                            <span className="text-rose-600 font-black ml-0.5">*</span>
                          </span>
                        </div>
                      ) : (
                        <label
                          className={`flex items-center gap-1.5 cursor-pointer p-0.5 rounded-xs transition ${
                            hasAttemptedSubmit && formErrors['hasGuardianCnicAttached']
                              ? 'bg-rose-100/70 text-rose-900 font-bold ring-1 ring-rose-400'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.hasGuardianCnicAttached}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                hasGuardianCnicAttached: e.target.checked,
                              }))
                            }
                            className="w-3 h-3 text-indigo-600 rounded-xs"
                          />
                          <span>
                            Attested copy of Father/Guardian CNIC
                            <span className="text-rose-600 font-black ml-0.5">*</span>
                          </span>
                        </label>
                      )}

                      {isPreviewMode ? (
                        <div className="flex items-center gap-1.5 p-0.5">
                          <span
                            className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center text-[8px] font-black shrink-0 ${
                              formData.hasReportCardAttached
                                ? 'border-slate-800 bg-slate-900 text-white'
                                : 'border-slate-400 bg-white text-transparent'
                            }`}
                          >
                            {formData.hasReportCardAttached ? '✓' : ''}
                          </span>
                          <span>Previous Academic Progress Report / Marksheet</span>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1.5 cursor-pointer p-0.5 rounded-xs">
                          <input
                            type="checkbox"
                            checked={formData.hasReportCardAttached}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                hasReportCardAttached: e.target.checked,
                              }))
                            }
                            className="w-3 h-3 text-indigo-600 rounded-xs"
                          />
                          <span>Previous Academic Progress Report / Marksheet</span>
                        </label>
                      )}

                      {isPreviewMode ? (
                        <div className="flex items-center gap-1.5 p-0.5">
                          <span
                            className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center text-[8px] font-black shrink-0 ${
                              formData.hasMedicalRecordAttached
                                ? 'border-slate-800 bg-slate-900 text-white'
                                : 'border-slate-400 bg-white text-transparent'
                            }`}
                          >
                            {formData.hasMedicalRecordAttached ? '✓' : ''}
                          </span>
                          <span>Medical / Immunization Record &amp; Blood Group Proof</span>
                        </div>
                      ) : (
                        <label className="flex items-center gap-1.5 cursor-pointer p-0.5 rounded-xs">
                          <input
                            type="checkbox"
                            checked={formData.hasMedicalRecordAttached}
                            onChange={e =>
                              setFormData(prev => ({
                                ...prev,
                                hasMedicalRecordAttached: e.target.checked,
                              }))
                            }
                            className="w-3 h-3 text-indigo-600 rounded-xs"
                          />
                          <span>Medical / Immunization Record &amp; Blood Group Proof</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* SECTION 5: RULES AND REGULATIONS (EXPLICIT USER REQUIREMENT) */}
                  <div className="mt-1.5 border border-amber-300 rounded-xs overflow-hidden bg-amber-50/70">
                    <div className="bg-amber-100 border-b border-amber-300 px-2 py-0.5 text-[8px] font-black uppercase text-amber-950 tracking-wider flex items-center justify-between">
                      <span>5. ADMISSION RULES, POLICIES &amp; REGULATIONS</span>
                      <span className="text-[6.5px] font-bold text-amber-800">
                        MANDATORY INSTITUTIONAL CHARTER
                      </span>
                    </div>
                    <div className="p-1.5 space-y-0.5 text-[6.8px] text-slate-800 leading-tight">
                      <p className="font-bold text-amber-950 flex items-start gap-1">
                        <span className="text-amber-700">★</span>
                        <span>
                          <strong>1. Annual Fee Policy:</strong> An annual tuition &amp; composite
                          fee increase of <strong>10%</strong> will be applied at the beginning of
                          every new academic year / January to account for operational escalations,
                          facility upgrades, and inflation.
                        </span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span>•</span>
                        <span>
                          <strong>2. Monthly Fee Schedule:</strong> All tuition and allied charges
                          must be deposited on or before the <strong>10th</strong> of every calendar
                          month. Late surcharge is strictly applied post due date.
                        </span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span>•</span>
                        <span>
                          <strong>3. Attendance Requirement:</strong> A minimum of{' '}
                          <strong>80% regular attendance</strong> is compulsory for student promotion
                          and eligibility in mid-term and final examinations.
                        </span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span>•</span>
                        <span>
                          <strong>4. Code of Conduct:</strong> Students must maintain punctuality,
                          wear the prescribed uniform, and adhere strictly to all academic and
                          disciplinary protocols of the institution.
                        </span>
                      </p>
                      <p className="flex items-start gap-1">
                        <span>•</span>
                        <span>
                          <strong>5. Notice of Withdrawal:</strong> One full month's advance written
                          notice or one month's fee in lieu thereof is mandatory prior to withdrawing
                          a student or seeking a School Leaving Certificate (SLC).
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* SECTION 6: PARENT / GUARDIAN UNDERTAKING */}
                  <div className="mt-1.5 border border-slate-300 rounded-xs overflow-hidden">
                    <div className="bg-slate-200 border-b border-slate-300 px-2 py-0.5 text-[8px] font-black uppercase text-slate-900 tracking-wider">
                      6. PARENT / GUARDIAN UNDERTAKING &amp; DECLARATION
                    </div>
                    <div className="p-1.5 bg-white text-[6.8px] text-slate-700 leading-tight">
                      <p className="italic">
                        "I hereby solemnly declare that the information provided in this admission form
                        is genuine, authentic, and accurate. I have read, understood, and agreed to all
                        school rules, policies, and regulations (including the mandatory 10% annual fee
                        increase and monthly fee schedules). I undertake to cooperate with the school in
                        maintaining the highest standard of moral and academic discipline."
                      </p>

                      {/* Signature Lines */}
                      <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[7px] text-slate-800">
                        <div className="border-t border-slate-400 pt-1">
                          <span className="font-semibold">Candidate / Student Signature</span>
                        </div>
                        <div className="border-t border-slate-400 pt-1">
                          <span className="font-semibold">
                            Date: {formatDate(formData.admissionDate)}
                          </span>
                        </div>
                        <div className="border-t border-slate-800 pt-1">
                          <span className="font-bold text-slate-950">
                            Father / Guardian Signature &amp; Thumb
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 7: FOR OFFICE / REGISTRAR USE ONLY (BOTTOM BOX) */}
                <div className="border-2 border-slate-700 rounded-xs overflow-hidden bg-slate-50 mt-1">
                  <div className="bg-slate-800 text-white px-2 py-0.5 text-[7.5px] font-black uppercase tracking-wider flex items-center justify-between">
                    <span>7. FOR OFFICE / REGISTRAR USE ONLY</span>
                    <span className="text-[6.5px] text-amber-300">
                      NOT TO BE FILLED BY APPLICANT
                    </span>
                  </div>
                  <div className="p-1.5 text-[7px] space-y-1">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="font-bold text-slate-800">Admission Decision: </span>
                        <span>[  ] Approved   [  ] Provisional   [  ] Deferred</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">Assigned Roll No: </span>
                        <span className="font-mono font-bold text-indigo-900">
                          {formData.officeRollNo || '2026-____'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">Assigned Section: </span>
                        <span className="font-mono font-bold">{formData.section || 'A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      <div>
                        <span className="font-bold text-slate-800">Admission Fee Paid: </span>
                        <span>Yes [  ]   No [  ]</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">Receipt Voucher No: </span>
                        <span>REC-2026-________</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">Date of Entry: </span>
                        <span>____/____/2026</span>
                      </div>
                    </div>

                    {/* Authority Signatures */}
                    <div className="grid grid-cols-3 gap-6 pt-3 text-center text-[6.5px] text-slate-700 relative">
                      <div className="border-t border-slate-400 pt-0.5">
                        <span>Admission Officer Incharge</span>
                      </div>
                      <div className="border-t border-slate-400 pt-0.5">
                        <span>Accounts Clearance Officer</span>
                      </div>
                      <div className="border-t-2 border-slate-800 pt-0.5">
                        <span className="font-black text-slate-900">
                          Principal / Headmaster Seal &amp; Signature
                        </span>
                      </div>

                      {/* Official Digital Registrar Stamp (Visible in Preview and Print if enabled) */}
                      {showOfficialSeal && (
                        <div
                          className="absolute right-0 -top-2 pointer-events-none opacity-85 select-none rotate-[-8deg]"
                          style={{ zIndex: 10 }}
                        >
                          <div className="w-16 h-16 rounded-full border-2 border-red-700 p-0.5 flex items-center justify-center bg-white/40 shadow-xs">
                            <div className="w-full h-full rounded-full border border-dashed border-red-700 flex flex-col items-center justify-center text-center p-0.5 text-red-700">
                              <span className="text-[4.5px] font-black uppercase tracking-tight leading-none">
                                {settings.schoolName?.slice(0, 18) || 'EDULEDGER SCHOOL'}
                              </span>
                              <ShieldCheck className="w-3.5 h-3.5 my-0.5 text-red-700" />
                              <span className="text-[4px] font-black uppercase tracking-wider leading-none">
                                ADMISSION VERIFIED
                              </span>
                              <span className="text-[3.5px] font-mono font-bold mt-0.5">
                                REG-{settings.currentAcademicYear?.slice(0, 4) || '2026'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Print Timestamp */}
                <div className="text-center text-[6px] text-slate-400 mt-0.5">
                  EduLedger Official Registry • System Generated Single-Page Admission Form • Strict Portrait Layout
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Validation Error Dialog Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs no-print">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Form Validation Required
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Please complete the following mandatory items before saving to the database or generating the official admission form:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 max-h-60 overflow-y-auto space-y-2">
              <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                Mandatory items missing ({validationSummary.length}):
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                {validationSummary.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold shrink-0 mt-0.5">•</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Tip: You can use the <strong>"Fill Sample Data"</strong> button in the top toolbar to automatically populate verified student details and documents for immediate testing.
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleFillDemoData();
                  setShowErrorModal(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto-Fill Sample Data</span>
              </button>
              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                Review &amp; Fix Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
