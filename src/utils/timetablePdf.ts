import jsPDF from 'jspdf';
import { TimetableSlot, SchoolSettings, DayOfWeek } from '../types';

export interface PeriodTimingDef {
  periodNumber: number;
  label: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

interface ClassTimetablePdfOptions {
  settings: SchoolSettings;
  className: string;
  section: string;
  slots: TimetableSlot[];
  periods: PeriodTimingDef[];
  includeSaturday?: boolean;
  notes?: string;
}

interface FacultySchedulePdfOptions {
  settings: SchoolSettings;
  teacherName: string;
  slots: TimetableSlot[];
  periods: PeriodTimingDef[];
  includeSaturday?: boolean;
}

interface MasterDailyPdfOptions {
  settings: SchoolSettings;
  day: DayOfWeek;
  allClasses: string[];
  allSections: string[];
  slots: TimetableSlot[];
  periods: PeriodTimingDef[];
}

/**
 * Generates an official Weekly Class Timetable PDF
 */
export function generateClassTimetablePdf({
  settings,
  className,
  section,
  slots,
  periods,
  includeSaturday = false,
  notes,
}: ClassTimetablePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm
  const margin = 12;
  const days: DayOfWeek[] = includeSaturday
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const schoolName = settings.schoolName || 'NextGen International Academy';

  // 1. Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent Line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 25, pageWidth, 1.5, 'F');

  // School Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(schoolName.toUpperCase(), margin, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(
    `OFFICIAL CLASS WEEKLY SCHEDULE & TIMETABLE — ${className.toUpperCase()} (SECTION ${section.toUpperCase()})`,
    margin,
    16
  );

  const metaRight = `ACADEMIC YEAR: ${settings.currentAcademicYear || '2026-2027'}  |  ROOM: ${className.replace(/\D/g, '') || '101'}  |  ISSUED: ${new Date().toLocaleDateString()}`;
  doc.text(metaRight, pageWidth - margin - doc.getTextWidth(metaRight), 16);

  let y = 32;

