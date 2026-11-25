import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { useSchool } from '../../context/SchoolContext';
import { useTranslation } from '../../i18n';
import { Student, StudentStatus, AttendanceStatus, PaymentMode } from '../../types';
import { formatDate, formatCurrency, exportToCSV, exportToExcel, getTodayDateString, getCurrentMonthName } from '../../utils/formatters';
import {
  formatStudentsForExport,
  exportMasterSchoolWorkbook,
} from '../../utils/exportUtils';
import { ExportDropdown } from '../common/ExportDropdown';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { BulkCommunicationModal } from '../common/BulkCommunicationModal';
import { QRScannerModal } from '../common/QRScannerModal';
import { BackButton } from '../common/BackButton';
import { ClassManagementModal } from '../common/ClassManagementModal';
import { BulkStudentImportModal } from '../common/BulkStudentImportModal';
import { StudentRecordCardModal } from './StudentRecordCardModal';
import { AdmissionFormModal } from './AdmissionFormModal';
import { generateStudentListPdf } from '../../utils/studentPdf';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Award,
  ArrowRightLeft,
  X,
  User,
  Upload,
  Phone,
  CalendarCheck,
  Receipt,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  ShieldCheck,
  Check,
  Sparkles,
  FileText,
  MessageSquare,
  QrCode,
  Eye,
  Printer,
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';

