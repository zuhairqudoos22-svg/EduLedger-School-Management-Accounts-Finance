import React, { useState, useMemo } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { calculateStudentGamification, calculateStaffGamification, STUDENT_BADGES, STAFF_BADGES } from '../../utils/gamification';
import { BackButton } from '../common/BackButton';
import {
  Trophy,
  Award,
  Medal,
  Crown,
  Sparkles,
  Zap,
  CalendarCheck,
  BookOpen,
  Receipt,
  Search,
  Filter,
  Users,
  GraduationCap,
  Star,
  Flame,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Coins,
  FileText,
  Clock,
  HelpCircle,
  X,
  Info,
} from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const {
    students,
    staff,
    studentAttendance,
    staffAttendance,
    examResults,
    feePayments,
    expenses,
    bookSales,
    settings,
    goBackTab,
    canGoBack,
    setSelectedStudentIdForDetail,
    setSelectedStaffIdForDetail,
    setActiveTab,
  } = useSchool();

  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'students' | 'staff' | 'badges'>('students');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showHowItWorksModal, setShowHowItWorksModal] = useState<boolean>(false);

  // Compute student profiles
  const studentProfiles = useMemo(() => {
    return calculateStudentGamification(
      students,
      studentAttendance,
      examResults,
      feePayments,
      bookSales
    );
  }, [students, studentAttendance, examResults, feePayments, bookSales]);

  // Compute staff profiles
  const staffProfiles = useMemo(() => {
    return calculateStaffGamification(
      staff,
      staffAttendance,
      feePayments,
      expenses
    );
  }, [staff, staffAttendance, feePayments, expenses]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return studentProfiles.filter(p => {
      const matchesClass = selectedClass === 'All' || p.className === selectedClass;
      const matchesSearch =
        searchQuery === '' ||
        p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesSearch;
    });
  }, [studentProfiles, selectedClass, searchQuery]);

  // Filtered Staff
  const filteredStaff = useMemo(() => {
    return staffProfiles.filter(p => {
      const matchesDept = selectedDept === 'All' || p.department === selectedDept;
      const matchesSearch =
        searchQuery === '' ||
        p.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.designation.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [staffProfiles, selectedDept, searchQuery]);

  // Available classes & departments for filters
  const standardClasses = settings.standardClasses || [];
  const departments = useMemo(() => {
    const set = new Set<string>();
    staff.forEach(s => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [staff]);

  // Top 3 Podium
  const topStudents = studentProfiles.slice(0, 3);
  const topStaff = staffProfiles.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header with BackButton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {canGoBack && <BackButton onClick={goBackTab} label="Back" variant="default" />}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-md shadow-amber-500/20">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Campus Gamification &amp; Leaderboards
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Recognizing academic excellence, punctual attendance, timely fee collections, and diligent record-keeping.
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHowItWorksModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs transition cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>How Points &amp; Badges Work</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 max-w-lg">
        <button
          type="button"
          onClick={() => {
            setActiveLeaderboardTab('students');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeLeaderboardTab === 'students'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Student Leaderboard</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono">
            {studentProfiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLeaderboardTab('staff');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeLeaderboardTab === 'staff'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Faculty &amp; Staff</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 font-mono">
            {staffProfiles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveLeaderboardTab('badges');
            setSearchQuery('');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeLeaderboardTab === 'badges'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Badge Gallery</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: STUDENT LEADERBOARD                                      */}
      {/* ============================================================== */}
      {activeLeaderboardTab === 'students' && (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          {topStudents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* 2nd Place (Silver) */}
              {topStudents[1] && (
                <div className="order-2 md:order-1 p-5 rounded-3xl bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black">
                    <span>🥈 2nd Place</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-lg border-2 border-slate-400">
                        {topStudents[1].photoUrl ? (
                          <img src={topStudents[1].photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          topStudents[1].studentName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                          {topStudents[1].studentName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {topStudents[1].className} • Roll #{topStudents[1].rollNo}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Score</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                          {topStudents[1].totalPoints} XP
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                        Level {topStudents[1].level}
                      </span>
                    </div>

                    {/* Badges preview */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {topStudents[1].badges.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          title={b.description}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                        >
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{b.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place (Gold Champion) */}
              {topStudents[0] && (
                <div className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-50 via-amber-100/40 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-400 dark:border-amber-600 shadow-xl shadow-amber-500/10 relative overflow-hidden flex flex-col justify-between transform md:-translate-y-2">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs font-black shadow-sm">
                    <Crown className="w-3.5 h-3.5" />
                    <span>🥇 Grand Champion</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-white text-xl shadow-md border-2 border-amber-300">
                          {topStudents[0].photoUrl ? (
                            <img src={topStudents[0].photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            topStudents[0].studentName.charAt(0)
                          )}
                        </div>
                        <div className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-400 text-amber-950 shadow-xs">
                          <Crown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                          #1 Campus Scholar
                        </span>
                        <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
                          {topStudents[0].studentName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {topStudents[0].className} • Roll #{topStudents[0].rollNo}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/60 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                          Total Campus XP
                        </span>
                        <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                          {topStudents[0].totalPoints} XP
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-black block">
                          Level {topStudents[0].level} Master
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                          {topStudents[0].streakDays} Day Streak 🔥
                        </span>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                        <span className="block text-[10px] text-indigo-500 font-normal">Attendance</span>
                        <span className="font-bold font-mono">+{topStudents[0].attendancePoints}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                        <span className="block text-[10px] text-purple-500 font-normal">Academics</span>
                        <span className="font-bold font-mono">+{topStudents[0].academicPoints}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                        <span className="block text-[10px] text-emerald-500 font-normal">Activities</span>
                        <span className="font-bold font-mono">+{topStudents[0].activityPoints}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place (Bronze) */}
              {topStudents[2] && (
                <div className="order-3 p-5 rounded-3xl bg-gradient-to-b from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-orange-200 dark:border-orange-950 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 text-xs font-black">
                    <span>🥉 3rd Place</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-200 dark:bg-orange-950 flex items-center justify-center font-black text-orange-800 dark:text-orange-300 text-lg border-2 border-orange-300">
                        {topStudents[2].photoUrl ? (
                          <img src={topStudents[2].photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          topStudents[2].studentName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                          {topStudents[2].studentName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {topStudents[2].className} • Roll #{topStudents[2].rollNo}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Score</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                          {topStudents[2].totalPoints} XP
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 text-xs font-bold">
                        Level {topStudents[2].level}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {topStudents[2].badges.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          title={b.description}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                        >
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>{b.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search & Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students by name or roll no..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <option value="All">All Grades &amp; Classes</option>
                  {standardClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing <strong>{filteredStudents.length}</strong> ranked students
            </span>
          </div>

          {/* Ranked Students List Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Student &amp; Class</th>
                    <th className="py-3 px-4 text-center">Level &amp; Streak</th>
                    <th className="py-3 px-4 text-right">Attendance Pts</th>
                    <th className="py-3 px-4 text-right">Academic Pts</th>
                    <th className="py-3 px-4 text-right">Activities</th>
                    <th className="py-3 px-4 text-right">Total XP</th>
                    <th className="py-3 px-4">Earned Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStudents.map((p, idx) => {
                    let rankBadge = (
                      <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto">
                        #{p.rank}
                      </span>
                    );
                    if (p.rank === 1) {
                      rankBadge = (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center mx-auto shadow-xs">
                          🥇
                        </span>
                      );
                    } else if (p.rank === 2) {
                      rankBadge = (
                        <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 font-black text-sm flex items-center justify-center mx-auto shadow-xs">
                          🥈
                        </span>
                      );
                    } else if (p.rank === 3) {
                      rankBadge = (
                        <span className="w-7 h-7 rounded-full bg-orange-300 text-orange-900 font-black text-sm flex items-center justify-center mx-auto shadow-xs">
                          🥉
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={p.studentId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {rankBadge}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                p.studentName.charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                {p.studentName}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {p.className} ({p.section}) • Roll #{p.rollNo}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            Lvl {p.level}
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold ml-1.5 inline-flex items-center">
                            <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {p.streakDays}d
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          +{p.attendancePoints}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-purple-600 dark:text-purple-400 font-bold">
                          +{p.academicPoints}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                          +{p.activityPoints}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                            {p.totalPoints}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">XP</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.badges.map((badge, bIdx) => (
                              <span
                                key={bIdx}
                                title={`${badge.name}: ${badge.description}`}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                              >
                                <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                <span>{badge.name}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: STAFF & FACULTY LEADERBOARD                              */}
      {/* ============================================================== */}
      {activeLeaderboardTab === 'staff' && (
        <div className="space-y-6">
          {/* Top 3 Staff Cards */}
          {topStaff.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* 2nd Place */}
              {topStaff[1] && (
                <div className="order-2 md:order-1 p-5 rounded-3xl bg-gradient-to-b from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black">
                    <span>🥈 2nd Place</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-slate-700 dark:text-slate-200 text-lg border-2 border-slate-400">
                        {topStaff[1].photoUrl ? (
                          <img src={topStaff[1].photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          topStaff[1].staffName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                          {topStaff[1].staffName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {topStaff[1].designation} • {topStaff[1].department}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Staff Score</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                          {topStaff[1].totalPoints} XP
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                        Level {topStaff[1].level}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {topStaff[1].badges.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          title={b.description}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                        >
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>{b.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place Staff Champion */}
              {topStaff[0] && (
                <div className="order-1 md:order-2 p-6 rounded-3xl bg-gradient-to-b from-amber-50 via-amber-100/40 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-400 dark:border-amber-600 shadow-xl shadow-amber-500/10 relative overflow-hidden flex flex-col justify-between transform md:-translate-y-2">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-white text-xs font-black shadow-sm">
                    <Crown className="w-3.5 h-3.5" />
                    <span>🥇 Staff of Excellence</span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center font-black text-white text-xl shadow-md border-2 border-amber-300">
                          {topStaff[0].photoUrl ? (
                            <img src={topStaff[0].photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            topStaff[0].staffName.charAt(0)
                          )}
                        </div>
                        <div className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-400 text-amber-950 shadow-xs">
                          <Crown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                          #1 Outstanding Contributor
                        </span>
                        <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight">
                          {topStaff[0].staffName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">
                          {topStaff[0].designation} • {topStaff[0].department}
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/60 shadow-xs flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                          Total Administrative Points
                        </span>
                        <span className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono">
                          {topStaff[0].totalPoints} XP
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-xs font-black block">
                          Level {topStaff[0].level} Master
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                          {topStaff[0].streakDays} Day Punctual 🔥
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                        <span className="block text-[10px] text-emerald-500 font-normal">Fee Collections</span>
                        <span className="font-bold font-mono">+{topStaff[0].collectionPoints}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                        <span className="block text-[10px] text-indigo-500 font-normal">Record Keeping</span>
                        <span className="font-bold font-mono">+{topStaff[0].recordKeepingPoints}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold">
                        <span className="block text-[10px] text-blue-500 font-normal">Attendance</span>
                        <span className="font-bold font-mono">+{topStaff[0].attendancePoints}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {topStaff[2] && (
                <div className="order-3 p-5 rounded-3xl bg-gradient-to-b from-orange-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-orange-200 dark:border-orange-950 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 text-xs font-black">
                    <span>🥉 3rd Place</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-200 dark:bg-orange-950 flex items-center justify-center font-black text-orange-800 dark:text-orange-300 text-lg border-2 border-orange-300">
                        {topStaff[2].photoUrl ? (
                          <img src={topStaff[2].photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          topStaff[2].staffName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight">
                          {topStaff[2].staffName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {topStaff[2].designation} • {topStaff[2].department}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Score</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                          {topStaff[2].totalPoints} XP
                        </span>
                      </div>
                      <span className="px-2 py-1 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 text-xs font-bold">
                        Level {topStaff[2].level}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {topStaff[2].badges.slice(0, 3).map((b, i) => (
                        <span
                          key={i}
                          title={b.description}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                        >
                          <Award className="w-3 h-3 text-amber-500" />
                          <span>{b.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Department Filter & Search */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search faculty and staff..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold"
                >
                  <option value="All">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing <strong>{filteredStaff.length}</strong> staff members
            </span>
          </div>

          {/* Staff Leaderboard Table */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department &amp; Role</th>
                    <th className="py-3 px-4 text-center">Level</th>
                    <th className="py-3 px-4 text-right">Fee Collections</th>
                    <th className="py-3 px-4 text-right">Records &amp; Audit</th>
                    <th className="py-3 px-4 text-right">Attendance</th>
                    <th className="py-3 px-4 text-right">Total XP</th>
                    <th className="py-3 px-4">Honor Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStaff.map((p) => {
                    let rankBadge = (
                      <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center mx-auto">
                        #{p.rank}
                      </span>
                    );
                    if (p.rank === 1) rankBadge = <span className="text-base">🥇</span>;
                    else if (p.rank === 2) rankBadge = <span className="text-base">🥈</span>;
                    else if (p.rank === 3) rankBadge = <span className="text-base">🥉</span>;

                    return (
                      <tr
                        key={p.staffId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {rankBadge}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                p.staffName.charAt(0)
                              )}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                                {p.staffName}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                ID: {p.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block">
                            {p.designation}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {p.department}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                            Lvl {p.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          +{p.collectionPoints}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                          +{p.recordKeepingPoints}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                          +{p.attendancePoints}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-black text-sm text-slate-900 dark:text-white font-mono">
                            {p.totalPoints}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">XP</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.badges.map((badge, bIdx) => (
                              <span
                                key={bIdx}
                                title={`${badge.name}: ${badge.description}`}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                              >
                                <Award className="w-2.5 h-2.5 text-amber-500" />
                                <span>{badge.name}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BADGE GALLERY & CRITERIA                                 */}
      {/* ============================================================== */}
      {activeLeaderboardTab === 'badges' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>Campus Achievement Badges Catalogue</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Badges are automatically awarded by the system when verifiable milestones are logged in attendance, examinations, fee collection receipts, and audit activities.
            </p>
          </div>

          <div>
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>Student Achievement Badges</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(STUDENT_BADGES).map(badge => (
                <div
                  key={badge.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {badge.badgeLevel} Tier
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                      {badge.name}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Category: {badge.category}</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">+50 to +150 XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>Faculty &amp; Staff Administrative Badges</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(STAFF_BADGES).map(badge => (
                <div
                  key={badge.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                      <Award className="w-5 h-5 text-amber-500" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {badge.badgeLevel} Tier
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                      {badge.name}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Category: {badge.category}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">+75 to +200 XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: How Points & Badges Work */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <BackButton onClick={() => setShowHowItWorksModal(false)} label="Back" variant="modal" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  How Gamification &amp; Points Work
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 space-y-2">
                <h4 className="font-black flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Student Points &amp; Leveling</span>
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>+15 XP</strong> per present school day in the attendance roll.</li>
                  <li><strong>+50 XP bonus</strong> for a 5+ consecutive day attendance streak.</li>
                  <li><strong>+120 XP</strong> for achieving Grade A+ in terminal examinations.</li>
                  <li><strong>+150 XP bonus</strong> for securing 1st rank in class exams.</li>
                  <li><strong>+35 XP</strong> for reading or purchasing curriculum books from the campus bookshop.</li>
                  <li><strong>Leveling Up:</strong> Every 180 XP elevates the student to the next Scholar Level.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                <h4 className="font-black flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Faculty &amp; Staff Administrative Points</span>
                </h4>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li><strong>+35 XP</strong> per student fee payment recorded &amp; issued with official receipt.</li>
                  <li><strong>+25 XP</strong> for accurate operational expenditure logging with audit reference number.</li>
                  <li><strong>+25 XP</strong> per on-time staff attendance day.</li>
                  <li><strong>+100 XP Master Bursar Bonus</strong> for clearing delinquent student balances.</li>
                  <li><strong>Leveling Up:</strong> Every 220 XP awards the staff member a higher faculty achievement tier.</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHowItWorksModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
