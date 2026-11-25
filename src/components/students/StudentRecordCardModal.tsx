import React, { useState } from 'react';
import {
  Student,
  SchoolSettings,
  StudentAttendanceRecord,
  ExamResult,
  FeePayment,
} from '../../types';
import {
  Printer,
  Download,
  X,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  User,
  ShieldCheck,
  FileText,
  Building,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
} from 'lucide-react';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { generateStudentRecordCardPdf } from '../../utils/studentPdf';

export interface StudentRecordCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  settings: SchoolSettings;
  attendanceRecords?: StudentAttendanceRecord[];
  examResults?: ExamResult[];
  feePayments?: FeePayment[];
  defaultersMap?: Record<string, number>;
}

export const StudentRecordCardModal: React.FC<StudentRecordCardModalProps> = ({
  isOpen,
  onClose,
  student,
  settings,
  attendanceRecords = [],
  examResults = [],
  feePayments = [],
  defaultersMap = {},
}) => {
  if (!isOpen || !student) return null;

  // Print layout toggles
  const [includeFees, setIncludeFees] = useState(true);
  const [includeExams, setIncludeExams] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const [zoomScale, setZoomScale] = useState(0.9);

  // Computations
  const studentPayments = feePayments.filter(p => p.studentId === student.id);
  const totalFeesPaid = studentPayments.reduce((sum, p) => sum + p.totalAmount, 0);
  const pendingBalance = defaultersMap[student.id] || 0;

  const studentAttendance = attendanceRecords.filter(a => a.studentId === student.id);
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const absentCount = studentAttendance.filter(a => a.status === 'absent').length;
  const leaveCount = studentAttendance.filter(a => a.status === 'leave').length;
  const totalSessions = studentAttendance.length;
  const attendancePct = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

  const studentExams = examResults.filter(r => r.studentId === student.id);

  // Handle browser print
  const handlePrint = () => {
    document.body.classList.add('print-mode-student-record');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-mode-student-record');
    }, 1200);
  };

  // Handle PDF Download
  const handleDownloadPdf = () => {
    generateStudentRecordCardPdf(
      student,
      settings,
      attendanceRecords,
      examResults,
      totalFeesPaid,
      pendingBalance,
      {
        includeFeeHistory: includeFees,
        includeExams: includeExams,
        includeAttendance: true,
        includeSignatures: includeSignatures,
      }
    );
  };

  const schoolName = settings.schoolName || 'St. Augustine International Academy';
  const schoolAddress = settings.schoolAddress || '742 Evergreen Terrace, Academic District';
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const currencySymbol = settings.currencySymbol || '$';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Top Control Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 bg-white dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Official Student Cumulative Record Card
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Print Layout Mode
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official academic dossier formatted for physical A4 printing, accreditation proofs, and parent conferences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(0.65, prev - 0.08))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono px-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(1.2, prev + 0.08))}
                className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(0.9)}
                className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-900"
              >
                Reset
              </button>
            </div>

            {/* Print & PDF Actions */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Card</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout Options Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Print Formatting Options:</span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={e => setIncludeLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600"
              />
              <span>Institutional Letterhead</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeExams}
                onChange={e => setIncludeExams(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600"
              />
              <span>Exam Progress Table</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFees}
                onChange={e => setIncludeFees(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600"
              />
              <span>Fee Clearance Ledger</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={e => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600"
              />
              <span>Official Signatures &amp; Seal</span>
            </label>
          </div>
        </div>

        {/* Printable Canvas Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-200/80 dark:bg-slate-950">
          <div
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: 'top center',
              width: '210mm',
              minHeight: '297mm',
              marginBottom: `-${297 * 3.77 * (1 - zoomScale)}px`,
            }}
            id="printable-student-record-card"
            className="print-paper-sheet sheet-portrait bg-white text-slate-900 rounded-sm shadow-2xl relative flex flex-col justify-between"
          >
            {/* Outer Official Borders */}
            <div className="border border-slate-400 p-5 min-h-[285mm] flex flex-col justify-between relative">
              
              <div>
                {/* 1. Official Header */}
                {includeLetterhead && (
                  <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center relative">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <h1 className="text-xl font-serif font-black tracking-wider uppercase text-slate-900">
                        {schoolName}
                      </h1>
                    </div>
                    <p className="text-[10px] text-slate-600 font-sans tracking-wide">
                      {schoolAddress} • Tel: {settings.schoolPhone || '+1 (555) 019-2831'} • Email: {settings.schoolEmail || 'admin@school.edu'}
                    </p>
                    <div className="inline-block mt-1 px-4 py-0.5 bg-slate-900 text-amber-300 font-serif font-bold text-[11px] tracking-widest uppercase rounded">
                      Official Student Cumulative Record Card • Session {academicYear}
                    </div>
                  </div>
                )}

                {/* 2. Student Bio-Data & Identification Section */}
                <div className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-300">
                  {/* Left: Bio Details */}
                  <div className="col-span-9 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black text-slate-900 font-serif">
                        {student.fullName}
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 border border-indigo-200 rounded">
                        ROLL: {student.rollNo}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-200 rounded">
                        {student.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-500 font-medium">Class &amp; Section:</span>{' '}
                        <strong className="text-slate-900">{student.className} - {student.section}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Date of Birth:</span>{' '}
                        <strong className="text-slate-900">{formatDate(student.dateOfBirth)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Gender:</span>{' '}
                        <strong className="text-slate-900">{student.gender}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Blood Group:</span>{' '}
                        <strong className="text-red-700">{student.bloodGroup || 'Not Specified'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Admission Date:</span>{' '}
                        <strong className="text-slate-900">{formatDate(student.admissionDate)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Guardian:</span>{' '}
                        <strong className="text-slate-900">{student.guardianName} ({student.guardianRelation})</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Emergency Phone:</span>{' '}
                        <strong className="text-slate-900 font-mono">{student.contactNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Email:</span>{' '}
                        <span className="text-slate-800">{student.email || 'None on record'}</span>
                      </div>
                    </div>

                    <div className="text-[11px] pt-1">
                      <span className="text-slate-500 font-medium">Residential Address:</span>{' '}
                      <span className="text-slate-800">{student.address || 'Campus Resident'}</span>
                    </div>
                  </div>

                  {/* Right: Photograph Box */}
                  <div className="col-span-3 flex flex-col items-center justify-center">
                    <div className="w-28 h-32 rounded border-2 border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden relative shadow-xs">
                      {student.photoUrl ? (
                        <img
                          src={student.photoUrl}
                          alt={student.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2 text-slate-400">
                          <User className="w-10 h-10 mx-auto text-slate-300 mb-1" />
                          <span className="text-[9px] font-bold block">OFFICIAL PHOTO</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-slate-400 mt-1">AFFIXED AT ADMISSION</span>
                  </div>
                </div>

                {/* 3. Performance & Attendance KPI Summary Strip */}
                <div className="grid grid-cols-4 gap-2.5 my-3.5 print-section-block">
                  <div className="print-kpi-card">
                    <div className="kpi-label">Attendance Rate</div>
                    <div className="kpi-value text-indigo-700">{attendancePct}%</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{presentCount} of {totalSessions} sessions</div>
                  </div>

                  <div className="print-kpi-card">
                    <div className="kpi-label">Absences / Leaves</div>
                    <div className="kpi-value text-amber-700">{absentCount} / {leaveCount}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Logged unexcused/leave</div>
                  </div>

                  <div className="print-kpi-card">
                    <div className="kpi-label">Total Fees Settled</div>
                    <div className="kpi-value text-emerald-700 print-currency">
                      {formatCurrency(totalFeesPaid, currencySymbol)}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{studentPayments.length} receipts issued</div>
                  </div>

                  <div className="print-kpi-card">
                    <div className="kpi-label">Account Balance</div>
                    <div className={`kpi-value print-currency ${pendingBalance > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                      {formatCurrency(pendingBalance, currencySymbol)}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{pendingBalance > 0 ? 'Dues Outstanding' : 'Fully Cleared'}</div>
                  </div>
                </div>

                {/* 4. Academic Examinations Progress Table */}
                {includeExams && (
                  <div className="my-3 print-section-block">
                    <div className="flex items-center justify-between bg-slate-100 border border-slate-300 px-3 py-1 mb-1.5">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-800">
                        I. Academic Examination Marks &amp; Transcripts
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {studentExams.length} evaluation(s) on file
                      </span>
                    </div>

                    {studentExams.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        No official examinations compiled yet for this student.
                      </p>
                    ) : (
                      <table className="print-table">
                        <thead>
                          <tr>
                            <th>Examination Title</th>
                            <th>Term / Year</th>
                            <th className="text-right">Max Marks</th>
                            <th className="text-right">Obtained</th>
                            <th className="text-right">%</th>
                            <th className="text-center">Grade</th>
                            <th className="text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentExams.map((r, i) => (
                            <tr key={i}>
                              <td className="font-medium">{r.examTitle}</td>
                              <td>{r.academicYear || academicYear}</td>
                              <td className="text-right font-mono">{r.totalMaxMarks}</td>
                              <td className="text-right font-mono font-bold">{r.totalObtainedMarks}</td>
                              <td className="text-right font-mono">{r.percentage}%</td>
                              <td className="text-center font-bold">{r.overallGrade || 'N/A'}</td>
                              <td className="text-center">
                                <span className={`print-badge ${r.status === 'Pass' ? 'badge-success' : 'badge-danger'}`}>
                                  {r.status || 'Evaluated'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* 5. Fee Clearance Statement */}
                {includeFees && (
                  <div className="my-3 print-section-block">
                    <div className="flex items-center justify-between bg-slate-100 border border-slate-300 px-3 py-1 mb-1.5">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-slate-800">
                        II. Institutional Fee Clearance &amp; Accounts Ledger
                      </span>
                      <span className={`text-[9px] font-bold ${pendingBalance === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {pendingBalance === 0 ? '● AUDIT STATUS: FULLY CLEARED' : '● AUDIT STATUS: OVERDUE LIABILITIES'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50 border border-slate-200 rounded text-[10px]">
                      <div>
                        <span className="text-slate-500">Cumulative Billed Dues:</span>{' '}
                        <strong className="text-slate-900">{formatCurrency(totalFeesPaid + pendingBalance, currencySymbol)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Settled To Date:</span>{' '}
                        <strong className="text-emerald-700">{formatCurrency(totalFeesPaid, currencySymbol)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Current Overdue Arrears:</span>{' '}
                        <strong className={pendingBalance > 0 ? 'text-red-700 font-bold' : 'text-slate-900'}>
                          {formatCurrency(pendingBalance, currencySymbol)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Financial Certificate:</span>{' '}
                        <strong className="text-slate-800">
                          {pendingBalance === 0 ? 'Clearance Granted' : 'Provisional Clearance Only'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Conduct & Character Evaluation */}
                <div className="my-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[10.5px] print-section-block">
                  <div className="font-bold text-[10px] uppercase text-slate-700 mb-1">
                    III. Conduct &amp; Moral Character Attestation
                  </div>
                  <p className="text-slate-700 leading-snug">
                    This certifies that the pupil has demonstrated respectful demeanor, consistent attendance, and commendable scholastic discipline throughout their academic enrollment. No disciplinary sanctions or unresolved liabilities are recorded on their file.
                  </p>
                </div>
              </div>

              {/* 7. Institutional Signatures & Attestation Block */}
              {includeSignatures && (
                <div className="pt-4 border-t-2 border-slate-800 mt-4 print-section-block">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="print-signature-box">
                      <div className="h-9 flex items-end justify-center mb-1">
                        <span className="font-serif italic text-xs text-slate-700">Form Tutor / Class Master</span>
                      </div>
                      <div className="signatory-name">Class Teacher</div>
                      <div className="signatory-title">Academic Form Attestation</div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-1.5 border border-amber-600/60 bg-amber-50/50 rounded">
                      <ShieldCheck className="w-4 h-4 text-amber-700 mb-0.5" />
                      <span className="text-[8px] font-black tracking-wider text-amber-900 uppercase">
                        OFFICIAL INSTITUTION SEAL
                      </span>
                      <span className="text-[7px] text-amber-800 font-mono">
                        VERIFIED: {new Date().toLocaleDateString()}
                      </span>
                    </div>

                    <div className="print-signature-box">
                      <div className="h-9 flex items-end justify-center mb-1">
                        <span className="font-serif italic text-xs text-slate-700">Principal &amp; Registrar</span>
                      </div>
                      <div className="signatory-name">Head of Institution</div>
                      <div className="signatory-title">Administrative Attestation</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono mt-3 pt-1 border-t border-slate-200">
                    <span>RECORD ID: {student.id}</span>
                    <span>STUDENT ROLL: {student.rollNo}</span>
                    <span>GENERATED: {new Date().toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