export const StudentManagementView: React.FC = () => {
  const {
    students,
    staff,
    feePayments,
    expenses,
    getDefaultersList,
    settings,
    addStudent,
    updateStudent,
    deleteStudent,
    bulkDeleteStudents,
    promoteStudents,
    bulkUpdateStudentStatus,
    bulkRecordStudentAttendance,
    bulkRecordFeePayments,
    setIdCardStudent,
    setReceiptToPrint,
    selectedStudentIdForDetail,
    setSelectedStudentIdForDetail,
    setActiveTab,
    studentAttendance,
    examResults,
    addClass,
  } = useSchool();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isClearStudentsModalOpen, setIsClearStudentsModalOpen] = useState(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [isRecordCardModalOpen, setIsRecordCardModalOpen] = useState(false);
  const [recordCardStudent, setRecordCardStudent] = useState<Student | null>(null);
  const [isAdmissionFormModalOpen, setIsAdmissionFormModalOpen] = useState(false);
  const [admissionCandidateStudent, setAdmissionCandidateStudent] = useState<Student | null>(null);
  const [isInlineAddClassOpen, setIsInlineAddClassOpen] = useState(false);
  const [inlineNewClassName, setInlineNewClassName] = useState('');
  const [inlineAddError, setInlineAddError] = useState('');

  const detailStudent = useMemo(() => {
    if (!selectedStudentIdForDetail) return null;
    return students.find(s => s.id === selectedStudentIdForDetail) || null;
  }, [selectedStudentIdForDetail, students]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');

  // Modal states for single edit/add
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Selection & Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Dedicated Student ID Card View State
  const [showInlineIdCard, setShowInlineIdCard] = useState<boolean>(false);
  const [inlineCardSide, setInlineCardSide] = useState<'front' | 'back'>('front');
  const [inlineQrUrl, setInlineQrUrl] = useState<string>('');

  useEffect(() => {
    if (!detailStudent) {
      setShowInlineIdCard(false);
      setInlineQrUrl('');
      return;
    }

    const qrPayload = JSON.stringify({
      type: 'STUDENT_ID',
      id: detailStudent.id,
      rollNo: detailStudent.rollNo,
      name: detailStudent.fullName,
      className: detailStudent.className,
      section: detailStudent.section,
      bloodGroup: detailStudent.bloodGroup || 'O+',
      emergencyContact: detailStudent.contactNumber,
      school: settings.schoolName || 'EduLedger Academy',
      academicYear: settings.currentAcademicYear || '2026-2027',
    });

    QRCode.toDataURL(qrPayload, {
      width: 280,
      margin: 1,
      color: {
        dark: '#1e1b4b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => setInlineQrUrl(url))
      .catch(err => console.error('Failed to generate inline QR code:', err));
  }, [detailStudent, settings]);

  // Bulk Modals
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [targetPromoteClass, setTargetPromoteClass] = useState('');

  const [isBulkAttendanceModalOpen, setIsBulkAttendanceModalOpen] = useState(false);
  const [bulkAttendanceDate, setBulkAttendanceDate] = useState(getTodayDateString());
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState<AttendanceStatus>('present');
  const [bulkAttendanceRemarks, setBulkAttendanceRemarks] = useState('');

  const [isBulkFeeModalOpen, setIsBulkFeeModalOpen] = useState(false);
  const [bulkFeeMonth, setBulkFeeMonth] = useState(getCurrentMonthName());
  const [bulkFeePaymentMode, setBulkFeePaymentMode] = useState<PaymentMode>('Cash');
  const [bulkFeeRemarks, setBulkFeeRemarks] = useState('Bulk fee collection batch');

  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [targetBulkStatus, setTargetBulkStatus] = useState<StudentStatus>('active');

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Bulk & Single Communication Modal State
  const [isBulkCommModalOpen, setIsBulkCommModalOpen] = useState(false);
  const [commCandidateStudent, setCommCandidateStudent] = useState<Student | null>(null);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Defaulters Map for injecting exact pending fee dues into message templates
  const defaultersList = getDefaultersList();
  const defaultersMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of defaultersList) {
      map[item.student.id] = item.pendingAmount;
    }
    return map;
  }, [defaultersList]);

  // Single Form State
  const [formData, setFormData] = useState({
    rollNo: '',
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dateOfBirth: '2015-01-01',
    className: settings.standardClasses?.[0] || '',
    section: 'A',
    admissionDate: '2026-09-01',
    guardianName: '',
    guardianRelation: 'Parent',
    contactNumber: '',
    email: '',
    address: '',
    photoUrl: '',
    status: 'active' as StudentStatus,
    bloodGroup: 'O+',
  });

  const [formError, setFormError] = useState('');

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.guardianName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = selectedClass === 'All' || s.className === selectedClass;
    const matchesSection = selectedSection === 'All' || s.section === selectedSection;
    const matchesStatus = selectedStatus === 'All' || s.status === selectedStatus;

    return matchesSearch && matchesClass && matchesSection && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      rollNo: `2026-${String(students.length + 1).padStart(3, '0')}`,
      fullName: '',
      gender: 'Male',
      dateOfBirth: '2015-05-15',
      className: settings.standardClasses?.[0] || '',
      section: 'A',
      admissionDate: '2026-09-01',
      guardianName: '',
      guardianRelation: 'Father',
      contactNumber: '',
      email: '',
      address: '',
      photoUrl: '',
      status: 'active',
      bloodGroup: 'O+',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      rollNo: student.rollNo,
      fullName: student.fullName,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      className: student.className,
      section: student.section,
      admissionDate: student.admissionDate,
      guardianName: student.guardianName,
      guardianRelation: student.guardianRelation,
      contactNumber: student.contactNumber,
      email: student.email || '',
      address: student.address,
      photoUrl: student.photoUrl || '',
      status: student.status,
      bloodGroup: student.bloodGroup || 'O+',
    });
    setFormError('');
    setIsFormOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image file is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        setFormData(prev => ({ ...prev, photoUrl: (ev.target?.result as string) || '' }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setFormError('Student full name is required.');
      return;
    }
    if (!formData.rollNo.trim()) {
      setFormError('Roll / Admission number is required.');
      return;
    }

    const duplicate = students.find(
      s =>
        s.rollNo.toLowerCase() === formData.rollNo.trim().toLowerCase() &&
        s.id !== editingStudent?.id
    );
    if (duplicate) {
      setFormError(`Roll No "${formData.rollNo}" already exists for ${duplicate.fullName}.`);
      return;
    }

    if (editingStudent) {
      await updateStudent({
        ...editingStudent,
        ...formData,
      });
    } else {
      await addStudent(formData);
    }
    setIsFormOpen(false);
  };

  const handleQuickAddClass = async () => {
    if (!isAdmin) {
      setInlineAddError('Administrator authority is required to create new classes.');
      return;
    }
    const trimmed = inlineNewClassName.trim();
    if (!trimmed) {
      setInlineAddError('Please enter a class name.');
      return;
    }
    if (settings.standardClasses?.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setFormData(prev => ({ ...prev, className: trimmed }));
      setIsInlineAddClassOpen(false);
      setInlineNewClassName('');
      setInlineAddError('');
      return;
    }
    const ok = await addClass(trimmed);
    if (ok) {
      setFormData(prev => ({ ...prev, className: trimmed }));
      setIsInlineAddClassOpen(false);
      setInlineNewClassName('');
      setInlineAddError('');
      setBannerNotice(`Class "${trimmed}" successfully added by Admin and selected for student.`);
      setTimeout(() => setBannerNotice(null), 3500);
    } else {
      setInlineAddError('Failed to add class. Please try again.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteCandidateId) {
      await deleteStudent(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  // Selection toggles
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  // 1. Bulk Attendance Execution
  const handleExecuteBulkAttendance = async () => {
    if (selectedStudentIds.length === 0) return;
    await bulkRecordStudentAttendance(
      selectedStudentIds,
      bulkAttendanceDate,
      bulkAttendanceStatus,
      bulkAttendanceRemarks || undefined
    );
    setIsBulkAttendanceModalOpen(false);
    showNotice(
      `Marked ${bulkAttendanceStatus.toUpperCase()} attendance for ${selectedStudentIds.length} students on ${formatDate(bulkAttendanceDate)}!`
    );
    setSelectedStudentIds([]);
  };

  // 2. Bulk Fee Collection Execution
  const handleExecuteBulkFee = async () => {
    if (selectedStudentIds.length === 0) return;
    const receipts = await bulkRecordFeePayments(
      selectedStudentIds,
      bulkFeeMonth,
      bulkFeePaymentMode,
      bulkFeeRemarks || undefined
    );
    setIsBulkFeeModalOpen(false);
    showNotice(
      `Recorded fee collections for ${receipts.length} students (${bulkFeeMonth})! Receipts generated from #${receipts[0]?.receiptNumber} to #${receipts[receipts.length - 1]?.receiptNumber}.`
    );
    if (receipts.length > 0) {
      // Offer viewing the first receipt
      setReceiptToPrint(receipts[0]);
    }
    setSelectedStudentIds([]);
  };

  // 3. Bulk Promotion Execution
  const handleExecuteBulkPromote = async () => {
    if (!targetPromoteClass || selectedStudentIds.length === 0) return;
    await promoteStudents(selectedStudentIds, targetPromoteClass);
    setIsPromoteModalOpen(false);
    showNotice(`Successfully promoted ${selectedStudentIds.length} student(s) to ${targetPromoteClass}!`);
    setSelectedStudentIds([]);
  };

  // 4. Bulk Status Change Execution
  const handleExecuteBulkStatus = async () => {
    if (selectedStudentIds.length === 0) return;
    await bulkUpdateStudentStatus(selectedStudentIds, targetBulkStatus);
    setIsBulkStatusModalOpen(false);
    showNotice(`Updated enrollment status to "${targetBulkStatus}" for ${selectedStudentIds.length} student(s)!`);
    setSelectedStudentIds([]);
  };

  // 5. Bulk Export Selected to CSV & Excel
  const handleBulkExportCSV = () => {
    const selected = students.filter(s => selectedStudentIds.includes(s.id));
    if (selected.length === 0) return;
    const rows = formatStudentsForExport(selected);
    exportToCSV(`Selected_Students_${selected.length}_batch`, rows);
    showNotice(`Exported ${selected.length} selected students to CSV.`);
  };

  const handleBulkExportExcel = () => {
    const selected = students.filter(s => selectedStudentIds.includes(s.id));
    if (selected.length === 0) return;
    const rows = formatStudentsForExport(selected);
    exportToExcel(`Selected_Students_${selected.length}_batch`, 'Selected Students', rows);
    showNotice(`Exported ${selected.length} selected students to Excel (.xlsx).`);
  };

  // 5b. Download Selected Students Audit PDF
  const handleBulkDownloadPdf = () => {
    const selected = students.filter(s => selectedStudentIds.includes(s.id));
    if (selected.length === 0) return;
    generateStudentListPdf(settings, selected, {
      title: 'OFFICIAL AUDIT ROSTER - SELECTED STUDENT COHORT',
      isSelectionOnly: true,
    });
    showNotice(`Official Audit Roster PDF downloaded for ${selected.length} selected student(s).`);
  };

  // 5c. Download Filtered Student List PDF (for complete roster audit)
  const handleDownloadStudentListPdf = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student records found matching the current filters.');
      return;
    }
    generateStudentListPdf(settings, filteredStudents, {
      title: 'OFFICIAL STUDENT DIRECTORY & ENROLLMENT AUDIT ROSTER',
      className: selectedClass,
      section: selectedSection,
      statusFilter: selectedStatus,
      searchQuery: searchQuery.trim() || undefined,
      isSelectionOnly: false,
    });
    showNotice(`Official Student Directory PDF downloaded (${filteredStudents.length} students).`);
  };

  // 5d. Export Filtered Students CSV & Excel
  const handleExportFilteredCSV = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student records to export.');
      return;
    }
    const rows = formatStudentsForExport(filteredStudents);
    exportToCSV(`Student_Directory_${selectedClass}_${getTodayDateString()}`, rows);
    showNotice(`Exported ${filteredStudents.length} student records to CSV.`);
  };

  const handleExportFilteredExcel = () => {
    if (filteredStudents.length === 0) {
      showNotice('No student records to export.');
      return;
    }
    const rows = formatStudentsForExport(filteredStudents);
    exportToExcel(`Student_Directory_${selectedClass}`, `Students ${selectedClass}`, rows);
    showNotice(`Exported ${filteredStudents.length} student records to Excel (.xlsx).`);
  };

  // Master Comprehensive Workbook
  const handleExportMasterWorkbook = () => {
    const ok = exportMasterSchoolWorkbook(settings, {
      students,
      staff,
      feePayments,
      expenses,
      defaulters: getDefaultersList(),
    });
    if (ok) {
      showNotice('Master School Workbook (.xlsx) generated with 6 complete audit sheets.');
    }
  };

  // 6. Bulk Delete Execution
  const handleExecuteBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    const count = selectedStudentIds.length;
    const ok = await bulkDeleteStudents(selectedStudentIds);
    if (ok) {
      showNotice(`Successfully deleted ${count} student record(s) from local database.`);
      setSelectedStudentIds([]);
    }
    setIsBulkDeleteModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {detailStudent ? (
        <div className="space-y-6 animate-in fade-in">
          {showInlineIdCard ? (
            /* DEDICATED STUDENT ID CARD VIEW WITH PROMINENT BACK BUTTON */
            <div className="space-y-6 animate-in fade-in">
              {/* ID Card Top Header Bar with BackButton */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <BackButton
                    onClick={() => setShowInlineIdCard(false)}
                    label="Back to Student Profile"
                    variant="default"
                    ariaLabel="Return to student profile"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span>Student ID Card — {detailStudent.fullName}</span>
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {detailStudent.className} - {detailStudent.section}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Roll Number: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{detailStudent.rollNo}</span> • Official identity badge with QR code verification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIdCardStudent(detailStudent)}
                    className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                    title="Open full print & QR scan dialog"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Card</span>
                  </button>
                  <BackButton
                    onClick={() => setShowInlineIdCard(false)}
                    label="Back"
                    variant="subtle"
                  />
                </div>
              </div>

              {/* ID Card Display Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                {/* Switcher & Actions */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setInlineCardSide('front')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        inlineCardSide === 'front'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Front Badge View
                    </button>
                    <button
                      type="button"
                      onClick={() => setInlineCardSide('back')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                        inlineCardSide === 'back'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Back (QR Verification Pass)</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIdCardStudent(detailStudent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!inlineQrUrl) return;
                        const a = document.createElement('a');
                        a.href = inlineQrUrl;
                        a.download = `QR_ID_${detailStudent.rollNo}_${detailStudent.fullName.replace(/\s+/g, '_')}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save QR Code</span>
                    </button>
                  </div>
                </div>

                {/* Printable ID Card Container */}
                <div className="p-8 bg-slate-50 dark:bg-slate-950/60 rounded-2xl flex justify-center">
                  {inlineCardSide === 'front' ? (
                    /* CARD FRONT */
                    <div className="w-80 rounded-3xl bg-white shadow-xl overflow-hidden border border-slate-300 text-slate-800 flex flex-col relative">
                      <div className="bg-gradient-to-r from-indigo-800 via-indigo-700 to-indigo-900 text-white p-4 text-center relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                        <div className="flex justify-center mb-1">
                          <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                            <Award className="w-5 h-5 text-amber-300" />
                          </div>
                        </div>
                        <h2 className="text-xs font-black uppercase tracking-wider leading-tight">
                          {settings.schoolName || 'St. Augustine Academy'}
                        </h2>
                        <p className="text-[10px] text-indigo-200 mt-0.5">
                          Academic Year {settings.currentAcademicYear || '2026-2027'}
                        </p>
                      </div>

                      <div className="p-5 flex flex-col items-center">
                        <div className="w-24 h-24 rounded-2xl border-4 border-indigo-100 bg-slate-100 overflow-hidden flex items-center justify-center shadow-md mb-2 relative">
                          {detailStudent.photoUrl ? (
                            <img
                              src={detailStudent.photoUrl}
                              alt={detailStudent.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-12 h-12 text-slate-400" />
                          )}
                        </div>

                        <h3 className="text-base font-black text-slate-900 text-center leading-tight">
                          {detailStudent.fullName}
                        </h3>
                        <div className="inline-block mt-1 px-3 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-xs font-black rounded-full shadow-2xs">
                          ROLL: {detailStudent.rollNo}
                        </div>

                        <div className="w-full mt-3.5 space-y-1.5 text-xs border-t border-slate-200 pt-2.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Class &amp; Section:</span>
                            <span className="font-bold text-slate-900">
                              {detailStudent.className} - {detailStudent.section}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Date of Birth:</span>
                            <span className="font-semibold text-slate-800">
                              {formatDate(detailStudent.dateOfBirth)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Blood Group:</span>
                            <span className="font-bold text-red-600">
                              {detailStudent.bloodGroup || 'O+'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Guardian Name:</span>
                            <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                              {detailStudent.guardianName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Emergency Phone:</span>
                            <span className="font-mono font-bold text-slate-900">
                              {detailStudent.contactNumber}
                            </span>
                          </div>
                        </div>

                        <div className="w-full mt-4 pt-2 border-t border-dashed border-slate-200 flex justify-between items-end text-[9px] text-slate-400">
                          <div>
                            <p>Issue Date: {formatDate(detailStudent.admissionDate)}</p>
                            <p className="font-mono">VALID UNTIL: AUG 2027</p>
                          </div>
                          <div className="text-right">
                            <div className="w-16 border-b border-slate-400 mb-0.5" />
                            <p className="font-medium text-slate-600">Authorized Sign</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* CARD BACK (QR VERIFICATION PASS) */
                    <div className="w-80 rounded-3xl bg-white shadow-xl overflow-hidden border border-slate-300 text-slate-800 flex flex-col relative">
                      <div className="bg-slate-900 text-white p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                          <QrCode className="w-4 h-4 text-emerald-400" />
                          <span>Quick Scan Digital Badge</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Authorized for Attendance, Library &amp; Security Gate
                        </p>
                      </div>

                      <div className="p-6 flex flex-col items-center justify-center text-center">
                        <div className="p-3 rounded-2xl bg-white border-2 border-indigo-200 shadow-md">
                          {inlineQrUrl ? (
                            <img
                              src={inlineQrUrl}
                              alt={`QR Code for ${detailStudent.fullName}`}
                              className="w-44 h-44 object-contain"
                            />
                          ) : (
                            <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                              Generating QR Code...
                            </div>
                          )}
                        </div>

                        <div className="mt-3">
                          <p className="font-mono text-sm font-black text-slate-900">
                            ID: {detailStudent.rollNo}
                          </p>
                          <p className="text-xs font-bold text-indigo-700">{detailStudent.fullName}</p>
                          <p className="text-[11px] text-slate-500">
                            Class {detailStudent.className} - {detailStudent.section}
                          </p>
                        </div>

                        <div className="w-full mt-4 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-950 text-left space-y-1">
                          <p className="font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Scanner Instructions:
                          </p>
                          <p className="text-slate-600 leading-tight">
                            • Hold card 5–10 cm in front of terminal camera or 2D laser reader.
                          </p>
                          <p className="text-slate-600 leading-tight">
                            • Automatic attendance confirmation &amp; library checkout privileges.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 border-t border-slate-200 p-2 text-center text-[9px] text-slate-400">
                        Non-transferable student credentials • {settings.schoolName || 'EduLedger'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Back Button Bar */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex-wrap gap-3">
                  <BackButton
                    onClick={() => setShowInlineIdCard(false)}
                    label="Back to Student Profile"
                    variant="default"
                    ariaLabel="Return to student profile"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIdCardStudent(detailStudent)}
                      className="flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print ID Card</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Detail Top Header with BackButton */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <BackButton
                    onClick={() => setSelectedStudentIdForDetail(null)}
                    label="Back to Directory"
                    variant="default"
                    ariaLabel="Return to student list"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">
                        {detailStudent.fullName}
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {detailStudent.className} - {detailStudent.section}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        detailStudent.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {detailStudent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Roll Number: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{detailStudent.rollNo}</span> • Admission Date: {formatDate(detailStudent.admissionDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setAdmissionCandidateStudent(detailStudent);
                      setIsAdmissionFormModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-xs transition active:scale-95 cursor-pointer"
                    title="Open Official Admission & Registration Form (1-Page Portrait)"
                  >
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Admission Form</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecordCardStudent(detailStudent);
                      setIsRecordCardModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                    title="Open Dedicated Print Layout & Dossier Export"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Print Record Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInlineIdCard(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 transition cursor-pointer"
                    title="View & Print Student ID Card"
                  >
                    <Award className="w-4 h-4" />
                    <span>Student ID Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCommCandidateStudent(detailStudent);
                      setIsBulkCommModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message Guardian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentIdForDetail(detailStudent.id);
                      setActiveTab('fee-collection');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Fee Collection</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(detailStudent)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

          {/* Quick Metrics */}
          {(() => {
            const studentPayments = feePayments.filter(p => p.studentId === detailStudent.id);
            const totalFeesPaid = studentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
            const pendingBalance = defaultersMap[detailStudent.id] || 0;
            const records = (studentAttendance || []).filter(a => a.studentId === detailStudent.id);
            const presentCount = records.filter(a => a.status === 'present').length;
            const attendancePct = records.length > 0 ? Math.round((presentCount / records.length) * 100) : 100;
            const results = (examResults || []).filter(r => r.studentId === detailStudent.id);

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Attendance Rate</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      {attendancePct}%
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{presentCount} of {records.length} logged sessions</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Total Fees Paid</p>
                    <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatCurrency(totalFeesPaid, settings.currencySymbol)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{studentPayments.length} receipts issued</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Pending Due Balance</p>
                    <p className={`text-2xl font-black font-mono mt-1 ${pendingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(pendingBalance, settings.currencySymbol)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{pendingBalance > 0 ? 'Overdue' : 'Fully Cleared'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Exams Evaluated</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {results.length} Exams
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Recorded result cards</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal & Academic Profile */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>Personal &amp; Enrollment Information</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Gender</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStudent.gender}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Date of Birth</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{formatDate(detailStudent.dateOfBirth)}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Blood Group</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStudent.bloodGroup || 'Not Specified'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Class &amp; Section</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStudent.className} - {detailStudent.section}</p>
                      </div>
                    </div>
                  </div>

                  {/* Guardian & Contact */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-600" />
                      <span>Guardian &amp; Emergency Contact</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Guardian Name</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStudent.guardianName} ({detailStudent.guardianRelation})</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Contact Phone</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStudent.contactNumber}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Email Address</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{detailStudent.email || 'None Provided'}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Address</span>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">{detailStudent.address || 'Campus Resident'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Fee Payment History Table */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-indigo-600" />
                      <span>Fee Payment Records &amp; Invoices</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentIdForDetail(detailStudent.id);
                        setActiveTab('fee-collection');
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Collect New Payment &rarr;
                    </button>
                  </div>
                  {studentPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3">No fee receipts recorded yet for this student.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 pb-2">
                          <tr>
                            <th className="py-2">Receipt #</th>
                            <th className="py-2">Date</th>
                            <th className="py-2">For Month</th>
                            <th className="py-2">Mode</th>
                            <th className="py-2 text-right">Amount</th>
                            <th className="py-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {studentPayments.slice(0, 5).map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">{p.receiptNumber}</td>
                              <td className="py-2.5 text-slate-500">{formatDate(p.date)}</td>
                              <td className="py-2.5 text-slate-700 dark:text-slate-300">{p.monthFor}</td>
                              <td className="py-2.5 text-slate-500">{p.paymentMode}</td>
                              <td className="py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.totalAmount, settings.currencySymbol)}</td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setReceiptToPrint(p)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer"
                                >
                                  Print Voucher
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span>{t('students.directory', 'Student Management & Profiles')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('students.directoryDesc', 'Maintain complete student database, enrollment status, parent details, and printable audit rosters')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Student List PDF Button */}
          <button
            type="button"
            onClick={handleDownloadStudentListPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 shadow-xs transition active:scale-95 cursor-pointer"
            title="Download printable official student roster PDF for administrative audit"
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Download PDF</span>
          </button>

          {/* Export Dropdown (Excel & CSV & Master) */}
          <ExportDropdown
            label="Export Students"
            totalCount={filteredStudents.length}
            selectedCount={selectedStudentIds.length}
            onExportExcel={handleExportFilteredExcel}
            onExportCSV={handleExportFilteredCSV}
            onExportSelectedExcel={selectedStudentIds.length > 0 ? handleBulkExportExcel : undefined}
            onExportSelectedCSV={selectedStudentIds.length > 0 ? handleBulkExportCSV : undefined}
            onExportMaster={handleExportMasterWorkbook}
            size="md"
          />

                    {/* Clear All Students Button */}
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearStudentsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-xs transition active:scale-95 cursor-pointer"
              title="Clear all student admission records for new school setup"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Students</span>
            </button>
          )}

          {/* Scan QR ID Button */}
          <button
            type="button"
            onClick={() => setIsQRScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Scan student QR code or barcode to quickly look up profile or check in"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Scan QR ID</span>
          </button>

          {/* Bulk / Broadcast Communications Button */}
          <button
            onClick={() => {
              setCommCandidateStudent(null);
              setIsBulkCommModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Dispatch bulk WhatsApp, SMS, or notices to parent contacts"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Broadcast Notice</span>
          </button>

          {/* Admin Authority: Manage Classes & Curriculum */}
          <button
            type="button"
            onClick={() => setIsClassModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs transition active:scale-95 cursor-pointer"
            title={
              isAdmin
                ? 'Admin Authority: Add and manage academic curriculum classes and sections'
                : 'View academic classes & sections'
            }
          >
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Manage Classes</span>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-mono font-bold">
              {settings.standardClasses?.length || 0}
            </span>
          </button>

          {/* Admin Authority: Bulk Import CSV */}
          <button
            type="button"
            onClick={() => setIsBulkImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-xs transition active:scale-95 cursor-pointer"
            title={
              isAdmin
                ? 'Admin Authority: Bulk import student records using CSV template'
                : 'Bulk import student records using CSV template'
            }
          >
            <Upload className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Bulk Import CSV</span>
          </button>

          {/* Admission & Registration Form Button */}
          <button
            type="button"
            onClick={() => {
              setAdmissionCandidateStudent(null);
              setIsAdmissionFormModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-xs transition active:scale-95 cursor-pointer"
            title="Official Student Admission & Registration Form (1-Page Portrait Print / PDF)"
          >
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{t('nav.admissionForm', 'Admission Form')}</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('students.addStudent', 'Enroll New Student')}</span>
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar when records are selected */}
      {selectedStudentIds.length > 0 && (
        <div className="sticky top-18 z-20 p-3.5 rounded-2xl bg-indigo-900 text-white shadow-2xl border border-indigo-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white text-indigo-950 font-black text-xs">
              {selectedStudentIds.length}
            </span>
            <div>
              <p className="text-xs font-bold leading-tight">
                {selectedStudentIds.length} Student{selectedStudentIds.length > 1 ? 's' : ''} Selected
              </p>
              <p className="text-[10px] text-indigo-200">
                Choose a bulk action to apply across all selected profiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Download PDF */}
            <button
              onClick={handleBulkDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white border border-indigo-600 transition cursor-pointer"
              title="Download official audit PDF for selected students"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-300" />
              <span>Download PDF</span>
            </button>

            {/* Bulk Communicate / Notice to Parents */}
            <button
              onClick={() => {
                setCommCandidateStudent(null);
                setIsBulkCommModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm transition active:scale-95 cursor-pointer"
              title="Dispatch bulk WhatsApp, SMS, or notices to selected parents"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Parents ({selectedStudentIds.length})</span>
            </button>

            {/* Bulk Attendance */}
            <button
              onClick={() => setIsBulkAttendanceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-900 hover:bg-indigo-50 shadow-sm transition active:scale-95"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bulk Attendance</span>
            </button>

            {/* Bulk Fee Collection */}
            <button
              onClick={() => setIsBulkFeeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Bulk Fee Entry</span>
            </button>

            {/* Bulk Promote */}
            <button
              onClick={() => {
                setTargetPromoteClass(settings.standardClasses?.[1] || settings.standardClasses?.[0] || '');
                setIsPromoteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white border border-indigo-600 transition"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Promote</span>
            </button>

            {/* Bulk Status */}
            <button
              onClick={() => setIsBulkStatusModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white border border-indigo-600 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Set Status</span>
            </button>

            {/* Bulk Export Excel */}
            <button
              onClick={handleBulkExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
              title="Export selected students to Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Bulk Export CSV */}
            <button
              onClick={handleBulkExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-800 hover:bg-indigo-700 text-white border border-indigo-600 transition cursor-pointer"
              title="Export selected students to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Bulk Delete */}
            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Delete all selected student records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedStudentIds.length})</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={() => setSelectedStudentIds([])}
              className="p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-800 transition"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {bannerNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('students.searchPlaceholder', 'Search student by name, roll no, or guardian...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">{t('finance.class', 'Class')}:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">{t('students.allClasses', 'All Classes')} ({settings.standardClasses?.length || 0})</option>
              {settings.standardClasses?.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsClassModalOpen(true)}
                className="ml-1 p-0.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 rounded-md transition cursor-pointer"
                title="Admin Authority: Add or manage classes"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="All">All Status</option>
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="transferred">Transferred</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredStudents.length > 0 &&
                      selectedStudentIds.length === filteredStudents.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                    title="Select All Students"
                  />
                </th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Class &amp; Sec</th>
                <th className="py-3 px-4">Guardian Contact</th>
                <th className="py-3 px-4">Admission Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      No student records match the active search and filter criteria.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Enroll a student individually or upload a batch via CSV template.
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-4">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsBulkImportModalOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 shadow-xs cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Bulk Import CSV</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Enroll New Student</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedStudentIds.includes(student.id);
                  return (
                    <tr
                      key={student.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(student.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              student.fullName.charAt(0)
                            )}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentIdForDetail(student.id)}
                              className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition cursor-pointer"
                              title="View student details & performance"
                            >
                              {student.fullName}
                            </button>
                            <p className="text-[11px] text-slate-400">
                              {student.gender} • Blood: {student.bloodGroup || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {student.rollNo}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {student.className} - {student.section}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {student.guardianName} ({student.guardianRelation})
                        </p>
                        <p className="text-slate-500 text-[11px]">{student.contactNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(student.admissionDate)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            student.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              : student.status === 'graduated'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedStudentIdForDetail(student.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="View Complete Student Profile & Record"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setCommCandidateStudent(student);
                              setIsBulkCommModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Message Guardian / Parent via WhatsApp, SMS, or Email"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudentIdForDetail(student.id);
                              setShowInlineIdCard(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="View Student ID Card"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setRecordCardStudent(student);
                              setIsRecordCardModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Print Official Student Cumulative Record Card"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setAdmissionCandidateStudent(student);
                              setIsAdmissionFormModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Print / View Official Student Admission & Registration Form (1-Page Portrait)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Edit Student Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidateId(student.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Delete Student Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* MODAL 1: BULK ATTENDANCE MARKING */}
      {isBulkAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Attendance Marking
                </h3>
              </div>
              <button
                onClick={() => setIsBulkAttendanceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-xs text-slate-500">
                Applying attendance status for <strong>{selectedStudentIds.length}</strong> selected students simultaneously.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={bulkAttendanceDate}
                    onChange={e => setBulkAttendanceDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status to Apply
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setBulkAttendanceStatus('present')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                        bulkAttendanceStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Present</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkAttendanceStatus('absent')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                        bulkAttendanceStatus === 'absent'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Absent</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkAttendanceStatus('leave')}
                      className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                        bulkAttendanceStatus === 'leave'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>Leave</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Remark / Reason (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Science Fair excursion or Annual Sports Day"
                    value={bulkAttendanceRemarks}
                    onChange={e => setBulkAttendanceRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkAttendanceModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkAttendance}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
              >
                Apply to {selectedStudentIds.length} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK FEE PAYMENT ENTRY */}
      {isBulkFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Fee Collection Entry
                </h3>
              </div>
              <button
                onClick={() => setIsBulkFeeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-xs text-slate-500">
                This will record fee receipts for all <strong>{selectedStudentIds.length}</strong> selected students according to their respective class fee structures.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Period / Month
                  </label>
                  <input
                    type="text"
                    value={bulkFeeMonth}
                    onChange={e => setBulkFeeMonth(e.target.value)}
                    placeholder="e.g. September 2026"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={bulkFeePaymentMode}
                    onChange={e => setBulkFeePaymentMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="Bank Transfer">Bank Wire / Transfer</option>
                    <option value="Online/UPI">Online / Card / UPI</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Batch Receipt Remarks
                  </label>
                  <input
                    type="text"
                    value={bulkFeeRemarks}
                    onChange={e => setBulkFeeRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkFeeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkFee}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
              >
                Record {selectedStudentIds.length} Payments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BULK PROMOTE */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Promote {selectedStudentIds.length} Student(s)
              </h3>
              <button
                onClick={() => setIsPromoteModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-xs text-slate-500">
                Select the destination class to upgrade the selected students for the new academic session.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Class
                  </label>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsClassModalOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Manage / Add Classes</span>
                    </button>
                  )}
                </div>
                <select
                  value={targetPromoteClass}
                  onChange={e => setTargetPromoteClass(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
                >
                  {settings.standardClasses?.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setIsPromoteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkPromote}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
              >
                Execute Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK STATUS CHANGE */}
      {isBulkStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Change Status for {selectedStudentIds.length} Student(s)
              </h3>
              <button
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-xs text-slate-500">
                Update the enrollment standing for all selected student accounts.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Enrollment Status
                </label>
                <select
                  value={targetBulkStatus}
                  onChange={e => setTargetBulkStatus(e.target.value as StudentStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold"
                >
                  <option value="active">Active (Enrolled)</option>
                  <option value="graduated">Graduated (Completed Academic Program)</option>
                  <option value="transferred">Transferred (Relocated to another institution)</option>
                  <option value="inactive">Inactive / Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setIsBulkStatusModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkStatus}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm"
              >
                Apply Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Single Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>{editingStudent ? 'Edit Student Record' : 'Enroll New Student'}</span>
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium shrink-0">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center shrink-0 border-2 border-indigo-200">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Photo (Stored Offline)
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-100 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Roll / Admission No *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.rollNo}
                    onChange={e => setFormData({ ...formData, rollNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Class *
                    </label>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsInlineAddClassOpen(!isInlineAddClassOpen);
                          setInlineAddError('');
                        }}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Admin authority: add new class"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{isInlineAddClassOpen ? 'Close' : '+ New Class'}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Standard class</span>
                    )}
                  </div>

                  {/* Inline Quick Add Class for Admin */}
                  {isAdmin && isInlineAddClassOpen && (
                    <div className="mb-2 p-2.5 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1 uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" />
                          Admin: Quick Add Class
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsInlineAddClassOpen(false)}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. Grade 11, Pre-K..."
                          value={inlineNewClassName}
                          onChange={e => {
                            setInlineNewClassName(e.target.value);
                            setInlineAddError('');
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                          onKeyDown={async e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              await handleQuickAddClass();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleQuickAddClass}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs cursor-pointer"
                        >
                          Create &amp; Select
                        </button>
                      </div>
                      {inlineAddError && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
                          {inlineAddError}
                        </p>
                      )}
                    </div>
                  )}

                  <select
                    value={formData.className}
                    onChange={e => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {settings.standardClasses?.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Section
                  </label>
                  <select
                    value={formData.section}
                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {settings.standardSections?.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={e =>
                      setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' | 'Other' })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Guardian Name
                  </label>
                  <input
                    type="text"
                    value={formData.guardianName}
                    onChange={e => setFormData({ ...formData, guardianName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact / Emergency Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contactNumber}
                    onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blood Group
                  </label>
                  <select
                    value={formData.bloodGroup}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={e =>
                      setFormData({ ...formData, status: e.target.value as StudentStatus })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="graduated">Graduated</option>
                    <option value="transferred">Transferred</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition"
                >
                  {editingStudent ? 'Save Changes' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidateId}
        title="Delete Student Record"
        message="Are you sure you want to permanently delete this student record? Historical attendance and fee receipts will remain preserved in database audit."
        confirmLabel="Delete Student"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCandidateId(null)}
      />

      {/* Confirm Bulk Delete Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Delete Selected Student Records"
        message={`Are you sure you want to permanently delete ${selectedStudentIds.length} selected student record(s) from the local IndexedDB database? This action cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedStudentIds.length} Student(s)`}
        isDestructive={true}
        onConfirm={handleExecuteBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Bulk & Single Parent Communications Modal */}
      <BulkCommunicationModal
        isOpen={isBulkCommModalOpen}
        onClose={() => {
          setIsBulkCommModalOpen(false);
          setCommCandidateStudent(null);
        }}
        entityType="student"
        selectedRecipients={
          commCandidateStudent
            ? [commCandidateStudent]
            : selectedStudentIds.length > 0
            ? students.filter(s => selectedStudentIds.includes(s.id))
            : filteredStudents
        }
        allRecipients={students}
        settings={settings}
        defaultersMap={defaultersMap}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        mode="verify"
        onStudentIdentified={(scannedStudent) => {
          setIdCardStudent(scannedStudent);
          setSearchQuery(scannedStudent.rollNo);
        }}
      />

      {/* Admin Authority: Class & Curriculum Management Modal */}
      <ClassManagementModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onClassAdded={(newClass) => {
          setFormData(prev => ({ ...prev, className: newClass }));
        }}
      />

      {/* Admin Authority: Bulk Student Import Modal */}
      <BulkStudentImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onImportCompleted={(count) => {
          setBannerNotice(`Successfully imported ${count} student records via CSV template!`);
          setTimeout(() => setBannerNotice(null), 4000);
        }}
      />

      {/* Official Student Cumulative Record Card Print Modal */}
      <StudentRecordCardModal
        isOpen={isRecordCardModalOpen}
        onClose={() => {
          setIsRecordCardModalOpen(false);
          setRecordCardStudent(null);
        }}
        student={recordCardStudent}
        settings={settings}
        attendanceRecords={studentAttendance}
        examResults={examResults}
        feePayments={feePayments}
        defaultersMap={defaultersMap}
      />

      {/* Official Student Admission & Registration Form Modal */}
      <AdmissionFormModal
        isOpen={isAdmissionFormModalOpen}
        onClose={() => {
          setIsAdmissionFormModalOpen(false);
          setAdmissionCandidateStudent(null);
        }}
        preSelectedStudent={admissionCandidateStudent}
      />
          {/* Clear All Students Confirmation Modal */}
      {isClearStudentsModalOpen && (
        <DataResetConfirmationModal
          isOpen={isClearStudentsModalOpen}
          targetModule="students"
          onClose={() => setIsClearStudentsModalOpen(false)}
        />
      )}

    </div>
  );
};