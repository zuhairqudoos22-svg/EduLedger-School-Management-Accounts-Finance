import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { Student, AttendanceStatus, StudentAttendanceRecord } from '../../types';
import { getTodayDateString, exportToCSV, exportToExcel } from '../../utils/formatters';
import { generateDailyAttendanceRosterPdf } from '../../utils/studentPdf';
import { ExternalReportingModal } from '../reports/ExternalReportingModal';
import { ExportDropdown } from '../common/ExportDropdown';
import { QRScannerModal } from '../common/QRScannerModal';
import { AttendanceQRModal } from '../common/AttendanceQRModal';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { useNotifications } from '../../context/NotificationContext';
import {
  Trash2,
  CalendarCheck,
  Calendar,
  Save,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Users,
  BarChart2,
  Download,
  Check,
  QrCode,
  FileText,
  Building,
  Sparkles,
  CalendarDays,
  Flame,
  LayoutGrid,
  ClipboardList,
  Camera,
  Volume2,
  VolumeX,
  ScanLine,
  Zap,
  RotateCcw,
  Search,
  ArrowRight,
  IdCard,
  AlertTriangle,
} from 'lucide-react';
import '../../utils/chartSetup';
import { Bar } from 'react-chartjs-2';
import { AttendanceCalendarHeatmap } from '../attendance/AttendanceCalendarHeatmap';

