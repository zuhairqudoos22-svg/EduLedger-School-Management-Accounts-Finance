import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { DataResetConfirmationModal } from '../common/DataResetConfirmationModal';
import { useAuth } from '../../context/AuthContext';
import {
  Exam,
  ExamSubject,
  ExamStatus,
  ExamResult,
  StudentSubjectMark,
} from '../../types';
import { formatDate, exportToCSV, getTodayDateString } from '../../utils/formatters';
import {
  Award,
  Calendar,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  BookOpen,
  UserCheck,
  ChevronRight,
  GraduationCap,
  Check,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  X,
  FileText,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import { ResultCardModal } from './ResultCardModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { StudentPerformanceHistory } from './StudentPerformanceHistory';

export const ExamResultsView: React.FC = () => {
  const {
    exams,
    examResults,
    students,
    settings,
    addExam,
    updateExam,
    deleteExam,
    saveExamResult,
    saveBulkExamResults,
    deleteExamResult,
  } = useSchool();
  const { isAdmin } = useAuth();

  // Active view tab inside module
  const [moduleTab, setModuleTab] = useState<'planner' | 'marks' | 'cards' | 'history'>('planner');
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  // Notification Banner
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 4000);
  };

  // Selected Result for Official Card Modal
  const [activeResultCard, setActiveResultCard] = useState<ExamResult | null>(null);

  // Delete Candidate States
  const [examToDeleteId, setExamToDeleteId] = useState<string | null>(null);

  // -------------------------------------------------------------
  // TAB 1: EXAM PLANNER STATE & MODAL
  // -------------------------------------------------------------
  const [plannerClassFilter, setPlannerClassFilter] = useState('All');
  const [plannerStatusFilter, setPlannerStatusFilter] = useState('All');

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form State for Exam Planner
  const [examForm, setExamForm] = useState<{
    title: string;
    academicYear: string;
    className: string;
    startDate: string;
    endDate: string;
    status: ExamStatus;
    instructions: string;
    subjects: ExamSubject[];
  }>({
    title: '',
    academicYear: settings.currentAcademicYear || '2026-2027',
    className: settings.standardClasses?.[0] || '',
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    status: 'Scheduled',
    instructions: '',
    subjects: [
      {
        id: 'sub-1',
        subjectName: 'Mathematics',
        examDate: getTodayDateString(),
        startTime: '09:00 AM',
        endTime: '11:30 AM',
        totalMarks: 100,
        passingMarks: 40,
      },
    ],
  });

  const openNewExamModal = () => {
    setEditingExamId(null);
    setExamForm({
      title: 'Term Examination ' + (settings.currentAcademicYear || '2026-2027'),
      academicYear: settings.currentAcademicYear || '2026-2027',
      className: settings.standardClasses?.[0] || '',
      startDate: getTodayDateString(),
      endDate: getTodayDateString(),
      status: 'Scheduled',
      instructions: 'Standard hall regulations apply. Students must carry valid student ID cards.',
      subjects: [
        {
          id: 'sub-' + Date.now() + '-1',
          subjectName: 'Mathematics',
          examDate: getTodayDateString(),
          startTime: '09:00 AM',
          endTime: '11:30 AM',
          totalMarks: 100,
          passingMarks: 40,
        },
        {
          id: 'sub-' + Date.now() + '-2',
          subjectName: 'English Literature',
          examDate: getTodayDateString(),
          startTime: '09:00 AM',
          endTime: '11:30 AM',
          totalMarks: 100,
          passingMarks: 40,
        },
      ],
    });
    setIsExamModalOpen(true);
  };

  const openEditExamModal = (exam: Exam) => {
    setEditingExamId(exam.id);
    setExamForm({
      title: exam.title,
      academicYear: exam.academicYear,
      className: exam.className,
      startDate: exam.startDate,
      endDate: exam.endDate,
      status: exam.status,
      instructions: exam.instructions || '',
      subjects: exam.subjects.map(s => ({ ...s })),
    });
    setIsExamModalOpen(true);
  };

  const handleAddSubjectToForm = (subjectName: string = '') => {
    setExamForm(prev => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        {
          id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          subjectName: subjectName || 'New Subject',
          examDate: prev.startDate,
          startTime: '09:00 AM',
          endTime: '11:30 AM',
          totalMarks: 100,
          passingMarks: 40,
        },
      ],
    }));
  };

  const handleRemoveSubjectFromForm = (subId: string) => {
    if (examForm.subjects.length <= 1) {
      alert('An examination schedule must have at least one subject.');
      return;
    }
    setExamForm(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s.id !== subId),
    }));
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title.trim()) {
      alert('Please enter an Examination Title.');
      return;
    }
    if (examForm.subjects.length === 0) {
      alert('Please add at least one subject to the schedule.');
      return;
    }

    if (editingExamId) {
      await updateExam({
        id: editingExamId,
        ...examForm,
        createdAt: new Date().toISOString(),
      });
      showNotice(`Exam schedule "${examForm.title}" updated successfully!`);
    } else {
      await addExam(examForm);
      showNotice(`New classwise exam schedule "${examForm.title}" created successfully!`);
    }
    setIsExamModalOpen(false);
  };

  const handleDeleteExamConfirm = async () => {
    if (!examToDeleteId) return;
    await deleteExam(examToDeleteId);
    showNotice('Exam schedule and associated student records deleted.');
    setExamToDeleteId(null);
  };

  // Filtered Exams
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchClass = plannerClassFilter === 'All' || e.className === plannerClassFilter;
      const matchStatus = plannerStatusFilter === 'All' || e.status === plannerStatusFilter;
      return matchClass && matchStatus;
    });
  }, [exams, plannerClassFilter, plannerStatusFilter]);

  // -------------------------------------------------------------
  // TAB 2: MARKS ENTRY & EVALUATION STATE
  // -------------------------------------------------------------
  const [selectedExamIdForMarks, setSelectedExamIdForMarks] = useState<string>(
    exams[0]?.id || ''
  );

  const selectedExamForMarks = useMemo(() => {
    return exams.find(e => e.id === selectedExamIdForMarks) || exams[0];
  }, [exams, selectedExamIdForMarks]);

  // Students in selected exam's class
  const classStudents = useMemo(() => {
    if (!selectedExamForMarks) return [];
    return students
      .filter(s => s.status === 'active' && s.className === selectedExamForMarks.className)
      .sort((a, b) => a.rollNo.localeCompare(b.rollNo));
  }, [students, selectedExamForMarks]);

  // Working Marks State per student & subject
  // Key: studentId -> Record<subjectName, { obtainedMarks: number; isAbsent: boolean }>
  const [workingMarks, setWorkingMarks] = useState<
    Record<string, Record<string, { marks: number; isAbsent: boolean }>>
  >({});
  const [workingRemarks, setWorkingRemarks] = useState<Record<string, string>>({});

  // Sync working marks when selected exam changes or results update
  React.useEffect(() => {
    if (!selectedExamForMarks) return;
    const initialMarks: Record<string, Record<string, { marks: number; isAbsent: boolean }>> = {};
    const initialRemarks: Record<string, string> = {};

    for (const student of classStudents) {
      initialMarks[student.id] = {};
      const existingResult = examResults.find(
        r => r.examId === selectedExamForMarks.id && r.studentId === student.id
      );

      if (existingResult) {
        initialRemarks[student.id] = existingResult.teacherRemarks || '';
        for (const sub of selectedExamForMarks.subjects) {
          const found = existingResult.subjectMarks.find(m => m.subjectName === sub.subjectName);
          initialMarks[student.id][sub.subjectName] = {
            marks: found ? found.obtainedMarks : 0,
            isAbsent: !!found?.isAbsent,
          };
        }
      } else {
        initialRemarks[student.id] = 'Good progress throughout the term.';
        for (const sub of selectedExamForMarks.subjects) {
          initialMarks[student.id][sub.subjectName] = {
            marks: 0,
            isAbsent: false,
          };
        }
      }
    }

    setWorkingMarks(initialMarks);
    setWorkingRemarks(initialRemarks);
  }, [selectedExamForMarks, classStudents, examResults]);

  const handleMarkChange = (studentId: string, subjectName: string, value: string, maxMarks: number) => {
    const num = Math.max(0, Math.min(maxMarks, Number(value) || 0));
    setWorkingMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: {
          marks: num,
          isAbsent: false,
        },
      },
    }));
  };

  const handleAbsentToggle = (studentId: string, subjectName: string) => {
    setWorkingMarks(prev => {
      const current = prev[studentId]?.[subjectName] || { marks: 0, isAbsent: false };
      return {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [subjectName]: {
            marks: current.isAbsent ? 0 : 0,
            isAbsent: !current.isAbsent,
          },
        },
      };
    });
  };

  // Helper grading formula
  const computeSubjectGrade = (obtained: number, total: number, isAbsent?: boolean): string => {
    if (isAbsent) return 'F';
    const pct = total > 0 ? (obtained / total) * 100 : 0;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B';
    if (pct >= 60) return 'C';
    if (pct >= 50) return 'D';
    return 'F';
  };

  // Save all entered marks for the selected class & exam
  const handleSaveAllClassMarks = async () => {
    if (!selectedExamForMarks || classStudents.length === 0) return;

    const resultsToSave: ExamResult[] = [];
    const totalMax = selectedExamForMarks.subjects.reduce((sum, s) => sum + s.totalMarks, 0);

    for (const student of classStudents) {
      const studentData = workingMarks[student.id] || {};
      const subjectMarks: StudentSubjectMark[] = selectedExamForMarks.subjects.map(s => {
        const item = studentData[s.subjectName] || { marks: 0, isAbsent: false };
        const grade = computeSubjectGrade(item.marks, s.totalMarks, item.isAbsent);
        return {
          subjectName: s.subjectName,
          totalMarks: s.totalMarks,
          passingMarks: s.passingMarks,
          obtainedMarks: item.isAbsent ? 0 : item.marks,
          isAbsent: item.isAbsent,
          grade,
          remarks: item.isAbsent ? 'Absent from test' : item.marks >= s.passingMarks ? 'Pass' : 'Needs improvement',
        };
      });

      const totalObtained = subjectMarks.reduce((sum, sm) => sum + (sm.isAbsent ? 0 : sm.obtainedMarks), 0);
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const overallGrade = computeSubjectGrade(totalObtained, totalMax);
      const allPassed = subjectMarks.every(sm => !sm.isAbsent && sm.obtainedMarks >= sm.passingMarks);

      // Check if existing result ID exists
      const existing = examResults.find(
        r => r.examId === selectedExamForMarks.id && r.studentId === student.id
      );

      resultsToSave.push({
        id: existing?.id || 'res-' + Date.now() + '-' + student.id,
        examId: selectedExamForMarks.id,
        examTitle: selectedExamForMarks.title,
        studentId: student.id,
        studentRollNo: student.rollNo,
        studentName: student.fullName,
        className: student.className,
        section: student.section,
        academicYear: selectedExamForMarks.academicYear,
        guardianName: student.guardianName,
        subjectMarks,
        totalMaxMarks: totalMax,
        totalObtainedMarks: totalObtained,
        percentage,
        overallGrade,
        status: allPassed ? 'Pass' : 'Fail',
        teacherRemarks: workingRemarks[student.id] || 'Satisfactory academic performance.',
        issueDate: getTodayDateString(),
        published: true,
      });
    }

    // Compute ranks among students of this class
    const sorted = [...resultsToSave].sort((a, b) => b.totalObtainedMarks - a.totalObtainedMarks);
    sorted.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    await saveBulkExamResults(sorted);
    showNotice(`Successfully saved and published results for ${resultsToSave.length} students in ${selectedExamForMarks.className}!`);
  };

  // Export marks sheet CSV
  const handleExportMarksLedgerCSV = () => {
    if (!selectedExamForMarks || classStudents.length === 0) return;

    const rows = classStudents.map(student => {
      const data = workingMarks[student.id] || {};
      const row: Record<string, string | number> = {
        'Roll No': student.rollNo,
        'Student Name': student.fullName,
        Class: student.className,
        Section: student.section,
      };

      let sumObtained = 0;
      let totalMax = 0;

      selectedExamForMarks.subjects.forEach(s => {
        const item = data[s.subjectName] || { marks: 0, isAbsent: false };
        row[`${s.subjectName} (${s.totalMarks})`] = item.isAbsent ? 'ABSENT' : item.marks;
        sumObtained += item.isAbsent ? 0 : item.marks;
        totalMax += s.totalMarks;
      });

      const pct = totalMax > 0 ? ((sumObtained / totalMax) * 100).toFixed(1) + '%' : '0%';
      row['Total Obtained'] = sumObtained;
      row['Max Marks'] = totalMax;
      row['Percentage'] = pct;
      row['Grade'] = computeSubjectGrade(sumObtained, totalMax);

      return row;
    });

    exportToCSV(`Marks_Ledger_${selectedExamForMarks.className}_${selectedExamForMarks.title.replace(/\s+/g, '_')}`, rows);
  };

  // -------------------------------------------------------------
  // TAB 3: RESULT CARDS DIRECTORY & FILTERING
  // -------------------------------------------------------------
  const [cardsExamFilter, setCardsExamFilter] = useState<string>('All');
  const [cardsClassFilter, setCardsClassFilter] = useState<string>('All');
  const [cardsSearchQuery, setCardsSearchQuery] = useState('');

  const filteredResults = useMemo(() => {
    return examResults.filter(r => {
      const matchExam = cardsExamFilter === 'All' || r.examId === cardsExamFilter;
      const matchClass = cardsClassFilter === 'All' || r.className === cardsClassFilter;
      const matchSearch =
        !cardsSearchQuery.trim() ||
        r.studentName.toLowerCase().includes(cardsSearchQuery.toLowerCase()) ||
        r.studentRollNo.toLowerCase().includes(cardsSearchQuery.toLowerCase());
      return matchExam && matchClass && matchSearch;
    });
  }, [examResults, cardsExamFilter, cardsClassFilter, cardsSearchQuery]);

  // Overall Statistics for Tab 3
  const totalPassedCount = filteredResults.filter(r => r.status === 'Pass').length;
  const passRate = filteredResults.length > 0 ? Math.round((totalPassedCount / filteredResults.length) * 100) : 0;
  const avgPercentage = filteredResults.length > 0
    ? (filteredResults.reduce((sum, r) => sum + r.percentage, 0) / filteredResults.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            <span>Examinations, Planners &amp; Student Result Cards</span>
          </h2>
          <p className="text-xs text-slate-500">
            Design classwise examination date sheets, enter student marks, and generate official printable result cards with school crest and address
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={openNewExamModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exam Schedule</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setModuleTab('marks')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              moduleTab === 'marks'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Enter Marks</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {bannerNotice && (
        <div className="print:hidden p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{bannerNotice}</span>
        </div>
      )}

      {/* Module Segmented Tab Switcher */}
      <div className="print:hidden flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setModuleTab('planner')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            moduleTab === 'planner'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Exam Planner (Classwise)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
            {exams.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setModuleTab('marks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            moduleTab === 'marks'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Edit2 className="w-4 h-4" />
          <span>2. Classwise Marks Entry</span>
        </button>

        <button
          type="button"
          onClick={() => setModuleTab('cards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            moduleTab === 'cards'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          <span>3. Student Result Cards</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700">
            {examResults.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setModuleTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            moduleTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span>4. Performance Trends (Recharts)</span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* SUB-VIEW 1: CLASSWISE EXAM PLANNER */}
      {/* ================================================================= */}
      {moduleTab === 'planner' && (
        <div className="space-y-6">
          {/* Filters Ribbon */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Target Class:</span>
                <select
                  value={plannerClassFilter}
                  onChange={e => setPlannerClassFilter(e.target.value)}
                  className="bg-transparent font-bold focus:outline-hidden"
                >
                  <option value="All">All Grades &amp; Classes</option>
                  {settings.standardClasses?.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Status:</span>
                <select
                  value={plannerStatusFilter}
                  onChange={e => setPlannerStatusFilter(e.target.value)}
                  className="bg-transparent font-bold focus:outline-hidden"
                >
                  <option value="All">All Exam Stages</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              Showing {filteredExams.length} examination planners
            </span>
          </div>

          {/* Exam Schedule Cards Grid */}
          {filteredExams.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Exam Planners Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                No exam schedules match the selected filters. Click below to add a classwise exam date sheet.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openNewExamModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Create First Exam Planner
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredExams.map(exam => {
                const totalExamMarks = exam.subjects.reduce((sum, s) => sum + s.totalMarks, 0);
                return (
                  <div
                    key={exam.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Top Badges & Title */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300">
                              {exam.className}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              Session {exam.academicYear}
                            </span>
                          </div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {exam.title}
                          </h3>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black uppercase ${
                          exam.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : exam.status === 'Ongoing'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400'
                        }`}>
                          {exam.status}
                        </span>
                      </div>

                      {/* Date Range & Instructions */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {formatDate(exam.startDate)} &rarr; {formatDate(exam.endDate)}
                        </span>
                        <span>•</span>
                        <span>{exam.subjects.length} Subjects</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {totalExamMarks} Total Marks
                        </span>
                      </div>

                      {exam.instructions && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
                          &ldquo;{exam.instructions}&rdquo;
                        </p>
                      )}

                      {/* Subject Date Sheet Table */}
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden mb-4">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold">
                              <th className="py-2 px-3">Subject</th>
                              <th className="py-2 px-3">Date &amp; Time</th>
                              <th className="py-2 px-3 text-right">Max</th>
                              <th className="py-2 px-3 text-right">Pass</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {exam.subjects.map((sub, i) => (
                              <tr key={sub.id || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                                  {sub.subjectName}
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  <div className="font-medium text-slate-700 dark:text-slate-300">
                                    {formatDate(sub.examDate)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {sub.startTime || '09:00 AM'} - {sub.endTime || '11:30 AM'}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {sub.totalMarks}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-slate-500">
                                  {sub.passingMarks}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExamIdForMarks(exam.id);
                          setModuleTab('marks');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Enter Marks</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditExamModal(exam)}
                              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Edit exam timetable"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExamToDeleteId(exam.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Delete exam schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-VIEW 2: CLASSWISE MARKS ENTRY & EVALUATION */}
      {/* ================================================================= */}
      {moduleTab === 'marks' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Award className="w-4 h-4 text-indigo-600" />
                <span className="text-slate-500">Select Exam:</span>
                <select
                  value={selectedExamIdForMarks}
                  onChange={e => setSelectedExamIdForMarks(e.target.value)}
                  className="bg-transparent font-bold focus:outline-hidden"
                >
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.className})
                    </option>
                  ))}
                </select>
              </div>

              {selectedExamForMarks && (
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800">
                  Target: {selectedExamForMarks.className} • {classStudents.length} Students Enrolled
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMarksLedgerCSV}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 shadow-xs"
                title="Download marks grid as CSV spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export Marks CSV</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAllClassMarks}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save All Class Marks</span>
              </button>
            </div>
          </div>

          {!selectedExamForMarks ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
              Please create an exam schedule in Tab 1 first to enter marks.
            </div>
          ) : classStudents.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
              No active students enrolled in {selectedExamForMarks.className}. Please add students to this class in Student Management.
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                      <th className="py-3 px-3 w-16 text-center">Roll</th>
                      <th className="py-3 px-4 min-w-[160px]">Student Name</th>
                      {selectedExamForMarks.subjects.map(sub => (
                        <th key={sub.id} className="py-3 px-3 text-center min-w-[110px]">
                          <div>{sub.subjectName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Max: {sub.totalMarks} | Pass: {sub.passingMarks}
                          </div>
                        </th>
                      ))}
                      <th className="py-3 px-3 text-right min-w-[80px]">Total</th>
                      <th className="py-3 px-3 text-center min-w-[70px]">Pct %</th>
                      <th className="py-3 px-3 text-center min-w-[60px]">Grade</th>
                      <th className="py-3 px-3 text-center min-w-[70px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {classStudents.map((student, idx) => {
                      const studentMarks = workingMarks[student.id] || {};
                      let totalObtained = 0;
                      let totalMax = 0;
                      let anyFail = false;

                      selectedExamForMarks.subjects.forEach(sub => {
                        const item = studentMarks[sub.subjectName] || { marks: 0, isAbsent: false };
                        totalMax += sub.totalMarks;
                        if (item.isAbsent) {
                          anyFail = true;
                        } else {
                          totalObtained += item.marks;
                          if (item.marks < sub.passingMarks) {
                            anyFail = true;
                          }
                        }
                      });

                      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
                      const overallGrade = computeSubjectGrade(totalObtained, totalMax);

                      return (
                        <tr
                          key={student.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            {student.rollNo}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {student.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Sec {student.section}
                            </span>
                          </td>

                          {/* Dynamic Columns for each subject */}
                          {selectedExamForMarks.subjects.map(sub => {
                            const item = studentMarks[sub.subjectName] || { marks: 0, isAbsent: false };
                            const subFailed = !item.isAbsent && item.marks < sub.passingMarks;

                            return (
                              <td key={sub.id} className="py-2 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={0}
                                    max={sub.totalMarks}
                                    disabled={item.isAbsent}
                                    value={item.isAbsent ? '' : item.marks}
                                    onChange={e =>
                                      handleMarkChange(student.id, sub.subjectName, e.target.value, sub.totalMarks)
                                    }
                                    placeholder={item.isAbsent ? 'ABS' : '0'}
                                    className={`w-14 text-center font-mono font-bold py-1 px-1.5 rounded-lg border text-xs focus:ring-1 focus:outline-hidden ${
                                      item.isAbsent
                                        ? 'bg-slate-100 text-rose-500 border-slate-300 dark:bg-slate-800'
                                        : subFailed
                                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-indigo-500'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAbsentToggle(student.id, sub.subjectName)}
                                    className={`p-1 rounded-md text-[10px] font-bold border transition ${
                                      item.isAbsent
                                        ? 'bg-rose-600 text-white border-rose-600'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-rose-500'
                                    }`}
                                    title="Toggle Absent"
                                  >
                                    A
                                  </button>
                                </div>
                              </td>
                            );
                          })}

                          {/* Computed Aggregates */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {totalObtained} / {totalMax}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {percentage.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-md text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {overallGrade}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {!anyFail ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                                Pass
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400">
                                Fail
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Save reminder */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Tip: Toggle &quot;A&quot; button to designate student as Absent. Click &quot;Save All Class Marks&quot; to compile student result cards.
                </span>
                <button
                  type="button"
                  onClick={handleSaveAllClassMarks}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                >
                  Save &amp; Generate Result Cards
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-VIEW 3: STUDENT RESULT CARDS DIRECTORY */}
      {/* ================================================================= */}
      {moduleTab === 'cards' && (
        <div className="space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModuleTab('marks')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs transition active:scale-95 cursor-pointer"
                title="Back to Classwise Marks Entry"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Marks Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setModuleTab('planner')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition cursor-pointer"
                title="Back to Exam Planner"
              >
                <span>Exam Timetable</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Official Academic Transcripts &amp; Student Result Cards</span>
            </div>
          </div>

          {/* Top Performance Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500">Evaluated Results</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                  {filteredResults.length}
                </span>
                <span className="text-xs text-slate-400">Cards Generated</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">Passed Students</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 font-mono">
                  {totalPassedCount}
                </span>
                <span className="text-xs text-emerald-600 font-medium">({passRate}%)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">Class Average</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-600 font-mono">
                  {avgPercentage}%
                </span>
                <span className="text-xs text-slate-400">Mean Score</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400">Top Position</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-500 font-mono">
                  {filteredResults.find(r => r.rank === 1)?.studentName?.split(' ')[0] || 'N/A'}
                </span>
                <span className="text-xs text-amber-500 font-bold">#1 Rank</span>
              </div>
            </div>
          </div>

          {/* Search and Filters Ribbon */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name or roll number..."
                value={cardsSearchQuery}
                onChange={e => setCardsSearchQuery(e.target.value)}
                className="w-full text-xs bg-transparent focus:outline-hidden"
              />
              {cardsSearchQuery && (
                <button onClick={() => setCardsSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-500">Exam:</span>
                <select
                  value={cardsExamFilter}
                  onChange={e => setCardsExamFilter(e.target.value)}
                  className="bg-transparent font-bold focus:outline-hidden"
                >
                  <option value="All">All Exams</option>
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500">Class:</span>
                <select
                  value={cardsClassFilter}
                  onChange={e => setCardsClassFilter(e.target.value)}
                  className="bg-transparent font-bold focus:outline-hidden"
                >
                  <option value="All">All Classes</option>
                  {settings.standardClasses?.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Result Cards Grid */}
          {filteredResults.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
              <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Result Cards Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Switch to &quot;Classwise Marks Entry&quot; tab to enter marks and generate official printable result cards.
              </p>
              <button
                type="button"
                onClick={() => setModuleTab('marks')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Go to Marks Entry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredResults.map(res => {
                const isPass = res.status === 'Pass';
                return (
                  <div
                    key={res.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-sm shrink-0">
                            {res.studentName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">
                              {res.studentName}
                            </h4>
                            <span className="text-xs text-slate-500 font-mono">
                              Roll #{res.studentRollNo} • {res.className} ({res.section})
                            </span>
                          </div>
                        </div>

                        {res.rank && res.rank <= 3 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Rank #{res.rank}
                          </span>
                        )}
                      </div>

                      {/* Exam Title Badge */}
                      <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 p-2 rounded-xl mb-3 line-clamp-1">
                        {res.examTitle}
                      </div>

                      {/* Marks Summary Box */}
                      <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 mb-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                            {res.totalObtainedMarks} / {res.totalMaxMarks}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Percentage</span>
                          <span className="font-black text-slate-900 dark:text-white font-mono">
                            {res.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Grade</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">
                            {res.overallGrade}
                          </span>
                        </div>
                      </div>

                      {/* Status Outcome */}
                      <div className="flex items-center justify-between text-xs mb-4">
                        <span className="text-slate-500">Result Status:</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          isPass
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveResultCard(res)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>View Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setHistoryStudentId(res.studentId);
                          setModuleTab('history');
                        }}
                        className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold transition active:scale-95 cursor-pointer"
                        title="View Grade Trends Chart (Recharts)"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Trends</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveResultCard(res);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                        title="Print Result Card"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* SUB-VIEW 4: STUDENT PERFORMANCE HISTORY & TRENDS (RECHARTS) */}
      {/* ================================================================= */}
      {moduleTab === 'history' && (
        <div className="space-y-6">
          <StudentPerformanceHistory
            students={students}
            exams={exams}
            examResults={examResults}
            settings={settings}
            selectedStudentId={historyStudentId}
            onSelectStudent={id => setHistoryStudentId(id)}
            onViewResultCard={res => setActiveResultCard(res)}
          />
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD / EDIT EXAM PLANNER (Classwise) */}
      {/* ================================================================= */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingExamId ? 'Edit Exam Schedule' : 'Create Classwise Exam Planner'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsExamModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm Examination 2026-2027"
                    value={examForm.title}
                    onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Class *
                  </label>
                  <select
                    value={examForm.className}
                    onChange={e => setExamForm({ ...examForm, className: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    {settings.standardClasses?.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session
                  </label>
                  <input
                    type="text"
                    value={examForm.academicYear}
                    onChange={e => setExamForm({ ...examForm, academicYear: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={examForm.startDate}
                    onChange={e => setExamForm({ ...examForm, startDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={examForm.endDate}
                    onChange={e => setExamForm({ ...examForm, endDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Stage / Status
                  </label>
                  <select
                    value={examForm.status}
                    onChange={e => setExamForm({ ...examForm, status: e.target.value as ExamStatus })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                    <option value="Published">Published</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Special Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bring scientific calculator, exam admit card required"
                    value={examForm.instructions}
                    onChange={e => setExamForm({ ...examForm, instructions: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Subject Schedule Builder */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Subjects &amp; Examination Timetable</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddSubjectToForm('')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Subject</span>
                  </button>
                </div>

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="text-[10px] text-slate-400 self-center">Quick Presets:</span>
                  {['Mathematics', 'English', 'General Science', 'Social Studies', 'Computer Science', 'Physics', 'Chemistry'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddSubjectToForm(preset)}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {examForm.subjects.map((sub, i) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                    >
                      <div className="sm:col-span-4">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Subject</span>
                        <input
                          type="text"
                          required
                          value={sub.subjectName}
                          onChange={e => {
                            const val = e.target.value;
                            setExamForm(prev => {
                              const copy = [...prev.subjects];
                              copy[i].subjectName = val;
                              return { ...prev, subjects: copy };
                            });
                          }}
                          placeholder="Subject Name"
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Date</span>
                        <input
                          type="date"
                          required
                          value={sub.examDate}
                          onChange={e => {
                            const val = e.target.value;
                            setExamForm(prev => {
                              const copy = [...prev.subjects];
                              copy[i].examDate = val;
                              return { ...prev, subjects: copy };
                            });
                          }}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Max Marks</span>
                        <input
                          type="number"
                          min={1}
                          required
                          value={sub.totalMarks}
                          onChange={e => {
                            const val = Number(e.target.value) || 100;
                            setExamForm(prev => {
                              const copy = [...prev.subjects];
                              copy[i].totalMarks = val;
                              return { ...prev, subjects: copy };
                            });
                          }}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Pass Marks</span>
                        <input
                          type="number"
                          min={1}
                          required
                          value={sub.passingMarks}
                          onChange={e => {
                            const val = Number(e.target.value) || 40;
                            setExamForm(prev => {
                              const copy = [...prev.subjects];
                              copy[i].passingMarks = val;
                              return { ...prev, subjects: copy };
                            });
                          }}
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubjectFromForm(sub.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                          title="Remove subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                >
                  {editingExamId ? 'Save Timetable' : 'Publish Exam Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Result Card Modal */}
      <ResultCardModal
        result={activeResultCard}
        settings={settings}
        onClose={() => setActiveResultCard(null)}
        onOpenHistory={studentId => {
          setHistoryStudentId(studentId);
          setModuleTab('history');
        }}
      />

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={!!examToDeleteId}
        title="Delete Examination Schedule"
        message="Are you sure you want to delete this examination planner? Any student marks and result cards linked to this exam will also be removed."
        confirmLabel="Delete Exam"
        isDestructive={true}
        onConfirm={handleDeleteExamConfirm}
        onCancel={() => setExamToDeleteId(null)}
      />
    </div>
  );
};
