import React from 'react';
import { useSchool } from '../../context/SchoolContext';
import { calculateStudentGamification, calculateStaffGamification } from '../../utils/gamification';
import {
  Trophy,
  Crown,
  Medal,
  Sparkles,
  Flame,
  Award,
  ArrowRight,
  GraduationCap,
  Users,
  ChevronRight,
  Star,
} from 'lucide-react';

interface GamificationWidgetProps {
  onOpenLeaderboard: () => void;
}

export const GamificationWidget: React.FC<GamificationWidgetProps> = ({ onOpenLeaderboard }) => {
  const {
    students,
    staff,
    studentAttendance,
    staffAttendance,
    examResults,
    feePayments,
    expenses,
    bookSales,
    setActiveTab,
  } = useSchool();

  const studentProfiles = React.useMemo(() => {
    return calculateStudentGamification(
      students,
      studentAttendance,
      examResults,
      feePayments,
      bookSales
    );
  }, [students, studentAttendance, examResults, feePayments, bookSales]);

  const staffProfiles = React.useMemo(() => {
    return calculateStaffGamification(
      staff,
      staffAttendance,
      feePayments,
      expenses
    );
  }, [staff, staffAttendance, feePayments, expenses]);

  const topStudent = studentProfiles[0];
  const topStaff = staffProfiles[0];

  const totalPointsAwarded = React.useMemo(() => {
    const sPoints = studentProfiles.reduce((acc, p) => acc + p.totalPoints, 0);
    const fPoints = staffProfiles.reduce((acc, p) => acc + p.totalPoints, 0);
    return sPoints + fPoints;
  }, [studentProfiles, staffProfiles]);

  const totalBadgesUnlocked = React.useMemo(() => {
    const sBadges = studentProfiles.reduce((acc, p) => acc + p.badges.length, 0);
    const fBadges = staffProfiles.reduce((acc, p) => acc + p.badges.length, 0);
    return sBadges + fBadges;
  }, [studentProfiles, staffProfiles]);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 shadow-xl border border-indigo-800/40 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-indigo-800/60 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-400 text-amber-950 font-black text-xs flex items-center gap-1 shadow-sm">
              <Trophy className="w-3.5 h-3.5" />
              <span>Campus Gamification</span>
            </span>
            <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Live Monthly Honor Roll</span>
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight mt-1 text-white">
            Academic &amp; Administrative Leaderboard
          </h3>
          <p className="text-xs text-indigo-200 mt-0.5">
            Punctual attendance, high exam percentiles, timely fee collections, and meticulous bookkeeping earn points and rank badges.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLeaderboard}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer shrink-0"
        >
          <span>View Full Leaderboards &amp; Badges</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content Grid: Top Student & Top Staff Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5 relative z-10">
        {/* Top Student Card */}
        {topStudent ? (
          <div
            onClick={onOpenLeaderboard}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>#1 Ranked Student</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {topStudent.totalPoints} XP
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md border border-indigo-400/40 shrink-0">
                  {topStudent.photoUrl ? (
                    <img src={topStudent.photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    topStudent.studentName.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="font-black text-white text-base leading-tight group-hover:text-amber-300 transition">
                    {topStudent.studentName}
                  </h4>
                  <p className="text-xs text-indigo-200 font-mono">
                    {topStudent.className} ({topStudent.section}) • Roll #{topStudent.rollNo}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {topStudent.badges.slice(0, 2).map((b, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-400/10 text-amber-200 border border-amber-400/20 flex items-center gap-1"
                  >
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-indigo-300 group-hover:text-white flex items-center gap-1">
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : null}

        {/* Top Staff Card */}
        {topStaff ? (
          <div
            onClick={onOpenLeaderboard}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  <span>#1 Staff Contributor</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  {topStaff.totalPoints} XP
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-md border border-emerald-400/40 shrink-0">
                  {topStaff.photoUrl ? (
                    <img src={topStaff.photoUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    topStaff.staffName.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="font-black text-white text-base leading-tight group-hover:text-emerald-300 transition">
                    {topStaff.staffName}
                  </h4>
                  <p className="text-xs text-indigo-200 font-mono">
                    {topStaff.designation} • {topStaff.department}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {topStaff.badges.slice(0, 2).map((b, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-400/10 text-emerald-200 border border-emerald-400/20 flex items-center gap-1"
                  >
                    <Award className="w-2.5 h-2.5 text-emerald-400" />
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold text-indigo-300 group-hover:text-white flex items-center gap-1">
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer Metrics Row */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-indigo-300 relative z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span><strong>{totalPointsAwarded.toLocaleString()}</strong> Total XP Earned</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Medal className="w-3.5 h-3.5 text-indigo-400" />
            <span><strong>{totalBadgesUnlocked}</strong> Honor Badges Unlocked</span>
          </span>
        </div>

        <span className="text-[11px] text-indigo-300">
          Updated in real-time as attendance &amp; financial activities are recorded
        </span>
      </div>
    </div>
  );
};
