import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import {
  GraduationCap,
  CalendarCheck,
  UserCheck,
  UserX,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  Phone,
  Search,
  Check,
  ArrowRight,
  TrendingUp,
  Award,
  CalendarDays,
} from 'lucide-react';
import {
  formatDate,
  getTodayDateString,
} from '../../utils/formatters';
import { Student, TimetableSlot, StudentAttendanceRecord } from '../../types';

export const TeacherDashboardWidgets: React.FC = () => {
  const {
    students,
    studentAttendance,
    saveStudentAttendance,
    exams,
    examResults,
    settings,
    setActiveTab,
  } = useSchool();

  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [truancySearch, setTruancySearch] = useState<string>('');
  const [excuseModalStudent, setExcuseModalStudent] = useState<Student | null>(null);
  const [excuseLeaveType, setExcuseLeaveType] = useState<'sick' | 'casual' | 'approved'>('sick');
  const [excuseRemarks, setExcuseRemarks] = useState('');
  const [isExcusing, setIsExcusing] = useState(false);
  const [excuseNotice, setExcuseNotice] = useState<string | null>(null);

  const today = getTodayDateString();
  const standardClasses = settings.standardClasses || ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];

  // 1. Read Timetable Slots for Schedule Widget
  const timetableSlots = useMemo<TimetableSlot[]>(() => {
    try {
      const raw = localStorage.getItem('eduledger_timetable_slots');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return [];
  }, []);

  const todayDayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
    const now = new Date();
    return days[now.getDay()];
  }, []);

  // Today's schedule slots sorted by start time
  const todaySchedule = useMemo(() => {
    return timetableSlots
      .filter(s => s.day === todayDayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timetableSlots, todayDayName]);

  // 2. Today's Student Attendance Metrics
  const activeStudents = useMemo(() => students.filter(s => s.status === 'active'), [students]);
  const totalStudentsCount = activeStudents.length;

  const todayAttendanceRecords = useMemo(() => {
    return studentAttendance.filter(a => a.date === today);
  }, [studentAttendance, today]);

  const attendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;

    for (const rec of todayAttendanceRecords) {
      if (rec.status === 'present') present++;
      else if (rec.status === 'absent') absent++;
      else if (rec.status === 'leave') leave++;
    }

    const recordedTotal = todayAttendanceRecords.length;
    const unrecorded = Math.max(0, totalStudentsCount - recordedTotal);
    const turnoutRate = totalStudentsCount > 0 ? Math.round((present / totalStudentsCount) * 100) : 0;

    return {
      present,
      absent,
      leave,
      recordedTotal,
      unrecorded,
      turnoutRate,
    };
  }, [todayAttendanceRecords, totalStudentsCount]);

  // 3. Class-by-Class Roll-Call Status
  const classTurnoutList = useMemo(() => {
    return standardClasses.map(className => {
      const classStudents = activeStudents.filter(s => s.className === className);
      const studentIds = new Set(classStudents.map(s => s.id));

      const classRecords = todayAttendanceRecords.filter(r => studentIds.has(r.studentId));
      const present = classRecords.filter(r => r.status === 'present').length;
      const absent = classRecords.filter(r => r.status === 'absent').length;
      const leave = classRecords.filter(r => r.status === 'leave').length;

      const total = classStudents.length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      const isMarked = classRecords.length >= total && total > 0;

      return {
        className,
        total,
        present,
        absent,
        leave,
        rate,
        isMarked,
        unmarkedCount: Math.max(0, total - classRecords.length),
      };
    });
  }, [standardClasses, activeStudents, todayAttendanceRecords]);

  // 4. Highlighted Truancy & Absentees
  const absentStudentsList = useMemo(() => {
    const absentIds = new Set(
      todayAttendanceRecords.filter(r => r.status === 'absent').map(r => r.studentId)
    );

    return activeStudents
      .filter(s => absentIds.has(s.id))
      .map(student => {
        // Count consecutive missed days
        const records = studentAttendance
          .filter(a => a.studentId === student.id)
          .sort((a, b) => b.date.localeCompare(a.date));

        let consecutive = 0;
        for (const r of records) {
          if (r.status === 'absent') consecutive++;
          else break;
        }

        const isMultiDay = consecutive >= 2;

        return {
          student,
          consecutive,
          isMultiDay,
          remarks: records[0]?.remarks || 'No leave note submitted',
        };
      });
  }, [activeStudents, todayAttendanceRecords, studentAttendance]);

  const filteredAbsentees = useMemo(() => {
    return absentStudentsList.filter(({ student }) => {
      if (selectedClassFilter !== 'all' && student.className !== selectedClassFilter) return false;
      if (truancySearch.trim()) {
        const q = truancySearch.toLowerCase();
        return (
          student.fullName.toLowerCase().includes(q) ||
          student.rollNo.toLowerCase().includes(q) ||
          (student.guardianName && student.guardianName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [absentStudentsList, selectedClassFilter, truancySearch]);

  // 5. 7-Day Student Attendance Trend
  const weeklyAttendanceTrend = useMemo(() => {
    const days: { displayDate: string; studentRate: number; benchmark: number }[] = [];
    const todayDate = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayRecords = studentAttendance.filter(a => a.date === iso);
      const present = dayRecords.filter(a => a.status === 'present').length;
      const rate = totalStudentsCount > 0 ? Math.round((present / totalStudentsCount) * 100) : 0;

      days.push({
        displayDate: dayLabel,
        studentRate: Math.min(100, Math.max(0, rate)),
        benchmark: 85,
      });
    }
    return days;
  }, [studentAttendance, totalStudentsCount]);

  // 6. Recent Exams & Grade Submissions Summary
  const recentExamsSummary = useMemo(() => {
    return (exams || []).slice(0, 4).map(exam => {
      const resultsForExam = (examResults || []).filter(r => r.examId === exam.id);
      const totalStudentsAppeared = resultsForExam.length;
      const averageScore = totalStudentsAppeared > 0
        ? Math.round(
            resultsForExam.reduce((sum, r) => sum + (r.totalMaxMarks > 0 ? (r.totalObtainedMarks / r.totalMaxMarks) * 100 : 0), 0) /
              totalStudentsAppeared
          )
        : 0;

      const subjectName = exam.subjects && exam.subjects[0] ? exam.subjects[0].subjectName : 'All Subjects';

      return {
        id: exam.id,
        title: exam.title,
        subject: subjectName,
        className: exam.className,
        date: exam.startDate,
        totalStudentsAppeared,
        averageScore,
      };
    });
  }, [exams, examResults]);

  // Handle Excusing an absence
  const handleExcuseStudent = async () => {
    if (!excuseModalStudent) return;
    setIsExcusing(true);
    try {
      const existing = studentAttendance.find(
        a => a.studentId === excuseModalStudent.id && a.date === today
      );

      const updatedRecord: StudentAttendanceRecord = {
        id: existing?.id || `att_excuse_${Date.now()}`,
        studentId: excuseModalStudent.id,
        studentName: excuseModalStudent.fullName,
        className: excuseModalStudent.className,
        section: excuseModalStudent.section,
        date: today,
        status: 'leave',
        remarks: `Excused (${excuseLeaveType.toUpperCase()} LEAVE): ${excuseRemarks.trim() || 'Approved by Faculty'}`,
      };

      await saveStudentAttendance([updatedRecord]);

      setExcuseNotice(`Excused attendance record updated for ${excuseModalStudent.fullName}.`);
      setExcuseModalStudent(null);
      setExcuseRemarks('');
      setTimeout(() => setExcuseNotice(null), 4000);
    } catch {
      // Error
    } finally {
      setIsExcusing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Teacher Notice / Context Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Teacher &amp; Academic Faculty Persona
              </span>
              <span className="text-xs text-indigo-200">{todayDayName}, {formatDate(today)}</span>
            </div>
            <h3 className="text-base font-black tracking-tight mt-0.5">
              Classroom Attendance, Truancy Alerts &amp; Academic Schedule
            </h3>
            <p className="text-xs text-indigo-200/80">
              Focuses strictly on student turnout, roll-call verification, daily teaching timetable, and student performance.
            </p>
          </div>
        </div>

        {/* Quick Academic Actions */}
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
          <button
            onClick={() => setActiveTab('student-attendance')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>Mark Roll-Call</span>
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Class Timetable</span>
          </button>
          <button
            onClick={() => setActiveTab('exams')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition active:scale-95 cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Enter Marks</span>
          </button>
        </div>
      </div>

      {excuseNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{excuseNotice}</span>
        </div>
      )}

      {/* Row 1: Academic & Attendance KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Student Attendance Rate */}
        <div
          onClick={() => setActiveTab('student-attendance')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Student Attendance Today
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {attendanceStats.turnoutRate}%
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {attendanceStats.present} Present
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, attendanceStats.turnoutRate)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>{totalStudentsCount} enrolled students</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Open Roll-Call →</span>
          </p>
        </div>

        {/* Card 2: Unexcused Absences Today */}
        <div
          onClick={() => setActiveTab('student-attendance')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-300 dark:hover:border-rose-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Absences Today
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {attendanceStats.absent}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Students Out
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {attendanceStats.leave} students on pre-approved leave
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center justify-between">
            <span>Requires Calling</span>
            <span>Check Roster →</span>
          </div>
        </div>

        {/* Card 3: Multi-Day Truancy Alerts */}
        <div
          onClick={() => setActiveTab('student-attendance')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Multi-Day Truancy
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {absentStudentsList.filter(a => a.isMultiDay).length}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              2+ Days Absent
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Students missing consecutive school days
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between">
            <span>Academic Alert</span>
            <span>Follow Up →</span>
          </div>
        </div>

        {/* Card 4: Today's Assigned Periods */}
        <div
          onClick={() => setActiveTab('timetable')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Teaching Schedule Today
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {todaySchedule.length || 6}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Scheduled Periods
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 line-clamp-1">
            {todaySchedule[0] ? `Next: ${todaySchedule[0].subject} (${todaySchedule[0].startTime})` : 'Full curriculum periods active'}
          </p>
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center justify-between">
            <span>Weekly Roster</span>
            <span>View Timetable →</span>
          </div>
        </div>
      </div>

      {/* Row 2: Today's Classroom Turnout Roll-Call Cards & 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Class-by-Class Attendance Status (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                <span>Classroom Roll-Call Verification Today</span>
              </h4>
              <p className="text-xs text-slate-500">Live attendance status across all standard classes</p>
            </div>
            <button
              onClick={() => setActiveTab('student-attendance')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Take Attendance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {classTurnoutList.map(cls => (
              <div
                key={cls.className}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between space-y-2 hover:border-slate-300 dark:hover:border-slate-600 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {cls.className.replace(/Grade|Class/i, '').trim().slice(0, 2) || 'C'}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {cls.className}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cls.total} Enrolled
                      </span>
                    </div>
                  </div>
                  {cls.isMarked ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Marked
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Pending
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] font-mono text-slate-500">
                    <strong className="text-emerald-600 dark:text-emerald-400">{cls.present}</strong> Present • <strong className="text-rose-600 dark:text-rose-400">{cls.absent}</strong> Absent
                  </span>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    {cls.rate}%
                  </span>
                </div>

                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${cls.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Student Attendance Trend (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Student Turnout Trend (7 Days)</span>
              </h4>
              <p className="text-xs text-slate-500">Daily attendance percentage vs 85% target</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Goal: 85%
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyAttendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="teacherStudentColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="displayDate"
                  tickLine={false}
                  axisLine={{ stroke: '#94a3b8', strokeWidth: 0.5 }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  domain={[50, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={val => `${val}%`}
                />
                <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1">
                          <p className="font-bold text-slate-200">{data.displayDate}</p>
                          <p className="text-indigo-400 font-bold text-sm">
                            Turnout: {data.studentRate}%
                          </p>
                          <p className="text-[11px] text-emerald-400">Target Benchmark: 85%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="studentRate"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#teacherStudentColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Institutional Benchmark: 85%</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              Today: {attendanceStats.turnoutRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Today's Teaching Schedule & Recent Exam Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Teaching Schedule (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Today&apos;s Class Schedule ({todayDayName})</span>
              </h4>
              <p className="text-xs text-slate-500">Periods, subjects &amp; assigned classrooms</p>
            </div>
            <button
              onClick={() => setActiveTab('timetable')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Full Grid</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySchedule.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 space-y-1">
              <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Standard Timetable Active</p>
              <p className="text-[11px]">Click &quot;Full Grid&quot; to inspect class timetable roster.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {todaySchedule.map((slot, idx) => (
                <div
                  key={slot.id || idx}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                      P{slot.periodNumber}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {slot.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {slot.startTime} - {slot.endTime} • {slot.room || 'Main Hall'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    {slot.periodLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Exams & Marks Summary (6 cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Recent Class Assessments &amp; Exams</span>
              </h4>
              <p className="text-xs text-slate-500">Student performance &amp; grade distribution</p>
            </div>
            <button
              onClick={() => setActiveTab('exams')}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Exams Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentExamsSummary.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 space-y-1">
              <Award className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No Assessment Records Yet</p>
              <p className="text-[11px]">Click &quot;Exams Hub&quot; to record class tests and term examinations.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentExamsSummary.map(ex => (
                <div
                  key={ex.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {ex.title} ({ex.className})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {ex.subject} • {ex.totalStudentsAppeared} student(s) submitted
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                      {ex.averageScore}% Avg
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(ex.date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Absentee Student Follow-up & Truancy Console */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-600" />
              <span>Unexcused Student Absences &amp; Truancy Console ({filteredAbsentees.length})</span>
            </h4>
            <p className="text-xs text-slate-500">
              Students flagged absent today — check guardian contact numbers or record approved leave
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student or roll..."
                value={truancySearch}
                onChange={e => setTruancySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Classes</option>
              {standardClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredAbsentees.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300">All Students Accounted For</p>
            <p className="text-[11px]">No unexcused absentees in the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-3">Student &amp; Roll No</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3">Guardian Contact</th>
                  <th className="py-2.5 px-3">Truancy Status</th>
                  <th className="py-2.5 px-3">Remarks / Reason</th>
                  <th className="py-2.5 px-3 text-right">Faculty Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredAbsentees.slice(0, 8).map(({ student, consecutive, isMultiDay, remarks }) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {student.fullName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Roll: {student.rollNo}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">
                      {student.className} - {student.section}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="block text-slate-800 dark:text-slate-200">{student.guardianName}</span>
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {student.contactNumber || 'No phone'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isMultiDay ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400">
                          {consecutive} Days Absent
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                          Absent Today
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                      {remarks}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {student.contactNumber && (
                          <a
                            href={`tel:${student.contactNumber}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition"
                            title="Call Guardian"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => setExcuseModalStudent(student)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                        >
                          Excuse Leave
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Excuse Modal */}
      {excuseModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              Excuse Absence for {excuseModalStudent.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Class {excuseModalStudent.className} - {excuseModalStudent.section} (Roll: {excuseModalStudent.rollNo})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Type
                </label>
                <select
                  value={excuseLeaveType}
                  onChange={e => setExcuseLeaveType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                >
                  <option value="sick">Medical / Sick Leave</option>
                  <option value="casual">Casual / Family Leave</option>
                  <option value="approved">Official Institutional Duty / Activity</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Remarks
                </label>
                <textarea
                  rows={2}
                  value={excuseRemarks}
                  onChange={e => setExcuseRemarks(e.target.value)}
                  placeholder="e.g. Guardian called with doctor's prescription..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isExcusing}
                onClick={() => setExcuseModalStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExcusing}
                onClick={handleExcuseStudent}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                {isExcusing ? 'Saving...' : 'Confirm Excused Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
