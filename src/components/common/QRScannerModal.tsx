import React, { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { BackButton } from './BackButton';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Search,
  RefreshCw,
  Sparkles,
  Building,
  Check,
} from 'lucide-react';
import { useSchool } from '../../context/SchoolContext';
import { Student, Staff } from '../../types';
import { formatDate, getTodayDateString } from '../../utils/formatters';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'attendance' | 'library' | 'verify';
  scannerTarget?: 'student' | 'staff' | 'all';
  targetDate?: string;
  selectedClass?: string;
  selectedSection?: string;
  onStudentIdentified?: (student: Student) => void;
  onStaffIdentified?: (staff: Staff) => void;
  onSwitchClassSection?: (className: string, section: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  mode = 'attendance',
  scannerTarget = 'student',
  targetDate,
  selectedClass,
  selectedSection,
  onStudentIdentified,
  onStaffIdentified,
  onSwitchClassSection,
}) => {
  const { students, staff, studentAttendance, saveStudentAttendance, staffAttendance, saveStaffAttendance } =
    useSchool();

  const [activeTabMode, setActiveTabMode] = useState<'attendance' | 'library' | 'verify'>(mode);
  const [activeTarget, setActiveTarget] = useState<'student' | 'staff'>(
    scannerTarget === 'staff' ? 'staff' : 'student'
  );
  const [manualInput, setManualInput] = useState('');
  const [lastScannedStudent, setLastScannedStudent] = useState<Student | null>(null);
  const [lastScannedStaff, setLastScannedStaff] = useState<Staff | null>(null);
  const [scanMessage, setScanMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'error';
    timestamp: string;
  } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<
    Array<{ name: string; subtitle: string; time: string; action: string; isStaff: boolean }>
  >([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Play synthetic chime on successful scan
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // AudioContext policy
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Process Scanned Value (from camera jsQR or USB Scanner / Manual text)
  const processScannedValue = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      const now = Date.now();
      // Debounce repeated scans within 1.5 seconds
      if (now - lastScannedTimeRef.current < 1500) {
        return;
      }
      lastScannedTimeRef.current = now;

      let targetStudent: Student | undefined;
      let targetStaff: Staff | undefined;
      let isStaffPayload = activeTarget === 'staff' || scannerTarget === 'staff';

      // Check if JSON payload
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === 'STAFF_ID') {
            isStaffPayload = true;
          } else if (parsed.type === 'STUDENT_ID') {
            isStaffPayload = false;
          }

          if (isStaffPayload) {
            if (parsed.id) {
              targetStaff = staff.find(s => s.id === parsed.id);
            }
            if (!targetStaff && parsed.employeeCode) {
              const code = String(parsed.employeeCode).toLowerCase();
              targetStaff = staff.find(s => s.employeeCode.toLowerCase() === code);
            }
          } else {
            if (parsed.id) {
              targetStudent = students.find(s => s.id === parsed.id);
            }
            if (!targetStudent && (parsed.rollNo || parsed.roll)) {
              const r = String(parsed.rollNo || parsed.roll).toLowerCase();
              targetStudent = students.find(s => s.rollNo.toLowerCase() === r);
            }
          }
        } catch {
          // JSON parse failed, proceed to string lookup
        }
      }

      // Fallback matching
      if (!targetStudent && !targetStaff) {
        const lower = trimmed.toLowerCase();

        if (isStaffPayload) {
          targetStaff = staff.find(
            s => s.employeeCode.toLowerCase() === lower || s.id === trimmed || s.fullName.toLowerCase() === lower
          );
        } else {
          targetStudent = students.find(
            s => s.rollNo.toLowerCase() === lower || s.id === trimmed || s.fullName.toLowerCase() === lower
          );
          // If not found in student, try staff as fallback
          if (!targetStudent && scannerTarget === 'all') {
            targetStaff = staff.find(
              s => s.employeeCode.toLowerCase() === lower || s.id === trimmed || s.fullName.toLowerCase() === lower
            );
            if (targetStaff) isStaffPayload = true;
          }
        }
      }

      const timeStr = new Date().toLocaleTimeString();

      // Handle Staff Attendance Scan
      if (isStaffPayload) {
        if (!targetStaff) {
          setScanMessage({
            text: `Staff record not found for: "${trimmed}". Check employee code.`,
            type: 'error',
            timestamp: timeStr,
          });
          return;
        }

        playBeep();
        setLastScannedStaff(targetStaff);
        setLastScannedStudent(null);
        onStaffIdentified?.(targetStaff);

        const today = getTodayDateString();
        const existingStaffAtt = staffAttendance.find(
          a => a.staffId === targetStaff!.id && a.date === today
        );

        // Record Staff Attendance as Present
        await saveStaffAttendance([
          {
            id: existingStaffAtt ? existingStaffAtt.id : `att-staff-${targetStaff.id}-${today}`,
            date: today,
            staffId: targetStaff.id,
            staffName: targetStaff.fullName,
            designation: targetStaff.designation,
            status: 'present',
            remarks: 'Verified via Staff QR Scanner',
          },
        ]);

        setScanMessage({
          text: `Marked faculty ${targetStaff.fullName} (${targetStaff.employeeCode} - ${targetStaff.department}) as PRESENT for today!`,
          type: 'success',
          timestamp: timeStr,
        });

        setRecentScans(prev => [
          {
            name: targetStaff!.fullName,
            subtitle: `${targetStaff!.employeeCode} • ${targetStaff!.department}`,
            time: timeStr,
            action: 'Staff Present',
            isStaff: true,
          },
          ...prev.slice(0, 9),
        ]);

        setManualInput('');
        return;
      }

      // Handle Student Attendance Scan
      if (!targetStudent) {
        setScanMessage({
          text: `Student record not found for: "${trimmed}". Please check the ID or roll number.`,
          type: 'error',
          timestamp: timeStr,
        });
        return;
      }

      playBeep();
      setLastScannedStudent(targetStudent);
      setLastScannedStaff(null);
      onStudentIdentified?.(targetStudent);

      if (activeTabMode === 'attendance') {
        const attDate = targetDate || getTodayDateString();
        const existing = studentAttendance.find(
          a => a.studentId === targetStudent!.id && a.date === attDate
        );

        // Record student attendance as present
        await saveStudentAttendance([
          {
            id: existing ? existing.id : `att-${targetStudent.id}-${attDate}`,
            date: attDate,
            studentId: targetStudent.id,
            studentName: targetStudent.fullName,
            className: targetStudent.className,
            section: targetStudent.section,
            status: 'present',
            remarks: 'Verified via QR Code ID scanner',
          },
        ]);

        const isSameClass =
          (!selectedClass || targetStudent.className === selectedClass) &&
          (!selectedSection || targetStudent.section === selectedSection);

        setScanMessage({
          text: isSameClass
            ? `Marked ${targetStudent.fullName} (Roll #${targetStudent.rollNo} • Class ${targetStudent.className}-${targetStudent.section}) as PRESENT for ${attDate}!`
            : `Marked ${targetStudent.fullName} (Roll #${targetStudent.rollNo}) as PRESENT for ${attDate}! Note: Student belongs to ${targetStudent.className}-${targetStudent.section} (current view: ${selectedClass || ''} ${selectedSection || ''}).`,
          type: isSameClass ? 'success' : 'warning',
          timestamp: timeStr,
        });

        setRecentScans(prev => [
          {
            name: targetStudent!.fullName,
            subtitle: `Roll #${targetStudent!.rollNo} • ${targetStudent!.className}-${targetStudent!.section}`,
            time: timeStr,
            action: 'Student Present',
            isStaff: false,
          },
          ...prev.slice(0, 9),
        ]);
      } else if (activeTabMode === 'library') {
        setScanMessage({
          text: `Library Pass Authorized: ${targetStudent.fullName} (${targetStudent.className}-${targetStudent.section}). Valid student ID.`,
          type: 'success',
          timestamp: timeStr,
        });

        setRecentScans(prev => [
          {
            name: targetStudent!.fullName,
            subtitle: `Roll #${targetStudent!.rollNo} • Library Authorized`,
            time: timeStr,
            action: 'Library Access',
            isStaff: false,
          },
          ...prev.slice(0, 9),
        ]);
      } else {
        setScanMessage({
          text: `Verified Active Enrollment: ${targetStudent.fullName} (${targetStudent.status.toUpperCase()})`,
          type: 'success',
          timestamp: timeStr,
        });

        setRecentScans(prev => [
          {
            name: targetStudent!.fullName,
            subtitle: `Roll #${targetStudent!.rollNo} • Active Verified`,
            time: timeStr,
            action: 'ID Verified',
            isStaff: false,
          },
          ...prev.slice(0, 9),
        ]);
      }

      setManualInput('');
    },
    [
      activeTarget,
      scannerTarget,
      staff,
      students,
      studentAttendance,
      staffAttendance,
      saveStudentAttendance,
      saveStaffAttendance,
      playBeep,
      onStudentIdentified,
      onStaffIdentified,
      activeTabMode,
      targetDate,
      selectedClass,
      selectedSection,
    ]
  );

  // Live video frame QR scanner loop using jsQR
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);

      const scanLoop = () => {
        if (!videoRef.current || !canvasRef.current) return;

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              processScannedValue(code.data);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(scanLoop);
      };

      animFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Camera permission denied or camera unavailable.';
      setCameraError(message);
      setCameraActive(false);
    }
  }, [processScannedValue]);

  useEffect(() => {
    if (isOpen) {
      setActiveTabMode(mode);
      setActiveTarget(scannerTarget === 'staff' ? 'staff' : 'student');
      startCamera();
    } else {
      stopCamera();
      setScanMessage(null);
      setLastScannedStudent(null);
      setLastScannedStaff(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, scannerTarget, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processScannedValue(manualInput);
  };

  if (!isOpen) return null;

  const modalTitle =
    scannerTarget === 'staff'
      ? 'Staff & Faculty Attendance QR Scanner'
      : scannerTarget === 'student'
      ? 'Student Attendance QR Code Scanner'
      : 'Campus QR Attendance & ID Scanner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Hidden Canvas for Live Video Frame Decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <BackButton onClick={onClose} label="Back" variant="modal" />
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">{modalTitle}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Live Reader
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Contactless real-time verification for daily roll calls and campus passes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Switcher if scannerTarget is 'all' or flexible */}
        {scannerTarget === 'all' && (
          <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Active Roster:</span>
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-200 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTarget('student')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeTarget === 'student' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Students
              </button>
              <button
                type="button"
                onClick={() => setActiveTarget('staff')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  activeTarget === 'staff' ? 'bg-white text-teal-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Staff / Faculty
              </button>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs (only for student context) */}
        {scannerTarget !== 'staff' && (
          <div className="px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
            <button
              onClick={() => setActiveTabMode('attendance')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTabMode === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Attendance Marking</span>
            </button>

            <button
              onClick={() => setActiveTabMode('library')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTabMode === 'library'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Library Entry</span>
            </button>

            <button
              onClick={() => setActiveTabMode('verify')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTabMode === 'verify'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Identity Verification</span>
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Camera Viewport or Hardware Scanner Interface */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Viewport */}
            <div className="relative aspect-4/3 rounded-2xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center border border-slate-800 text-center p-4">
              {cameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {/* Targeting Reticle */}
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-2xl pointer-events-none flex items-center justify-center animate-pulse">
                    <span className="text-[10px] uppercase font-bold text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded-full">
                      Align {activeTarget === 'staff' ? 'Staff' : 'Student'} QR Code
                    </span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-300">Camera Viewport Idle</p>
                    <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                      {cameraError ||
                        'Use USB Barcode / QR scanner wedge, or enter ID / Code manually below.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Enabling Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Roll / Barcode Gun Input */}
            <div className="flex flex-col justify-between space-y-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-indigo-500" />
                  <span>Scanner Wedge or Manual Entry</span>
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Works with USB handheld 2D QR scanners, laser barcode guns, or typing{' '}
                  {activeTarget === 'staff' ? 'Employee Code' : 'Student Roll Number'}.
                </p>

                <form onSubmit={handleManualSubmit} className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                      placeholder={
                        activeTarget === 'staff'
                          ? 'Scan or enter Employee Code (e.g. EMP-101)...'
                          : 'Scan or enter Roll No (e.g. 1001)...'
                      }
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 font-bold rounded-xl text-xs transition shadow-xs cursor-pointer"
                  >
                    Lookup &amp; Mark Present
                  </button>
                </form>
              </div>

              {/* Status Message */}
              {scanMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all animate-in fade-in ${
                    scanMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : scanMessage.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {scanMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold leading-tight">{scanMessage.text}</p>
                    <span className="text-[10px] opacity-75 font-mono">{scanMessage.timestamp}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Identified Profile (Student or Staff) */}
          {(lastScannedStudent || lastScannedStaff) && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">
                  {lastScannedStudent
                    ? lastScannedStudent.fullName.charAt(0)
                    : lastScannedStaff!.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {lastScannedStudent ? lastScannedStudent.fullName : lastScannedStaff!.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {lastScannedStudent
                      ? `Roll: #${lastScannedStudent.rollNo} • Class ${lastScannedStudent.className}-${lastScannedStudent.section}`
                      : `${lastScannedStaff!.employeeCode} • ${lastScannedStaff!.department} (${lastScannedStaff!.designation})`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {lastScannedStudent &&
                  selectedClass &&
                  (lastScannedStudent.className !== selectedClass ||
                    (selectedSection && lastScannedStudent.section !== selectedSection)) &&
                  onSwitchClassSection && (
                    <button
                      type="button"
                      onClick={() =>
                        onSwitchClassSection(lastScannedStudent.className, lastScannedStudent.section)
                      }
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span>Switch to Class {lastScannedStudent.className}-{lastScannedStudent.section}</span>
                    </button>
                  )}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Marked Present</span>
                </span>
              </div>
            </div>
          )}

          {/* Recent Scans Session Feed */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Recent Roll Call Scans (This Session)
            </h4>
            {recentScans.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                Ready for scans. Point QR code to camera or scan with barcode reader.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {recentScans.map((scan, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${scan.isStaff ? 'bg-teal-500' : 'bg-indigo-500'}`}
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200">{scan.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{scan.subtitle}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {scan.action}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{scan.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