  // 2. Summary stats bar
  const totalSlotsCount = slots.length;
  const uniqueTeachers = new Set(slots.map(s => s.teacherName).filter(Boolean)).size;
  const uniqueSubjects = new Set(slots.map(s => s.subject).filter(Boolean)).size;
  const labPeriods = slots.filter(s => s.periodType === 'Lab').length;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, 'FD');

  const stats = [
    { label: 'CLASSROOM', val: `${className} - Section ${section}` },
    { label: 'TOTAL PERIODS/WEEK', val: `${totalSlotsCount} Scheduled` },
    { label: 'UNIQUE SUBJECTS', val: `${uniqueSubjects} Subjects` },
    { label: 'FACULTY ASSIGNED', val: `${uniqueTeachers} Teachers` },
    { label: 'LAB/PRACTICALS', val: `${labPeriods} Sessions` },
    { label: 'OPERATING DAYS', val: includeSaturday ? '6 Days (Mon - Sat)' : '5 Days (Mon - Fri)' },
  ];

  const statWidth = (pageWidth - 2 * margin) / stats.length;
  stats.forEach((st, idx) => {
    const sx = margin + idx * statWidth + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(st.label, sx, y + 4.5);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(st.val, sx, y + 9.5);
  });

  y += 16;

  // 3. Grid Table
  // Left column for Days, remaining width divided across periods
  const dayColWidth = 26;
  const periodColsCount = periods.length;
  const availableWidth = pageWidth - 2 * margin - dayColWidth;
  const periodColWidth = availableWidth / periodColsCount;

  // Draw Table Header (Periods & Timings)
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - 2 * margin, 13, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - 2 * margin, 13, 'S');

  // Day header label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('DAY / PERIOD', margin + dayColWidth / 2, y + 8, { align: 'center' });

  // Draw each period header
  periods.forEach((p, pIdx) => {
    const px = margin + dayColWidth + pIdx * periodColWidth;
    doc.line(px, y, px, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(p.isBreak ? 180 : 30, p.isBreak ? 83 : 41, p.isBreak ? 9 : 59);
    doc.text(p.label, px + periodColWidth / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${p.startTime} - ${p.endTime}`, px + periodColWidth / 2, y + 10, { align: 'center' });
  });

  y += 13;

  // Row height for each day
  const rowHeight = Math.min(22, (pageHeight - y - 36) / days.length);

  days.forEach((day, dIdx) => {
    const ry = y + dIdx * rowHeight;

    // Day label background
    doc.setFillColor(dIdx % 2 === 0 ? 255 : 248, dIdx % 2 === 0 ? 255 : 250, dIdx % 2 === 0 ? 255 : 252);
    doc.rect(margin, ry, pageWidth - 2 * margin, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, ry, pageWidth - 2 * margin, rowHeight, 'S');

    // Day text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(day, margin + dayColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });

    // Inner columns for periods
    periods.forEach((p, pIdx) => {
      const px = margin + dayColWidth + pIdx * periodColWidth;
      doc.line(px, ry, px, ry + rowHeight);

      if (p.isBreak) {
        doc.setFillColor(254, 243, 199); // amber-100
        doc.rect(px + 0.5, ry + 0.5, periodColWidth - 1, rowHeight - 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9);
        doc.text('RECESS', px + periodColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });
        return;
      }

      // Find slot
      const slot = slots.find(s => s.day === day && s.periodNumber === p.periodNumber);
      if (slot) {
        // Slot background based on type
        if (slot.periodType === 'Lab') {
          doc.setFillColor(238, 242, 255); // indigo-50
          doc.rect(px + 0.5, ry + 0.5, periodColWidth - 1, rowHeight - 1, 'F');
        } else if (slot.periodType === 'Sports') {
          doc.setFillColor(236, 253, 245); // emerald-50
          doc.rect(px + 0.5, ry + 0.5, periodColWidth - 1, rowHeight - 1, 'F');
        }

        // Subject name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        const subj = slot.subject.length > 18 ? slot.subject.substring(0, 16) + '...' : slot.subject;
        doc.text(subj, px + periodColWidth / 2, ry + 5.5, { align: 'center' });

        // Teacher
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        const tchr = (slot.teacherName || 'TBA').length > 18 ? (slot.teacherName || 'TBA').substring(0, 16) + '...' : (slot.teacherName || 'TBA');
        doc.text(tchr, px + periodColWidth / 2, ry + 10, { align: 'center' });

        // Room + Type badge
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        const roomStr = `${slot.room || 'Room'} • ${slot.periodType}`;
        doc.text(roomStr, px + periodColWidth / 2, ry + 14, { align: 'center' });
      } else {
        // Free period
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(203, 213, 225);
        doc.text('— Free / Study —', px + periodColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });
      }
    });
  });

  y += days.length * rowHeight + 6;

  // 4. Institutional Sign-off Block
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const signColWidth = (pageWidth - 2 * margin) / 3;
  const signSections = [
    { title: 'Class Teacher Signature', sub: `Assigned: ${slots[0]?.teacherName || 'Class Mentor'}` },
    { title: 'Academic / Timetable Coordinator', sub: 'Curriculum & Scheduling Directorate' },
    { title: "Principal's Official Stamp & Seal", sub: `${schoolName} Administration` },
  ];

  signSections.forEach((sig, idx) => {
    const sx = margin + idx * signColWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(sig.title, sx + 5, y);

    doc.setDrawColor(148, 163, 184);
    doc.line(sx + 5, y + 10, sx + signColWidth - 15, y + 10);

    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(`Sign & Date: _________________  (${sig.sub})`, sx + 5, y + 14);
  });

  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `CONFIDENTIAL OFFICIAL ACADEMIC DOCUMENT — GENERATED ON ${new Date().toLocaleString()} FOR INSTITUTIONAL DISPLAY AND STUDENT RECORDS.`,
    margin,
    pageHeight - 4
  );

  const filename = `Class_Timetable_${className.replace(/\s+/g, '_')}_Sec_${section}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return doc;
}

/**
 * Generates an official Teacher Faculty Workload & Schedule PDF
 */
export function generateFacultyWorkloadPdf({
  settings,
  teacherName,
  slots,
  periods,
  includeSaturday = false,
}: FacultySchedulePdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const days: DayOfWeek[] = includeSaturday
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const schoolName = settings.schoolName || 'NextGen International Academy';
  const teacherSlots = slots.filter(s => s.teacherName.toLowerCase() === teacherName.toLowerCase());

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(16, 185, 129); // emerald-500 accent for faculty
  doc.rect(0, 25, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(schoolName.toUpperCase(), margin, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`FACULTY WORKLOAD MATRIX & WEEKLY ASSIGNMENT — INSTRUCTOR: ${teacherName.toUpperCase()}`, margin, 16);

  const metaRight = `ACADEMIC YEAR: ${settings.currentAcademicYear || '2026-2027'}  |  DATE: ${new Date().toLocaleDateString()}`;
  doc.text(metaRight, pageWidth - margin - doc.getTextWidth(metaRight), 16);

  let y = 32;

  // Summary bar
  const totalPeriodsTaught = teacherSlots.length;
  const classesCovered = Array.from(new Set(teacherSlots.map(s => `${s.className}-${s.section}`)));
  const subjectsTaught = Array.from(new Set(teacherSlots.map(s => s.subject)));

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, 'FD');

  const stats = [
    { label: 'FACULTY MEMBER', val: teacherName },
    { label: 'TOTAL WEEKLY PERIODS', val: `${totalPeriodsTaught} Periods` },
    { label: 'CLASSES ALLOCATED', val: classesCovered.join(', ') || 'None' },
    { label: 'SUBJECTS TAUGHT', val: subjectsTaught.join(', ') || 'None' },
    { label: 'WORKLOAD INTENSITY', val: totalPeriodsTaught > 25 ? 'High (25+ hrs)' : 'Standard (Balanced)' },
  ];

  const statWidth = (pageWidth - 2 * margin) / stats.length;
  stats.forEach((st, idx) => {
    const sx = margin + idx * statWidth + 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(st.label, sx, y + 4.5);

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const valText = st.val.length > 25 ? st.val.substring(0, 23) + '...' : st.val;
    doc.text(valText, sx, y + 9.5);
  });

  y += 16;

  // Grid
  const dayColWidth = 26;
  const periodColsCount = periods.length;
  const availableWidth = pageWidth - 2 * margin - dayColWidth;
  const periodColWidth = availableWidth / periodColsCount;

  // Header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - 2 * margin, 13, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - 2 * margin, 13, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('DAY / PERIOD', margin + dayColWidth / 2, y + 8, { align: 'center' });

  periods.forEach((p, pIdx) => {
    const px = margin + dayColWidth + pIdx * periodColWidth;
    doc.line(px, y, px, y + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(p.isBreak ? 180 : 30, p.isBreak ? 83 : 41, p.isBreak ? 9 : 59);
    doc.text(p.label, px + periodColWidth / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${p.startTime} - ${p.endTime}`, px + periodColWidth / 2, y + 10, { align: 'center' });
  });

  y += 13;

  const rowHeight = Math.min(22, (pageHeight - y - 36) / days.length);

  days.forEach((day, dIdx) => {
    const ry = y + dIdx * rowHeight;

    doc.setFillColor(dIdx % 2 === 0 ? 255 : 248, dIdx % 2 === 0 ? 255 : 250, dIdx % 2 === 0 ? 255 : 252);
    doc.rect(margin, ry, pageWidth - 2 * margin, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, ry, pageWidth - 2 * margin, rowHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(day, margin + dayColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });

    periods.forEach((p, pIdx) => {
      const px = margin + dayColWidth + pIdx * periodColWidth;
      doc.line(px, ry, px, ry + rowHeight);

      if (p.isBreak) {
        doc.setFillColor(254, 243, 199);
        doc.rect(px + 0.5, ry + 0.5, periodColWidth - 1, rowHeight - 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9);
        doc.text('RECESS', px + periodColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });
        return;
      }

      const slot = teacherSlots.find(s => s.day === day && s.periodNumber === p.periodNumber);
      if (slot) {
        doc.setFillColor(236, 253, 245);
        doc.rect(px + 0.5, ry + 0.5, periodColWidth - 1, rowHeight - 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 78, 59);
        doc.text(`${slot.className} - ${slot.section}`, px + periodColWidth / 2, ry + 5.5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(slot.subject, px + periodColWidth / 2, ry + 10, { align: 'center' });

        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(`${slot.room || 'Room'} • ${slot.periodType}`, px + periodColWidth / 2, ry + 14, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(203, 213, 225);
        doc.text('— Preparation / Off —', px + periodColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });
      }
    });
  });

  y += days.length * rowHeight + 6;

  // Sign-off
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const signColWidth = (pageWidth - 2 * margin) / 3;
  const signs = [
    { title: 'Faculty Signature', sub: teacherName },
    { title: 'Dean / Academic Head', sub: 'Department of Instruction' },
    { title: 'Principal Stamp', sub: schoolName },
  ];

  signs.forEach((sig, idx) => {
    const sx = margin + idx * signColWidth;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(sig.title, sx + 5, y);

    doc.setDrawColor(148, 163, 184);
    doc.line(sx + 5, y + 10, sx + signColWidth - 15, y + 10);

    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(`Sign & Date: _________________  (${sig.sub})`, sx + 5, y + 14);
  });

  const filename = `Faculty_Schedule_${teacherName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return doc;
}

/**
 * Generates an official Master Daily Timetable across all classrooms
 */
export function generateMasterDailySchedulePdf({
  settings,
  day,
  allClasses,
  allSections,
  slots,
  periods,
}: MasterDailyPdfOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const schoolName = settings.schoolName || 'NextGen International Academy';

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(234, 88, 12); // orange-600 accent
  doc.rect(0, 25, pageWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(schoolName.toUpperCase(), margin, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`MASTER DAILY TIMETABLE MATRIX — ${day.toUpperCase()} CONSOLIDATED SCHEDULE`, margin, 16);

  const metaRight = `ACADEMIC YEAR: ${settings.currentAcademicYear || '2026-2027'}  |  DATE: ${new Date().toLocaleDateString()}`;
  doc.text(metaRight, pageWidth - margin - doc.getTextWidth(metaRight), 16);

  let y = 32;

  // Build list of all class/section pairs
  const classroomList: { className: string; section: string }[] = [];
  allClasses.forEach(c => {
    allSections.forEach(s => {
      // Check if any slot exists for this class/sec on this day
      const hasSlot = slots.some(sl => sl.className === c && sl.section === s && sl.day === day);
      if (hasSlot || (c === 'Class 9' && s === 'A') || (c === 'Class 10' && s === 'A')) {
        classroomList.push({ className: c, section: s });
      }
    });
  });

  const classColWidth = 32;
  const periodColsCount = periods.length;
  const availableWidth = pageWidth - 2 * margin - classColWidth;
  const periodColWidth = availableWidth / periodColsCount;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('CLASS / SECTION', margin + classColWidth / 2, y + 7.5, { align: 'center' });

  periods.forEach((p, pIdx) => {
    const px = margin + classColWidth + pIdx * periodColWidth;
    doc.line(px, y, px, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(p.isBreak ? 180 : 30, p.isBreak ? 83 : 41, p.isBreak ? 9 : 59);
    doc.text(p.label, px + periodColWidth / 2, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`${p.startTime}-${p.endTime}`, px + periodColWidth / 2, y + 9.5, { align: 'center' });
  });

  y += 12;

  const rowHeight = Math.min(18, (pageHeight - y - 30) / Math.max(classroomList.length, 1));

  classroomList.forEach((cls, cIdx) => {
    const ry = y + cIdx * rowHeight;

    doc.setFillColor(cIdx % 2 === 0 ? 255 : 248, cIdx % 2 === 0 ? 255 : 250, cIdx % 2 === 0 ? 255 : 252);
    doc.rect(margin, ry, pageWidth - 2 * margin, rowHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, ry, pageWidth - 2 * margin, rowHeight, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`${cls.className} (${cls.section})`, margin + classColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });

    periods.forEach((p, pIdx) => {
      const px = margin + classColWidth + pIdx * periodColWidth;
      doc.line(px, ry, px, ry + rowHeight);

      if (p.isBreak) {
        doc.setFillColor(254, 243, 199);
        doc.rect(px + 0.5, ry + 0.5, periodColWidth - 1, rowHeight - 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(180, 83, 9);
        doc.text('BREAK', px + periodColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });
        return;
      }

      const slot = slots.find(
        s => s.className === cls.className && s.section === cls.section && s.day === day && s.periodNumber === p.periodNumber
      );

      if (slot) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(slot.subject, px + periodColWidth / 2, ry + 5, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.text(slot.teacherName || 'TBA', px + periodColWidth / 2, ry + 9, { align: 'center' });
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(203, 213, 225);
        doc.text('—', px + periodColWidth / 2, ry + rowHeight / 2 + 1, { align: 'center' });
      }
    });
  });

  const filename = `Master_Daily_Timetable_${day}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return doc;
}
