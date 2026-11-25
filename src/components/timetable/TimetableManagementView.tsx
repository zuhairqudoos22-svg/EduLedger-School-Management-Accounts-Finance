import React, { useState, useMemo, useEffect } from 'react';
import { useSchool } from '../../context/SchoolContext';
import { useAuth } from '../../context/AuthContext';
import { BackButton } from '../common/BackButton';
import { TimetableSlot, DayOfWeek, PeriodType } from '../../types';
import { TimetablePrintModal } from './TimetablePrintModal';
import { generateClassTimetablePdf, generateFacultyWorkloadPdf } from '../../utils/timetablePdf';
import { exportToExcel } from '../../utils/exportUtils';
import {
  CalendarDays,
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
  Printer,
  FileDown,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Sparkles,
  Layers,
  X,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Check,
  Zap,
  Info,
  GripVertical,
  Move,
  ArrowLeftRight,
  UserPlus,
  MousePointerClick,
} from 'lucide-react';

// Days of week
const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Standard default period timings
export interface PeriodDefinition {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

export const STANDARD_PERIODS: PeriodDefinition[] = [
  { periodNumber: 1, label: 'Period 1', startTime: '08:00 AM', endTime: '08:45 AM' },
  { periodNumber: 2, label: 'Period 2', startTime: '08:45 AM', endTime: '09:30 AM' },
  { periodNumber: 3, label: 'Period 3', startTime: '09:30 AM', endTime: '10:15 AM' },
  { periodNumber: 0, label: 'Recess Break', startTime: '10:15 AM', endTime: '10:45 AM', isBreak: true },
  { periodNumber: 4, label: 'Period 4', startTime: '10:45 AM', endTime: '11:30 AM' },
  { periodNumber: 5, label: 'Period 5', startTime: '11:30 AM', endTime: '12:15 PM' },
  { periodNumber: 6, label: 'Period 6', startTime: '12:15 PM', endTime: '01:00 PM' },
  { periodNumber: 7, label: 'Period 7', startTime: '01:00 PM', endTime: '01:40 PM' },
  { periodNumber: 8, label: 'Period 8', startTime: '01:40 PM', endTime: '02:20 PM' },
];

// Subject color theme helper
export const getSubjectTheme = (subjectName: string): { bg: string; text: string; border: string; badge: string; accent: string } => {
  const s = subjectName.toLowerCase();
  if (s.includes('math')) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
      accent: 'border-l-4 border-l-blue-500',
    };
  }
  if (s.includes('physics') || s.includes('chem') || s.includes('bio') || s.includes('science')) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300',
      accent: 'border-l-4 border-l-emerald-500',
    };
  }
  if (s.includes('computer') || s.includes('it') || s.includes('tech')) {
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300',
      accent: 'border-l-4 border-l-purple-500',
    };
  }
  if (s.includes('english')) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300',
      accent: 'border-l-4 border-l-amber-500',
    };
  }
  if (s.includes('urdu')) {
    return {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-200 dark:border-rose-800',
      badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300',
      accent: 'border-l-4 border-l-rose-500',
    };
  }
  if (s.includes('islam') || s.includes('ethic') || s.includes('quran')) {
    return {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      text: 'text-teal-700 dark:text-teal-300',
      border: 'border-teal-200 dark:border-teal-800',
      badge: 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300',
      accent: 'border-l-4 border-l-teal-500',
    };
  }
  if (s.includes('sport') || s.includes('physical') || s.includes('pt') || s.includes('game')) {
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/40',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300',
      accent: 'border-l-4 border-l-orange-500',
    };
  }
  if (s.includes('break') || s.includes('recess') || s.includes('lunch')) {
    return {
      bg: 'bg-slate-100 dark:bg-slate-800/60',
      text: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700',
      badge: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
      accent: 'border-l-4 border-l-slate-400',
    };
  }
  return {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
    accent: 'border-l-4 border-l-indigo-500',
  };
};

// Initial Seed Schedule for Class 9-A & Class 10-A
const getInitialSeedTimetable = (): TimetableSlot[] => {
  const seed: TimetableSlot[] = [];
  const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const schedulePlanClass9A: { period: number; subject: string; teacher: string; room: string; type: PeriodType }[] = [
    { period: 1, subject: 'Mathematics', teacher: 'Sarah Jenkins', room: 'Room 201', type: 'Lecture' },
    { period: 2, subject: 'English Language', teacher: 'David Sterling', room: 'Room 201', type: 'Lecture' },
    { period: 3, subject: 'Physics', teacher: 'Dr. Arthur Sterling', room: 'Physics Lab', type: 'Lab' },
    { period: 4, subject: 'Chemistry', teacher: 'Amina Khan', room: 'Chemistry Lab', type: 'Lecture' },
    { period: 5, subject: 'Computer Science', teacher: 'Faisal Mehmood', room: 'IT Lab 1', type: 'Lab' },
    { period: 6, subject: 'Urdu Literature', teacher: 'Muhammad Tariq', room: 'Room 201', type: 'Lecture' },
    { period: 7, subject: 'Islamic Studies', teacher: 'Hafiz Bilal', room: 'Room 201', type: 'Lecture' },
    { period: 8, subject: 'Physical Education', teacher: 'Coach Kamran', room: 'Sports Complex', type: 'Sports' },
  ];

  const schedulePlanClass10A: { period: number; subject: string; teacher: string; room: string; type: PeriodType }[] = [
    { period: 1, subject: 'Physics', teacher: 'Dr. Arthur Sterling', room: 'Room 302', type: 'Lecture' },
    { period: 2, subject: 'Mathematics', teacher: 'Sarah Jenkins', room: 'Room 302', type: 'Lecture' },
    { period: 3, subject: 'Chemistry', teacher: 'Amina Khan', room: 'Chemistry Lab', type: 'Lab' },
    { period: 4, subject: 'English Literature', teacher: 'David Sterling', room: 'Room 302', type: 'Lecture' },
    { period: 5, subject: 'Biology', teacher: 'Dr. Arthur Sterling', room: 'Bio Lab', type: 'Lab' },
    { period: 6, subject: 'Pakistan Studies', teacher: 'Muhammad Tariq', room: 'Room 302', type: 'Lecture' },
    { period: 7, subject: 'Computer Science', teacher: 'Faisal Mehmood', room: 'IT Lab 2', type: 'Lab' },
    { period: 8, subject: 'Library / Research', teacher: 'Zahra Hassan', room: 'Main Library', type: 'Library' },
  ];

  days.forEach(day => {
    // Class 9-A
    schedulePlanClass9A.forEach((item, idx) => {
      const rotatedIdx = (idx + days.indexOf(day)) % schedulePlanClass9A.length;
      const slot = schedulePlanClass9A[rotatedIdx];
      const periodDef = STANDARD_PERIODS.find(p => p.periodNumber === item.period);

      seed.push({
        id: `slot-9A-${day}-${item.period}`,
        className: 'Class 9',
        section: 'A',
        day,
        periodNumber: item.period,
        periodLabel: `Period ${item.period}`,
        startTime: periodDef?.startTime || '08:00 AM',
        endTime: periodDef?.endTime || '08:45 AM',
        subject: slot.subject,
        teacherName: slot.teacher,
        room: slot.room,
        periodType: slot.type,
      });
    });

    // Class 10-A
    schedulePlanClass10A.forEach((item, idx) => {
      const rotatedIdx = (idx + days.indexOf(day)) % schedulePlanClass10A.length;
      const slot = schedulePlanClass10A[rotatedIdx];
      const periodDef = STANDARD_PERIODS.find(p => p.periodNumber === item.period);

      seed.push({
        id: `slot-10A-${day}-${item.period}`,
        className: 'Class 10',
        section: 'A',
        day,
        periodNumber: item.period,
        periodLabel: `Period ${item.period}`,
        startTime: periodDef?.startTime || '08:00 AM',
        endTime: periodDef?.endTime || '08:45 AM',
        subject: slot.subject,
        teacherName: slot.teacher,
        room: slot.room,
        periodType: slot.type,
      });
    });
  });

  return seed;
};

