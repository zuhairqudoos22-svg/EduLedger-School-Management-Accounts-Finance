import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { Student, Staff, SchoolSettings } from '../../types';
import { useSchool } from '../../context/SchoolContext';
import { BrightFutureIDCard } from '../attendance/BrightFutureIDCard';
import { CardDetailEditorModal } from '../attendance/CardDetailEditorModal';
import {
  QrCode,
  Printer,
  Download,
  X,
  User,
  Users,
  Search,
  CheckCircle2,
  Copy,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  FileText,
  Camera,
  Upload,
  Edit3,
} from 'lucide-react';
import { generateSingleBadgePdf, generateBatchBadgesPdf } from '../../utils/attendanceBadgePdf';
import {
  resolveBadgeTheme,
  getStoredBadgeTheme,
} from '../../utils/badgeTheme';

interface AttendanceQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  staff: Staff[];
  settings: SchoolSettings;
  initialType?: 'student' | 'staff';
  initialClass?: string;
  initialSection?: string;
  initialDept?: string;
  initialStudentId?: string;
}

export const AttendanceQRModal: React.FC<AttendanceQRModalProps> = ({
  isOpen,
  onClose,
  students,
  staff,
  settings,
  initialType = 'student',
  initialClass,
  initialSection = 'A',
  initialDept = 'All',
  initialStudentId,
}) => {
  const { updateStudent, updateStaff, updateSettings } = useSchool();
  const [activeType, setActiveType] = useState<'student' | 'staff'>(initialType);
  const [selectedClass, setSelectedClass] = useState<string>(
    initialClass || settings.standardClasses?.[0] || 'All'
  );
  const [selectedSection, setSelectedSection] = useState<string>(initialSection);
  const [selectedDept, setSelectedDept] = useState<string>(initialDept);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [batchQrUrls, setBatchQrUrls] = useState<Record<string, string>>({});
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Load active badge color theme from local persistence
  const storedThemeInfo = useMemo(() => getStoredBadgeTheme(), [isOpen]);
  const themeConfig = useMemo(
    () => resolveBadgeTheme(storedThemeInfo.theme, storedThemeInfo.customColor),
    [storedThemeInfo]
  );

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPhoto = async (photoBase64: string) => {
    if (activeType === 'student' && currentStudent) {
      await updateStudent({ ...currentStudent, photoUrl: photoBase64 });
    } else if (currentStaff) {
      await updateStaff({ ...currentStaff, photoUrl: photoBase64 });
    }
  };

  const handleUploadLogo = async (logoBase64: string) => {
    await updateSettings({ ...settings, logoUrl: logoBase64 });
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

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (isOpen) {
      if (initialStudentId) {
        setSelectedStudentId(initialStudentId);
        setActiveType('student');
      }
      if (initialClass) {
        setSelectedClass(initialClass);
      }
      if (initialSection) {
        setSelectedSection(initialSection);
      }
    }
  }, [isOpen, initialStudentId, initialClass, initialSection]);

  const availableClasses = useMemo(() => {
    const list = settings.standardClasses || [];
    return ['All', ...list];
  }, [settings.standardClasses]);

  const availableSections = useMemo(() => {
    const list = settings.standardSections || ['A', 'B', 'C'];
    return ['All', ...list];
  }, [settings.standardSections]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchClass = !selectedClass || selectedClass === 'All' || s.className === selectedClass;
      const matchSection = !selectedSection || selectedSection === 'All' || s.section === selectedSection;
      const matchQuery =
        !searchQuery ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchClass && matchSection && matchQuery;
    });
  }, [students, selectedClass, selectedSection, searchQuery]);

  // Filter staff
  const filteredStaff = useMemo(() => {
    return staff.filter(m => {
      const matchDept = !selectedDept || selectedDept === 'All' || m.department === selectedDept;
      const matchQuery =
        !searchQuery ||
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchQuery;
    });
  }, [staff, selectedDept, searchQuery]);

  // Initialize selected item
  useEffect(() => {
    if (activeType === 'student') {
      if (initialStudentId && filteredStudents.some(s => s.id === initialStudentId)) {
        setSelectedStudentId(initialStudentId);
      } else if (filteredStudents.length > 0 && !filteredStudents.some(s => s.id === selectedStudentId)) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      if (filteredStaff.length > 0 && !filteredStaff.some(s => s.id === selectedStaffId)) {
        setSelectedStaffId(filteredStaff[0].id);
      }
    }
  }, [activeType, filteredStudents, filteredStaff, selectedStudentId, selectedStaffId, initialStudentId]);

  const currentStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId) || filteredStudents[0] || null,
    [students, selectedStudentId, filteredStudents]
  );

  const currentStaff = useMemo(
    () => staff.find(s => s.id === selectedStaffId) || filteredStaff[0] || null,
    [staff, selectedStaffId, filteredStaff]
  );

  // Generate Single QR Code
  useEffect(() => {
    if (viewMode !== 'single') return;

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
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: activeType === 'student' ? '#1e1b4b' : '#042f2e', // deep indigo or teal
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate attendance QR code:', err));
  }, [activeType, currentStudent, currentStaff, settings, viewMode]);

  // Generate Batch QR Codes
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
          width: 200,
          margin: 1,
          color: {
            dark: activeType === 'student' ? '#1e1b4b' : '#042f2e',
            light: '#ffffff',
          },
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

  if (!isOpen) return null;

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    const name =
      activeType === 'student'
        ? `student_qr_${currentStudent?.rollNo || 'id'}`
        : `staff_qr_${currentStaff?.employeeCode || 'id'}`;
    link.download = `${name}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const handleDownloadPdf = async () => {
    const target = activeType === 'student' ? currentStudent : currentStaff;
    if (!target) return;
    setIsPdfGenerating(true);
    try {
      await generateSingleBadgePdf(target, activeType, settings, themeConfig);
    } catch (err) {
      console.error('Failed to generate PDF badge', err);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleDownloadBatchPdf = async () => {
    const list = activeType === 'student' ? filteredStudents : filteredStaff;
    if (list.length === 0) return;
    setIsPdfGenerating(true);
    try {
      await generateBatchBadgesPdf(list, activeType, settings, themeConfig);
    } catch (err) {
      console.error('Failed to generate batch PDF', err);
    } finally {
      setIsPdfGenerating(false);
    }
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
      });
    } else if (activeType === 'staff' && currentStaff) {
      payload = JSON.stringify({
        type: 'STAFF_ID',
        id: currentStaff.id,
        employeeCode: currentStaff.employeeCode,
        name: currentStaff.fullName,
        department: currentStaff.department,
      });
    }
    if (payload) {
      navigator.clipboard.writeText(payload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-6 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Attendance QR Code &amp; ID Badge Generator</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Contactless Roll Call
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Generate high-resolution scannable QR cards for students and faculty attendance tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs cursor-pointer transition"
              title="Print attendance cards on paper"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>Print Badges</span>
            </button>

            {viewMode === 'single' && (
              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 cursor-pointer transition"
                title="Download QR code image PNG"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Selector Bar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between flex-wrap gap-3 text-xs">
          {/* Target Type Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setActiveType('student');
                setViewMode('single');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeType === 'student'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Attendance</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveType('staff');
                setViewMode('single');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeType === 'staff'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Staff &amp; Faculty</span>
            </button>
          </div>

          {/* Mode: Single vs Batch */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Layout:</span>
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Individual Badge
            </button>
            <button
              type="button"
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                viewMode === 'batch'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Batch Sheet (Grid of Badges)
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeType === 'student' ? (
              <>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>
                      {c === 'All' ? 'All Grades' : c}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {availableSections.map(s => (
                    <option key={s} value={s}>
                      {s === 'All' ? 'All Sections' : `Sec ${s}`}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold"
              >
                {departments.map(d => (
                  <option key={d} value={d}>
                    {d} {d !== 'All' ? 'Dept' : ''}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-40"
              />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'single' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Attendee Selector List */}
              <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-900/40 max-h-[460px] overflow-y-auto">
                <span className="text-[11px] font-extrabold uppercase text-slate-400 px-2 block">
                  Select {activeType === 'student' ? 'Student' : 'Staff Member'} (
                  {activeType === 'student' ? filteredStudents.length : filteredStaff.length})
                </span>

                {activeType === 'student' ? (
                  filteredStudents.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 text-center">No matching students found.</p>
                  ) : (
                    filteredStudents.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-between ${
                          currentStudent?.id === s.id
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate">{s.fullName}</p>
                          <p className={`text-[10px] font-mono ${currentStudent?.id === s.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                            Roll: #{s.rollNo} • {s.className}-{s.section}
                          </p>
                        </div>
                        {currentStudent?.id === s.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      </button>
                    ))
                  )
                ) : filteredStaff.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 text-center">No matching staff members found.</p>
                ) : (
                  filteredStaff.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedStaffId(m.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-between ${
                        currentStaff?.id === m.id
                          ? 'bg-teal-600 text-white font-bold shadow-xs'
                          : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="truncate">
                        <p className="truncate">{m.fullName}</p>
                        <p className={`text-[10px] font-mono ${currentStaff?.id === m.id ? 'text-teal-200' : 'text-slate-400'}`}>
                          {m.employeeCode} • {m.department}
                        </p>
                      </div>
                      {currentStaff?.id === m.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              {/* Right 2 Columns: Printable ID Badge / Card Preview */}
              <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-slate-950/60 rounded-3xl border border-slate-200 dark:border-slate-800">
                {(activeType === 'student' && currentStudent) || (activeType === 'staff' && currentStaff) ? (
                  <div className="space-y-4 max-w-sm w-full flex flex-col items-center">
                    {/* Hidden file inputs for direct upload */}
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

                    {/* Quick Customization Toolbar */}
                    <div className="w-full flex items-center justify-between gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer text-[11px]"
                      >
                        <Camera className="w-3 h-3 text-indigo-600" />
                        <span>Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition cursor-pointer text-[11px]"
                      >
                        <Upload className="w-3 h-3 text-amber-500" />
                        <span>Logo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition cursor-pointer text-[11px]"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* Badge Card Matching Sample */}
                    <div id="printable-attendance-badge" className="flex justify-center w-full">
                      <BrightFutureIDCard
                        attendee={activeType === 'student' ? currentStudent! : currentStaff!}
                        type={activeType}
                        settings={settings}
                        themeConfig={themeConfig}
                        qrDataUrl={qrDataUrl}
                        onUploadPhoto={handleUploadPhoto}
                        onUploadLogo={handleUploadLogo}
                        onEditDetails={() => setIsEditorOpen(true)}
                        showEditOverlay={true}
                        className="shadow-2xl"
                      />
                    </div>

                    {/* Single Actions */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadPdf}
                        disabled={isPdfGenerating}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition cursor-pointer active:scale-95 disabled:opacity-50"
                        title="Download ISO CR80 standard printable PDF ID card"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isPdfGenerating ? 'Building PDF...' : 'Download PDF Badge'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadQr}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                        title="Download high-resolution QR matrix image"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyPayload}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition cursor-pointer"
                        title="Copy raw JSON payload stored in the QR code"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedPayload ? 'Copied!' : 'Copy QR'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Please select an attendee from the list.</p>
                )}
              </div>
            </div>
          ) : (
            /* Batch Printable Grid Mode */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-extrabold text-indigo-900 dark:text-indigo-200">
                    Batch Attendance Card Print Sheet (
                    {activeType === 'student' ? filteredStudents.length : filteredStaff.length} Badges)
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Ready-to-print multi-up sheet for cutting and laminating badges for the entire roster.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBatchPdf}
                    disabled={isPdfGenerating}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{isPdfGenerating ? 'Generating...' : 'Download Batch PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Sheet</span>
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
                        className="p-3 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center print:border-slate-400 print:shadow-none"
                      >
                        <p className="text-[9px] uppercase font-bold text-slate-400 truncate max-w-full">
                          {settings.schoolName || 'EduLedger'}
                        </p>
                        <p className="font-bold text-xs text-slate-900 truncate max-w-full mt-0.5">{s.fullName}</p>
                        <p className="text-[10px] font-mono text-indigo-600 font-semibold">
                          #{s.rollNo} • {s.className}-{s.section}
                        </p>
                        <div className="my-2 p-1 bg-white border border-slate-100 rounded-lg">
                          {batchQrUrls[s.id] ? (
                            <img src={batchQrUrls[s.id]} alt="QR" className="w-24 h-24 object-contain" />
                          ) : (
                            <div className="w-24 h-24 flex items-center justify-center text-[10px] text-slate-400">
                              ...
                            </div>
                          )}
                        </div>
                        <p className="text-[8px] text-slate-400 font-mono uppercase">Student Attendance ID</p>
                      </div>
                    ))
                  : filteredStaff.slice(0, 48).map(m => (
                      <div
                        key={m.id}
                        className="p-3 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center print:border-slate-400 print:shadow-none"
                      >
                        <p className="text-[9px] uppercase font-bold text-slate-400 truncate max-w-full">
                          {settings.schoolName || 'EduLedger'}
                        </p>
                        <p className="font-bold text-xs text-slate-900 truncate max-w-full mt-0.5">{m.fullName}</p>
                        <p className="text-[10px] font-mono text-teal-600 font-semibold">
                          {m.employeeCode} • {m.department}
                        </p>
                        <div className="my-2 p-1 bg-white border border-slate-100 rounded-lg">
                          {batchQrUrls[m.id] ? (
                            <img src={batchQrUrls[m.id]} alt="QR" className="w-24 h-24 object-contain" />
                          ) : (
                            <div className="w-24 h-24 flex items-center justify-center text-[10px] text-slate-400">
                              ...
                            </div>
                          )}
                        </div>
                        <p className="text-[8px] text-slate-400 font-mono uppercase">Staff Attendance ID</p>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Detail & Branding Customization Modal */}
      <CardDetailEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        attendee={activeType === 'student' ? currentStudent : currentStaff}
        type={activeType}
        settings={settings}
      />
    </div>
  );
};
