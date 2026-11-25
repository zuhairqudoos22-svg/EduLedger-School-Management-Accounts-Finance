import React, { useState, useMemo } from 'react';
import { SchoolSettings, TimetableSlot, DayOfWeek } from '../../types';
import { PeriodDefinition } from './TimetableManagementView';
import {
  generateClassTimetablePdf,
  generateFacultyWorkloadPdf,
  generateMasterDailySchedulePdf,
} from '../../utils/timetablePdf';
import { exportToExcel, exportToCSV } from '../../utils/exportUtils';
import {
  Printer,
  FileDown,
  FileSpreadsheet,
  X,
  Calendar,
  CheckCircle2,
  Users,
  Building2,
  Sliders,
  Eye,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface TimetablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  slots: TimetableSlot[];
  periods: PeriodDefinition[];
  allClasses: string[];
  allSections: string[];
  initialClass: string;
  initialSection: string;
  teachersList: string[];
  initialTeacher?: string;
  showToast?: (msg: string) => void;
}

type ScheduleType = 'class-weekly' | 'teacher-schedule' | 'daily-master' | 'all-classes';

export const TimetablePrintModal: React.FC<TimetablePrintModalProps> = ({
  isOpen,
  onClose,
  settings,
  slots,
  periods,
  allClasses,
  allSections,
  initialClass,
  initialSection,
  teachersList,
  initialTeacher = '',
  showToast,
}) => {
  // Config state
  const [scheduleType, setScheduleType] = useState<ScheduleType>('class-weekly');
  const [selectedClass, setSelectedClass] = useState<string>(initialClass || 'Class 9');
  const [selectedSection, setSelectedSection] = useState<string>(initialSection || 'A');
  const [selectedTeacher, setSelectedTeacher] = useState<string>(
    initialTeacher || teachersList[0] || 'Dr. Robert Smith'
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [paperOrientation, setPaperOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const days: DayOfWeek[] = useMemo(() => {
    return includeSaturday
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  }, [includeSaturday]);

  // Filter slots for preview
  const previewSlots = useMemo(() => {
    if (scheduleType === 'class-weekly') {
      return slots.filter(s => s.className === selectedClass && s.section === selectedSection);
    }
    if (scheduleType === 'teacher-schedule') {
      return slots.filter(s => s.teacherName.toLowerCase() === selectedTeacher.toLowerCase());
    }
    if (scheduleType === 'daily-master') {
      return slots.filter(s => s.day === selectedDay);
    }
    return slots;
  }, [slots, scheduleType, selectedClass, selectedSection, selectedTeacher, selectedDay]);

  if (!isOpen) return null;

  // Handle PDF Download
  const handleDownloadPdf = () => {
    setIsGenerating(true);
    try {
      if (scheduleType === 'class-weekly') {
        generateClassTimetablePdf({
          settings,
          className: selectedClass,
          section: selectedSection,
          slots: previewSlots,
          periods,
          includeSaturday,
        });
        showToast?.(`Generated PDF for ${selectedClass} - Section ${selectedSection}.`);
      } else if (scheduleType === 'teacher-schedule') {
        generateFacultyWorkloadPdf({
          settings,
          teacherName: selectedTeacher,
          slots,
          periods,
          includeSaturday,
        });
        showToast?.(`Generated PDF workload schedule for ${selectedTeacher}.`);
      } else {
        generateMasterDailySchedulePdf({
          settings,
          day: selectedDay,
          allClasses,
          allSections,
          slots,
          periods,
        });
        showToast?.(`Generated PDF Master Timetable for ${selectedDay}.`);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      showToast?.('Error generating PDF document.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Browser Print (Formatted Institutional Ledger)
  const handlePrint = () => {
    document.body.classList.add('print-mode-timetable');
    window.print();
    // Remove class after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('print-mode-timetable');
    }, 1500);
  };

  // Handle Excel Export
  const handleExportExcel = () => {
    const exportRows = previewSlots.map((s, idx) => ({
      '#': idx + 1,
      Class: s.className,
      Section: s.section,
      Day: s.day,
      'Period #': s.periodNumber,
      'Start Time': s.startTime,
      'End Time': s.endTime,
      Subject: s.subject,
      'Teacher / Faculty': s.teacherName,
      Room: s.room || 'General',
      Type: s.periodType,
      Notes: s.notes || '',
    }));

    exportToExcel(
      `Timetable_${scheduleType}_${new Date().toISOString().split('T')[0]}`,
      'Schedule',
      exportRows as unknown as Record<string, unknown>[]
    );
    showToast?.(`Exported ${exportRows.length} timetable records to Excel.`);
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    const exportRows = previewSlots.map((s, idx) => ({
      Index: idx + 1,
      Class: s.className,
      Section: s.section,
      Day: s.day,
      Period: s.periodNumber,
      StartTime: s.startTime,
      EndTime: s.endTime,
      Subject: s.subject,
      Teacher: s.teacherName,
      Room: s.room || '',
      Type: s.periodType,
    }));

    exportToCSV(
      `Timetable_${scheduleType}_${new Date().toISOString().split('T')[0]}`,
      exportRows as unknown as Record<string, unknown>[]
    );
    showToast?.(`Exported ${exportRows.length} timetable records to CSV.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Timetable Documentation, Print &amp; PDF Hub</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Audit Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate official institutional schedule registers, print ledgers, and download vectorized PDF documents.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left configuration & Right preview */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Controls Column */}
          <div className="lg:col-span-4 p-5 space-y-5 bg-slate-50/30 dark:bg-slate-900/30">
            {/* Schedule Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Schedule Document Type
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setScheduleType('class-weekly')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    scheduleType === 'class-weekly'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 mb-1 text-indigo-600" />
                  <div className="font-bold">Class Weekly</div>
                  <div className="text-[10px] text-slate-400 font-normal">Individual classroom grid</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('teacher-schedule')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    scheduleType === 'teacher-schedule'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 mb-1 text-emerald-600" />
                  <div className="font-bold">Faculty Schedule</div>
                  <div className="text-[10px] text-slate-400 font-normal">Teacher workload matrix</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('daily-master')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    scheduleType === 'daily-master'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4 mb-1 text-amber-600" />
                  <div className="font-bold">Daily Master</div>
                  <div className="text-[10px] text-slate-400 font-normal">All rooms for 1 day</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('all-classes')}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition cursor-pointer ${
                    scheduleType === 'all-classes'
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-4 h-4 mb-1 text-purple-600" />
                  <div className="font-bold">Complete Ledger</div>
                  <div className="text-[10px] text-slate-400 font-normal">All scheduled slots</div>
                </button>
              </div>
            </div>

            {/* Context Filters */}
            {scheduleType === 'class-weekly' && (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Target Classroom</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Class</label>
                    <select
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      {allClasses.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Section</label>
                    <select
                      value={selectedSection}
                      onChange={e => setSelectedSection(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                    >
                      {allSections.map(s => (
                        <option key={s} value={s}>
                          Section {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {scheduleType === 'teacher-schedule' && (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Instructor / Faculty</div>
                <select
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                >
                  {teachersList.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {scheduleType === 'daily-master' && (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Operating Day</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as DayOfWeek[]).map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedDay === day
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layout & Format Options */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Print &amp; Document Options
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSaturday}
                    onChange={e => setIncludeSaturday(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Include Saturday (6-day academic schedule)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignatures}
                    onChange={e => setIncludeSignatures(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Include Official Signatures &amp; Seal block
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Page Orientation</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaperOrientation('landscape')}
                    className={`py-1.5 px-3 rounded-xl border font-bold text-center transition cursor-pointer ${
                      paperOrientation === 'landscape'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Landscape (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperOrientation('portrait')}
                    className={`py-1.5 px-3 rounded-xl border font-bold text-center transition cursor-pointer ${
                      paperOrientation === 'portrait'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Portrait (A4)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Summary Note */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Generated PDFs contain vectorized fonts, sharp typography, institutional headers, and official coordinator signature seals.
              </span>
            </div>
          </div>

          {/* Right Column: Live Document Preview */}
          <div className="lg:col-span-8 p-5 flex flex-col justify-between bg-slate-100 dark:bg-slate-950/50 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Document Live Preview</span>
                  <span className="text-slate-400 font-normal">({previewSlots.length} allocated periods)</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Paper: A4 {paperOrientation.toUpperCase()}
                </div>
              </div>

              {/* Printable sheet container */}
              <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-md border border-slate-200 text-xs">
                {/* Header */}
                <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
                  <h1 className="text-lg font-black tracking-wider uppercase text-slate-900">
                    {settings.schoolName || 'NextGen International Academy'}
                  </h1>
                  <h2 className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wide">
                    {scheduleType === 'class-weekly' && `Weekly Academic Timetable — ${selectedClass} (${selectedSection})`}
                    {scheduleType === 'teacher-schedule' && `Faculty Workload Schedule — ${selectedTeacher}`}
                    {scheduleType === 'daily-master' && `Master Daily Schedule Matrix — ${selectedDay}`}
                    {scheduleType === 'all-classes' && 'Consolidated Academic Timetable Schedule'}
                  </h2>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200">
                    <span>Year: {settings.currentAcademicYear || '2026-2027'}</span>
                    <span>Facility: {selectedClass.replace(/\D/g, '') ? `Room ${selectedClass.replace(/\D/g, '')}` : 'Campus Master'}</span>
                    <span>Issued: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Grid Preview */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300 text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 px-2 py-1.5 text-center font-bold w-16">
                          Day / Period
                        </th>
                        {periods.map(p => (
                          <th key={p.periodNumber} className="border border-slate-300 px-2 py-1.5 text-center font-bold">
                            <div>{p.label}</div>
                            <div className="text-[9px] text-slate-500 font-normal">{p.startTime}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {days.map(day => (
                        <tr key={day} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-2 font-bold text-center bg-slate-50">
                            {day.slice(0, 3)}
                          </td>
                          {periods.map(p => {
                            if (p.isBreak) {
                              return (
                                <td
                                  key={p.periodNumber}
                                  className="border border-slate-300 bg-amber-50/70 text-amber-800 text-center font-bold text-[9px] px-1 py-1"
                                >
                                  BREAK
                                </td>
                              );
                            }

                            const slot = previewSlots.find(
                              s => s.day === day && s.periodNumber === p.periodNumber
                            );

                            return (
                              <td key={p.periodNumber} className="border border-slate-300 p-1.5 text-center">
                                {slot ? (
                                  <div>
                                    <div className="font-bold text-slate-900 leading-tight">{slot.subject}</div>
                                    <div className="text-[9px] text-slate-600 mt-0.5">{slot.teacherName || slot.room}</div>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[9px]">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-off preview */}
                {includeSignatures && (
                  <div className="pt-6 mt-6 border-t border-slate-300 grid grid-cols-3 text-center text-[10px] text-slate-600">
                    <div>
                      <div className="w-24 border-b border-slate-800 mx-auto mb-1"></div>
                      <span>Class Teacher</span>
                    </div>
                    <div>
                      <div className="w-24 border-b border-slate-800 mx-auto mb-1"></div>
                      <span>Timetable In-charge</span>
                    </div>
                    <div>
                      <div className="w-24 border-b border-slate-800 mx-auto mb-1"></div>
                      <span>Principal Stamp</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-5 mt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Print Report */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span>Print Report (Ledger)</span>
                </button>

                {/* Download Official PDF */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isGenerating ? 'Generating PDF...' : 'Download Official PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