export const StudentAttendanceView: React.FC = () => {
  const { students, staff, studentAttendance, saveStudentAttendance, settings } = useSchool();
  const { isAdmin } = useAuth();
  const { notify } = useNotifications();
  const { t } = useTranslation();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedClass, setSelectedClass] = useState<string>(
    settings.standardClasses?.[0] || ''
  );
  const [selectedSection, setSelectedSection] = useState<string>('A');

  useEffect(() => {
    const available = settings.standardClasses || [];
    if (available.length > 0 && (!selectedClass || !available.includes(selectedClass))) {
      setSelectedClass(available[0]);
    }
  }, [settings.standardClasses, selectedClass]);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = useState(false);
  const [isClearAttendanceModalOpen, setIsClearAttendanceModalOpen] = useState(false);
  const [isExternalReportModalOpen, setIsExternalReportModalOpen] = useState(false);
  const [activeAttendanceTab, setActiveAttendanceTab] = useState<'roster' | 'heatmap'>('roster');
  const [selectedBadgeStudent, setSelectedBadgeStudent] = useState<Student | null>(null);

  // Rapid Touchless QR Scanner States
  const [isRapidScannerExpanded, setIsRapidScannerExpanded] = useState<boolean>(true);
  const [hardwareWedgeInput, setHardwareWedgeInput] = useState<string>('');
  const [soundFeedback, setSoundFeedback] = useState<boolean>(true);
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [lastScannedTime, setLastScannedTime] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<
    Array<{ id: string; student: Student; time: string; sameClass: boolean }>
  >([]);
  const [crossClassAlert, setCrossClassAlert] = useState<{
    student: Student;
    fromClass: string;
    fromSection: string;
  } | null>(null);
  const [scannerNotice, setScannerNotice] = useState<string | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);
  const wedgeInputRef = useRef<HTMLInputElement>(null);

  // Active students in the selected class and section
  const rosterStudents = useMemo(() => {
    return students.filter(
      s => s.status === 'active' && s.className === selectedClass && s.section === selectedSection
    );
  }, [students, selectedClass, selectedSection]);

  // Attendance state for current form view
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; remarks: string }>
  >({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkRemark, setBulkRemark] = useState<string>('');
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Sync checkbox indeterminate state
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate =
        selectedStudentIds.length > 0 && selectedStudentIds.length < rosterStudents.length;
    }
  }, [selectedStudentIds, rosterStudents]);

  // Populate map when date/class/section changes or initial load
  useEffect(() => {
    setSelectedStudentIds([]);
    const map: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    for (const student of rosterStudents) {
      const existing = studentAttendance.find(
        a => a.date === selectedDate && a.studentId === student.id
      );
      if (existing) {
        map[student.id] = { status: existing.status, remarks: existing.remarks || '' };
      } else {
        map[student.id] = { status: 'present', remarks: '' }; // default present
      }
    }
    setAttendanceMap(map);
  }, [selectedDate, selectedClass, selectedSection, rosterStudents, studentAttendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!isAdmin) return; // Finance users are read-only for attendance
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    if (!isAdmin) return;
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    if (!isAdmin) return;
    const newMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    for (const s of rosterStudents) {
      newMap[s.id] = { status, remarks: attendanceMap[s.id]?.remarks || '' };
    }
    setAttendanceMap(newMap);
  };

  const handleMarkSelected = (status: AttendanceStatus) => {
    if (!isAdmin || selectedStudentIds.length === 0) return;
    setAttendanceMap(prev => {
      const newMap = { ...prev };
      for (const id of selectedStudentIds) {
        newMap[id] = {
          ...newMap[id],
          status,
          remarks: bulkRemark.trim() ? bulkRemark.trim() : newMap[id]?.remarks || '',
        };
      }
      return newMap;
    });
    setBulkRemark('');
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === rosterStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(rosterStudents.map(s => s.id));
    }
  };

  // Audio chime feedback using Web Audio API
  const playScanChime = (success: boolean = true) => {
    if (!soundFeedback) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // Audio policy safe
    }
  };

  // Rapid Touchless Scan Processor (handles JSON QR badges, roll numbers, or student IDs)
  const handleProcessStudentScan = async (rawInput: string) => {
    if (!rawInput || !rawInput.trim() || isProcessingScan) return;
    const trimmed = rawInput.trim();
    setIsProcessingScan(true);

    let targetStudent: Student | undefined;

    // Try decoding JSON QR payload (generated by EduLedger QR badge)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.id) {
          targetStudent = students.find(s => s.id === parsed.id);
        }
        if (!targetStudent && (parsed.rollNo || parsed.roll)) {
          const r = String(parsed.rollNo || parsed.roll).toLowerCase();
          targetStudent = students.find(s => s.rollNo.toLowerCase() === r);
        }
      } catch {
        // Fallback to string matching
      }
    }

    // Direct lookup by student ID, roll number, or exact full name
    if (!targetStudent) {
      const lower = trimmed.toLowerCase();
      targetStudent = students.find(
        s =>
          s.rollNo.toLowerCase() === lower ||
          s.id.toLowerCase() === lower ||
          s.fullName.toLowerCase() === lower
      );
    }

    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (!targetStudent) {
      playScanChime(false);
      setScannerNotice(`Unrecognized student card or roll number: "${trimmed}".`);
      setTimeout(() => setScannerNotice(null), 4000);
      setHardwareWedgeInput('');
      setIsProcessingScan(false);
      return;
    }

    // Student found! Play pleasant chime
    playScanChime(true);
    setLastScannedStudent(targetStudent);
    setLastScannedTime(timeStr);

    const isSameClass =
      targetStudent.className === selectedClass && targetStudent.section === selectedSection;

    // Instant persistence to database
    const existing = studentAttendance.find(
      a => a.studentId === targetStudent!.id && a.date === selectedDate
    );

    await saveStudentAttendance([
      {
        id: existing ? existing.id : `att-${targetStudent.id}-${selectedDate}`,
        date: selectedDate,
        studentId: targetStudent.id,
        studentName: targetStudent.fullName,
        className: targetStudent.className,
        section: targetStudent.section,
        status: 'present',
        remarks: 'Verified via Touchless QR ID Scanner',
      },
    ]);

    // Update in-memory map if matching active roster
    if (isSameClass) {
      setAttendanceMap(prev => ({
        ...prev,
        [targetStudent!.id]: {
          status: 'present',
          remarks: 'Verified via Touchless QR ID Scanner',
        },
      }));
      setCrossClassAlert(null);
      setScannerNotice(
        `Marked ${targetStudent.fullName} (Roll #${targetStudent.rollNo}) as PRESENT for ${selectedDate}!`
      );
    } else {
      setCrossClassAlert({
        student: targetStudent,
        fromClass: targetStudent.className,
        fromSection: targetStudent.section,
      });
      setScannerNotice(
        `Marked ${targetStudent.fullName} (Roll #${targetStudent.rollNo}) PRESENT for ${targetStudent.className}-${targetStudent.section}. (Active view is ${selectedClass}-${selectedSection})`
      );
    }

    setRecentScans(prev => [
      {
        id: `${targetStudent!.id}-${Date.now()}`,
        student: targetStudent!,
        time: timeStr,
        sameClass: isSameClass,
      },
      ...prev.slice(0, 9),
    ]);

    setHardwareWedgeInput('');
    setIsProcessingScan(false);
    setTimeout(() => setScannerNotice(null), 4500);

    // Auto-scroll target student row into view if in current class
    if (isSameClass) {
      setTimeout(() => {
        const el = document.getElementById(`student-row-${targetStudent!.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
  };

  const handleSaveAttendance = async () => {
    if (!isAdmin) return;
    const recordsToSave: StudentAttendanceRecord[] = rosterStudents.map(student => {
      const entry = attendanceMap[student.id] || { status: 'present', remarks: '' };
      return {
        id: `att-s-${selectedDate}-${student.id}`,
        date: selectedDate,
        studentId: student.id,
        studentName: student.fullName,
        className: student.className,
        section: student.section,
        status: entry.status,
        remarks: entry.remarks,
      };
    });

    await saveStudentAttendance(recordsToSave);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  const [exportNotice, setExportNotice] = useState<string | null>(null);

  /**
   * Computes the current view's attendance data with auto-calculated absence percentages,
   * monthly presence/absence breakdown, and session metrics.
   */
  const getAttendanceRowsWithAbsencePercentages = () => {
    const currentMonthPrefix = selectedDate.slice(0, 7); // YYYY-MM
    const classAbsentToday = rosterStudents.filter(
      s => (attendanceMap[s.id]?.status || 'present') === 'absent'
    ).length;
    const classDailyAbsenceRate =
      rosterStudents.length > 0
        ? Number(((classAbsentToday / rosterStudents.length) * 100).toFixed(1))
        : 0;

    return rosterStudents.map(student => {
      const entry = attendanceMap[student.id] || { status: 'present', remarks: '' };
      const currentDayStatus = entry.status;

      // 1. Current Month Attendance Calculation (incorporating today's current view status)
      const historicalMonthRecords = studentAttendance.filter(
        a => a.studentId === student.id && a.date.startsWith(currentMonthPrefix) && a.date !== selectedDate
      );
      const allMonthStatuses = [
        ...historicalMonthRecords.map(r => r.status),
        currentDayStatus,
      ];

      const monthTotalDays = allMonthStatuses.length;
      const monthAbsentDays = allMonthStatuses.filter(s => s === 'absent').length;
      const monthPresentDays = allMonthStatuses.filter(s => s === 'present').length;
      const monthLeaveDays = allMonthStatuses.filter(s => s === 'leave').length;

      const monthAbsencePercentage = monthTotalDays > 0
        ? Number(((monthAbsentDays / monthTotalDays) * 100).toFixed(1))
        : (currentDayStatus === 'absent' ? 100 : 0);

      const monthPresencePercentage = monthTotalDays > 0
        ? Number(((monthPresentDays / monthTotalDays) * 100).toFixed(1))
        : (currentDayStatus === 'present' ? 100 : 0);

      // 2. All-Time Session Attendance Calculation (incorporating today's current view status)
      const historicalAllRecords = studentAttendance.filter(
        a => a.studentId === student.id && a.date !== selectedDate
      );
      const allSessionStatuses = [
        ...historicalAllRecords.map(r => r.status),
        currentDayStatus,
      ];
      const sessionTotalDays = allSessionStatuses.length;
      const sessionAbsentDays = allSessionStatuses.filter(s => s === 'absent').length;
      const sessionAbsencePercentage = sessionTotalDays > 0
        ? Number(((sessionAbsentDays / sessionTotalDays) * 100).toFixed(1))
        : (currentDayStatus === 'absent' ? 100 : 0);

      return {
        'Date': selectedDate,
        'Roll No': student.rollNo,
        'Student Name': student.fullName,
        'Class': student.className,
        'Section': student.section,
        'Today Status': currentDayStatus.toUpperCase(),
        'Absence Percentage (%)': `${monthAbsencePercentage}%`,
        'Presence Percentage (%)': `${monthPresencePercentage}%`,
        'Month Absent Days': monthAbsentDays,
        'Month Present Days': monthPresentDays,
        'Month Leave Days': monthLeaveDays,
        'Total Evaluated Days (Month)': monthTotalDays,
        'All-Time Absence (%)': `${sessionAbsencePercentage}%`,
        'Class Daily Absence Rate (%)': `${classDailyAbsenceRate}%`,
        'Remarks': entry.remarks || 'None',
        'Guardian Name': student.guardianName || 'N/A',
        'Guardian Phone': student.contactNumber || 'N/A',
      };
    });
  };

  const getExportRows = () => {
    return getAttendanceRowsWithAbsencePercentages();
  };

  /**
   * Export function that exports the current view's attendance data
   * as a CSV file with auto-calculated absence percentages.
   */
  const exportCurrentAttendanceCSVWithAbsenceRate = () => {
    if (rosterStudents.length === 0) {
      setExportNotice('No student records in the current view to export.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    const rows = getAttendanceRowsWithAbsencePercentages();
    const sanitizedClass = selectedClass.replace(/\s+/g, '_');
    const filename = `Student_Attendance_${sanitizedClass}_Sec_${selectedSection}_${selectedDate}_with_Absence_Percentages`;

    exportToCSV(filename, rows);

    setExportNotice(
      `Exported ${rows.length} attendance records with auto-calculated absence percentages to CSV.`
    );
    notify({
      title: 'Attendance CSV Exported',
      message: `Exported ${rows.length} records for ${selectedClass} Sec ${selectedSection} with auto-calculated absence percentages.`,
      category: 'system',
      priority: 'low',
    });
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportRosterExcel = () => {
    const rows = getExportRows();
    if (rows.length === 0) return;
    exportToExcel(`Student_Attendance_${selectedClass}_Sec_${selectedSection}_${selectedDate}`, 'Attendance Roster', rows);
    setExportNotice(`Exported ${rows.length} attendance records with absence percentages to Excel (.xlsx).`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  const handleExportRosterCSV = () => {
    exportCurrentAttendanceCSVWithAbsenceRate();
  };

  const handleExportRosterPDF = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      setExportNotice('No student records found to export to PDF.');
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }
    generateDailyAttendanceRosterPdf(settings, rosterStudents, attendanceMap, {
      className: selectedClass,
      section: selectedSection,
      date: selectedDate,
    });
    setExportNotice(`Exported official Daily Attendance Roster PDF for ${selectedClass} Sec ${selectedSection}.`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Compute stats for current class & section
  const presentCount = rosterStudents.filter(s => attendanceMap[s.id]?.status === 'present').length;
  const absentCount = rosterStudents.filter(s => attendanceMap[s.id]?.status === 'absent').length;
  const leaveCount = rosterStudents.filter(s => attendanceMap[s.id]?.status === 'leave').length;
  const qrVerifiedCount = rosterStudents.filter(
    s =>
      attendanceMap[s.id]?.status === 'present' &&
      (attendanceMap[s.id]?.remarks?.toLowerCase().includes('qr') ||
        attendanceMap[s.id]?.remarks?.toLowerCase().includes('touchless'))
  ).length;
  const attendanceRate =
    rosterStudents.length > 0 ? Math.round((presentCount / rosterStudents.length) * 100) : 0;

  // Monthly attendance % per student for this roster
  const studentMonthlyPercentages = useMemo(() => {
    const currentMonthPrefix = selectedDate.slice(0, 7); // YYYY-MM
    const map: Record<string, number> = {};

    for (const student of rosterStudents) {
      const studentMonthRecords = studentAttendance.filter(
        a => a.studentId === student.id && a.date.startsWith(currentMonthPrefix)
      );
      if (studentMonthRecords.length === 0) {
        map[student.id] = 100;
      } else {
        const presentInMonth = studentMonthRecords.filter(a => a.status === 'present').length;
        map[student.id] = Math.round((presentInMonth / studentMonthRecords.length) * 100);
      }
    }
    return map;
  }, [rosterStudents, studentAttendance, selectedDate]);

  // Class-wise summary chart for the selected date
  const classAttendanceChartData = useMemo(() => {
    const classes = settings.standardClasses || [];
    const presentData = classes.map(c => {
      const recs = studentAttendance.filter(a => a.date === selectedDate && a.className === c);
      return recs.filter(r => r.status === 'present').length;
    });
    const absentData = classes.map(c => {
      const recs = studentAttendance.filter(a => a.date === selectedDate && a.className === c);
      return recs.filter(r => r.status === 'absent').length;
    });

    return {
      labels: classes,
      datasets: [
        {
          label: 'Present Students',
          data: presentData,
          backgroundColor: '#4F46E5',
          borderRadius: 4,
        },
        {
          label: 'Absent / Leave',
          data: absentData,
          backgroundColor: '#EF4444',
          borderRadius: 4,
        },
      ],
    };
  }, [studentAttendance, selectedDate, settings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-indigo-600" />
            <span>{t('attendance.title', 'Student Daily Attendance Portal')}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {t('attendance.subtitle', 'Record class & section daily roll calls, compute monthly presence rates, and inspect attendance trends')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition active:scale-95 cursor-pointer"
              title="Launch rapid touchless camera QR scanner for student attendance"
            >
              <Camera className="w-4 h-4 text-emerald-100" />
              <span>Touchless QR Scanner</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsQRGeneratorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            title="Generate and print student attendance QR cards & badges"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Student QR Badges</span>
          </button>

          <ExportDropdown
            label="Export Attendance"
            totalCount={rosterStudents.length}
            onExportExcel={handleExportRosterExcel}
            onExportCSV={handleExportRosterCSV}
            onExportPDF={handleExportRosterPDF}
            onExportExternal={() => setIsExternalReportModalOpen(true)}
            size="md"
          />

          <button
            type="button"
            onClick={exportCurrentAttendanceCSVWithAbsenceRate}
            disabled={rosterStudents.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            title="Export current view attendance records as a CSV file with auto-calculated absence percentages"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            <span>{t('attendance.exportCsvAbsence', 'Export CSV (Absence %)')}</span>
          </button>

          {/* Clear Attendance Button */}
          {studentAttendance.length > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAttendanceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 shadow-xs transition active:scale-95 cursor-pointer"
              title="Clear all student attendance records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Attendance</span>
            </button>
          )}


          <button
            type="button"
            onClick={() => setIsExternalReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            title="Export Student Attendance data as CSV or PDF files for external reporting"
          >
            <Building className="w-4 h-4 text-white" />
            <span>External Reporting (PDF/CSV)</span>
          </button>

          <button
            type="button"
            onClick={handleExportRosterPDF}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            title="Download official printable PDF of this attendance roll"
          >
            <FileText className="w-4 h-4" />
            <span>Roster PDF</span>
          </button>

          {isAdmin ? (
            <button
              onClick={handleSaveAttendance}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Class Attendance</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              Finance Read-Only Mode
            </div>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {isSavedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Attendance records successfully written to offline IndexedDB database!</span>
        </div>
      )}

      {/* Primary Sub-Navigation: Daily Roll Call vs Academic Year Heatmap */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveAttendanceTab('roster')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeAttendanceTab === 'roster'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Daily Roll Call & Roster</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAttendanceTab('heatmap')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeAttendanceTab === 'heatmap'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Academic Year Attendance Heatmap</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            Absenteeism Radar
          </span>
        </button>
      </div>

      {activeAttendanceTab === 'heatmap' ? (
        <AttendanceCalendarHeatmap
          students={students}
          studentAttendance={studentAttendance}
          settings={settings}
          selectedDate={selectedDate}
          initialClass={selectedClass}
          initialSection={selectedSection}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            setActiveAttendanceTab('roster');
          }}
        />
      ) : (
        <>
          {/* Filter and Date Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-indigo-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-semibold">Class:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
            >
              {settings.standardClasses?.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-semibold">Section:</span>
            <select
              value={selectedSection}
              onChange={e => setSelectedSection(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
            >
              {settings.standardSections?.map(s => (
                <option key={s} value={s}>
                  Sec {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Batch Actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Quick Mark:</span>
            <button
              type="button"
              onClick={() => handleMarkAll('present')}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold hover:bg-emerald-100 transition"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll('absent')}
              className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300 font-semibold hover:bg-red-100 transition"
            >
              All Absent
            </button>
          </div>
        )}
      </div>

      {/* KPI Counters for Selected Session */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Enrolled In Section</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {rosterStudents.length} Students
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
            Present
          </p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {presentCount} ({attendanceRate}%)
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase flex items-center justify-between">
            <span>QR Touchless</span>
            <QrCode className="w-3.5 h-3.5 text-indigo-500" />
          </p>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {qrVerifiedCount} Scanned
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase">Absent</p>
          <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{absentCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">
            On Leave
          </p>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{leaveCount}</p>
        </div>
      </div>

      {/* Selected Students Bulk Action Bar */}
      {selectedStudentIds.length > 0 && isAdmin && (
        <div className="p-3.5 rounded-2xl bg-indigo-950 text-white shadow-xl border border-indigo-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-indigo-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {selectedStudentIds.length}
            </span>
            <div>
              <p className="text-xs font-bold text-white leading-tight">
                {selectedStudentIds.length} of {rosterStudents.length} Students Selected
              </p>
              <p className="text-[11px] text-indigo-300">
                Apply attendance status and remarks to all selected records simultaneously
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              type="text"
              value={bulkRemark}
              onChange={e => setBulkRemark(e.target.value)}
              placeholder="Optional remark for all..."
              className="px-3 py-1.5 rounded-xl bg-indigo-900/80 border border-indigo-700 text-xs text-white placeholder-indigo-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-400 w-44"
            />
            <button
              type="button"
              onClick={() => handleMarkSelected('present')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark Present</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkSelected('absent')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Mark Absent</span>
            </button>
            <button
              type="button"
              onClick={() => handleMarkSelected('leave')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Mark Leave</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const first = students.find(s => selectedStudentIds.includes(s.id));
                setSelectedBadgeStudent(first || null);
                setIsQRGeneratorOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 font-bold transition shadow-xs cursor-pointer active:scale-95 text-white"
              title="Generate QR attendance badges for selected students"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Badges ({selectedStudentIds.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-2.5 py-1.5 rounded-xl text-indigo-300 hover:text-white hover:bg-indigo-900 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Absenteeism Radar Quick Banner */}
      <div className="p-3.5 rounded-2xl bg-linear-to-r from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 border border-amber-200/80 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
          <div className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-black">Academic Year Absenteeism Heatmap Active:</span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              Track seasonal dips, systemic drop-off periods, and storm or flu absentee surges across 180 academic sessions.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveAttendanceTab('heatmap')}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer active:scale-95 shrink-0"
        >
          <span>Explore Calendar Heatmap</span>
          <CalendarDays className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clear Attendance Confirmation Modal */}
      {isClearAttendanceModalOpen && (
        <DataResetConfirmationModal
          isOpen={isClearAttendanceModalOpen}
          targetModule="attendance"
          onClose={() => setIsClearAttendanceModalOpen(false)}
        />
      )}

      {/* Rapid Touchless QR Scanner Dock */}
      {isAdmin && (
        <div className="rounded-3xl bg-slate-900 text-white border border-emerald-500/30 p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                <ScanLine className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>Rapid Touchless QR Attendance Scanner</span>
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live Reader Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Instantly record student attendance via Camera QR reader or USB/Wireless Barcode scanner gun.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSoundFeedback(!soundFeedback)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  soundFeedback
                    ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    : 'bg-slate-800/50 text-slate-500 border-slate-800 line-through'
                }`}
                title={soundFeedback ? 'Mute scan audio chime' : 'Enable scan audio chime'}
              >
                {soundFeedback ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundFeedback ? 'Audio Chime On' : 'Chime Muted'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
                title="Launch full-screen live camera viewport for scanning QR badges"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Camera Scanner</span>
              </button>
            </div>
          </div>

          {/* Barcode Gun / Keyboard Wedge Direct Input Bar */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleProcessStudentScan(hardwareWedgeInput);
            }}
            className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800 focus-within:border-emerald-500 transition-colors shadow-inner"
          >
            <div className="pl-2 text-emerald-400">
              <QrCode className="w-4 h-4" />
            </div>
            <input
              ref={wedgeInputRef}
              type="text"
              value={hardwareWedgeInput}
              onChange={e => setHardwareWedgeInput(e.target.value)}
              placeholder="Point USB Barcode Scanner gun or type Student Roll # (Press Enter to Mark)..."
              className="flex-1 px-2 py-1 bg-transparent text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-hidden"
            />
            {hardwareWedgeInput && (
              <button
                type="button"
                onClick={() => setHardwareWedgeInput('')}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              disabled={!hardwareWedgeInput.trim() || isProcessingScan}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Mark Present</span>
            </button>
          </form>

          {/* Real-time Notice or Cross-Class Switcher Banner */}
          {scannerNotice && (
            <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="truncate">{scannerNotice}</span>
              </div>
              {crossClassAlert && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClass(crossClassAlert.fromClass);
                    setSelectedSection(crossClassAlert.fromSection);
                    setCrossClassAlert(null);
                  }}
                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  Switch to Class {crossClassAlert.fromClass}-{crossClassAlert.fromSection}
                </button>
              )}
            </div>
          )}

          {/* Recent Scans Session Feed (Horizontal Chips) */}
          {recentScans.length > 0 && (
            <div className="pt-1 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 shrink-0">
                Recent Scans ({recentScans.length}):
              </span>
              {recentScans.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.sameClass) {
                      const el = document.getElementById(`student-row-${item.student.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    } else {
                      setSelectedClass(item.student.className);
                      setSelectedSection(item.student.section);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition shrink-0 border ${
                    item.sameClass
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/80 hover:scale-105'
                      : 'bg-amber-950/70 text-amber-300 border-amber-700/60 hover:bg-amber-900/80 hover:scale-105'
                  }`}
                  title={
                    item.sameClass
                      ? `Click to highlight ${item.student.fullName} in roster`
                      : `Click to switch to Class ${item.student.className}-${item.student.section}`
                  }
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[140px]">{item.student.fullName}</span>
                  <span className="text-[10px] font-mono opacity-80">#{item.student.rollNo}</span>
                  <span className="text-[10px] opacity-60">({item.time})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roster Attendance Marking Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {selectedClass} — Section {selectedSection} Roster ({selectedDate})
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
              {rosterStudents.length} Students
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && rosterStudents.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
              >
                <span>
                  {selectedStudentIds.length === rosterStudents.length
                    ? 'Deselect All'
                    : `Select All (${rosterStudents.length})`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedBadgeStudent(rosterStudents[0] || null);
                setIsQRGeneratorOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer active:scale-95"
              title={`Generate and print QR badges for all students in ${selectedClass} Section ${selectedSection}`}
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Print Class Badges ({rosterStudents.length})</span>
            </button>

            <button
              type="button"
              onClick={exportCurrentAttendanceCSVWithAbsenceRate}
              disabled={rosterStudents.length === 0}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              title="Export current view attendance records as a CSV file with auto-calculated absence percentages"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('attendance.exportCsvAbsence', 'Export CSV (Absence %)')}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      id="select-all-students-header"
                      checked={
                        rosterStudents.length > 0 &&
                        selectedStudentIds.length === rosterStudents.length
                      }
                      onChange={toggleSelectAll}
                      disabled={!isAdmin || rosterStudents.length === 0}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        selectedStudentIds.length === rosterStudents.length
                          ? 'Deselect All Students'
                          : 'Select All Students in Roster'
                      }
                      aria-label="Select All Students"
                    />
                  </div>
                </th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 text-center">Month Presence %</th>
                <th className="py-3 px-4 text-center">Today Status</th>
                <th className="py-3 px-4">Remarks / Reason</th>
                <th className="py-3 px-4 text-center">QR Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {rosterStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No active students enrolled in {selectedClass} Section {selectedSection}.
                  </td>
                </tr>
              ) : (
                rosterStudents.map(student => {
                  const entry = attendanceMap[student.id] || { status: 'present', remarks: '' };
                  const monthlyPct = studentMonthlyPercentages[student.id] ?? 100;
                  const isSelected = selectedStudentIds.includes(student.id);
                  const isJustScanned = lastScannedStudent?.id === student.id;
                  const isPresent = entry.status === 'present';
                  const isQrVerified =
                    isPresent &&
                    (entry.remarks?.toLowerCase().includes('qr') ||
                      entry.remarks?.toLowerCase().includes('touchless'));

                  return (
                    <tr
                      key={student.id}
                      id={`student-row-${student.id}`}
                      className={`transition-all duration-300 ${
                        isJustScanned
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/40 ring-2 ring-emerald-500 shadow-sm'
                          : isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectStudent(student.id)}
                          disabled={!isAdmin}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-300">
                        {student.rollNo}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{student.fullName}</span>
                          {isJustScanned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 animate-pulse">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>Just Scanned</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-bold font-mono px-2 py-0.5 rounded-full text-[11px] ${
                            monthlyPct >= 85
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : monthlyPct >= 70
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                          }`}
                        >
                          {monthlyPct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleStatusChange(student.id, 'present')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              entry.status === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                            {isQrVerified && (
                              <QrCode className="w-3 h-3 text-emerald-200 ml-0.5 shrink-0" />
                            )}
                          </button>
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              entry.status === 'absent'
                                ? 'bg-red-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleStatusChange(student.id, 'leave')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                              entry.status === 'leave'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Leave</span>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder={isAdmin ? 'Reason or note...' : 'No remarks'}
                          disabled={!isAdmin}
                          value={entry.remarks}
                          onChange={e => handleRemarkChange(student.id, e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleProcessStudentScan(student.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 border ${
                                isJustScanned || isQrVerified
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80'
                              }`}
                              title={`Simulate contactless ID card scan for ${student.fullName}`}
                            >
                              <Zap className="w-3 h-3 text-emerald-300" />
                              <span>Scan</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBadgeStudent(student);
                              setIsQRGeneratorOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold transition cursor-pointer active:scale-95 group shadow-2xs"
                            title={`Generate and print QR attendance badge for ${student.fullName}`}
                          >
                            <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span>Badge</span>
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

      {/* Class-wise Attendance Bar Chart */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <BarChart2 className="w-4 h-4 text-indigo-600" />
          <span>School-Wide Class Attendance Distribution ({selectedDate})</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Comparative attendance turnout across grade levels
        </p>

        <div className="h-60">
          <Bar
            data={classAttendanceChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            }}
          />
        </div>
      </div>
    </>
  )}

      {/* QR Scanner Modal for Instant Contactless Roll Call */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        mode="attendance"
        scannerTarget="student"
        targetDate={selectedDate}
        selectedClass={selectedClass}
        selectedSection={selectedSection}
        onStudentIdentified={(scannedStudent) => {
          handleProcessStudentScan(scannedStudent.id);
        }}
        onSwitchClassSection={(newClass, newSection) => {
          setSelectedClass(newClass);
          setSelectedSection(newSection);
          setCrossClassAlert(null);
        }}
      />

      {/* External Audit & Regulatory Reporting Modal */}
      <ExternalReportingModal
        isOpen={isExternalReportModalOpen}
        onClose={() => setIsExternalReportModalOpen(false)}
        initialReportType="attendance"
        initialClass={selectedClass}
      />

      {/* Student Attendance QR Badge Generator Modal */}
      <AttendanceQRModal
        isOpen={isQRGeneratorOpen}
        onClose={() => {
          setIsQRGeneratorOpen(false);
          setSelectedBadgeStudent(null);
        }}
        students={students}
        staff={staff}
        settings={settings}
        initialType="student"
        initialClass={selectedClass}
        initialSection={selectedSection}
        initialStudentId={selectedBadgeStudent?.id}
      />
    </div>
  );
};