// Types for Drag & Drop items
export type DraggedItem =
  | { type: 'slot'; slot: TimetableSlot }
  | { type: 'teacher'; teacherName: string; defaultSubject?: string }
  | { type: 'subject'; subjectName: string };

export const TimetableManagementView: React.FC = () => {
  const { setActiveTab, staff, settings } = useSchool();
  const { isAdmin } = useAuth();

  // Storage key
  const STORAGE_KEY = 'eduledger_timetable_schedules';

  // State: Timetable Slots
  const [slots, setSlots] = useState<TimetableSlot[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading timetable from storage:', e);
    }
    return getInitialSeedTimetable();
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    } catch (e) {
      console.error('Failed to save timetable to storage:', e);
    }
  }, [slots]);

  // Synchronize immediately if a full database backup is restored
  useEffect(() => {
    const handleRestoreEvent = (e: Event) => {
      const custom = e as CustomEvent<TimetableSlot[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setSlots(custom.detail);
      } else {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setSlots(parsed);
          }
        } catch {
          // Ignore
        }
      }
    };
    window.addEventListener('eduledger-timetable-updated', handleRestoreEvent);
    return () => window.removeEventListener('eduledger-timetable-updated', handleRestoreEvent);
  }, []);

  // View Mode: 'class-weekly' | 'teacher-schedule' | 'daily-master'
  const [viewMode, setViewMode] = useState<'class-weekly' | 'teacher-schedule' | 'daily-master'>('class-weekly');

  // Filter States
  const allClasses = useMemo(() => {
    const defaultClasses = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
    const fromSettings = settings.standardClasses || [];
    return Array.from(new Set([...defaultClasses, ...fromSettings]));
  }, [settings.standardClasses]);

  const allSections = useMemo(() => {
    const defaultSecs = ['A', 'B', 'C', 'D'];
    const fromSettings = settings.standardSections || [];
    return Array.from(new Set([...defaultSecs, ...fromSettings]));
  }, [settings.standardSections]);

  const [selectedClass, setSelectedClass] = useState<string>('Class 9');
  const [selectedSection, setSelectedSection] = useState<string>('A');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [selectedMasterDay, setSelectedMasterDay] = useState<DayOfWeek>('Monday');
  const [includeSaturday, setIncludeSaturday] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Drag and Drop States
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ day: DayOfWeek; periodNumber: number } | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(true);
  const [paletteTab, setPaletteTab] = useState<'instructors' | 'subjects'>('instructors');
  const [paletteSearch, setPaletteSearch] = useState<string>('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    className: 'Class 9',
    section: 'A',
    day: 'Monday' as DayOfWeek,
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subject: 'Mathematics',
    teacherName: '',
    room: 'Room 201',
    periodType: 'Lecture' as PeriodType,
    notes: '',
  });

  // Copy modal form state
  const [copyTargetClass, setCopyTargetClass] = useState<string>('Class 9');
  const [copyTargetSection, setCopyTargetSection] = useState<string>('B');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Pre-populate teachers list
  const teacherOptions = useMemo(() => {
    const names = staff.map(s => s.fullName).filter(Boolean);
    const existing = slots.map(s => s.teacherName).filter(Boolean);
    const combined = Array.from(new Set([...names, ...existing]));
    return combined.sort();
  }, [staff, slots]);

  // Set initial teacher for teacher view
  useEffect(() => {
    if (!selectedTeacher && teacherOptions.length > 0) {
      setSelectedTeacher(teacherOptions[0]);
    }
  }, [teacherOptions, selectedTeacher]);

  // Standard subjects list
  const standardSubjects = [
    'Mathematics',
    'English Language',
    'English Literature',
    'Physics',
    'Chemistry',
    'Biology',
    'Computer Science',
    'Urdu',
    'Islamic Studies',
    'Pakistan Studies',
    'General Science',
    'Social Studies',
    'Arts & Drawing',
    'Physical Education',
    'Library / Reading',
  ];

  // Active days to display
  const activeDays = useMemo(() => {
    return includeSaturday ? DAYS_OF_WEEK : DAYS_OF_WEEK.filter(d => d !== 'Saturday');
  }, [includeSaturday]);

  // Slots for the active selected class & section
  const currentClassSlots = useMemo(() => {
    return slots.filter(
      s => s.className === selectedClass && s.section === selectedSection
    );
  }, [slots, selectedClass, selectedSection]);

  // Conflict Detection: Double-booked teachers or rooms in the same day and period
  const conflicts = useMemo(() => {
    const list: { teacher: string; day: DayOfWeek; period: number; classes: string[] }[] = [];
    const teacherMap = new Map<string, TimetableSlot[]>();

    slots.forEach(slot => {
      if (!slot.teacherName || slot.periodType === 'Break') return;
      const key = `${slot.teacherName.toLowerCase()}_${slot.day}_${slot.periodNumber}`;
      const existing = teacherMap.get(key) || [];
      existing.push(slot);
      teacherMap.set(key, existing);
    });

    teacherMap.forEach((matchedSlots) => {
      if (matchedSlots.length > 1) {
        list.push({
          teacher: matchedSlots[0].teacherName,
          day: matchedSlots[0].day,
          period: matchedSlots[0].periodNumber,
          classes: matchedSlots.map(s => `${s.className}-${s.section} (${s.subject})`),
        });
      }
    });

    return list;
  }, [slots]);

  // Filtered staff list for palette
  const filteredPaletteStaff = useMemo(() => {
    const query = paletteSearch.trim().toLowerCase();
    return staff.filter(s => {
      if (!query) return true;
      return (
        s.fullName.toLowerCase().includes(query) ||
        (s.department && s.department.toLowerCase().includes(query)) ||
        (s.designation && s.designation.toLowerCase().includes(query))
      );
    });
  }, [staff, paletteSearch]);

  // Filtered subjects for palette
  const filteredPaletteSubjects = useMemo(() => {
    const query = paletteSearch.trim().toLowerCase();
    return standardSubjects.filter(subj => {
      if (!query) return true;
      return subj.toLowerCase().includes(query);
    });
  }, [standardSubjects, paletteSearch]);

  // DRAG & DROP HANDLERS
  const handleSlotDragStart = (e: React.DragEvent, slot: TimetableSlot) => {
    setDraggedItem({ type: 'slot', slot });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slot.id);
  };

  const handleTeacherDragStart = (e: React.DragEvent, teacherName: string, defaultSubject?: string) => {
    setDraggedItem({ type: 'teacher', teacherName, defaultSubject });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', teacherName);
  };

  const handleSubjectDragStart = (e: React.DragEvent, subjectName: string) => {
    setDraggedItem({ type: 'subject', subjectName });
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', subjectName);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCell(null);
  };

  const handleCellDragOver = (e: React.DragEvent, day: DayOfWeek, periodNumber: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedItem?.type === 'slot' ? 'move' : 'copy';
    if (!dragOverCell || dragOverCell.day !== day || dragOverCell.periodNumber !== periodNumber) {
      setDragOverCell({ day, periodNumber });
    }
  };

  const handleCellDragLeave = (e: React.DragEvent, day: DayOfWeek, periodNumber: number) => {
    e.preventDefault();
    if (dragOverCell?.day === day && dragOverCell?.periodNumber === periodNumber) {
      setDragOverCell(null);
    }
  };

  // DROP INTO A TIMETABLE CELL
  const handleCellDrop = (e: React.DragEvent, targetDay: DayOfWeek, targetPeriodNumber: number) => {
    e.preventDefault();
    setDragOverCell(null);
    if (!draggedItem) return;

    const targetPeriodDef = STANDARD_PERIODS.find(p => p.periodNumber === targetPeriodNumber) || STANDARD_PERIODS[0];
    const existingTargetSlot = currentClassSlots.find(
      s => s.day === targetDay && s.periodNumber === targetPeriodNumber
    );

    // 1. REARRANGE / SWAP EXISTING SLOTS
    if (draggedItem.type === 'slot') {
      const sourceSlot = draggedItem.slot;
      if (sourceSlot.day === targetDay && sourceSlot.periodNumber === targetPeriodNumber) {
        setDraggedItem(null);
        return; // Dropped on self
      }

      if (existingTargetSlot) {
        // SWAP the two periods
        const sourcePeriodDef = STANDARD_PERIODS.find(p => p.periodNumber === sourceSlot.periodNumber) || STANDARD_PERIODS[0];

        setSlots(prev =>
          prev.map(s => {
            if (s.id === sourceSlot.id) {
              return {
                ...s,
                day: targetDay,
                periodNumber: targetPeriodNumber,
                periodLabel: `Period ${targetPeriodNumber}`,
                startTime: targetPeriodDef.startTime,
                endTime: targetPeriodDef.endTime,
              };
            }
            if (s.id === existingTargetSlot.id) {
              return {
                ...s,
                day: sourceSlot.day,
                periodNumber: sourceSlot.periodNumber,
                periodLabel: `Period ${sourceSlot.periodNumber}`,
                startTime: sourcePeriodDef.startTime,
                endTime: sourcePeriodDef.endTime,
              };
            }
            return s;
          })
        );
        showToast(`Swapped "${sourceSlot.subject}" with "${existingTargetSlot.subject}".`);
      } else {
        // MOVE slot to empty cell
        setSlots(prev =>
          prev.map(s =>
            s.id === sourceSlot.id
              ? {
                  ...s,
                  day: targetDay,
                  periodNumber: targetPeriodNumber,
                  periodLabel: `Period ${targetPeriodNumber}`,
                  startTime: targetPeriodDef.startTime,
                  endTime: targetPeriodDef.endTime,
                }
              : s
          )
        );
        showToast(`Moved "${sourceSlot.subject}" to ${targetDay} Period ${targetPeriodNumber}.`);
      }
    }

    // 2. DROP AN INSTRUCTOR FROM PALETTE
    else if (draggedItem.type === 'teacher') {
      const teacherName = draggedItem.teacherName;
      const defaultSubj = draggedItem.defaultSubject || 'Mathematics';

      // Check for double-booking conflict
      const hasConflict = slots.some(
        s =>
          s.teacherName.toLowerCase() === teacherName.toLowerCase() &&
          s.day === targetDay &&
          s.periodNumber === targetPeriodNumber &&
          !(s.className === selectedClass && s.section === selectedSection)
      );

      if (existingTargetSlot) {
        setSlots(prev =>
          prev.map(s =>
            s.id === existingTargetSlot.id
              ? { ...s, teacherName }
              : s
          )
        );
        showToast(
          hasConflict
            ? `Assigned ${teacherName} to ${existingTargetSlot.subject} (Note: double-booked in another class)`
            : `Assigned ${teacherName} to ${existingTargetSlot.subject} on ${targetDay} Period ${targetPeriodNumber}.`
        );
      } else {
        const newSlot: TimetableSlot = {
          id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          className: selectedClass,
          section: selectedSection,
          day: targetDay,
          periodNumber: targetPeriodNumber,
          periodLabel: `Period ${targetPeriodNumber}`,
          startTime: targetPeriodDef.startTime,
          endTime: targetPeriodDef.endTime,
          subject: defaultSubj,
          teacherName,
          room: `Room ${selectedClass.replace(/\D/g, '') || '101'}`,
          periodType: 'Lecture',
          createdAt: new Date().toISOString(),
        };
        setSlots(prev => [...prev, newSlot]);
        showToast(
          hasConflict
            ? `Scheduled ${teacherName} for Period ${targetPeriodNumber} on ${targetDay} (Warning: double-booked)`
            : `Scheduled ${teacherName} (${defaultSubj}) for Period ${targetPeriodNumber} on ${targetDay}.`
        );
      }
    }

    // 3. DROP A SUBJECT FROM PALETTE
    else if (draggedItem.type === 'subject') {
      const subjectName = draggedItem.subjectName;
      // Match relevant teacher for this subject
      const matchedTeacher =
        teacherOptions.find(t => {
          const s = staff.find(st => st.fullName === t);
          return (
            s &&
            (s.department.toLowerCase().includes(subjectName.toLowerCase()) ||
              s.designation.toLowerCase().includes(subjectName.toLowerCase()))
          );
        }) ||
        teacherOptions[0] ||
        'Sarah Jenkins';

      if (existingTargetSlot) {
        setSlots(prev =>
          prev.map(s =>
            s.id === existingTargetSlot.id
              ? { ...s, subject: subjectName }
              : s
          )
        );
        showToast(`Updated Period ${targetPeriodNumber} to "${subjectName}".`);
      } else {
        const newSlot: TimetableSlot = {
          id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          className: selectedClass,
          section: selectedSection,
          day: targetDay,
          periodNumber: targetPeriodNumber,
          periodLabel: `Period ${targetPeriodNumber}`,
          startTime: targetPeriodDef.startTime,
          endTime: targetPeriodDef.endTime,
          subject: subjectName,
          teacherName: matchedTeacher,
          room: `Room ${selectedClass.replace(/\D/g, '') || '101'}`,
          periodType:
            subjectName.toLowerCase().includes('lab') || subjectName.toLowerCase().includes('computer')
              ? 'Lab'
              : subjectName.toLowerCase().includes('sport')
              ? 'Sports'
              : 'Lecture',
          createdAt: new Date().toISOString(),
        };
        setSlots(prev => [...prev, newSlot]);
        showToast(`Scheduled "${subjectName}" for ${targetDay} Period ${targetPeriodNumber}.`);
      }
    }

    setDraggedItem(null);
  };

  // Open modal to add a slot
  const handleOpenAddModal = (presetDay?: DayOfWeek, presetPeriod?: number) => {
    const targetPeriod = presetPeriod !== undefined ? presetPeriod : 1;
    const periodDef = STANDARD_PERIODS.find(p => p.periodNumber === targetPeriod) || STANDARD_PERIODS[0];

    setFormData({
      className: selectedClass,
      section: selectedSection,
      day: presetDay || 'Monday',
      periodNumber: targetPeriod,
      startTime: periodDef.startTime,
      endTime: periodDef.endTime,
      subject: 'Mathematics',
      teacherName: teacherOptions[0] || 'Sarah Jenkins',
      room: `Room ${selectedClass.replace(/\D/g, '') || '101'}`,
      periodType: 'Lecture',
      notes: '',
    });
    setEditingSlot(null);
    setIsModalOpen(true);
  };

  // Open modal to edit an existing slot
  const handleOpenEditModal = (slot: TimetableSlot) => {
    setFormData({
      className: slot.className,
      section: slot.section,
      day: slot.day,
      periodNumber: slot.periodNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subject: slot.subject,
      teacherName: slot.teacherName,
      room: slot.room || '',
      periodType: slot.periodType,
      notes: slot.notes || '',
    });
    setEditingSlot(slot);
    setIsModalOpen(true);
  };

  // Save Slot (Add or Update)
  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.className.trim()) return;

    if (editingSlot) {
      setSlots(prev =>
        prev.map(s =>
          s.id === editingSlot.id
            ? {
                ...s,
                ...formData,
                periodLabel: `Period ${formData.periodNumber}`,
              }
            : s
        )
      );
      showToast(`Updated "${formData.subject}" for ${formData.className}-${formData.section}.`);
    } else {
      const newSlot: TimetableSlot = {
        id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...formData,
        periodLabel: `Period ${formData.periodNumber}`,
        createdAt: new Date().toISOString(),
      };
      setSlots(prev => [...prev, newSlot]);
      showToast(`Scheduled "${formData.subject}" for ${formData.className}-${formData.section} on ${formData.day}.`);
    }
    setIsModalOpen(false);
  };

  // Delete Slot
  const handleDeleteSlot = (id: string, subject: string) => {
    if (confirm(`Remove "${subject}" from this schedule slot?`)) {
      setSlots(prev => prev.filter(s => s.id !== id));
      showToast(`Removed slot for "${subject}".`);
    }
  };

  // Auto-generate standard template for active class
  const handleAutoGenerateTemplate = () => {
    if (
      currentClassSlots.length > 0 &&
      !confirm(
        `Class ${selectedClass}-${selectedSection} already has ${currentClassSlots.length} scheduled periods. Replace them with standard timetable template?`
      )
    ) {
      return;
    }

    const standardCurriculum = [
      { subject: 'Mathematics', teacher: teacherOptions[0] || 'Sarah Jenkins', type: 'Lecture' as PeriodType },
      { subject: 'English Language', teacher: teacherOptions[1] || 'David Sterling', type: 'Lecture' as PeriodType },
      { subject: 'General Science', teacher: teacherOptions[2] || 'Amina Khan', type: 'Lecture' as PeriodType },
      { subject: 'Computer Science', teacher: teacherOptions[3] || 'Faisal Mehmood', type: 'Lab' as PeriodType },
      { subject: 'Urdu', teacher: teacherOptions[4] || 'Muhammad Tariq', type: 'Lecture' as PeriodType },
      { subject: 'Islamic Studies', teacher: teacherOptions[5] || 'Hafiz Bilal', type: 'Lecture' as PeriodType },
      { subject: 'Social Studies', teacher: teacherOptions[6] || 'Zahra Hassan', type: 'Lecture' as PeriodType },
      { subject: 'Physical Education', teacher: teacherOptions[7] || 'Coach Kamran', type: 'Sports' as PeriodType },
    ];

    const generated: TimetableSlot[] = [];
    const days: DayOfWeek[] = includeSaturday
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    days.forEach((day, dayIndex) => {
      [1, 2, 3, 4, 5, 6, 7, 8].forEach((periodNum, pIdx) => {
        const periodDef = STANDARD_PERIODS.find(p => p.periodNumber === periodNum);
        const subjItem = standardCurriculum[(pIdx + dayIndex) % standardCurriculum.length];

        generated.push({
          id: `gen-${selectedClass}-${selectedSection}-${day}-${periodNum}-${Date.now()}`,
          className: selectedClass,
          section: selectedSection,
          day,
          periodNumber: periodNum,
          periodLabel: `Period ${periodNum}`,
          startTime: periodDef?.startTime || '08:00 AM',
          endTime: periodDef?.endTime || '08:45 AM',
          subject: subjItem.subject,
          teacherName: subjItem.teacher,
          room: `Room ${selectedClass.replace(/\D/g, '') || '101'}`,
          periodType: subjItem.type,
        });
      });
    });

    setSlots(prev => [
      ...prev.filter(s => !(s.className === selectedClass && s.section === selectedSection)),
      ...generated,
    ]);

    showToast(`Generated full weekly timetable for ${selectedClass}-${selectedSection} (${generated.length} slots).`);
  };

  // Copy schedule from current class to another class/section
  const handleExecuteCopySchedule = () => {
    if (copyTargetClass === selectedClass && copyTargetSection === selectedSection) {
      alert('Source and target class/section cannot be identical.');
      return;
    }

    if (currentClassSlots.length === 0) {
      alert(`No schedule entries found to copy for ${selectedClass}-${selectedSection}.`);
      return;
    }

    const copiedSlots: TimetableSlot[] = currentClassSlots.map(s => ({
      ...s,
      id: `copy-${copyTargetClass}-${copyTargetSection}-${s.day}-${s.periodNumber}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      className: copyTargetClass,
      section: copyTargetSection,
      room: `Room ${copyTargetClass.replace(/\D/g, '') || '102'}`,
    }));

    setSlots(prev => [
      ...prev.filter(s => !(s.className === copyTargetClass && s.section === copyTargetSection)),
      ...copiedSlots,
    ]);

    setIsCopyModalOpen(false);
    showToast(`Successfully copied ${copiedSlots.length} schedule periods to ${copyTargetClass}-${copyTargetSection}.`);
  };

  // Export Timetable to CSV
  const handleExportCSV = () => {
    const targetSlots =
      viewMode === 'class-weekly'
        ? currentClassSlots
        : viewMode === 'teacher-schedule'
        ? slots.filter(s => s.teacherName.toLowerCase() === selectedTeacher.toLowerCase())
        : slots;

    const headers = ['Class', 'Section', 'Day', 'Period', 'Start Time', 'End Time', 'Subject', 'Teacher', 'Room', 'Period Type'];
    const rows = targetSlots.map(s => [
      `"${s.className}"`,
      `"${s.section}"`,
      `"${s.day}"`,
      s.periodNumber,
      `"${s.startTime}"`,
      `"${s.endTime}"`,
      `"${s.subject.replace(/"/g, '""')}"`,
      `"${s.teacherName.replace(/"/g, '""')}"`,
      `"${(s.room || '').replace(/"/g, '""')}"`,
      `"${s.periodType}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Timetable_${selectedClass}_${selectedSection}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${targetSlots.length} timetable records to CSV.`);
  };

  // Export Excel (.xlsx)
  const handleExportExcel = () => {
    const targetSlots =
      viewMode === 'class-weekly'
        ? slots.filter(s => s.className === selectedClass && s.section === selectedSection)
        : viewMode === 'teacher-schedule'
        ? slots.filter(s => s.teacherName.toLowerCase() === selectedTeacher.toLowerCase())
        : slots;

    const rows = targetSlots.map((s, idx) => ({
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
      `Timetable_${selectedClass}_${selectedSection}_${new Date().toISOString().split('T')[0]}`,
      'TimetableSchedule',
      rows as unknown as Record<string, unknown>[]
    );
    showToast(`Exported ${targetSlots.length} timetable records to Excel.`);
  };

  // Direct 1-Click Download PDF
  const handleDownloadPdf = () => {
    try {
      if (viewMode === 'teacher-schedule' && selectedTeacher) {
        generateFacultyWorkloadPdf({
          settings,
          teacherName: selectedTeacher,
          slots,
          periods: STANDARD_PERIODS,
          includeSaturday,
        });
        showToast(`Downloaded Faculty Schedule PDF for ${selectedTeacher}.`);
      } else {
        const targetSlots = slots.filter(s => s.className === selectedClass && s.section === selectedSection);
        generateClassTimetablePdf({
          settings,
          className: selectedClass,
          section: selectedSection,
          slots: targetSlots,
          periods: STANDARD_PERIODS,
          includeSaturday,
        });
        showToast(`Downloaded Official Timetable PDF for ${selectedClass} (${selectedSection}).`);
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating PDF document.');
    }
  };

  // Print Report: Formatted institutional print ledger for auditing
  const handlePrintReport = () => {
    document.body.classList.add('print-mode-timetable');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('print-mode-timetable');
    }, 1500);
  };

  // Quick stats for class weekly view
  const weeklyClassStats = useMemo(() => {
    const totalPeriods = currentClassSlots.length;
    const teachersAssigned = new Set(currentClassSlots.map(s => s.teacherName).filter(Boolean)).size;
    const subjectsCovered = new Set(currentClassSlots.map(s => s.subject).filter(Boolean)).size;
    const labPeriods = currentClassSlots.filter(s => s.periodType === 'Lab').length;
    return { totalPeriods, teachersAssigned, subjectsCovered, labPeriods };
  }, [currentClassSlots]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-between shadow-xl animate-in fade-in slide-in-from-top-2 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage('')}
            className="p-1 rounded-lg text-slate-400 hover:text-white dark:hover:text-slate-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <BackButton onClick={() => setActiveTab('dashboard')} label="Back to Home" />
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Class Timetable &amp; Schedule</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {slots.length} Total Slots
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Intuitive drag-and-drop schedule planner, faculty period allocation &amp; workload matrix.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export timetable to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          {/* Export Excel (.xlsx) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition active:scale-95 cursor-pointer"
            title="Export timetable to Excel spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Export Excel</span>
          </button>

          {/* Download PDF: Generates and downloads official institutional document */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition active:scale-95 cursor-pointer shadow-xs"
            title="Download official institutional timetable PDF"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Download PDF</span>
          </button>

          {/* Print Report: Formatted institutional print ledger for auditing */}
          <button
            type="button"
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition active:scale-95 cursor-pointer"
            title="Print formatted institutional ledger for auditing"
          >
            <Printer className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            <span>Print Report</span>
          </button>

          {/* Print & PDF Hub: All options & presets */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600/10 dark:bg-indigo-500/20 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-600/20 transition active:scale-95 cursor-pointer"
            title="All print, PDF and schedule documentation options"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Print &amp; PDF Hub</span>
          </button>

          {/* Copy Schedule */}
          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition active:scale-95 cursor-pointer"
            title="Duplicate timetable to another section"
          >
            <Copy className="w-3.5 h-3.5 text-purple-600" />
            <span>Copy Schedule</span>
          </button>

          {/* Auto Generate Template */}
          <button
            type="button"
            onClick={handleAutoGenerateTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition active:scale-95 cursor-pointer"
            title="Auto-fill complete balanced weekly template"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Auto Template</span>
          </button>

          {/* Add Slot */}
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Period Slot</span>
          </button>
        </div>
      </div>

      {/* Conflict Detection Alert Banner */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 shadow-xs flex items-start gap-3 print:hidden">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Schedule Conflict Detected ({conflicts.length} Overlapping Allocation{conflicts.length > 1 ? 's' : ''})
            </h4>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              The following faculty member is scheduled across multiple classes during the exact same period:
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {conflicts.map((c, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono text-[11px] font-semibold border border-amber-300/60"
                >
                  <strong>{c.teacher}</strong> on {c.day} Period {c.period}: {c.classes.join(' & ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View Switcher & Filter Ribbon */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 print:hidden">
        {/* Left: View Modes */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 w-fit">
          <button
            type="button"
            onClick={() => setViewMode('class-weekly')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'class-weekly'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Class Weekly View</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('teacher-schedule')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'teacher-schedule'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Teacher Workload</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('daily-master')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              viewMode === 'daily-master'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Daily Matrix</span>
          </button>
        </div>

        {/* Right: Dynamic Filters depending on View Mode */}
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'class-weekly' && (
            <>
              {/* Class Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Class:</span>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {allClasses.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Sec:</span>
                <select
                  value={selectedSection}
                  onChange={e => setSelectedSection(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                >
                  {allSections.map(s => (
                    <option key={s} value={s}>
                      Section {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {viewMode === 'teacher-schedule' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Teacher:</span>
              <select
                value={selectedTeacher}
                onChange={e => setSelectedTeacher(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {teacherOptions.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {viewMode === 'daily-master' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Day:</span>
              <select
                value={selectedMasterDay}
                onChange={e => setSelectedMasterDay(e.target.value as DayOfWeek)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {DAYS_OF_WEEK.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Saturday Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSaturday}
              onChange={e => setIncludeSaturday(e.target.checked)}
              className="w-3.5 h-3.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Include Saturday</span>
          </label>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DRAG-AND-DROP QUICK ASSIGNMENT PALETTE (Instructors & Subjects) */}
      {/* ============================================================== */}
      {viewMode === 'class-weekly' && (
        <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 shadow-xs overflow-hidden print:hidden transition">
          <div className="p-3.5 sm:p-4 border-b border-indigo-100/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                <MousePointerClick className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Quick Drag-and-Drop Assignment Palette
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Interactive
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Drag any instructor or subject chip below directly into any period slot on the grid, or drag periods to rearrange.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setPaletteTab('instructors')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                    paletteTab === 'instructors'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Instructors ({staff.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaletteTab('subjects')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                    paletteTab === 'subjects'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Subjects ({standardSubjects.length})</span>
                </button>
              </div>

              {/* Palette Toggle */}
              <button
                type="button"
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                {isPaletteOpen ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Palette Chips Tray */}
          {isPaletteOpen && (
            <div className="p-3.5 sm:p-4 space-y-2.5 animate-in fade-in">
              {/* Palette Quick Filter */}
              <div className="relative max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={paletteSearch}
                  onChange={e => setPaletteSearch(e.target.value)}
                  placeholder={
                    paletteTab === 'instructors'
                      ? 'Filter faculty by name or department...'
                      : 'Filter subjects...'
                  }
                  className="w-full pl-8 pr-3 py-1 rounded-lg text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                />
              </div>

              {/* Instructors Chips Tray */}
              {paletteTab === 'instructors' && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                  {filteredPaletteStaff.map(member => {
                    const teachingSlotsCount = slots.filter(
                      s => s.teacherName.toLowerCase() === member.fullName.toLowerCase()
                    ).length;

                    // Guess a primary subject from their department
                    const defaultSubj = member.department?.includes('Math')
                      ? 'Mathematics'
                      : member.department?.includes('English')
                      ? 'English Language'
                      : member.department?.includes('Science') || member.department?.includes('Physics')
                      ? 'Physics'
                      : member.department?.includes('IT') || member.department?.includes('Computer')
                      ? 'Computer Science'
                      : member.department?.includes('Urdu')
                      ? 'Urdu'
                      : 'Mathematics';

                    return (
                      <div
                        key={member.id}
                        draggable
                        onDragStart={e => handleTeacherDragStart(e, member.fullName, defaultSubj)}
                        onDragEnd={handleDragEnd}
                        className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-xs transition cursor-grab active:cursor-grabbing shrink-0 select-none"
                        title={`Drag ${member.fullName} (${defaultSubj}) to any period`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {member.fullName.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {member.fullName}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {member.designation || member.department || 'Faculty'} · {teachingSlotsCount} periods
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Subjects Chips Tray */}
              {paletteTab === 'subjects' && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                  {filteredPaletteSubjects.map(subject => {
                    const theme = getSubjectTheme(subject);
                    return (
                      <div
                        key={subject}
                        draggable
                        onDragStart={e => handleSubjectDragStart(e, subject)}
                        onDragEnd={handleDragEnd}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${theme.bg} ${theme.border} hover:shadow-xs transition cursor-grab active:cursor-grabbing shrink-0 select-none`}
                        title={`Drag ${subject} to any period`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
                        <span className={`text-xs font-bold ${theme.text}`}>{subject}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 1: CLASS WEEKLY SCHEDULE GRID (MAIN)                      */}
      {/* ============================================================== */}
      {viewMode === 'class-weekly' && (
        <div className="space-y-4">
          {/* Quick Stats Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Target Cohort</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {selectedClass} - Section {selectedSection}
              </p>
              <span className="text-[10px] text-slate-500">
                Academic Year {settings.currentAcademicYear || '2026-2027'}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Weekly Periods</span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {weeklyClassStats.totalPeriods} Slots
              </p>
              <span className="text-[10px] text-slate-500">Scheduled classroom hours</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Faculty Assigned</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {weeklyClassStats.teachersAssigned} Teachers
              </p>
              <span className="text-[10px] text-slate-500">
                Covering {weeklyClassStats.subjectsCovered} distinct subjects
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Practical / Labs</span>
              <p className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {weeklyClassStats.labPeriods} Sessions
              </p>
              <span className="text-[10px] text-slate-500">Hands-on laboratory hours</span>
            </div>
          </div>

          {/* Active Drag Hint Bar */}
          {draggedItem && (
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center justify-between shadow-md animate-in fade-in print:hidden">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 animate-bounce shrink-0" />
                <span>
                  {draggedItem.type === 'slot' && (
                    <>
                      Dragging <strong>"{draggedItem.slot.subject}"</strong>. Drop onto any slot to swap or move!
                    </>
                  )}
                  {draggedItem.type === 'teacher' && (
                    <>
                      Dragging instructor <strong>"{draggedItem.teacherName}"</strong>. Drop into any period cell to assign!
                    </>
                  )}
                  {draggedItem.type === 'subject' && (
                    <>
                      Dragging subject <strong>"{draggedItem.subjectName}"</strong>. Drop into any period cell to schedule!
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={handleDragEnd}
                className="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-[11px]"
              >
                Cancel Drag
              </button>
            </div>
          )}

          {/* Weekly Timetable Grid Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4 font-bold text-slate-500 uppercase tracking-wider text-[11px] min-w-[130px]">
                      Period / Time
                    </th>
                    {activeDays.map(day => (
                      <th
                        key={day}
                        className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200 text-center min-w-[170px]"
                      >
                        <div className="font-extrabold text-sm">{day}</div>
                        <div className="text-[10px] font-medium text-slate-400">
                          {currentClassSlots.filter(s => s.day === day).length} Periods
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {STANDARD_PERIODS.map(period => {
                    if (period.isBreak) {
                      return (
                        <tr
                          key="break-row"
                          className="bg-amber-50/50 dark:bg-amber-950/20 border-y border-amber-200/50 dark:border-amber-900/40"
                        >
                          <td className="py-2.5 px-4 font-bold text-amber-800 dark:text-amber-300">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{period.label}</span>
                            </div>
                            <div className="text-[10px] text-amber-600/80 font-mono mt-0.5">
                              {period.startTime} - {period.endTime}
                            </div>
                          </td>
                          <td
                            colSpan={activeDays.length}
                            className="py-2.5 px-4 text-center font-bold tracking-wider uppercase text-[11px] text-amber-700 dark:text-amber-300"
                          >
                            🍽️ Recess &amp; Midday Refreshment Break (30 Minutes)
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={period.periodNumber} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition">
                        {/* Period Header Column */}
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                          <div className="text-xs font-black">{period.label}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {period.startTime} - {period.endTime}
                          </div>
                        </td>

                        {/* Each Day Cell */}
                        {activeDays.map(day => {
                          const slot = currentClassSlots.find(
                            s => s.day === day && s.periodNumber === period.periodNumber
                          );
                          const isDropTarget =
                            dragOverCell?.day === day && dragOverCell?.periodNumber === period.periodNumber;
                          const isBeingDragged =
                            draggedItem?.type === 'slot' && draggedItem.slot.id === slot?.id;

                          if (slot) {
                            const theme = getSubjectTheme(slot.subject);
                            return (
                              <td
                                key={day}
                                className={`py-2 px-2 align-top transition-all ${
                                  isDropTarget
                                    ? 'bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500 scale-[1.01] rounded-xl'
                                    : ''
                                }`}
                                onDragOver={e => handleCellDragOver(e, day, period.periodNumber)}
                                onDragLeave={e => handleCellDragLeave(e, day, period.periodNumber)}
                                onDrop={e => handleCellDrop(e, day, period.periodNumber)}
                              >
                                <div
                                  draggable
                                  onDragStart={e => handleSlotDragStart(e, slot)}
                                  onDragEnd={handleDragEnd}
                                  className={`p-2.5 rounded-xl border ${theme.bg} ${theme.border} ${theme.accent} transition group relative select-none cursor-grab active:cursor-grabbing hover:shadow-xs ${
                                    isBeingDragged ? 'opacity-40 border-dashed border-indigo-400' : ''
                                  }`}
                                >
                                  {/* Subject & Type with Drag Handle */}
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <GripVertical className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 cursor-grab" />
                                      <div className={`font-bold text-xs ${theme.text} leading-tight truncate`}>
                                        {slot.subject}
                                      </div>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold ${theme.badge} shrink-0`}
                                    >
                                      {slot.periodType}
                                    </span>
                                  </div>

                                  {/* Teacher */}
                                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1.5 truncate">
                                    <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{slot.teacherName}</span>
                                  </div>

                                  {/* Room / Facility */}
                                  {slot.room && (
                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      <span>{slot.room}</span>
                                    </div>
                                  )}

                                  {/* Quick Actions (Hover overlay) */}
                                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition print:hidden bg-white/90 dark:bg-slate-900/90 rounded-md p-0.5 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(slot)}
                                      className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                                      title="Edit Period"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSlot(slot.id, slot.subject)}
                                      className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                                      title="Delete Slot"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {/* Drop to Swap indicator overlay */}
                                  {isDropTarget && (
                                    <div className="absolute inset-0 bg-indigo-600/90 rounded-xl flex items-center justify-center gap-1 text-white text-[11px] font-bold animate-in zoom-in-95 pointer-events-none">
                                      <ArrowLeftRight className="w-3.5 h-3.5" />
                                      <span>Swap with {slot.subject}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          // Empty Slot with Drop target & Add button
                          return (
                            <td
                              key={day}
                              className={`py-2 px-2 align-middle text-center transition-all ${
                                isDropTarget
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500 scale-[1.01] rounded-xl'
                                  : ''
                              }`}
                              onDragOver={e => handleCellDragOver(e, day, period.periodNumber)}
                              onDragLeave={e => handleCellDragLeave(e, day, period.periodNumber)}
                              onDrop={e => handleCellDrop(e, day, period.periodNumber)}
                            >
                              {isDropTarget ? (
                                <div className="py-4 rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-100/50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1.5 animate-in fade-in">
                                  <Plus className="w-4 h-4 animate-spin" />
                                  <span>Drop to Assign Here</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddModal(day, period.periodNumber)}
                                  className="w-full py-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer group print:hidden"
                                  title={`Add class or drop instructor for ${day} Period ${period.periodNumber}`}
                                >
                                  <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition" />
                                  <span className="text-[11px]">Assign / Drop</span>
                                </button>
                              )}
                              <div className="hidden print:block text-slate-300 text-[10px]">Free Period</div>
                            </td>
                          );
                        })}
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
      {/* VIEW 2: TEACHER WORKLOAD & WEEKLY TEACHING SCHEDULE            */}
      {/* ============================================================== */}
      {viewMode === 'teacher-schedule' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Teaching Dossier: {selectedTeacher || 'Faculty'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Allocated Periods:{' '}
                <strong className="text-indigo-600 font-mono">
                  {slots.filter(s => s.teacherName.toLowerCase() === selectedTeacher.toLowerCase()).length} Periods / Week
                </strong>
              </p>
            </div>
          </div>

          {/* Teacher Weekly Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[11px] min-w-[130px]">
                      Period / Time
                    </th>
                    {activeDays.map(day => (
                      <th key={day} className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 text-center min-w-[160px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {STANDARD_PERIODS.map(period => {
                    if (period.isBreak) {
                      return (
                        <tr key="break-row" className="bg-slate-100/60 dark:bg-slate-800/40 text-center text-slate-500 font-semibold text-[11px]">
                          <td className="py-2 px-4 text-left font-bold">{period.label}</td>
                          <td colSpan={activeDays.length} className="py-2">
                            Recess &amp; Staff Tea Break
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={period.periodNumber} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                          <div>{period.label}</div>
                          <div className="text-[10px] font-mono text-slate-400">{period.startTime}</div>
                        </td>

                        {activeDays.map(day => {
                          const slot = slots.find(
                            s =>
                              s.day === day &&
                              s.periodNumber === period.periodNumber &&
                              s.teacherName.toLowerCase() === selectedTeacher.toLowerCase()
                          );

                          if (slot) {
                            const theme = getSubjectTheme(slot.subject);
                            return (
                              <td key={day} className="py-2 px-2">
                                <div className={`p-2.5 rounded-xl border ${theme.bg} ${theme.border}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                      {slot.className}-{slot.section}
                                    </span>
                                    <span className={`text-[9px] px-1.5 py-0.2 font-bold rounded ${theme.badge}`}>
                                      {slot.periodType}
                                    </span>
                                  </div>
                                  <div className={`font-bold text-xs ${theme.text} mt-1`}>{slot.subject}</div>
                                  {slot.room && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                      <Building2 className="w-3 h-3 text-slate-400" />
                                      <span>{slot.room}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={day} className="py-2 px-2 text-center text-slate-300 dark:text-slate-600 text-xs">
                              <span className="inline-block py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-400 text-[11px] font-medium">
                                Free Period
                              </span>
                            </td>
                          );
                        })}
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
      {/* VIEW 3: MASTER DAILY MATRIX (ALL CLASSES FOR ONE DAY)           */}
      {/* ============================================================== */}
      {viewMode === 'daily-master' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Institutional Master Matrix for {selectedMasterDay}</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Real-time cross-campus period layout
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 font-bold text-slate-500 uppercase text-[11px] min-w-[100px]">
                      Class &amp; Sec
                    </th>
                    {STANDARD_PERIODS.filter(p => !p.isBreak).map(p => (
                      <th key={p.periodNumber} className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200 text-center min-w-[140px]">
                        <div className="font-bold">{p.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.startTime}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {allClasses.slice(0, 8).map(cls => (
                    <tr key={cls} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-800/30">
                        {cls}-A
                      </td>
                      {STANDARD_PERIODS.filter(p => !p.isBreak).map(period => {
                        const slot = slots.find(
                          s =>
                            s.className === cls &&
                            s.section === 'A' &&
                            s.day === selectedMasterDay &&
                            s.periodNumber === period.periodNumber
                        );

                        if (slot) {
                          const theme = getSubjectTheme(slot.subject);
                          return (
                            <td key={period.periodNumber} className="py-2 px-2">
                              <div className={`p-2 rounded-xl border ${theme.bg} ${theme.border}`}>
                                <div className={`font-bold text-xs ${theme.text} truncate`}>{slot.subject}</div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                                  {slot.teacherName}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={period.periodNumber} className="py-2 px-2 text-center text-slate-300 dark:text-slate-700">
                            -
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* OFFICIAL PRINTABLE TIMETABLE TEMPLATE                           */}
      {/* ============================================================== */}
      <div id="printable-timetable-document" className="hidden print:block p-6 bg-white text-slate-900 w-full">
        {/* Header Banner */}
        <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
          <h1 className="text-2xl font-black tracking-wide uppercase text-slate-900">
            {settings.schoolName || 'NextGen International Academy'}
          </h1>
          <h2 className="text-sm font-bold text-slate-700 mt-1 uppercase tracking-wider">
            {viewMode === 'teacher-schedule' && selectedTeacher
              ? `Faculty Workload Schedule & Assignment — ${selectedTeacher}`
              : `Official Weekly Academic Timetable — ${selectedClass} (Section ${selectedSection})`}
          </h2>
          <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200">
            <span>Academic Year: {settings.currentAcademicYear || '2026-2027'}</span>
            <span>Room: {selectedClass.replace(/\D/g, '') ? `Room ${selectedClass.replace(/\D/g, '')}` : 'Room 101'}</span>
            <span>Generated Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="my-5">
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold">
                <th className="border border-slate-400 p-2 text-center w-24">Day / Period</th>
                {STANDARD_PERIODS.map(p => (
                  <th key={p.periodNumber} className="border border-slate-400 p-2 text-center">
                    <div>{p.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{p.startTime} - {p.endTime}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(includeSaturday ? DAYS_OF_WEEK : DAYS_OF_WEEK.filter(d => d !== 'Saturday')).map(day => (
                <tr key={day} className="border-b border-slate-300">
                  <td className="border border-slate-400 p-2 font-bold text-center bg-slate-50">
                    {day}
                  </td>
                  {STANDARD_PERIODS.map(period => {
                    if (period.isBreak) {
                      return (
                        <td
                          key={period.periodNumber}
                          className="border border-slate-400 bg-amber-50 text-amber-900 text-center font-bold text-[10px] p-1"
                        >
                          RECESS BREAK
                        </td>
                      );
                    }

                    const slot = slots.find(s => {
                      if (viewMode === 'teacher-schedule' && selectedTeacher) {
                        return s.teacherName.toLowerCase() === selectedTeacher.toLowerCase() && s.day === day && s.periodNumber === period.periodNumber;
                      }
                      return s.className === selectedClass && s.section === selectedSection && s.day === day && s.periodNumber === period.periodNumber;
                    });

                    return (
                      <td key={period.periodNumber} className="border border-slate-400 p-2 text-center">
                        {slot ? (
                          <div>
                            <div className="font-bold text-slate-900">{slot.subject}</div>
                            <div className="text-[10px] text-slate-600 mt-0.5">
                              {viewMode === 'teacher-schedule' ? `${slot.className}-${slot.section}` : slot.teacherName || 'TBA'}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5">
                              {slot.room || 'Room'} • {slot.periodType}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Institutional Sign-off Block */}
        <div className="pt-8 mt-8 border-t border-slate-300 grid grid-cols-3 text-center text-xs">
          <div>
            <div className="w-40 border-b border-slate-800 mx-auto mb-1"></div>
            <span className="font-bold">Class Teacher Signature</span>
            <div className="text-[10px] text-slate-400 mt-0.5">Mentor Assigned</div>
          </div>
          <div>
            <div className="w-40 border-b border-slate-800 mx-auto mb-1"></div>
            <span className="font-bold">Academic Coordinator</span>
            <div className="text-[10px] text-slate-400 mt-0.5">Curriculum &amp; Scheduling</div>
          </div>
          <div>
            <div className="w-40 border-b border-slate-800 mx-auto mb-1"></div>
            <span className="font-bold">Principal's Official Stamp</span>
            <div className="text-[10px] text-slate-400 mt-0.5">{settings.schoolName || 'Administration'}</div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
          Official Institutional Document • NextGen Educational Management ERP • Page 1 of 1
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT PERIOD SLOT                                  */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingSlot ? 'Edit Period Allocation' : 'Schedule New Period Slot'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assign subject, faculty member, timing, and classroom facility.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Class */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Class *
                  </label>
                  <select
                    value={formData.className}
                    onChange={e => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    {allClasses.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Section *
                  </label>
                  <select
                    value={formData.section}
                    onChange={e => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    {allSections.map(s => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Day */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Day of Week *
                  </label>
                  <select
                    value={formData.day}
                    onChange={e => setFormData({ ...formData, day: e.target.value as DayOfWeek })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    {activeDays.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Period Number *
                  </label>
                  <select
                    value={formData.periodNumber}
                    onChange={e => {
                      const num = Number(e.target.value);
                      const periodDef = STANDARD_PERIODS.find(p => p.periodNumber === num);
                      setFormData({
                        ...formData,
                        periodNumber: num,
                        startTime: periodDef?.startTime || formData.startTime,
                        endTime: periodDef?.endTime || formData.endTime,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <option key={p} value={p}>
                        Period {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 08:00 AM"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 08:45 AM"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>

                {/* Subject */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subject Name *
                  </label>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mathematics"
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold"
                    />
                    {/* Quick Subject Suggestions */}
                    <div className="flex flex-wrap gap-1">
                      {standardSubjects.slice(0, 8).map(subj => (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => setFormData({ ...formData, subject: subj })}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition"
                        >
                          {subj}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Teacher */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Teacher / Faculty *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Select or enter teacher name"
                    value={formData.teacherName}
                    onChange={e => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium mb-1"
                  />
                  {teacherOptions.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {teacherOptions.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, teacherName: t })}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Room */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room / Campus Facility
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 201, Physics Lab"
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                  />
                </div>

                {/* Period Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Period Type
                  </label>
                  <select
                    value={formData.periodType}
                    onChange={e => setFormData({ ...formData, periodType: e.target.value as PeriodType })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    <option value="Lecture">Lecture</option>
                    <option value="Lab">Practical / Lab</option>
                    <option value="Sports">Sports / Physical Ed</option>
                    <option value="Library">Library &amp; Study</option>
                    <option value="Break">Break</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
                >
                  {editingSlot ? 'Update Period Slot' : 'Save to Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: COPY SCHEDULE TO ANOTHER CLASS / SECTION                */}
      {/* ============================================================== */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Duplicate Timetable Schedule
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Copy all <strong className="text-indigo-600 font-bold">{currentClassSlots.length} periods</strong> from{' '}
                <strong className="text-slate-900 dark:text-white">{selectedClass} - Section {selectedSection}</strong> to
                another classroom. Existing periods in the target section will be updated.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Class
                  </label>
                  <select
                    value={copyTargetClass}
                    onChange={e => setCopyTargetClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    {allClasses.map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Section
                  </label>
                  <select
                    value={copyTargetSection}
                    onChange={e => setCopyTargetSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-semibold cursor-pointer"
                  >
                    {allSections.map(s => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-purple-800 dark:text-purple-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Tip: Useful for setting up parallel sections (e.g. Class 9-B from Class 9-A) with the same period structure!
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCopyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleExecuteCopySchedule}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  Copy All Periods
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ============================================================== */}
      {/* MODAL: TIMETABLE PRINT & PDF DOCUMENTATION HUB                  */}
      {/* ============================================================== */}
      <TimetablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        settings={settings}
        slots={slots}
        periods={STANDARD_PERIODS}
        allClasses={allClasses}
        allSections={allSections}
        initialClass={selectedClass}
        initialSection={selectedSection}
        teachersList={teacherOptions}
        initialTeacher={selectedTeacher}
        showToast={showToast}
      />
    </div>
  );
};
