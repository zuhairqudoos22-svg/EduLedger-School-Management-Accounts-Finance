import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { useSchool } from '../../context/SchoolContext';
import { useNotifications } from '../../context/NotificationContext';
import { Student, Staff, SchoolSettings } from '../../types';
import { QRScannerModal } from '../common/QRScannerModal';
import { BrightFutureIDCard } from './BrightFutureIDCard';
import { CardDetailEditorModal } from './CardDetailEditorModal';
import {
  generateSingleBadgePdf,
  generateBatchBadgesPdf,
  generateClassBadgesPdf,
} from '../../utils/attendanceBadgePdf';
import { formatDate, getTodayDateString } from '../../utils/formatters';
import {
  QrCode,
  Printer,
  Download,
  Users,
  Search,
  CheckCircle2,
  Copy,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  Camera,
  Filter,
  Check,
  Phone,
  ShieldCheck,
  UserCheck,
  FileText,
  Sliders,
  Palette,
  Eye,
  RefreshCw,
  Clock,
  IdCard,
  Upload,
  Edit3,
  Image as ImageIcon,
  PenTool,
} from 'lucide-react';
import {
  BadgeThemeKey,
  BadgeThemeConfig,
  BADGE_THEMES,
  resolveBadgeTheme,
  getStoredBadgeTheme,
  saveStoredBadgeTheme,
} from '../../utils/badgeTheme';

export type BadgeOrientation = 'landscape' | 'portrait';

