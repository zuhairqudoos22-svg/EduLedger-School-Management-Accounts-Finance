import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
} from 'recharts';
import { QRScannerModal } from '../common/QRScannerModal';
import { GamificationWidget } from './GamificationWidget';
import { MonthlyRevenueExpensesWidget } from './MonthlyRevenueExpensesWidget';
import { FiscalYearFeeVsExpensesWidget } from './FiscalYearFeeVsExpensesWidget';
import { DashboardSummaryWidget } from './DashboardSummaryWidget';
import { QuickInsightsWidget } from './QuickInsightsWidget';
import { LeaderboardModal } from '../gamification/LeaderboardModal';
import { getAttendanceTrendSeries, getExpenseDistribution } from '../../utils/dashboardMetricsSelector';
import { QuickActionsHub } from './QuickActionsHub';
import { AccountantDashboardWidgets } from './AccountantDashboardWidgets';
import { TeacherDashboardWidgets } from './TeacherDashboardWidgets';
import { HRManagerDashboardWidgets } from './HRManagerDashboardWidgets';
import { RecentFeePaymentsWidget } from './RecentFeePaymentsWidget';
import { SortableWidgetWrapper } from './SortableWidgetWrapper';
import { useNotifications } from '../../context/NotificationContext';
import {
  DashboardWidgetId,
  DashboardLayoutState,
  DASHBOARD_WIDGET_META,
  loadDashboardLayout,
  saveDashboardLayout,
  resetDashboardLayout,
  reorderWidgets,
  isCustomLayout,
} from '../../utils/dashboardLayout';
import {
  GraduationCap,
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Receipt,
  UserCheck,
  UserPlus,
  BarChart2,
  Calendar,
  Phone,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  FileText,
  Wallet,
  Award,
  BellRing,
  AlertCircle,
  Briefcase,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  QrCode,
  Scan,
  PieChart as PieChartIcon,
  Activity,
  ArrowRight,
  CalendarCheck,
  Trophy,
  UserX,
  CalendarX,
  PhoneCall,
  ShieldAlert,
  MessageSquare,
  Plus,
  ChevronRight,
  TrendingDown,
  CalendarDays,
  ShoppingBag,
  HardDrive,
  LayoutGrid,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  Check,
  Pin,
} from 'lucide-react';
import { formatCurrency, formatDate, getTodayDateString, getCurrentMonthName } from '../../utils/formatters';
import { AttendanceStatus, Student, Staff, StudentAttendanceRecord, StaffAttendanceRecord } from '../../types';

export interface FlaggedAbsenteeItem {
  id: string;
  type: 'student' | 'staff';
  entityId: string;
  name: string;
  codeOrRoll: string;
  meta: string;
  gender?: string;
  latestDate: string;
  status: AttendanceStatus;
  isAbsentWithoutLeave: boolean;
  isMultiDayAbsent: boolean;
  consecutiveAbsentDays: number;
  datesMissed: string[];
  remarks: string;
  contactName?: string;
  contactRelation?: string;
  contactPhone?: string;
  contactEmail?: string;
  studentObj?: Student;
  staffObj?: Staff;
  latestRecordId?: string;
}

