import React, { useEffect } from 'react';
import { ExamResult, SchoolSettings } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  Printer,
  Download,
  X,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { BackButton } from '../common/BackButton';

interface ResultCardModalProps {
  result: ExamResult | null;
  settings: SchoolSettings;
  onClose: () => void;
  onOpenHistory?: (studentId: string) => void;
}

export const ResultCardModal: React.FC<ResultCardModalProps> = ({
  result,
  settings,
  onClose,
  onOpenHistory,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!result) return null;

  const isPassed = result.status === 'Pass';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 16;

      // Outer Decorative Border
      doc.setDrawColor(79, 70, 229); // indigo-600
      doc.setLineWidth(1);
      doc.rect(8, 8, pageWidth - 16, 280);
      doc.setDrawColor(199, 210, 254); // indigo-200
      doc.setLineWidth(0.3);
      doc.rect(9.5, 9.5, pageWidth - 19, 277);

      // School Header Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(10, 10, pageWidth - 20, 26, 'F');

      // School Name & Details in Header
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(settings.schoolName || 'St. Augustine International Academy', pageWidth / 2, y + 2, { align: 'center' });

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240);
      if (settings.schoolTagline) {
        doc.text(settings.schoolTagline, pageWidth / 2, y + 8, { align: 'center' });
      }

      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      const addressLine = `${settings.schoolAddress || 'Campus Address'} • Tel: ${settings.schoolPhone || 'N/A'} • Email: ${settings.schoolEmail || 'info@school.edu'}`;
      doc.text(addressLine, pageWidth / 2, y + 14, { align: 'center' });

      // Title Banner
      y = 44;
      doc.setFillColor(238, 242, 255); // indigo-50
      doc.setDrawColor(199, 210, 254); // indigo-200
      doc.roundedRect(14, y, pageWidth - 28, 12, 2, 2, 'FD');

      doc.setTextColor(49, 46, 129); // indigo-900
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('OFFICIAL STATEMENT OF RESULTS & ACADEMIC TRANSCRIPT', pageWidth / 2, y + 5.5, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(79, 70, 229);
      doc.text(`${result.examTitle} • Academic Session: ${result.academicYear}`, pageWidth / 2, y + 9.5, { align: 'center' });

      // Student Profile Information Box
      y = 62;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, y, pageWidth - 28, 25, 2, 2, 'FD');

      doc.setFontSize(8.5);
      const col1 = 18;
      const col2 = pageWidth / 2 + 5;

      // Row 1
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Student Name:', col1, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(result.studentName, col1 + 25, y + 6);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Roll Number:', col2, y + 6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(result.studentRollNo, col2 + 24, y + 6);

      // Row 2
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Class & Section:', col1, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${result.className} (Section ${result.section})`, col1 + 25, y + 13);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Guardian Name:', col2, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(result.guardianName || 'N/A', col2 + 24, y + 13);

      // Row 3
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Issue Date:', col1, y + 20);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(formatDate(result.issueDate), col1 + 25, y + 20);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Class Position:', col2, y + 20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(result.rank ? `Rank #${result.rank}` : 'Evaluated', col2 + 24, y + 20);

      // Subject Marks Table Header
      y = 94;
      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);

      doc.text('S.NO', 18, y + 5.5);
      doc.text('SUBJECT', 32, y + 5.5);
      doc.text('MAX MARKS', pageWidth - 105, y + 5.5, { align: 'right' });
      doc.text('PASS MARKS', pageWidth - 78, y + 5.5, { align: 'right' });
      doc.text('OBTAINED', pageWidth - 50, y + 5.5, { align: 'right' });
      doc.text('GRADE', pageWidth - 32, y + 5.5, { align: 'right' });
      doc.text('STATUS', pageWidth - 18, y + 5.5, { align: 'right' });

      y += 8;

      // Subject Rows
      result.subjectMarks.forEach((m, idx) => {
        const rowH = 7.5;
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(14, y, pageWidth - 28, rowH, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);

        doc.text(`${idx + 1}`, 18, y + 5);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(m.subjectName, 32, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`${m.totalMarks}`, pageWidth - 105, y + 5, { align: 'right' });
        doc.text(`${m.passingMarks}`, pageWidth - 78, y + 5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        if (m.isAbsent) {
          doc.setTextColor(225, 29, 72);
          doc.text('ABSENT', pageWidth - 50, y + 5, { align: 'right' });
        } else {
          doc.setTextColor(15, 23, 42);
          doc.text(`${m.obtainedMarks}`, pageWidth - 50, y + 5, { align: 'right' });
        }

        doc.text(m.grade || '-', pageWidth - 32, y + 5, { align: 'right' });

        const subPassed = !m.isAbsent && m.obtainedMarks >= m.passingMarks;
        if (subPassed) {
          doc.setTextColor(5, 150, 105);
          doc.text('PASS', pageWidth - 18, y + 5, { align: 'right' });
        } else {
          doc.setTextColor(225, 29, 72);
          doc.text('FAIL', pageWidth - 18, y + 5, { align: 'right' });
        }

        // Row border
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y + rowH, pageWidth - 14, y + rowH);
        y += rowH;
      });

      // Total Summary Row
      doc.setFillColor(238, 242, 255);
      doc.rect(14, y, pageWidth - 28, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(49, 46, 129);

      doc.text('GRAND TOTAL', 32, y + 6);
      doc.text(`${result.totalMaxMarks}`, pageWidth - 105, y + 6, { align: 'right' });
      doc.text('-', pageWidth - 78, y + 6, { align: 'right' });
      doc.text(`${result.totalObtainedMarks}`, pageWidth - 50, y + 6, { align: 'right' });
      doc.text(`${result.overallGrade}`, pageWidth - 32, y + 6, { align: 'right' });
      doc.setTextColor(isPassed ? 5 : 225, isPassed ? 150 : 29, isPassed ? 105 : 72);
      doc.text(result.status.toUpperCase(), pageWidth - 18, y + 6, { align: 'right' });

      y += 15;

      // Key Metrics Banner Cards (3-column)
      const kpiW = (pageWidth - 28 - 8) / 3;
      const kpiH = 18;

      // KPI 1: Percentage
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, kpiW, kpiH, 2, 2, 'FD');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('PERCENTAGE', 18, y + 5.5);
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.text(`${result.percentage.toFixed(1)}%`, 18, y + 14);

      // KPI 2: Overall Grade
      const kpi2X = 14 + kpiW + 4;
      doc.roundedRect(kpi2X, y, kpiW, kpiH, 2, 2, 'FD');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('FINAL LETTER GRADE', kpi2X + 4, y + 5.5);
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229);
      doc.setFont('helvetica', 'bold');
      doc.text(result.overallGrade, kpi2X + 4, y + 14);

      // KPI 3: Status
      const kpi3X = kpi2X + kpiW + 4;
      if (isPassed) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
      } else {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 205, 205);
      }
      doc.roundedRect(kpi3X, y, kpiW, kpiH, 2, 2, 'FD');
      doc.setFontSize(7.5);
      if (isPassed) {
        doc.setTextColor(5, 150, 105);
      } else {
        doc.setTextColor(225, 29, 72);
      }
      doc.text('FINAL RESULT STATUS', kpi3X + 4, y + 5.5);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(isPassed ? 'PROMOTED / PASS' : 'NEEDS IMPROVEMENT', kpi3X + 4, y + 14);

      y += kpiH + 8;

      // Evaluation & Remarks Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, y, pageWidth - 28, 18, 2, 2, 'FD');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('TEACHER & INSTITUTION REMARKS:', 18, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const remarkText = result.teacherRemarks || 'Satisfactory progress demonstrated across all evaluated subjects. Keep striving for academic excellence.';
      doc.text(doc.splitTextToSize(remarkText, pageWidth - 36), 18, y + 11);

      y += 24;

      // Grading Scale Legend
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Grading Scale: A+ (90-100%) Outstanding | A (80-89%) Excellent | B (70-79%) Very Good | C (60-69%) Good | D (50-59%) Pass | F (<50%) Unsatisfactory', 14, y);

      // Signatures Block
      const signY = 265;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);

      // Signature 1: Class Teacher
      doc.line(18, signY, 65, signY);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Class Teacher Signature', 22, signY + 4.5);

      // Signature 2: Controller of Examinations
      const sign2X = (pageWidth / 2) - 25;
      doc.line(sign2X, signY, sign2X + 50, signY);
      doc.text('Controller of Exams', sign2X + 7, signY + 4.5);

      // Signature 3: Principal & Seal
      const sign3X = pageWidth - 65;
      doc.line(sign3X, signY, pageWidth - 18, signY);
      doc.text('Principal / Official Seal', sign3X + 5, signY + 4.5);

      // Save document
      const cleanFileName = `Result_Card_${result.studentRollNo}_${result.studentName.replace(/\s+/g, '_')}.pdf`;
      doc.save(cleanFileName);
    } catch (err) {
      console.error('Failed to export Result Card PDF:', err);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4 animate-in fade-in zoom-in-95">
        
        {/* Modal Controls Bar (Hidden in Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 gap-3">
          <div className="flex items-center gap-3">
            {/* Primary Back Button */}
            <BackButton onClick={onClose} label="Back" variant="modal" />

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Award className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Official Student Result Card
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {result.studentRollNo} • {result.studentName}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Multi-Semester Performance Trends */}
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistory(result.studentId);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-xs transition active:scale-95 cursor-pointer"
                title="View student multi-semester grade trends & chart"
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Grade Trends</span>
              </button>
            )}

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Download official PDF result card"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Print document or Save as PDF via browser dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Result</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Result Card Container */}
        <div id="printable-result-card" className="p-6 sm:p-10 bg-white text-slate-900 selection:bg-indigo-100">
          
          {/* Outer Decorative Certificate Border */}
          <div className="border-4 border-double border-indigo-900/30 rounded-2xl p-6 sm:p-8 bg-linear-to-b from-indigo-50/20 via-white to-slate-50/40 relative overflow-hidden">
            
            {/* Watermark Crest Background */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-4 select-none">
              <Award className="w-96 h-96 text-indigo-900" />
            </div>

            {/* 1. School Header with Logo and Address */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b-2 border-indigo-600 gap-4 text-center sm:text-left">
              <div className="flex items-center gap-4">
                {/* Logo */}
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.schoolName}
                    className="w-16 h-16 object-contain rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-800 text-white flex flex-col items-center justify-center shadow-md shadow-indigo-950/20 shrink-0">
                    <Award className="w-7 h-7 text-amber-300 mb-0.5" />
                    <span className="text-[10px] font-black tracking-widest uppercase">EDU</span>
                  </div>
                )}

                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                    {settings.schoolName || 'St. Augustine International Academy'}
                  </h1>
                  {settings.schoolTagline && (
                    <p className="text-xs font-medium text-indigo-700 italic">
                      {settings.schoolTagline}
                    </p>
                  )}
                  {/* Address & Contact Information */}
                  <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{settings.schoolAddress || '742 Evergreen Boulevard, Springfield, IL 62704'}</span>
                    <span>•</span>
                    <span>Tel: {settings.schoolPhone || '+1 (555) 234-5678'}</span>
                    {settings.schoolEmail && (
                      <>
                        <span>•</span>
                        <span>{settings.schoolEmail}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Session / Official Seal Badge */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 border border-indigo-200 text-indigo-800 tracking-wider uppercase">
                  Session {result.academicYear}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 font-mono">
                  Cert Ref: {result.id}
                </span>
              </div>
            </div>

            {/* 2. Certificate Title Ribbon */}
            <div className="my-5 text-center bg-indigo-900 text-white py-2 px-4 rounded-xl shadow-xs">
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-widest flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Official Statement of Academic Results</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </h2>
              <p className="text-[11px] text-indigo-200 font-medium">
                {result.examTitle}
              </p>
            </div>

            {/* 3. Student Bio Information Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 text-xs mb-6">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Student Name</span>
                <span className="font-bold text-slate-900 text-sm">{result.studentName}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Roll Number</span>
                <span className="font-bold text-slate-900 text-sm font-mono">{result.studentRollNo}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Class &amp; Section</span>
                <span className="font-bold text-slate-900 text-sm">{result.className} ({result.section})</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Guardian Name</span>
                <span className="font-medium text-slate-800">{result.guardianName || 'Parent / Guardian'}</span>
              </div>
            </div>

            {/* 4. Subject-wise Marks Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6 bg-white shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-4">Subject Name</th>
                    <th className="py-2.5 px-3 text-right">Max Marks</th>
                    <th className="py-2.5 px-3 text-right">Pass Marks</th>
                    <th className="py-2.5 px-3 text-right">Obtained</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.subjectMarks.map((m, idx) => {
                    const subPassed = !m.isAbsent && m.obtainedMarks >= m.passingMarks;
                    return (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-4 font-bold text-slate-900">{m.subjectName}</td>
                        <td className="py-2 px-3 text-right text-slate-600 font-mono">{m.totalMarks}</td>
                        <td className="py-2 px-3 text-right text-slate-600 font-mono">{m.passingMarks}</td>
                        <td className="py-2 px-3 text-right font-black font-mono">
                          {m.isAbsent ? (
                            <span className="text-rose-600 font-bold">ABSENT</span>
                          ) : (
                            <span className="text-slate-900">{m.obtainedMarks}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                            m.grade?.startsWith('A')
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.grade === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : m.grade === 'C'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.grade || '-'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {subPassed ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Pass</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Fail</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-indigo-50/80 font-black text-indigo-950 border-t-2 border-indigo-300">
                    <td colSpan={2} className="py-3 px-4 text-left uppercase tracking-wider">
                      Grand Total &amp; Aggregate
                    </td>
                    <td className="py-3 px-3 text-right font-mono">{result.totalMaxMarks}</td>
                    <td className="py-3 px-3 text-right text-slate-400 font-mono">-</td>
                    <td className="py-3 px-3 text-right font-mono text-sm">{result.totalObtainedMarks}</td>
                    <td className="py-3 px-3 text-center text-sm font-extrabold text-indigo-700">
                      {result.overallGrade}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                        isPassed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {result.status}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. Performance Summary Dashboard Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Percentage</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {result.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Final Grade</span>
                <span className="text-xl font-black text-indigo-600">
                  {result.overallGrade}
                </span>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Class Standing</span>
                <span className="text-xl font-black text-emerald-600">
                  {result.rank ? `Rank #${result.rank}` : 'Top Tier'}
                </span>
              </div>
              <div className={`p-3.5 rounded-xl border ${
                isPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
              }`}>
                <span className={`text-[10px] font-bold uppercase block ${
                  isPassed ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  Result Outcome
                </span>
                <span className={`text-base font-black uppercase ${
                  isPassed ? 'text-emerald-900' : 'text-rose-900'
                }`}>
                  {isPassed ? 'Promoted' : 'Remedial Required'}
                </span>
              </div>
            </div>

            {/* 6. Evaluation Remarks Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-8">
              <span className="font-bold text-slate-700 block mb-1">Teacher &amp; Controller Remarks:</span>
              <p className="text-slate-600 italic">
                &ldquo;{result.teacherRemarks || 'Satisfactory academic dedication demonstrated across all evaluated courses. Continuous reading and mathematics practice recommended.'}&rdquo;
              </p>
            </div>

            {/* 7. Signatures and Seal Block */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-800">Class Teacher</span>
                <span className="text-[10px] text-slate-500">Sign &amp; Date</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-800">Exam Controller</span>
                <span className="text-[10px] text-slate-500">Verified &amp; Certified</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-36 border-b border-slate-400 mb-1" />
                <span className="font-bold text-slate-800">Head of School</span>
                <span className="text-[10px] text-slate-500">Official Stamp</span>
              </div>
            </div>

            {/* 8. Certificate Footer */}
            <div className="mt-8 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[10px] text-slate-400">
              <span>Official System-Generated Report • Stored Offline in Browser</span>
              <span>Issue Date: {formatDate(result.issueDate)}</span>
            </div>

          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden in Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Result Cards</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistory(result.studentId);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-xs transition active:scale-95 cursor-pointer"
                title="View Performance Trends"
              >
                <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Performance Trends</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Download official PDF result card"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              title="Print document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Result</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