export const AttendanceQRGeneratorView: React.FC = () => {
  const {
    students,
    staff,
    settings,
    updateSettings,
    updateStudent,
    updateStaff,
    studentAttendance,
    staffAttendance,
    saveStudentAttendance,
    saveStaffAttendance,
    setActiveTab,
  } = useSchool();

  const { notify } = useNotifications();

  // Mode States
  const [activeType, setActiveType] = useState<'student' | 'staff'>('student');
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [badgeOrientation, setBadgeOrientation] = useState<BadgeOrientation>('portrait');

  // Badge Color Theme State (with local persistence)
  const storedThemeInfo = useMemo(() => getStoredBadgeTheme(), []);
  const [activeTheme, setActiveTheme] = useState<BadgeThemeKey>(storedThemeInfo.theme);
  const [customHex, setCustomHex] = useState<string>(storedThemeInfo.customColor || '#0A2E63');
  const customColorInputRef = useRef<HTMLInputElement>(null);

  const themeConfig = useMemo(
    () => resolveBadgeTheme(activeTheme, customHex),
    [activeTheme, customHex]
  );

  const handleSelectTheme = (key: BadgeThemeKey) => {
    setActiveTheme(key);
    saveStoredBadgeTheme(key, customHex);
  };

  const handleCustomHexChange = (color: string) => {
    setCustomHex(color);
    setActiveTheme('custom');
    saveStoredBadgeTheme('custom', color);
  };

  // Filter States
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Badge Customizer Options
  const [showEmergencyPhone, setShowEmergencyPhone] = useState(true);
  const [showBloodGroup, setShowBloodGroup] = useState(true);
  const [showVerificationSeal, setShowVerificationSeal] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);

  // Editor Modal & File Upload States
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Output States
  const [singleQrDataUrl, setSingleQrDataUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [batchQrUrls, setBatchQrUrls] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filter students (with search)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = selectedClass === 'All' || s.className === selectedClass;
      const matchSection = selectedSection === 'All' || s.section === selectedSection;
      const matchQuery =
        !searchQuery ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSection && matchQuery;
    });
  }, [students, selectedClass, selectedSection, searchQuery]);

  // All active students enrolled in the selected class (for Download All PDF)
  const targetClassStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'active') return false;
      if (selectedClass !== 'All' && s.className !== selectedClass) return false;
      if (selectedSection !== 'All' && s.section !== selectedSection) return false;
      return true;
    });
  }, [students, selectedClass, selectedSection]);

  // Dynamic list of classes available from school settings and enrolled students
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    (settings.standardClasses || []).forEach(c => classSet.add(c));
    students.forEach(s => {
      if (s.className) classSet.add(s.className);
    });
    return Array.from(classSet);
  }, [settings.standardClasses, students]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    return staff.filter(m => {
      const matchDept = selectedDept === 'All' || m.department === selectedDept;
      const matchQuery =
        !searchQuery ||
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchQuery;
    });
  }, [staff, selectedDept, searchQuery]);

  // Select first item if current selection invalid
  useEffect(() => {
    if (activeType === 'student') {
      if (filteredStudents.length > 0 && !filteredStudents.some(s => s.id === selectedStudentId)) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      if (filteredStaff.length > 0 && !filteredStaff.some(s => s.id === selectedStaffId)) {
        setSelectedStaffId(filteredStaff[0].id);
      }
    }
  }, [activeType, filteredStudents, filteredStaff, selectedStudentId, selectedStaffId]);

  const currentStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId) || filteredStudents[0] || null,
    [students, selectedStudentId, filteredStudents]
  );

  const currentStaff = useMemo(
    () => staff.find(s => s.id === selectedStaffId) || filteredStaff[0] || null,
    [staff, selectedStaffId, filteredStaff]
  );

  // Generate single attendee QR
  useEffect(() => {
    let payload = '';
    if (activeType === 'student' && currentStudent) {
      payload = JSON.stringify({
        type: 'STUDENT_ID',
        id: currentStudent.id,
        rollNo: currentStudent.rollNo,
        name: currentStudent.fullName,
        className: currentStudent.className,
        section: currentStudent.section,
        school: settings.schoolName || 'EduLedger Academy',
        session: settings.currentAcademicYear || '2026-2027',
      });
    } else if (activeType === 'staff' && currentStaff) {
      payload = JSON.stringify({
        type: 'STAFF_ID',
        id: currentStaff.id,
        employeeCode: currentStaff.employeeCode,
        name: currentStaff.fullName,
        department: currentStaff.department,
        designation: currentStaff.designation,
        school: settings.schoolName || 'EduLedger Academy',
        session: settings.currentAcademicYear || '2026-2027',
      });
    }

    if (!payload) {
      setSingleQrDataUrl('');
      return;
    }

    QRCode.toDataURL(payload, {
      width: 400,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setSingleQrDataUrl(url))
      .catch(err => console.error('Failed to generate attendance QR code:', err));
  }, [activeType, currentStudent, currentStaff, settings]);

  // Generate batch QR URLs for grid
  useEffect(() => {
    if (viewMode !== 'batch') return;

    const list = activeType === 'student' ? filteredStudents.slice(0, 48) : filteredStaff.slice(0, 48);
    const map: Record<string, string> = {};
    let isCancelled = false;

    Promise.all(
      list.map(async item => {
        let payload = '';
        if (activeType === 'student') {
          const s = item as Student;
          payload = JSON.stringify({
            type: 'STUDENT_ID',
            id: s.id,
            rollNo: s.rollNo,
            name: s.fullName,
            className: s.className,
            section: s.section,
            school: settings.schoolName || 'EduLedger Academy',
          });
        } else {
          const m = item as Staff;
          payload = JSON.stringify({
            type: 'STAFF_ID',
            id: m.id,
            employeeCode: m.employeeCode,
            name: m.fullName,
            department: m.department,
            designation: m.designation,
            school: settings.schoolName || 'EduLedger Academy',
          });
        }

        const url = await QRCode.toDataURL(payload, {
          width: 250,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        return { id: item.id, url };
      })
    ).then(results => {
      if (!isCancelled) {
        results.forEach(r => {
          map[r.id] = r.url;
        });
        setBatchQrUrls(map);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeType, filteredStudents, filteredStaff, settings, viewMode]);

  // Actions
  const handleDownloadSinglePng = () => {
    if (!singleQrDataUrl) return;
    const link = document.createElement('a');
    const name =
      activeType === 'student'
        ? `attendance_qr_${currentStudent?.rollNo || 'student'}_${currentStudent?.fullName.replace(/\s+/g, '_')}`
        : `attendance_qr_${currentStaff?.employeeCode || 'staff'}_${currentStaff?.fullName.replace(/\s+/g, '_')}`;
    link.download = `${name}.png`;
    link.href = singleQrDataUrl;
    link.click();
  };

  const handleDownloadSinglePdf = async () => {
    const target = activeType === 'student' ? currentStudent : currentStaff;
    if (!target) return;
    setIsGeneratingPdf(true);
    try {
      await generateSingleBadgePdf(target, activeType, settings, themeConfig);
      setActionNotice(`Exported official ${themeConfig.name} PDF badge for ${target.fullName}.`);
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadBatchPdf = async () => {
    const list = activeType === 'student' ? filteredStudents : filteredStaff;
    if (list.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      await generateBatchBadgesPdf(list, activeType, settings, themeConfig);
      setActionNotice(`Generated printable A4 batch sheet (${themeConfig.name}) for ${list.length} attendees.`);
      setTimeout(() => setActionNotice(null), 3500);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadAllClassBadges = async () => {
    const list = targetClassStudents;
    if (list.length === 0) {
      notify({
        title: 'No Students Found',
        message: `No active students found in ${selectedClass === 'All' ? 'the selected filter' : selectedClass}.`,
        category: 'system',
        priority: 'normal',
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const classDescriptor =
        selectedClass === 'All'
          ? 'All Classes'
          : selectedSection === 'All'
          ? selectedClass
          : `${selectedClass} - Section ${selectedSection}`;

      await generateClassBadgesPdf(list, classDescriptor, settings, themeConfig);

      const msg = `Generated single PDF containing QR badges for all ${list.length} students in ${classDescriptor} with ${themeConfig.name} styling.`;
      setActionNotice(msg);
      notify({
        title: 'Class Badges PDF Ready',
        message: msg,
        category: 'general',
        priority: 'normal',
      });
      setTimeout(() => setActionNotice(null), 4500);
    } catch (err) {
      console.error('Failed to generate class badges PDF', err);
      notify({
        title: 'PDF Generation Failed',
        message: 'Could not generate QR badges PDF for the selected class.',
        category: 'system',
        priority: 'urgent',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleUploadPhoto = async (photoBase64: string) => {
    if (activeType === 'student' && currentStudent) {
      const updated: Student = { ...currentStudent, photoUrl: photoBase64 };
      await updateStudent(updated);
      setActionNotice(`Updated photo for ${currentStudent.fullName}.`);
      notify({
        title: 'Photo Uploaded',
        message: `Student portrait photo updated for ${currentStudent.fullName}.`,
        category: 'system',
        priority: 'normal',
      });
    } else if (currentStaff) {
      const updated: Staff = { ...currentStaff, photoUrl: photoBase64 };
      await updateStaff(updated);
      setActionNotice(`Updated photo for ${currentStaff.fullName}.`);
      notify({
        title: 'Photo Uploaded',
        message: `Faculty photo updated for ${currentStaff.fullName}.`,
        category: 'system',
        priority: 'normal',
      });
    }
  };

  const handleUploadLogo = async (logoBase64: string) => {
    await updateSettings({
      ...settings,
      logoUrl: logoBase64,
    });
    setActionNotice('Custom school logo updated and applied to all ID card headers.');
    notify({
      title: 'School Logo Updated',
      message: 'New school logo emblem applied to student and staff ID cards.',
      category: 'system',
      priority: 'normal',
    });
  };

  const handleApplySamplePreset = async () => {
    await updateSettings({
      ...settings,
      schoolName: 'BRIGHT FUTURE',
      schoolTagline: 'PUBLIC SCHOOL',
      currentAcademicYear: '2025-26',
    });
    setActionNotice('Applied "BRIGHT FUTURE PUBLIC SCHOOL" card branding preset.');
    notify({
      title: 'Preset Applied',
      message: 'Card headers updated to match Bright Future Public School format.',
      category: 'system',
      priority: 'normal',
    });
  };

  const handlePhotoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        handleUploadPhoto(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        handleUploadLogo(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUploadSignature = async (signatureBase64: string) => {
    await updateSettings({
      ...settings,
      principalSignatureUrl: signatureBase64,
    });
    setActionNotice('Principal signature uploaded and applied to Student & Staff cards.');
    notify({
      title: 'Principal Signature Updated',
      message: 'Official principal signature applied to Student and Staff cards & PDF batch sheets.',
      category: 'system',
      priority: 'normal',
    });
  };

  const handleRemoveSignature = async () => {
    await updateSettings({
      ...settings,
      principalSignatureUrl: '',
    });
    setActionNotice('Principal signature cleared. Restored default cursive signature.');
    notify({
      title: 'Signature Reset',
      message: 'Restored default cursive signature for cards.',
      category: 'system',
      priority: 'normal',
    });
  };

  const handleSignatureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate JPG, PNG, JPEG
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const validExtensions = /\.(jpe?g|png)$/i;
    if (!validTypes.includes(file.type) && !validExtensions.test(file.name)) {
      notify({
        title: 'Unsupported Image Format',
        message: 'Please upload a valid JPG, PNG, or JPEG image for the principal signature.',
        category: 'system',
        priority: 'urgent',
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      if (evt.target?.result) {
        handleUploadSignature(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopyPayload = () => {
    let payload = '';
    if (activeType === 'student' && currentStudent) {
      payload = JSON.stringify({
        type: 'STUDENT_ID',
        id: currentStudent.id,
        rollNo: currentStudent.rollNo,
        name: currentStudent.fullName,
        className: currentStudent.className,
        section: currentStudent.section,
        school: settings.schoolName || 'EduLedger Academy',
      });
    } else if (activeType === 'staff' && currentStaff) {
      payload = JSON.stringify({
        type: 'STAFF_ID',
        id: currentStaff.id,
        employeeCode: currentStaff.employeeCode,
        name: currentStaff.fullName,
        department: currentStaff.department,
        designation: currentStaff.designation,
        school: settings.schoolName || 'EduLedger Academy',
      });
    }
    if (payload) {
      navigator.clipboard.writeText(payload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  // 1-Click Roll Call test verification
  const handleTestMarkPresent = async () => {
    const today = getTodayDateString();
    if (activeType === 'student' && currentStudent) {
      const existing = studentAttendance.find(a => a.studentId === currentStudent.id && a.date === today);
      await saveStudentAttendance([
        {
          id: existing ? existing.id : `att-${currentStudent.id}-${today}`,
          date: today,
          studentId: currentStudent.id,
          studentName: currentStudent.fullName,
          className: currentStudent.className,
          section: currentStudent.section,
          status: 'present',
          remarks: 'Contactless Roll Call QR Badge verification',
        },
      ]);
      notify({
        title: 'Contactless Roll Call Verified',
        message: `${currentStudent.fullName} (Roll #${currentStudent.rollNo}) marked Present for today!`,
        category: 'general',
        priority: 'normal',
        targetTab: 'student-attendance',
        actionLabel: 'View Attendance',
      });
      setActionNotice(`Marked student ${currentStudent.fullName} as PRESENT for today.`);
      setTimeout(() => setActionNotice(null), 3500);
    } else if (currentStaff) {
      const existing = staffAttendance.find(a => a.staffId === currentStaff.id && a.date === today);
      await saveStaffAttendance([
        {
          id: existing ? existing.id : `att-staff-${currentStaff.id}-${today}`,
          date: today,
          staffId: currentStaff.id,
          staffName: currentStaff.fullName,
          designation: currentStaff.designation,
          status: 'present',
          remarks: 'Contactless Roll Call QR Badge verification',
        },
      ]);
      notify({
        title: 'Staff Attendance Logged',
        message: `${currentStaff.fullName} (${currentStaff.employeeCode}) marked Present for today!`,
        category: 'staff_attendance',
        priority: 'normal',
        targetTab: 'staff-attendance',
        actionLabel: 'View Roster',
      });
      setActionNotice(`Marked faculty member ${currentStaff.fullName} as PRESENT for today.`);
      setTimeout(() => setActionNotice(null), 3500);
    }
  };

  const departments = [
    'All',
    'Academics',
    'Mathematics',
    'Humanities',
    'Science & Robotics',
    'Finance & Accounts',
    'Administration',
    'Operations',
    'Athletics',
  ];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0 mt-0.5">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Attendance QR Code &amp; ID Badge Generator
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Contactless Roll Call
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Generate high-resolution scannable QR cards for students and faculty attendance tracking, print multi-up sheets, or launch live camera contactless check-in.
            </p>
          </div>
        </div>

        {/* Global Primary Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {activeType === 'student' && (
            <button
              type="button"
              onClick={handleDownloadAllClassBadges}
              disabled={isGeneratingPdf || targetClassStudents.length === 0}
              className="h-10 flex items-center gap-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              title={`Download a single PDF containing QR badges for all students in ${selectedClass === 'All' ? 'all classes' : selectedClass}`}
            >
              <Download className="w-4 h-4 text-indigo-200 shrink-0" />
              <span>
                {isGeneratingPdf
                  ? 'Generating PDF...'
                  : `Download All (${selectedClass === 'All' ? 'All Classes' : selectedClass}: ${targetClassStudents.length})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="h-10 flex items-center gap-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            title="Launch camera or USB scanner to track attendance"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span>Launch Live Scanner</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBatchPdf}
            disabled={isGeneratingPdf}
            className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title="Download multi-card A4 printable PDF sheet"
          >
            <Layers className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Batch Sheet PDF ({activeType === 'student' ? filteredStudents.length : filteredStaff.length})</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="h-10 flex items-center gap-1.5 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            title="Print through browser"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Print Layout</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Studio Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {/* Navigation & Target Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          {/* Target: Student vs Staff */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setActiveType('student');
                setViewMode('single');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeType === 'student'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student Attendance Cards ({students.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveType('staff');
                setViewMode('single');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeType === 'staff'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Building className="w-4 h-4" />
              <span>Faculty &amp; Staff Cards ({staff.length})</span>
            </button>
          </div>

          {/* Mode: Individual Studio vs Batch Grid */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold">Layout Mode:</span>
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'single'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Individual Studio
              </button>
              <button
                type="button"
                onClick={() => setViewMode('batch')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'batch'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Batch Multi-Up Sheet (A4)
              </button>
            </div>
          </div>
        </div>

        {/* Filter & Customization Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs">
          {/* Filter 1: Grade/Class or Dept */}
          <div>
            <div className="flex items-center justify-between mb-1.5 min-w-0">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">
                {activeType === 'student' ? 'Class Filter' : 'Department'}
              </label>
              {activeType === 'student' && targetClassStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadAllClassBadges}
                  disabled={isGeneratingPdf}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  title="Download single PDF containing all QR badges in this class"
                >
                  <Download className="w-3 h-3" />
                  <span>Download All</span>
                </button>
              )}
            </div>
            {activeType === 'student' ? (
              <select
                value={selectedClass}
                onChange={e => setSelectedClass(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="All">All Grades &amp; Classes</option>
                {availableClasses.map(c => (
                  <option key={c} value={c}>
                    {c.toLowerCase().includes('grade') || c.toLowerCase().includes('class') ? c : `Class ${c}`}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d} {d !== 'All' ? 'Dept' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Filter 2: Section or Search */}
          <div>
            <div className="flex items-center justify-between mb-1.5 min-w-0">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">
                {activeType === 'student' ? 'Section' : 'Search Staff'}
              </label>
            </div>
            {activeType === 'student' ? (
              <select
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="All">All Sections</option>
                {(settings.standardSections || ['A', 'B', 'C', 'D']).map(s => (
                  <option key={s} value={s}>
                    Section {s}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name or employee code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          {/* Filter 3: Search (for students) or Role */}
          <div>
            <div className="flex items-center justify-between mb-1.5 min-w-0">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider truncate">
                {activeType === 'student' ? 'Search Student' : 'Card Orientation'}
              </label>
            </div>
            {activeType === 'student' ? (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Name or roll number..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 h-10">
                <button
                  type="button"
                  onClick={() => setBadgeOrientation('portrait')}
                  className={`flex-1 h-8 rounded-lg font-bold text-xs text-center transition cursor-pointer flex items-center justify-center ${
                    badgeOrientation === 'portrait' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setBadgeOrientation('landscape')}
                  className={`flex-1 h-8 rounded-lg font-bold text-xs text-center transition cursor-pointer flex items-center justify-center ${
                    badgeOrientation === 'landscape' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Landscape
                </button>
              </div>
            )}
          </div>

          {/* Filter 4: Theme Palette */}
          <div>
            <div className="flex items-center justify-between mb-1.5 min-w-0">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5 min-w-0">
                <Palette className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">Badge Color Theme</span>
              </label>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                {themeConfig.name}
              </span>
            </div>

            <div className="w-full flex flex-wrap items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs min-h-[40px]">
              {(Object.keys(BADGE_THEMES) as Array<Exclude<BadgeThemeKey, 'custom'>>).map(key => {
                const isSelected = activeTheme === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSelectTheme(key)}
                    className={`relative w-7 h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 shadow-sm z-10'
                        : 'opacity-75 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: BADGE_THEMES[key].primaryHex }}
                    title={BADGE_THEMES[key].name}
                  >
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-xs" />
                    )}
                  </button>
                );
              })}

              {/* Custom Color Picker Button */}
              <div className="relative shrink-0">
                <input
                  ref={customColorInputRef}
                  type="color"
                  value={customHex}
                  onChange={e => handleCustomHexChange(e.target.value)}
                  className="sr-only"
                  id="badge-custom-color-picker"
                />
                <button
                  type="button"
                  onClick={() => customColorInputRef.current?.click()}
                  className={`relative w-7 h-7 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border ${
                    activeTheme === 'custom'
                      ? 'scale-110 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-900 shadow-sm z-10 border-indigo-500'
                      : 'border-dashed border-slate-300 dark:border-slate-600 opacity-80 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: activeTheme === 'custom' ? customHex : 'transparent',
                  }}
                  title="Choose Custom Hex Brand Color"
                >
                  <Sliders
                    className={`w-3.5 h-3.5 ${
                      activeTheme === 'custom' ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* View Body */}
        {viewMode === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] gap-6 items-stretch">
            {/* Left Column: Attendee Roster */}
            <div className="flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 min-h-[640px] space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Select Attendee ({activeType === 'student' ? filteredStudents.length : filteredStaff.length})
                </span>
                {activeType === 'student' && targetClassStudents.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleDownloadAllClassBadges}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/60 px-2.5 py-1 rounded-lg transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title={`Download single PDF containing all ${targetClassStudents.length} student badges for ${selectedClass === 'All' ? 'All Classes' : selectedClass}`}
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Download All ({targetClassStudents.length})</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">1-Click Preview</span>
                )}
              </div>

              <div className="space-y-2 flex-1 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
                {activeType === 'student' ? (
                  filteredStudents.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      No matching students found.
                    </div>
                  ) : (
                    filteredStudents.map(s => {
                      const isSelected = currentStudent?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStudentId(s.id)}
                          className={`w-full text-left p-3 rounded-2xl text-xs transition cursor-pointer flex items-center justify-between border ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-bold border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/70'
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                                isSelected ? 'bg-white text-indigo-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {s.fullName.charAt(0)}
                            </div>
                            <div className="truncate">
                              <p className="font-bold truncate text-sm">{s.fullName}</p>
                              <p className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                Roll #{s.rollNo} • Class {s.className}-{s.section}
                              </p>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />}
                        </button>
                      );
                    })
                  )
                ) : filteredStaff.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    No matching staff members found.
                  </div>
                ) : (
                  filteredStaff.map(m => {
                    const isSelected = currentStaff?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedStaffId(m.id)}
                        className={`w-full text-left p-3 rounded-2xl text-xs transition cursor-pointer flex items-center justify-between border ${
                          isSelected
                            ? 'bg-teal-600 text-white font-bold border-teal-600 shadow-md shadow-teal-600/20'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              isSelected ? 'bg-white text-teal-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {m.fullName.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="font-bold truncate text-sm">{m.fullName}</p>
                            <p className={`text-[11px] font-mono mt-0.5 ${isSelected ? 'text-teal-100' : 'text-slate-400'}`}>
                              {m.employeeCode} • {m.department}
                            </p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Live Badge Card Preview & Actions Studio */}
            <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-100 dark:bg-slate-950/70 rounded-3xl border border-slate-200 dark:border-slate-800 min-h-[640px]">
              {/* Hidden file inputs for direct one-click upload triggers */}
              <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handlePhotoInputChange}
              />
              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleLogoInputChange}
              />
              <input
                type="file"
                ref={signatureInputRef}
                accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleSignatureInputChange}
              />

              {(activeType === 'student' && currentStudent) || (activeType === 'staff' && currentStaff) ? (
                <div className="space-y-6 max-w-md w-full flex flex-col items-center">
                  {/* Quick Customization Toolbar */}
                  <div className="w-full flex items-center justify-between gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex-wrap">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                      title="Upload attendee portrait photograph"
                    >
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                      title="Upload school crest or logo emblem"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-500" />
                      <span>Upload Logo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                      title="Upload principal signature image (JPG, PNG, JPEG)"
                    >
                      <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{settings.principalSignatureUrl ? 'Change Signature' : 'Upload Signature'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsEditorModalOpen(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                      title="Edit all attendee and school card credentials"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleApplySamplePreset}
                      className="px-2.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                      title="Apply sample preset: BRIGHT FUTURE PUBLIC SCHOOL"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span className="hidden sm:inline ml-1">Preset</span>
                    </button>
                  </div>

                  {/* Sample-Matched Bright Future Portrait CR80 ID Card */}
                  <div id="printable-attendance-badge" className="flex justify-center w-full">
                    <BrightFutureIDCard
                      attendee={activeType === 'student' ? currentStudent! : currentStaff!}
                      type={activeType}
                      settings={settings}
                      themeConfig={themeConfig}
                      qrDataUrl={singleQrDataUrl}
                      onUploadPhoto={handleUploadPhoto}
                      onUploadLogo={handleUploadLogo}
                      onUploadSignature={handleUploadSignature}
                      onEditDetails={() => setIsEditorModalOpen(true)}
                      showEditOverlay={true}
                      className="shadow-2xl"
                    />
                  </div>

                  {/* Actions Bar for the Selected Badge */}
                  <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadSinglePng}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
                      title="Download high-resolution PNG"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Save PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSinglePdf}
                      disabled={isGeneratingPdf}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
                      title="Download official ISO CR80 vector PDF badge matching sample"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vector PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
                      title="Copy QR payload data JSON"
                    >
                      <Copy className="w-3.5 h-3.5 text-blue-600" />
                      <span>{copiedPayload ? 'Copied!' : 'Copy Data'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestMarkPresent}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition active:scale-95 cursor-pointer"
                      title="Test contactless check-in right now"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Test Scan</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Please select an attendee from the list.</p>
              )}
            </div>
          </div>
        ) : (
          /* Mode 2: Batch Multi-Card A4 Print Sheet */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-extrabold text-indigo-900 dark:text-indigo-200 text-sm">
                  Batch Multi-Card A4 Print Sheet ({activeType === 'student' ? filteredStudents.length : filteredStaff.length} Badges)
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Pre-formatted 8-up layout on A4 paper with cutting guides. Ready for card punch, lamination, and pouch inserts.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {activeType === 'student' && (
                  <button
                    type="button"
                    onClick={handleDownloadAllClassBadges}
                    disabled={isGeneratingPdf || targetClassStudents.length === 0}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title={`Download a single PDF containing QR badges for all ${targetClassStudents.length} students in ${selectedClass === 'All' ? 'all classes' : selectedClass}`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download All ({targetClassStudents.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadBatchPdf}
                  disabled={isGeneratingPdf}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Download current filtered batch as A4 printable PDF sheet"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Download Batch PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Badges</span>
                </button>
              </div>
            </div>

            {/* Grid of badges */}
            <div
              id="printable-batch-qr-sheet"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-3"
            >
              {activeType === 'student'
                ? filteredStudents.slice(0, 48).map(s => (
                    <div
                      key={s.id}
                      className="p-3 bg-white text-slate-900 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col items-center text-center overflow-hidden print:border-slate-400 print:shadow-none hover:shadow-md transition"
                    >
                      {/* Mini Themed Header */}
                      <div
                        className="w-full text-white py-1.5 px-2 rounded-xl text-center mb-2 shadow-xs transition-colors"
                        style={{ backgroundColor: themeConfig.primaryHex }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-wider text-white truncate">
                          {settings.schoolName || 'BRIGHT FUTURE'}
                        </p>
                        <p
                          className="text-[7px] font-bold uppercase tracking-wider truncate"
                          style={{ color: themeConfig.accentHex }}
                        >
                          {settings.schoolTagline || 'PUBLIC SCHOOL'}
                        </p>
                      </div>

                      {/* Photo & QR side-by-side */}
                      <div className="flex items-center justify-center gap-2 w-full my-1">
                        <div
                          className="w-12 h-14 rounded-lg border-2 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-xs transition-colors"
                          style={{ borderColor: themeConfig.primaryHex }}
                        >
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span
                              className="text-sm font-black"
                              style={{ color: themeConfig.primaryHex }}
                            >
                              {s.fullName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="p-1 bg-white border border-slate-200 rounded-lg shrink-0 shadow-2xs">
                          {batchQrUrls[s.id] ? (
                            <img src={batchQrUrls[s.id]} alt="QR" className="w-12 h-12 object-contain" />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center text-[8px] text-slate-400">
                              QR
                            </div>
                          )}
                        </div>
                      </div>

                      <p
                        className="font-black text-xs truncate max-w-full mt-1"
                        style={{ color: themeConfig.primaryHex }}
                      >
                        {s.fullName}
                      </p>
                      <p className="text-[9px] font-bold text-slate-600">
                        Class : {s.className} ({s.section})
                      </p>
                      <div
                        className="mt-1 px-2.5 py-0.5 rounded-full text-white text-[8px] font-mono font-bold tracking-wider shadow-2xs"
                        style={{ backgroundColor: themeConfig.primaryHex }}
                      >
                        ID: {s.idNumber || `BFPS/25/${s.rollNo}`}
                      </div>
                    </div>
                  ))
                : filteredStaff.slice(0, 48).map(m => (
                    <div
                      key={m.id}
                      className="p-3 bg-white text-slate-900 rounded-2xl border-2 border-slate-200 shadow-sm flex flex-col items-center text-center overflow-hidden print:border-slate-400 print:shadow-none hover:shadow-md transition"
                    >
                      {/* Mini Themed Header */}
                      <div
                        className="w-full text-white py-1.5 px-2 rounded-xl text-center mb-2 shadow-xs transition-colors"
                        style={{ backgroundColor: themeConfig.primaryHex }}
                      >
                        <p className="text-[9px] font-black uppercase tracking-wider text-white truncate">
                          {settings.schoolName || 'BRIGHT FUTURE'}
                        </p>
                        <p
                          className="text-[7px] font-bold uppercase tracking-wider truncate"
                          style={{ color: themeConfig.accentHex }}
                        >
                          {settings.schoolTagline || 'PUBLIC SCHOOL'}
                        </p>
                      </div>

                      {/* Photo & QR side-by-side */}
                      <div className="flex items-center justify-center gap-2 w-full my-1">
                        <div
                          className="w-12 h-14 rounded-lg border-2 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-xs transition-colors"
                          style={{ borderColor: themeConfig.primaryHex }}
                        >
                          {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span
                              className="text-sm font-black"
                              style={{ color: themeConfig.primaryHex }}
                            >
                              {m.fullName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="p-1 bg-white border border-slate-200 rounded-lg shrink-0 shadow-2xs">
                          {batchQrUrls[m.id] ? (
                            <img src={batchQrUrls[m.id]} alt="QR" className="w-12 h-12 object-contain" />
                          ) : (
                            <div className="w-12 h-12 flex items-center justify-center text-[8px] text-slate-400">
                              QR
                            </div>
                          )}
                        </div>
                      </div>

                      <p
                        className="font-black text-xs truncate max-w-full mt-1"
                        style={{ color: themeConfig.primaryHex }}
                      >
                        {m.fullName}
                      </p>
                      <p className="text-[9px] font-bold text-slate-600 truncate max-w-full">
                        {m.designation || 'Faculty'} • {m.department}
                      </p>
                      <div
                        className="mt-1 px-2.5 py-0.5 rounded-full text-white text-[8px] font-mono font-bold tracking-wider shadow-2xs"
                        style={{ backgroundColor: themeConfig.primaryHex }}
                      >
                        ID: {m.idNumber || `BFPS/STAFF/${m.employeeCode}`}
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Attendee & School Branding Customization Modal */}
      <CardDetailEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        attendee={activeType === 'student' ? currentStudent : currentStaff}
        type={activeType}
        settings={settings}
      />

      {/* Built-in Live Contactless Roll Call Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        scannerTarget="all"
        mode="attendance"
      />
    </div>
  );
};