export const DashboardView: React.FC = () => {
  const {
    students,
    staff,
    studentAttendance,
    staffAttendance,
    saveStudentAttendance,
    saveStaffAttendance,
    feePayments,
    expenses,
    settings,
    setActiveTab,
    setSelectedStudentIdForDetail,
    setSelectedStaffIdForDetail,
    getDefaultersList,
    getMonthlyStats,
  } = useSchool();
  const { currentUser, role, isAdmin, isFinance } = useAuth();
  const { t } = useTranslation();
  const { notify } = useNotifications();

  // Determine default role view based on authenticated user's role
  const defaultRoleView: 'executive' | 'accountant' | 'teacher' | 'hr_manager' = useMemo(() => {
    if (role === 'accountant' || role === 'finance') return 'accountant';
    if (role === 'teacher') return 'teacher';
    if (role === 'hr_manager') return 'hr_manager';
    return 'executive';
  }, [role]);

  const [activeRoleView, setActiveRoleView] = useState<'executive' | 'accountant' | 'teacher' | 'hr_manager'>(defaultRoleView);

  // Synchronize when active session role changes
  useEffect(() => {
    setActiveRoleView(defaultRoleView);
  }, [defaultRoleView]);

  // Drag-and-Drop Dashboard Widget Layout State (persisted per user)
  const [widgetLayout, setWidgetLayout] = useState<DashboardLayoutState>(() =>
    loadDashboardLayout(currentUser?.id)
  );
  const [isCustomizeMode, setIsCustomizeMode] = useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<DashboardWidgetId | null>(null);

  useEffect(() => {
    setWidgetLayout(loadDashboardLayout(currentUser?.id));
    setIsCustomizeMode(false);
  }, [currentUser?.id]);

  const updateWidgetLayout = (updater: (prev: DashboardLayoutState) => DashboardLayoutState) => {
    setWidgetLayout(prev => {
      const next = updater(prev);
      saveDashboardLayout(next, currentUser?.id);
      return next;
    });
  };

  const visibleWidgetOrder = useMemo(
    () => widgetLayout.order.filter(id => !widgetLayout.hidden.includes(id)),
    [widgetLayout]
  );

  const hasCustomWidgetLayout = useMemo(() => isCustomLayout(widgetLayout), [widgetLayout]);

  const handleWidgetDragStart = (id: DashboardWidgetId) => {
    setDraggedWidgetId(id);
  };

  const handleWidgetDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: DashboardWidgetId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidgetId !== targetId) {
      setDragOverWidgetId(targetId);
    }
  };

  const handleWidgetDrop = (e: React.DragEvent<HTMLDivElement>, targetId: DashboardWidgetId) => {
    e.preventDefault();
    const transferId = e.dataTransfer.getData('text/plain') as DashboardWidgetId | '';
    const sourceId = draggedWidgetId || (transferId && transferId in DASHBOARD_WIDGET_META ? transferId : null);

    if (sourceId && sourceId !== targetId) {
      updateWidgetLayout(prev => ({
        ...prev,
        order: reorderWidgets(prev.order, sourceId, targetId),
      }));
    }
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleMoveWidgetUp = (id: DashboardWidgetId) => {
    const visibleIdx = visibleWidgetOrder.indexOf(id);
    if (visibleIdx <= 0) return;
    const prevVisibleId = visibleWidgetOrder[visibleIdx - 1];
    updateWidgetLayout(prev => ({
      ...prev,
      order: reorderWidgets(prev.order, id, prevVisibleId),
    }));
  };

  const handleMoveWidgetDown = (id: DashboardWidgetId) => {
    const visibleIdx = visibleWidgetOrder.indexOf(id);
    if (visibleIdx === -1 || visibleIdx >= visibleWidgetOrder.length - 1) return;
    const nextVisibleId = visibleWidgetOrder[visibleIdx + 1];
    updateWidgetLayout(prev => {
      const nextOrder = [...prev.order];
      const fromIdx = nextOrder.indexOf(id);
      const toIdx = nextOrder.indexOf(nextVisibleId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, moved);
      return { ...prev, order: nextOrder };
    });
  };

  const handlePinWidgetToTop = (id: DashboardWidgetId) => {
    updateWidgetLayout(prev => ({
      ...prev,
      hidden: prev.hidden.filter(h => h !== id),
      order: [id, ...prev.order.filter(item => item !== id)],
    }));
    notify({
      category: 'system',
      priority: 'low',
      title: 'Dashboard Prioritized',
      message: `"${DASHBOARD_WIDGET_META[id].title}" moved to the top of your dashboard.`,
      autoDismissMs: 3000,
    });
  };

  const handleHideWidget = (id: DashboardWidgetId) => {
    if (visibleWidgetOrder.length <= 1) {
      notify({
        category: 'system',
        priority: 'normal',
        title: 'Minimum Widget Required',
        message: 'Keep at least one widget visible on the dashboard.',
        autoDismissMs: 3500,
      });
      return;
    }
    updateWidgetLayout(prev => ({
      ...prev,
      hidden: prev.hidden.includes(id) ? prev.hidden : [...prev.hidden, id],
    }));
  };

  const handleShowWidget = (id: DashboardWidgetId) => {
    updateWidgetLayout(prev => ({
      ...prev,
      hidden: prev.hidden.filter(h => h !== id),
    }));
  };

  const handleResetWidgetLayout = () => {
    const defaults = resetDashboardLayout(currentUser?.id);
    setWidgetLayout(defaults);
    notify({
      category: 'system',
      priority: 'low',
      title: 'Dashboard Layout Restored',
      message: 'Widget order and visibility have been reset to default.',
      autoDismissMs: 3000,
    });
  };

  const today = getTodayDateString();
  const monthlyStats = getMonthlyStats();
  const defaulters = getDefaultersList();

  // Low Balance & Past Due Alert states
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'student' | 'staff'>('all');
  const [alertSearch, setAlertSearch] = useState('');
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);
  const [tableTab, setTableTab] = useState<'students' | 'staff'>('students');

  // Attendance & Truancy Alert states
  const [attendanceAlertFilter, setAttendanceAlertFilter] = useState<'all' | 'unexcused' | 'multiday' | 'students' | 'staff'>('all');
  const [attendanceAlertSearch, setAttendanceAlertSearch] = useState('');
  const [isAttendanceAlertsExpanded, setIsAttendanceAlertsExpanded] = useState(false);
  const [excuseModalTarget, setExcuseModalTarget] = useState<FlaggedAbsenteeItem | null>(null);
  const [excuseLeaveType, setExcuseLeaveType] = useState<'casual' | 'sick' | 'paid'>('casual');
  const [excuseRemarks, setExcuseRemarks] = useState('');
  const [isExcusing, setIsExcusing] = useState(false);
  const [excuseSuccessNotice, setExcuseSuccessNotice] = useState<string | null>(null);

  // Interactive Chart & Scanner View States
  const [attendanceViewType, setAttendanceViewType] = useState<'combined' | 'studentOnly' | 'staffOnly'>('combined');
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);

  const currentMonth = getCurrentMonthName(); // e.g. "September 2026"
  const previousMonth = 'August 2026';

  // 1. Student Low Balance & Defaulter Alerts
  const studentBalanceAlerts = useMemo(() => {
    return defaulters.map(({ student, pendingAmount, lastPaymentDate }) => {
      let severity: 'critical' | 'high' | 'moderate' = 'moderate';
      let badgeLabel = 'MODERATE DUES';
      let badgeColor = 'amber';

      if (pendingAmount >= 1000) {
        severity = 'critical';
        badgeLabel = 'CRITICAL OVERDUE';
        badgeColor = 'rose';
      } else if (pendingAmount >= 500) {
        severity = 'high';
        badgeLabel = 'HIGH BALANCE DUE';
        badgeColor = 'orange';
      }

      return {
        id: `student-${student.id}`,
        type: 'student' as const,
        entityId: student.id,
        name: student.fullName,
        codeOrRoll: student.rollNo,
        meta: `Class ${student.className} - ${student.section}`,
        contactName: student.guardianName,
        contactPhone: student.contactNumber,
        amount: pendingAmount,
        severity,
        badgeLabel,
        badgeColor,
        note: lastPaymentDate ? `Last payment: ${formatDate(lastPaymentDate)}` : 'No prior payment recorded',
        student,
      };
    });
  }, [defaulters]);

  // 2. Staff Payroll Record Alerts (Low / Past Due / Unpaid Salaries)
  const staffPayrollAlerts = useMemo(() => {
    return staff
      .filter(s => s.status === 'active')
      .map(member => {
        const netSalary = member.monthlySalary + member.allowances - member.deductions;
        const currentMonthExpense = expenses.find(
          e =>
            e.category === 'Staff Salaries' &&
            e.staffId === member.id &&
            e.monthForSalary === currentMonth
        );
        const prevMonthExpense = expenses.find(
          e =>
            e.category === 'Staff Salaries' &&
            e.staffId === member.id &&
            e.monthForSalary === previousMonth
        );

        let severity: 'critical' | 'high' | null = null;
        let badgeLabel = '';
        let badgeColor = '';
        let overdueNote = '';

        if (!prevMonthExpense) {
          severity = 'critical';
          badgeLabel = 'PAYROLL OVERDUE';
          badgeColor = 'rose';
          overdueNote = `Unpaid for ${previousMonth} (+${currentMonth})`;
        } else if (!currentMonthExpense) {
          severity = 'high';
          badgeLabel = 'PENDING DISBURSAL';
          badgeColor = 'amber';
          overdueNote = `Pending disbursal for ${currentMonth}`;
        }

        if (!severity) return null;

        return {
          id: `staff-${member.id}`,
          type: 'staff' as const,
          entityId: member.id,
          name: member.fullName,
          codeOrRoll: member.employeeCode,
          meta: `${member.designation} • ${member.department}`,
          contactName: member.designation,
          contactPhone: member.contactNumber || member.email,
          amount: netSalary,
          severity,
          badgeLabel,
          badgeColor,
          note: overdueNote,
          member,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [staff, expenses, currentMonth, previousMonth]);

  // Combined and sorted alerts (Critical first, then amount desc)
  const allAlerts = useMemo(() => {
    const combined = [...studentBalanceAlerts, ...staffPayrollAlerts];
    return combined.sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2 };
      if (order[a.severity] !== order[b.severity]) {
        return order[a.severity] - order[b.severity];
      }
      return b.amount - a.amount;
    });
  }, [studentBalanceAlerts, staffPayrollAlerts]);

  // Filtered alerts by search and tab
  const filteredAlerts = useMemo(() => {
    return allAlerts.filter(alert => {
      if (alertFilter === 'critical' && alert.severity !== 'critical') return false;
      if (alertFilter === 'student' && alert.type !== 'student') return false;
      if (alertFilter === 'staff' && alert.type !== 'staff') return false;

      if (alertSearch.trim()) {
        const query = alertSearch.toLowerCase();
        const matchesName = alert.name.toLowerCase().includes(query);
        const matchesCode = alert.codeOrRoll.toLowerCase().includes(query);
        const matchesMeta = alert.meta.toLowerCase().includes(query);
        return matchesName || matchesCode || matchesMeta;
      }
      return true;
    });
  }, [allAlerts, alertFilter, alertSearch]);

  const totalAtRiskAmount = useMemo(() => {
    return allAlerts.reduce((sum, item) => sum + item.amount, 0);
  }, [allAlerts]);

  const criticalCount = useMemo(() => {
    return allAlerts.filter(a => a.severity === 'critical').length;
  }, [allAlerts]);

  const displayedAlerts = isAlertsExpanded ? filteredAlerts : filteredAlerts.slice(0, 4);

  // 1. Staff count breakdown
  const totalStaff = staff.length;
  const teachingStaff = staff.filter(s => s.isTeaching && s.status === 'active').length;
  const nonTeachingStaff = staff.filter(s => !s.isTeaching && s.status === 'active').length;

  // ----------------------------------------------------
  // ATTENDANCE & TRUANCY INTELLIGENCE ENGINE
  // ----------------------------------------------------
  // Effective attendance dates (Today or most recent record session)
  const effectiveStudentDate = useMemo(() => {
    const hasToday = studentAttendance.some(a => a.date === today);
    if (hasToday) return today;
    const dates = Array.from(new Set(studentAttendance.map(a => a.date))).sort().reverse();
    return dates[0] || today;
  }, [studentAttendance, today]);

  const effectiveStaffDate = useMemo(() => {
    const hasToday = staffAttendance.some(a => a.date === today);
    if (hasToday) return today;
    const dates = Array.from(new Set(staffAttendance.map(a => a.date))).sort().reverse();
    return dates[0] || today;
  }, [staffAttendance, today]);

  // 2. Staff Attendance Metrics
  const staffTodayRecords = useMemo(() => {
    return staffAttendance.filter(a => a.date === effectiveStaffDate);
  }, [staffAttendance, effectiveStaffDate]);

  const staffPresentCount = staffTodayRecords.filter(a => a.status === 'present').length;
  const staffAbsentCount = staffTodayRecords.filter(a => a.status === 'absent').length;
  const staffLeaveCount = staffTodayRecords.filter(a => a.status === 'leave').length;
  const staffAbsentList = staffTodayRecords.filter(
    a => a.status === 'absent' || a.status === 'leave'
  );
  const staffAttendanceRate = totalStaff > 0 ? Math.round((staffPresentCount / totalStaff) * 100) : 0;

  // 3. Students breakdown
  const activeStudents = useMemo(() => students.filter(s => s.status === 'active'), [students]);
  const totalStudents = activeStudents.length;
  const classBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of activeStudents) {
      map[s.className] = (map[s.className] || 0) + 1;
    }
    return map;
  }, [activeStudents]);

  // 4. Student Attendance Metrics
  const studentTodayRecords = useMemo(() => {
    return studentAttendance.filter(a => a.date === effectiveStudentDate);
  }, [studentAttendance, effectiveStudentDate]);

  const studentPresentCount = studentTodayRecords.filter(a => a.status === 'present').length;
  const studentAbsentCount = studentTodayRecords.filter(a => a.status === 'absent').length;
  const studentLeaveCount = studentTodayRecords.filter(a => a.status === 'leave').length;
  const studentAbsentList = studentTodayRecords.filter(
    a => a.status === 'absent' || a.status === 'leave'
  );
  const studentAttendanceRate = totalStudents > 0 ? Math.round((studentPresentCount / totalStudents) * 100) : 0;

  // ----------------------------------------------------
  // FLAGGED ABSENTEES (Absent Without Leave OR Absent > 2 Days)
  // ----------------------------------------------------
  const flaggedStudentAbsentees = useMemo(() => {
    const list: FlaggedAbsenteeItem[] = [];

    for (const student of activeStudents) {
      // Get all attendance records for this student sorted newest to oldest
      const records = studentAttendance
        .filter(a => a.studentId === student.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (records.length === 0) continue;

      const latestRecord = records[0];
      const isAbsentToday = latestRecord.status === 'absent';
      const isAbsentWithoutLeave = isAbsentToday; // Absent without approved leave

      // Count consecutive absent days starting from the latest record
      let consecutiveAbsentDays = 0;
      const datesMissed: string[] = [];

      for (const r of records) {
        if (r.status === 'absent') {
          consecutiveAbsentDays++;
          datesMissed.push(r.date);
        } else {
          break; // Stop at first non-absent day
        }
      }

      // Flag if absent without leave OR absent more than two days (>= 2 days)
      const isMultiDayAbsent = consecutiveAbsentDays >= 2;

      if (isAbsentWithoutLeave || isMultiDayAbsent) {
        list.push({
          id: `flagged-student-${student.id}`,
          type: 'student',
          entityId: student.id,
          name: student.fullName,
          codeOrRoll: student.rollNo,
          meta: `Class ${student.className} - ${student.section}`,
          gender: student.gender,
          latestDate: latestRecord.date,
          status: latestRecord.status,
          isAbsentWithoutLeave,
          isMultiDayAbsent,
          consecutiveAbsentDays,
          datesMissed,
          remarks: latestRecord.remarks || (isAbsentWithoutLeave ? 'Unexcused - No leave application submitted' : ''),
          contactName: student.guardianName,
          contactRelation: student.guardianRelation,
          contactPhone: student.contactNumber,
          contactEmail: student.email,
          studentObj: student,
          latestRecordId: latestRecord.id,
        });
      }
    }

    return list;
  }, [activeStudents, studentAttendance]);

  const flaggedStaffAbsentees = useMemo(() => {
    const list: FlaggedAbsenteeItem[] = [];
    const activeStaff = staff.filter(s => s.status === 'active');

    for (const member of activeStaff) {
      const records = staffAttendance
        .filter(a => a.staffId === member.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (records.length === 0) continue;

      const latestRecord = records[0];
      const isAbsentToday = latestRecord.status === 'absent';
      const isAbsentWithoutLeave = isAbsentToday;

      let consecutiveAbsentDays = 0;
      const datesMissed: string[] = [];

      for (const r of records) {
        if (r.status === 'absent') {
          consecutiveAbsentDays++;
          datesMissed.push(r.date);
        } else {
          break;
        }
      }

      const isMultiDayAbsent = consecutiveAbsentDays >= 2;

      if (isAbsentWithoutLeave || isMultiDayAbsent) {
        list.push({
          id: `flagged-staff-${member.id}`,
          type: 'staff',
          entityId: member.id,
          name: member.fullName,
          codeOrRoll: member.employeeCode,
          meta: `${member.designation} • ${member.department}`,
          gender: member.gender,
          latestDate: latestRecord.date,
          status: latestRecord.status,
          isAbsentWithoutLeave,
          isMultiDayAbsent,
          consecutiveAbsentDays,
          datesMissed,
          remarks: latestRecord.remarks || (isAbsentWithoutLeave ? 'Unreported absence - no approved leave form' : ''),
          contactName: member.fullName,
          contactPhone: member.contactNumber,
          contactEmail: member.email,
          staffObj: member,
          latestRecordId: latestRecord.id,
        });
      }
    }

    return list;
  }, [staff, staffAttendance]);

  // Combined flagged absentees sorted with critical dual-violation first
  const allFlaggedAbsentees = useMemo(() => {
    const combined = [...flaggedStudentAbsentees, ...flaggedStaffAbsentees];
    return combined.sort((a, b) => {
      // Prioritize members who are both unexcused and multi-day
      const aScore = (a.isAbsentWithoutLeave ? 2 : 0) + (a.isMultiDayAbsent ? 3 : 0) + a.consecutiveAbsentDays;
      const bScore = (b.isAbsentWithoutLeave ? 2 : 0) + (b.isMultiDayAbsent ? 3 : 0) + b.consecutiveAbsentDays;
      return bScore - aScore;
    });
  }, [flaggedStudentAbsentees, flaggedStaffAbsentees]);

  // Filtered flagged absentees
  const filteredFlaggedAbsentees = useMemo(() => {
    return allFlaggedAbsentees.filter(item => {
      if (attendanceAlertFilter === 'unexcused' && !item.isAbsentWithoutLeave) return false;
      if (attendanceAlertFilter === 'multiday' && !item.isMultiDayAbsent) return false;
      if (attendanceAlertFilter === 'students' && item.type !== 'student') return false;
      if (attendanceAlertFilter === 'staff' && item.type !== 'staff') return false;

      if (attendanceAlertSearch.trim()) {
        const q = attendanceAlertSearch.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.codeOrRoll.toLowerCase().includes(q);
        const matchesMeta = item.meta.toLowerCase().includes(q);
        const matchesPhone = item.contactPhone?.toLowerCase().includes(q) || false;
        return matchesName || matchesCode || matchesMeta || matchesPhone;
      }
      return true;
    });
  }, [allFlaggedAbsentees, attendanceAlertFilter, attendanceAlertSearch]);

  const displayedFlaggedAbsentees = isAttendanceAlertsExpanded
    ? filteredFlaggedAbsentees
    : filteredFlaggedAbsentees.slice(0, 4);

  const unexcusedCount = useMemo(() => {
    return allFlaggedAbsentees.filter(a => a.isAbsentWithoutLeave).length;
  }, [allFlaggedAbsentees]);

  const multiDayCount = useMemo(() => {
    return allFlaggedAbsentees.filter(a => a.isMultiDayAbsent).length;
  }, [allFlaggedAbsentees]);

  // Handle Excusing Absences from Dashboard
  const handleOpenExcuseModal = (item: FlaggedAbsenteeItem) => {
    setExcuseModalTarget(item);
    setExcuseLeaveType('casual');
    setExcuseRemarks(
      item.type === 'student'
        ? 'Parent contacted; medical/family leave verified and approved.'
        : 'Official leave application sanctioned by administration.'
    );
  };

  const handleConfirmExcuse = async () => {
    if (!excuseModalTarget) return;
    setIsExcusing(true);

    try {
      if (excuseModalTarget.type === 'student') {
        const rec = studentAttendance.find(
          a => a.date === excuseModalTarget.latestDate && a.studentId === excuseModalTarget.entityId
        );
        const updatedRecord: StudentAttendanceRecord = rec
          ? {
              ...rec,
              status: 'leave',
              remarks: excuseRemarks.trim() || 'Approved leave',
            }
          : {
              id: `att-s-excuse-${Date.now()}`,
              date: excuseModalTarget.latestDate,
              studentId: excuseModalTarget.entityId,
              studentName: excuseModalTarget.name,
              className: excuseModalTarget.studentObj?.className || '',
              section: excuseModalTarget.studentObj?.section || '',
              status: 'leave',
              remarks: excuseRemarks.trim() || 'Approved leave',
            };

        await saveStudentAttendance([updatedRecord]);
        setExcuseSuccessNotice(`Student ${excuseModalTarget.name}'s absence was excused and recorded as approved leave.`);
      } else {
        const rec = staffAttendance.find(
          a => a.date === excuseModalTarget.latestDate && a.staffId === excuseModalTarget.entityId
        );
        const updatedRecord: StaffAttendanceRecord = rec
          ? {
              ...rec,
              status: 'leave',
              leaveType: excuseLeaveType,
              remarks: excuseRemarks.trim() || 'Approved leave',
            }
          : {
              id: `att-st-excuse-${Date.now()}`,
              date: excuseModalTarget.latestDate,
              staffId: excuseModalTarget.entityId,
              staffName: excuseModalTarget.name,
              designation: excuseModalTarget.staffObj?.designation || '',
              status: 'leave',
              leaveType: excuseLeaveType,
              remarks: excuseRemarks.trim() || 'Approved leave',
            };

        await saveStaffAttendance([updatedRecord]);
        setExcuseSuccessNotice(`Staff member ${excuseModalTarget.name}'s absence was excused and recorded as approved leave.`);
      }

      setExcuseModalTarget(null);
      setTimeout(() => setExcuseSuccessNotice(null), 4000);
    } catch (err) {
      console.error(err);
      notify({
        category: 'system',
        priority: 'high',
        title: 'Attendance Update Failed',
        message: 'Failed to update attendance record.',
      });
    } finally {
      setIsExcusing(false);
    }
  };

  // 8. Recharts: Monthly Attendance Rates Data (Students & Staff)
  const attendanceTrendData = useMemo(() => {
    return getAttendanceTrendSeries(studentAttendance, staffAttendance);
  }, [studentAttendance, staffAttendance]);

  // 9. Recharts: Expense Distribution Data (Grouped by Category)
  const expenseDistributionData = useMemo(() => {
    return getExpenseDistribution(expenses);
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 text-indigo-100 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                {t('dashboard.systemOnline', 'EduLedger System Online')}
              </span>
              <span className="text-xs text-indigo-200">{t('dashboard.session', 'Session')} {settings.currentAcademicYear}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              {t('dashboard.title', 'School Operations & Accounts Dashboard')}
            </h2>
            <p className="text-xs text-indigo-200 max-w-xl">
              {t('dashboard.subtitle', 'Live overview of student attendance, faculty status, fee dues, and financial health stored offline in your browser.')}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Leaderboard & Badges - Amber Gold */}
            <button
              onClick={() => setIsLeaderboardModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-300/60 transition active:scale-95 cursor-pointer"
              title="View Student & Faculty Leaderboard, Badges & Achievements"
            >
              <Trophy className="w-4 h-4 text-slate-950" />
              <span>{t('dashboard.leaderboard', 'Leaderboard & Badges')}</span>
            </button>

            {/* 2. Mark Attendance - Vibrant Teal/Emerald */}
            <button
              onClick={() => setActiveTab('student-attendance')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white shadow-md shadow-emerald-500/25 ring-1 ring-emerald-300/40 transition active:scale-95 cursor-pointer"
              title="Take daily student attendance roll-call"
            >
              <UserCheck className="w-4 h-4 text-emerald-100" />
              <span>{t('dashboard.markAttendance', 'Mark Attendance')}</span>
            </button>

            {/* 3. Collect Fee - Vibrant Green */}
            <button
              onClick={() => setActiveTab('fee-collection')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-md shadow-green-500/25 ring-1 ring-green-300/40 transition active:scale-95 cursor-pointer"
              title="Collect fees, print vouchers & receipts"
            >
              <Receipt className="w-4 h-4 text-emerald-100" />
              <span>{t('dashboard.collectFee', 'Collect Fee')}</span>
            </button>

            {/* 4. Record Expense - Vibrant Rose / Coral */}
            <button
              onClick={() => setActiveTab('expenses')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/25 ring-1 ring-rose-300/40 transition active:scale-95 cursor-pointer"
              title="Log utility, vendor, or operating expenses"
            >
              <TrendingDown className="w-4 h-4 text-rose-100" />
              <span>{t('dashboard.recordExpense', 'Record Expense')}</span>
            </button>

            {/* 5. Add Student / Admissions - Royal Blue */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admission-form')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-300/40 transition active:scale-95 cursor-pointer"
                title="New Student Enrollment Form"
              >
                <UserPlus className="w-4 h-4 text-blue-100" />
                <span>{t('dashboard.newAdmission', 'New Admission')}</span>
              </button>
            )}

            {/* 6. Class Timetable - Cyan / Sky */}
            <button
              onClick={() => setActiveTab('timetable')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 text-white shadow-md shadow-cyan-500/25 ring-1 ring-cyan-300/40 transition active:scale-95 cursor-pointer"
              title="View class weekly schedules and periods"
            >
              <CalendarDays className="w-4 h-4 text-sky-100" />
              <span>{t('dashboard.timetable', 'Timetable')}</span>
            </button>

            {/* 7. Staff & HR - Rich Violet / Purple */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('hr-management')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-md shadow-purple-500/25 ring-1 ring-purple-300/40 transition active:scale-95 cursor-pointer"
                title="Staff directory, leaves & HR records"
              >
                <Users className="w-4 h-4 text-purple-100" />
                <span>{t('dashboard.facultyHr', 'Faculty & HR')}</span>
              </button>
            )}

            {/* 8. Generate Report - Radiant Orange */}
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-300/40 transition active:scale-95 cursor-pointer"
              title="Audit, financial, and attendance analytics"
            >
              <BarChart2 className="w-4 h-4 text-orange-100" />
              <span>{t('dashboard.reports', 'Reports')}</span>
            </button>

            {/* 9. Books & Assets - Pink / Fuchsia */}
            <button
              onClick={() => setActiveTab('bookshop')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-md shadow-pink-500/25 ring-1 ring-pink-300/40 transition active:scale-95 cursor-pointer"
              title="Bookstore POS & Inventory"
            >
              <ShoppingBag className="w-4 h-4 text-pink-100" />
              <span>{t('dashboard.bookstore', 'Bookstore')}</span>
            </button>

            {/* 10. Data Backup & Vault - Teal / Cyan */}
            {isAdmin && (
              <button
                onClick={() => setActiveTab('backup')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 text-white shadow-md shadow-teal-500/25 ring-1 ring-teal-300/40 transition active:scale-95 cursor-pointer"
                title="Automated Client-Side Data Backup & Vault"
              >
                <HardDrive className="w-4 h-4 text-cyan-100" />
                <span>{t('dashboard.backupVault', 'Backup Vault')}</span>
              </button>
            )}

            {/* 11. Profile & Security - Slate / Dark Indigo */}
            <button
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white shadow-md ring-1 ring-slate-600/50 transition active:scale-95 cursor-pointer"
              title={isAdmin ? 'Profile & Users Security' : 'My User Profile'}
            >
              <ShieldCheck className="w-4 h-4 text-indigo-300" />
              <span>{isAdmin ? t('dashboard.profileUsers', 'Profile & Users') : t('dashboard.myProfile', 'My Profile')}</span>
            </button>
          </div>
        </div>

      {/* Role-Specialized Dashboard Persona Switcher */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {t('dashboard.roleConsole', 'Role-Specialized Dashboard Console')}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {t('dashboard.activeSession', 'Active Session:')} {role ? role.replace(/_/g, ' ').toUpperCase() : 'ADMINISTRATOR'}
              </span>
              {activeRoleView !== defaultRoleView && (
                <span className="px-2 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-semibold">
                  {t('dashboard.previewMode', 'Preview Mode')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {activeRoleView === 'accountant'
                ? 'Displaying only financial summaries, fee collections, payment rails, operating burn, and tuition recovery.'
                : activeRoleView === 'teacher'
                ? 'Displaying only attendance summaries, classroom roll-call, teaching schedule, and student truancy alerts.'
                : activeRoleView === 'hr_manager'
                ? 'Displaying only faculty coverage, staff attendance roll-call, leave applications, and payroll disbursal.'
                : 'Executive institutional dashboard combining unified operational, financial, and attendance summaries.'}
            </p>
          </div>
        </div>

        {/* View Switcher Controls / Persona Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-stretch md:self-auto overflow-x-auto shrink-0">
          {/* Executive Tab - Indigo */}
          <button
            type="button"
            onClick={() => setActiveRoleView('executive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeRoleView === 'executive'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400/60'
                : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
            }`}
            title="Institutional Executive Overview (All Unified Summaries)"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${activeRoleView === 'executive' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
            <span>{t('dashboard.executiveOverview', 'Executive Overview')}</span>
          </button>

          {/* Accountant Tab - Emerald */}
          <button
            type="button"
            onClick={() => setActiveRoleView('accountant')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeRoleView === 'accountant'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/60'
                : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
            }`}
            title="Accountant & Finance Specialist View (Showing only financial summaries)"
          >
            <Wallet className={`w-3.5 h-3.5 ${activeRoleView === 'accountant' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span>{t('dashboard.accountant', 'Accountant')}</span>
          </button>

          {/* Teacher Tab - Blue / Sky */}
          <button
            type="button"
            onClick={() => setActiveRoleView('teacher')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeRoleView === 'teacher'
                ? 'bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400/60'
                : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60'
            }`}
            title="Teacher & Academic Faculty View (Showing only attendance & academic summaries)"
          >
            <GraduationCap className={`w-3.5 h-3.5 ${activeRoleView === 'teacher' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
            <span>{t('dashboard.teacher', 'Teacher')}</span>
          </button>

          {/* HR Manager Tab - Purple / Violet */}
          <button
            type="button"
            onClick={() => setActiveRoleView('hr_manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeRoleView === 'hr_manager'
                ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/60'
                : 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/60'
            }`}
            title="Faculty & HR Operations View"
          >
            <Users className={`w-3.5 h-3.5 ${activeRoleView === 'hr_manager' ? 'text-white' : 'text-purple-600 dark:text-purple-400'}`} />
            <span>{t('dashboard.hrManager', 'HR Manager')}</span>
          </button>
        </div>
      </div>

      {/* SPECIALIZED WIDGET FOR ACCOUNTANT / FINANCE */}
      {activeRoleView === 'accountant' && (
        <AccountantDashboardWidgets />
      )}

      {/* SPECIALIZED WIDGET FOR TEACHER / ACADEMIC FACULTY */}
      {activeRoleView === 'teacher' && (
        <TeacherDashboardWidgets />
      )}

      {/* SPECIALIZED WIDGET FOR HR MANAGER */}
      {activeRoleView === 'hr_manager' && (
        <HRManagerDashboardWidgets />
      )}

      {/* EXECUTIVE ADMINISTRATOR ALL-IN-ONE VIEW */}
      {activeRoleView === 'executive' && (() => {
        const renderDashboardWidget = (widgetId: DashboardWidgetId): React.ReactNode => {
          switch (widgetId) {
            case 'kpi_summary':
              return (
                <>
      {/* Row 1: KPI Cards (Clickable drill downs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students Card */}
        <div
          onClick={() => setActiveTab('students')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.totalStudents', 'Total Students')}
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalStudents}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
              {t('dashboard.activeEnrolled', 'Active Enrolled')}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 line-clamp-1">
            Across {Object.keys(classBreakdown).length} classes • Click to view directory
          </p>
        </div>

        {/* Total Staff Card */}
        <div
          onClick={() => (isAdmin ? setActiveTab('staff') : null)}
          className={`group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all relative overflow-hidden ${
            isAdmin ? 'cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.totalStaff', 'Staff & Faculty')}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalStaff}
            </span>
            <span className="text-xs font-medium text-slate-500">{t('dashboard.totalMembers', 'Total Members')}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span className="text-blue-600 dark:text-blue-400 font-semibold">
              {teachingStaff} {t('dashboard.teaching', 'Teaching')}
            </span>
            <span>•</span>
            <span className="text-slate-600 dark:text-slate-400 font-semibold">
              {nonTeachingStaff} {t('dashboard.nonTeaching', 'Non-Teaching')}
            </span>
          </div>
        </div>

        {/* Fee Collection This Month Card */}
        <div
          onClick={() => setActiveTab('fee-collection')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.feeCollectionMonth', 'Fee Collection (Month)')}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(monthlyStats.totalFeeCollectedThisMonth, settings.currencySymbol)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Collected vs Expected</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {monthlyStats.collectionPercentage}%
            </span>
          </div>
        </div>

        {/* Pending Dues Card */}
        <div
          onClick={() => setActiveTab('due-fees')}
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pendingFeesMonth', 'Pending Fees (Month)')}
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {formatCurrency(monthlyStats.totalPendingThisMonth, settings.currencySymbol)}
            </span>
          </div>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium line-clamp-1">
            {defaulters.length} accounts overdue • Drill down
          </p>
        </div>
      </div>
                </>
              );

            case 'gamification':
              return <GamificationWidget onOpenLeaderboard={() => setIsLeaderboardModalOpen(true)} />;

            case 'quick_insights':
              return <QuickInsightsWidget />;

            case 'recent_fee_payments':
              return <RecentFeePaymentsWidget />;

            case 'todays_attendance':
              return (
                <>
        {/* 1. Dual Turnout Metric Cards (Students & Staff Side by Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card A: Student Attendance Overview */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Student Attendance Turnout</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800">
                        {formatDate(effectiveStudentDate)}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Live daily presence status across all enrolled classes
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('student-attendance')}
                  className="hidden sm:flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                >
                  <span>Manage Attendance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Stat Badges Grid */}
              <div className="grid grid-cols-4 gap-2.5 mt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Total
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {totalStudents}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Enrolled</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    Present
                  </span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {studentPresentCount}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
                    {studentAttendanceRate}% Rate
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-0.5">
                    Absent
                  </span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                    {studentAbsentCount}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">
                    {studentAbsentCount > 0 ? 'Unexcused' : 'Zero'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                    On Leave
                  </span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    {studentLeaveCount}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
                    Approved
                  </span>
                </div>
              </div>

              {/* Multi-Segment Turnout Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Student Attendance Health</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {studentPresentCount} / {totalStudents} Present ({studentAttendanceRate}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${totalStudents > 0 ? (studentPresentCount / totalStudents) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    title={`Present: ${studentPresentCount}`}
                  />
                  <div
                    style={{ width: `${totalStudents > 0 ? (studentAbsentCount / totalStudents) * 100 : 0}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                    title={`Absent: ${studentAbsentCount}`}
                  />
                  <div
                    style={{ width: `${totalStudents > 0 ? (studentLeaveCount / totalStudents) * 100 : 0}%` }}
                    className="bg-amber-400 h-full transition-all duration-500"
                    title={`Leave: ${studentLeaveCount}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {flaggedStudentAbsentees.length > 0 ? (
                  <strong className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{flaggedStudentAbsentees.length} student(s) flagged for follow-up</span>
                  </strong>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All students verified present or on approved leave</span>
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('student-attendance')}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline sm:hidden"
              >
                Open Register
              </button>
            </div>
          </div>

          {/* Card B: Staff & Faculty Attendance Overview */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Staff &amp; Faculty Attendance Turnout</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                        {formatDate(effectiveStaffDate)}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Faculty and campus administrative presence records
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('staff-attendance')}
                  className="hidden sm:flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  <span>Manage Staff Attendance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 4 Stat Badges Grid */}
              <div className="grid grid-cols-4 gap-2.5 mt-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-800 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Total
                  </span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {totalStaff}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Faculty/Staff</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    Present
                  </span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {staffPresentCount}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
                    {staffAttendanceRate}% Rate
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-0.5">
                    Absent
                  </span>
                  <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                    {staffAbsentCount}
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">
                    {staffAbsentCount > 0 ? 'Unexcused' : 'Zero'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-0.5">
                    On Leave
                  </span>
                  <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    {staffLeaveCount}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block">
                    Sanctioned
                  </span>
                </div>
              </div>

              {/* Multi-Segment Turnout Progress Bar */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Faculty Turnout Health</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {staffPresentCount} / {totalStaff} Present ({staffAttendanceRate}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${totalStaff > 0 ? (staffPresentCount / totalStaff) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                    title={`Present: ${staffPresentCount}`}
                  />
                  <div
                    style={{ width: `${totalStaff > 0 ? (staffAbsentCount / totalStaff) * 100 : 0}%` }}
                    className="bg-rose-500 h-full transition-all duration-500"
                    title={`Absent: ${staffAbsentCount}`}
                  />
                  <div
                    style={{ width: `${totalStaff > 0 ? (staffLeaveCount / totalStaff) * 100 : 0}%` }}
                    className="bg-amber-400 h-full transition-all duration-500"
                    title={`Leave: ${staffLeaveCount}`}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {flaggedStaffAbsentees.length > 0 ? (
                  <strong className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{flaggedStaffAbsentees.length} staff member(s) flagged for absence</span>
                  </strong>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All staff members on active duty or approved leave</span>
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('staff-attendance')}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline sm:hidden"
              >
                Open Register
              </button>
            </div>
          </div>
        </div>
                </>
              );

            case 'attendance_alerts':
              return (
                <>
        {/* 2. Highlighted Absenteeism & Truancy Alert Console */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-sm shrink-0">
                <ShieldAlert className="w-5 h-5" />
                {unexcusedCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border border-white dark:border-slate-900"></span>
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Highlighted Absenteeism &amp; Truancy Alerts</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    {unexcusedCount} Unexcused Without Leave
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {multiDayCount} Absent &gt; 2 Days
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {allFlaggedAbsentees.length} Total Flagged
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated tracking highlighting staff &amp; students absent without leave or missing school for more than two consecutive days
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('student-attendance')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
              >
                Student Register
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff-attendance')}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer"
              >
                Staff Register
              </button>
            </div>
          </div>

          {/* Filter Chips & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAttendanceAlertFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  attendanceAlertFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                All Flagged ({allFlaggedAbsentees.length})
              </button>
              <button
                type="button"
                onClick={() => setAttendanceAlertFilter('unexcused')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  attendanceAlertFilter === 'unexcused'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Without Leave ({unexcusedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceAlertFilter('multiday')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  attendanceAlertFilter === 'multiday'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Absent &gt; 2 Days ({multiDayCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceAlertFilter('students')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  attendanceAlertFilter === 'students'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Students ({flaggedStudentAbsentees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAttendanceAlertFilter('staff')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  attendanceAlertFilter === 'staff'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff ({flaggedStaffAbsentees.length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, class, dept..."
                value={attendanceAlertSearch}
                onChange={e => setAttendanceAlertSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Cards Feed */}
          {filteredFlaggedAbsentees.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              <p className="text-xs font-bold">
                No personnel match the selected absenteeism filter.
              </p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                All tracked individuals have accounted attendance or approved leaves.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedFlaggedAbsentees.map(item => {
                const isStudent = item.type === 'student';
                const cleanPhone = item.contactPhone?.replace(/[^0-9]/g, '') || '';
                const waMessage = encodeURIComponent(
                  isStudent
                    ? `Dear Parent, this is an official attendance notice from school regarding ${item.name} (${item.meta}) who has been marked absent without approved leave on ${item.datesMissed.map(d => formatDate(d)).join(', ')}. Please contact the administration office.`
                    : `Hello ${item.name}, this is an attendance notice from school administration regarding your unrecorded absence on ${item.datesMissed.map(d => formatDate(d)).join(', ')}. Please submit your leave application.`
                );

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border-2 transition-all hover:shadow-md flex flex-col justify-between space-y-3 ${
                      item.isAbsentWithoutLeave
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/70'
                        : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/70'
                    }`}
                  >
                    <div>
                      {/* Top Row: Avatar + Name + Type */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                              isStudent
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {item.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                {item.name}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                                  isStudent
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                }`}
                              >
                                {isStudent ? 'Student' : 'Staff / Faculty'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                              {item.meta} • <span className="font-mono font-bold text-slate-700 dark:text-slate-300">#{item.codeOrRoll}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {item.isAbsentWithoutLeave && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Without Leave</span>
                            </span>
                          )}
                          {item.isMultiDayAbsent && (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-500 text-slate-950 shadow-2xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{item.consecutiveAbsentDays} Days Absent</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Missed Dates Tag Ribbon */}
                      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Dates Missed:
                        </span>
                        {item.datesMissed.map(d => (
                          <span
                            key={d}
                            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                          >
                            {formatDate(d)}
                          </span>
                        ))}
                      </div>

                      {/* Reason / Remarks */}
                      {item.remarks && (
                        <div className="mt-2 p-2 rounded-xl bg-white/70 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300 italic">
                          <span className="font-semibold text-slate-700 dark:text-slate-200 not-italic">Recorded Note: </span>
                          "{item.remarks}"
                        </div>
                      )}

                      {/* Guardian or Contact Info */}
                      {item.contactPhone && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">
                            {isStudent
                              ? `Guardian: ${item.contactName || 'Parent'} (${item.contactRelation || 'Guardian'})`
                              : `Direct Contact:`}
                          </span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.contactPhone}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {item.contactPhone && (
                          <>
                            <a
                              href={`tel:${item.contactPhone}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                              title="Call Contact"
                            >
                              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Call</span>
                            </a>

                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
                              title="Send WhatsApp Alert"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenExcuseModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                          title="Sanction or excuse this absence"
                        >
                          <CalendarCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Excuse Leave</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (isStudent) {
                            setSelectedStudentIdForDetail(item.entityId);
                            setActiveTab('students');
                          } else {
                            setSelectedStaffIdForDetail(item.entityId);
                            setActiveTab('staff');
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <span>Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expand/Collapse Button */}
          {filteredFlaggedAbsentees.length > 4 && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setIsAttendanceAlertsExpanded(!isAttendanceAlertsExpanded)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                <span>
                  {isAttendanceAlertsExpanded
                    ? 'Show Less'
                    : `View All ${filteredFlaggedAbsentees.length} Flagged Absentees`}
                </span>
                {isAttendanceAlertsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>
                </>
              );

            case 'balance_alerts':
              return (
                <>
      {/* Low Balance & Past Due Alert Console */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-900/60 shadow-sm space-y-4">
        {/* Alert Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm shrink-0">
              <BellRing className="w-5 h-5" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-600 border border-white dark:border-slate-900"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Low Balance &amp; Past Due Alert Center</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                  {criticalCount} Critical
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {allAlerts.length} Total Alerts
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated auditing of student accounts with low/delinquent fee balances and faculty payroll liabilities
              </p>
            </div>
          </div>

          {/* Aggregate Exposure Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deficit / Overdue</p>
              <p className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
                {formatCurrency(totalAtRiskAmount, settings.currencySymbol)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('due-fees')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 transition"
              >
                Defaulters Hub
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Payroll Hub
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAlertFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                alertFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Alerts ({allAlerts.length})
            </button>
            <button
              type="button"
              onClick={() => setAlertFilter('critical')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                alertFilter === 'critical'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              <span>Critical Only ({criticalCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setAlertFilter('student')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                alertFilter === 'student'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 hover:bg-indigo-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Student Overdue ({studentBalanceAlerts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setAlertFilter('staff')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                alertFilter === 'staff'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Staff Payroll ({staffPayrollAlerts.length})</span>
            </button>
          </div>

          {/* Quick Search in Alerts */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, roll, code..."
              value={alertSearch}
              onChange={e => setAlertSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Alert Cards Feed */}
        {filteredAlerts.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <p className="text-xs font-bold">No delinquent records or pending payroll liabilities match your current filter.</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">All monitored accounts are operating in balanced standing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border transition-all hover:shadow-xs flex flex-col justify-between ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                    : alert.severity === 'high'
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          alert.type === 'student'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {alert.type === 'student' ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <Briefcase className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {alert.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">{alert.meta}</p>
                      </div>
                    </div>

                    {/* Color-Coded Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                        alert.badgeColor === 'rose'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                          : alert.badgeColor === 'orange'
                          ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                          : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {alert.severity === 'critical' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      )}
                      <span>{alert.badgeLabel}</span>
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                        {alert.type === 'student' ? 'Past Due Balance' : 'Pending Net Compensation'}
                      </span>
                      <span
                        className={`text-base font-black font-mono ${
                          alert.severity === 'critical'
                            ? 'text-rose-600 dark:text-rose-400'
                            : alert.severity === 'high'
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {formatCurrency(alert.amount, settings.currencySymbol)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block font-mono">
                        {alert.codeOrRoll}
                      </span>
                      <span className="text-[10px] font-medium text-slate-500">{alert.note}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 truncate max-w-[180px]">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {alert.type === 'student' ? 'Guardian:' : 'Contact:'}
                    </span>{' '}
                    <span>{alert.contactPhone || alert.contactName}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {alert.type === 'student' ? (
                      <>
                        {alert.contactPhone && (
                          <a
                            href={`tel:${alert.contactPhone}`}
                            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white bg-slate-100 dark:bg-slate-800 transition"
                            title="Call Guardian"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentIdForDetail(alert.entityId);
                            setActiveTab('fee-collection');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition"
                        >
                          Collect Fee
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaffIdForDetail(alert.entityId);
                            setActiveTab('staff');
                          }}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('payroll')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
                        >
                          Disburse
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expand / Collapse Footer */}
        {filteredAlerts.length > 4 && (
          <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>{isAlertsExpanded ? 'Show Top 4 Alerts' : `View All ${filteredAlerts.length} Alerts`}</span>
              {isAlertsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
                </>
              );

            case 'quick_actions':
              return <QuickActionsHub />;

            case 'fiscal_fee_vs_expenses':
              return <FiscalYearFeeVsExpensesWidget />;

            case 'operations_trend':
              return <DashboardSummaryWidget />;

            case 'monthly_cashflow':
              return <MonthlyRevenueExpensesWidget />;

            case 'attendance_and_expense_charts':
              return (
                <>
      {/* SECTION 2: RECHARTS MONTHLY ATTENDANCE PERCENTAGES & EXPENSE DISTRIBUTION (2 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Attendance Turnout Rates (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-indigo-600" />
                  <span>Monthly Attendance Percentages (Turnout Analytics)</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Student vs Staff
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily presence percentage tracking against the 85% institutional benchmark
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQRScannerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                title="Open QR scanner for instant student attendance or library pass"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan Student QR</span>
              </button>

              <button
                onClick={() => setActiveTab('student-attendance')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Roll Call</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recharts Bar/Line Chart */}
          <div className="h-64 w-full pt-3">
            {!attendanceTrendData.some(d => d.hasStudentData || d.hasStaffData) ? (
              <div className="h-full w-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
                <CalendarCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Attendance Logged</p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1 mb-3">Daily student and faculty attendance records will plot the turnout trend automatically without sample data.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('student-attendance')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Mark Attendance
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={v => `${v}%`} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
                            <p className="font-bold text-slate-200">{data.date}</p>
                            <div className="flex justify-between gap-4 text-indigo-400 font-mono">
                              <span>Student Presence:</span>
                              <span className="font-bold">{data.studentRate}%</span>
                            </div>
                            <div className="flex justify-between gap-4 text-emerald-400 font-mono">
                              <span>Faculty Presence:</span>
                              <span className="font-bold">{data.staffRate}%</span>
                            </div>
                            <div className="text-[10px] text-amber-300 pt-1 border-t border-slate-800">
                              Benchmark Threshold: 85%
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <RechartsLegend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '11px' }} />
                  <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: '85% Target', position: 'insideTopRight', fill: '#d97706', fontSize: 10 }} />
                  <Bar dataKey="studentRate" name="Student Attendance %" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="staffRate" name="Faculty Attendance %" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Today's Live Attendance Metric Cards */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 text-center">
              <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                Present Today
              </span>
              <p className="text-base font-black text-indigo-900 dark:text-indigo-100 font-mono">
                {studentPresentCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 text-center">
              <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">
                Absent Today
              </span>
              <p className="text-base font-black text-red-900 dark:text-red-100 font-mono">
                {studentAbsentCount}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 text-center">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Approved Leaves
              </span>
              <p className="text-base font-black text-amber-900 dark:text-amber-100 font-mono">
                {studentLeaveCount}
              </p>
            </div>
          </div>
        </div>

        {/* Expense Distribution Recharts Donut (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-violet-500" />
                <span>Expense Distribution</span>
              </h3>
              <p className="text-xs text-slate-500">School expenditure grouped by operational category</p>
            </div>
            <button
              onClick={() => setActiveTab('expenses')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Donut Chart with Center Callout or Empty State */}
          {expenseDistributionData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center">
              <PieChartIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No Expenses Recorded</p>
              <p className="text-[11px] text-slate-400 max-w-xs mt-1 mb-3">Operating expenses will be categorized automatically once logged.</p>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                Record Expense
              </button>
            </div>
          ) : (
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg text-xs border border-slate-700">
                            <p className="font-bold text-slate-200">{data.name}</p>
                            <p className="font-mono font-bold text-emerald-400 text-sm">
                              {formatCurrency(data.value, settings.currencySymbol)} ({data.percentage}%)
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Label in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Burn</span>
                <span className="text-sm font-black text-slate-900 dark:text-white font-mono leading-tight">
                  {formatCurrency(monthlyStats.totalExpensesThisMonth, settings.currencySymbol)}
                </span>
              </div>
            </div>
          )}

          {/* Category Percentage List */}
          <div className="space-y-1.5 max-h-36 overflow-y-auto pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {expenseDistributionData.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400 font-medium">
                No expense breakdown recorded
              </div>
            ) : (
              expenseDistributionData.map(item => (
                <div key={item.name} className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(item.value, settings.currencySymbol)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold w-9 text-right">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
                </>
              );

            case 'actionable_insights':
              return (
                <>
      {/* SECTION 3: ACTIONABLE INSIGHTS AT A GLANCE */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400 text-slate-950 shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Actionable Operational &amp; Financial Insights</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  Real-time Intelligence
                </span>
              </h3>
              <p className="text-xs text-indigo-200">
                High-priority alerts and suggested interventions calculated directly from live records
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Insight 1: Fee Recovery Velocity */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
                  Fee Recovery Trajectory
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  {monthlyStats.collectionPercentage}%
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {monthlyStats.collectionPercentage >= 80
                  ? 'Strong Cashflow Inflow'
                  : 'Fee Follow-up Required'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {defaulters.length} accounts have overdue balances totaling{' '}
                <strong className="text-amber-300 font-mono">
                  {formatCurrency(totalAtRiskAmount, settings.currencySymbol)}
                </strong>
                .
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('due-fees')}
              className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition cursor-pointer"
            >
              <span>Review Defaulters</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Insight 2: Attendance Turnout & Truancy */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
                  Campus Turnout Health
                </span>
                <span className="font-mono font-bold text-indigo-300">
                  {totalStudents > 0 ? Math.round((studentPresentCount / totalStudents) * 100) : 0}%
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {studentAbsentCount > 5 ? 'Elevated Absenteeism Today' : 'Optimal Attendance Health'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {studentPresentCount} of {totalStudents} students verified present.{' '}
                {studentAbsentCount} marked absent without prior leave.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsQRScannerOpen(true)}
              className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>Launch QR Scanner</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Insight 3: Operating Burn & Cash Reserve */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">
                  Net Operating Margin
                </span>
                <span
                  className={`font-mono font-bold ${
                    monthlyStats.netBalanceThisMonth >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {monthlyStats.netBalanceThisMonth >= 0 ? '+' : ''}
                  {formatCurrency(monthlyStats.netBalanceThisMonth, settings.currencySymbol)}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {monthlyStats.netBalanceThisMonth >= 0 ? 'Surplus Maintained' : 'Deficit Advisory'}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Faculty salaries represent {expenseDistributionData[0]?.percentage || 65}% of the operating
                burn rate.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-white/20 text-xs font-bold transition cursor-pointer"
            >
              <span>Inspect P&amp;L Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
                </>
              );

            case 'accounts_audit_table':
              return (
                <>
      {/* Row 4: Delinquent Accounts & Liabilities Table with Tabs & Color-Coded Badges */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Accounts Audit: Overdue Balances &amp; Payroll Deficits</span>
            </h3>
            <p className="text-xs text-slate-500">
              Immediate visibility into top student defaulters and pending staff salary obligations
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center text-xs">
              <button
                type="button"
                onClick={() => setTableTab('students')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  tableTab === 'students'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Student Defaulters ({defaulters.length})
              </button>
              <button
                type="button"
                onClick={() => setTableTab('staff')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  tableTab === 'staff'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Staff Payroll ({staffPayrollAlerts.length})
              </button>
            </div>

            <button
              onClick={() => setActiveTab(tableTab === 'students' ? 'due-fees' : 'payroll')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {tableTab === 'students' ? (
          defaulters.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-600 font-medium">
              Outstanding balance zero! All enrolled student accounts are fully paid.
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Roll No</th>
                    <th className="py-2.5 px-3">Class &amp; Section</th>
                    <th className="py-2.5 px-3">Guardian &amp; Phone</th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {defaulters.slice(0, 6).map(({ student, pendingAmount }) => {
                    const isCritical = pendingAmount >= 1000;
                    const isHigh = pendingAmount >= 500 && pendingAmount < 1000;
                    const badgeText = isCritical
                      ? 'CRITICAL OVERDUE'
                      : isHigh
                      ? 'HIGH BALANCE'
                      : 'MODERATE DUES';
                    const badgeClass = isCritical
                      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                      : isHigh
                      ? 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800'
                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        onClick={() => {
                          setSelectedStudentIdForDetail(student.id);
                          setActiveTab('fee-collection');
                        }}
                      >
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {student.fullName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{student.rollNo}</td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                          {student.className} - {student.section}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{student.guardianName} ({student.contactNumber})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shadow-2xs ${badgeClass}`}
                          >
                            {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>}
                            <span>{badgeText}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(pendingAmount, settings.currencySymbol)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedStudentIdForDetail(student.id);
                              setActiveTab('fee-collection');
                            }}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                          >
                            Collect Fee
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          staffPayrollAlerts.length === 0 ? (
            <div className="py-8 text-center text-xs text-emerald-600 font-medium">
              All staff compensations disbursed! No pending faculty payroll liabilities.
            </div>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Employee Code</th>
                    <th className="py-2.5 px-3">Department &amp; Role</th>
                    <th className="py-2.5 px-3">Pending Period</th>
                    <th className="py-2.5 px-3">Payroll Status</th>
                    <th className="py-2.5 px-3 text-right">Net Due Amount</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {staffPayrollAlerts.slice(0, 6).map(alert => (
                    <tr
                      key={alert.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                      onClick={() => {
                        setSelectedStaffIdForDetail(alert.entityId);
                        setActiveTab('staff');
                      }}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {alert.name}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">{alert.codeOrRoll}</td>
                      <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {alert.meta}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {alert.note}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                            alert.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                          }`}
                        >
                          {alert.severity === 'critical' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                          )}
                          <span>{alert.badgeLabel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {formatCurrency(alert.amount, settings.currencySymbol)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setActiveTab('payroll');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                        >
                          Disburse
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
                </>
              );

            default:
              return null;
          }
        };

        return (
          <div className="space-y-6">
            {/* Admin Customizable Widget Toolbar */}
            {isAdmin && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Customizable Dashboard Widgets
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {visibleWidgetOrder.length} Active
                        </span>
                        {widgetLayout.hidden.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            {widgetLayout.hidden.length} Hidden
                          </span>
                        )}
                        {hasCustomWidgetLayout && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            Custom Order Saved
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {isCustomizeMode
                          ? 'Drag any widget card below to reorder, pin priority cards to top, or toggle visibility.'
                          : 'Prioritize key metrics like Today\'s Attendance or Recent Fee Payments to the top of your view.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {hasCustomWidgetLayout && (
                      <button
                        type="button"
                        onClick={handleResetWidgetLayout}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        title="Restore default dashboard widget order"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Default</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsCustomizeMode(prev => !prev)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                        isCustomizeMode
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isCustomizeMode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Done Customizing</span>
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Customize Layout</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Customize Controls: Quick Prioritize & Hidden Widgets */}
                {isCustomizeMode && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Quick Pin to Top:
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePinWidgetToTop('todays_attendance')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition cursor-pointer"
                      >
                        <Pin className="w-3 h-3" />
                        <span>Today&apos;s Attendance</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinWidgetToTop('recent_fee_payments')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                      >
                        <Pin className="w-3 h-3" />
                        <span>Recent Fee Payments</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinWidgetToTop('kpi_summary')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                      >
                        <Pin className="w-3 h-3" />
                        <span>Key Metrics Overview</span>
                      </button>
                    </div>

                    {widgetLayout.hidden.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Hidden Widgets (Click to Restore):
                        </span>
                        {widgetLayout.hidden.map(hiddenId => (
                          <button
                            key={hiddenId}
                            type="button"
                            onClick={() => handleShowWidget(hiddenId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{DASHBOARD_WIDGET_META[hiddenId].title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Success Notice if an absence was excused */}
            {excuseSuccessNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{excuseSuccessNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setExcuseSuccessNotice(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Sortable Dashboard Widgets Stack */}
            <div className="space-y-6">
              {visibleWidgetOrder.map((widgetId, idx) => (
                <SortableWidgetWrapper
                  key={widgetId}
                  widgetId={widgetId}
                  index={idx}
                  totalCount={visibleWidgetOrder.length}
                  isAdmin={isAdmin}
                  isCustomizeMode={isCustomizeMode}
                  isDragged={draggedWidgetId === widgetId}
                  isDragOver={dragOverWidgetId === widgetId}
                  onDragStart={handleWidgetDragStart}
                  onDragOver={handleWidgetDragOver}
                  onDrop={handleWidgetDrop}
                  onDragEnd={handleWidgetDragEnd}
                  onMoveUp={handleMoveWidgetUp}
                  onMoveDown={handleMoveWidgetDown}
                  onPinToTop={handlePinWidgetToTop}
                  onHideWidget={handleHideWidget}
                >
                  {renderDashboardWidget(widgetId)}
                </SortableWidgetWrapper>
              ))}
            </div>

            {/* Excuse / Mark Leave Modal */}
            {excuseModalTarget && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs">
                <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-2.5">
                      <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                        <CalendarCheck className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          Excuse Absence &amp; Sanction Leave
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Convert unexcused absence to verified leave record
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExcuseModalTarget(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 text-xs">
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {excuseModalTarget.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white">
                          {excuseModalTarget.type === 'student' ? 'Student' : 'Staff'}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                        {excuseModalTarget.meta} • Date: {formatDate(excuseModalTarget.latestDate)}
                      </p>
                    </div>

                    {excuseModalTarget.type === 'staff' && (
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Leave Category
                        </label>
                        <select
                          value={excuseLeaveType}
                          onChange={e => setExcuseLeaveType(e.target.value as any)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="casual">Casual Leave</option>
                          <option value="sick">Sick / Medical Leave</option>
                          <option value="paid">Paid Duty / Special Leave</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Reason / Excuse Documentation Note *
                      </label>
                      <textarea
                        rows={3}
                        value={excuseRemarks}
                        onChange={e => setExcuseRemarks(e.target.value)}
                        placeholder="Enter medical note, parent verbal authorization, or justification..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setExcuseModalTarget(null)}
                        className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isExcusing}
                        onClick={handleConfirmExcuse}
                        className="px-4 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        {isExcusing ? 'Saving...' : 'Confirm & Sanction Leave'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* QR Code ID Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        mode="attendance"
      />

      {/* Full Leaderboard & Badges Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
      />
    </div>
  );
};
