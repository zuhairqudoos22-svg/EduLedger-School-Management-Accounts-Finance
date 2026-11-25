import jsPDF from 'jspdf';
import { SchoolSettings, Student, StudentAttendanceRecord, ExamResult, AttendanceStatus } from '../types';
import { formatDate } from './formatters';

export interface StudentListPdfOptions {
  title?: string;
  className?: string;
  section?: string;
  statusFilter?: string;
  searchQuery?: string;
  isSelectionOnly?: boolean;
}

/**
 * Generates an official, printable Student Roster & Enrollment Audit Report as a downloadable PDF.
 * Formatted specifically for regulatory compliance, administrative audits, and board inspections.
 */
export function generateStudentListPdf(
  settings: SchoolSettings,
  students: Student[],
  options: StudentListPdfOptions = {}
): void {
  // Use Landscape A4 for spacious, clear tabular audit layout
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;
  let y = 14;

  const totalStudents = students.length;
  const activeCount = students.filter(s => s.status === 'active').length;
  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;
  const otherCount = totalStudents - maleCount - femaleCount;

  const reportTitle = options.title || 'OFFICIAL STUDENT ROSTER & ENROLLMENT AUDIT REPORT';
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const timestamp = new Date().toLocaleString();

  // Helper to draw the header banner
  const drawHeader = (isFirstPage: boolean) => {
    // Top Brand Banner
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, isFirstPage ? 26 : 18, 'F');

    // School Name & Tagline
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225); // Slate-300
    doc.text(reportTitle, margin, isFirstPage ? 15 : 13);

    const subText = `Academic Session: ${academicYear}  •  ${settings.schoolAddress || 'School Administrative Registry'}`;
    doc.text(subText, margin, isFirstPage ? 21 : 16);

    // Right-aligned audit metadata
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(`Doc Ref: AUD-STU-${Date.now().toString().slice(-6)}`, pageWidth - margin, isFirstPage ? 9 : 8, {
      align: 'right',
    });
    doc.text(`Generated: ${timestamp}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  // Helper to draw column headers
  const drawTableHeaders = (startY: number) => {
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate-800

    let colX = margin;
    doc.text('#', colX + 2, startY + 5.5);
    colX += 10;
    doc.text('Roll No', colX + 2, startY + 5.5);
    colX += 22;
    doc.text('Student Full Name', colX + 2, startY + 5.5);
    colX += 55;
    doc.text('Class & Sec', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Gender', colX + 2, startY + 5.5);
    colX += 18;
    doc.text('Admission Date', colX + 2, startY + 5.5);
    colX += 26;
    doc.text('Guardian Name & Relation', colX + 2, startY + 5.5);
    colX += 50;
    doc.text('Emergency Contact', colX + 2, startY + 5.5);
    colX += 34;
    doc.text('Enrollment Status', colX + 2, startY + 5.5);
  };

  // 1. Draw Page 1 Header
  drawHeader(true);
  y = 32;

  // 2. Audit Scope & Executive Summary Cards
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, 'FD');

  const cardW = (pageWidth - margin * 2) / 4;

  // Metric 1: Total Listed Students
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL ROSTER ENROLLMENT', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalStudents} Students`, margin + 4, y + 14);

  // Metric 2: Active Students
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ACTIVE REGISTRATION', margin + cardW + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129);
  doc.text(`${activeCount} Active (${totalStudents > 0 ? Math.round((activeCount / totalStudents) * 100) : 0}%)`, margin + cardW + 4, y + 14);

  // Metric 3: Gender Distribution
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GENDER COMPOSITION', margin + cardW * 2 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(79, 70, 229);
  doc.text(`${maleCount} Male • ${femaleCount} Female${otherCount > 0 ? ` • ${otherCount} Other` : ''}`, margin + cardW * 2 + 4, y + 14);

  // Metric 4: Class & Filter Scope
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AUDIT FILTER SCOPE', margin + cardW * 3 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const scopeText = options.isSelectionOnly
    ? 'Manual Selection Filter'
    : `${options.className && options.className !== 'All' ? options.className : 'All Classes'}${
        options.section && options.section !== 'All' ? ` - Sec ${options.section}` : ''
      }`;
  doc.text(scopeText, margin + cardW * 3 + 4, y + 14);

  y += 24;

  // 3. Table Headers
  drawTableHeaders(y);
  y += 10;

  let currentPage = 1;

  // 4. Student Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  students.forEach((student, index) => {
    // Check if new page needed (leave room for signature block if last items)
    if (y > pageHeight - 25) {
      // Footer page number for current page
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `EduLedger Student Directory Audit Roster  •  Page ${currentPage}`,
        margin,
        pageHeight - 6
      );
      doc.text(`Official Administrative Record`, pageWidth - margin, pageHeight - 6, { align: 'right' });

      doc.addPage();
      currentPage += 1;
      drawHeader(false);
      y = 24;
      drawTableHeaders(y);
      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
    }

    // Row zebra striping
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 3.5, pageWidth - margin * 2, 6, 'F');
    }

    let colX = margin;

    // #
    doc.setTextColor(148, 163, 184);
    doc.text(String(index + 1), colX + 2, y);
    colX += 10;

    // Roll No
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Indigo-600
    doc.text(student.rollNo || '—', colX + 2, y);
    colX += 22;

    // Full Name
    doc.setTextColor(15, 23, 42); // Slate-900
    const nameStr = student.fullName.length > 28 ? student.fullName.substring(0, 26) + '..' : student.fullName;
    doc.text(nameStr, colX + 2, y);
    doc.setFont('helvetica', 'normal');
    colX += 55;

    // Class & Sec
    doc.setTextColor(51, 65, 85);
    doc.text(`${student.className} - ${student.section}`, colX + 2, y);
    colX += 28;

    // Gender
    doc.text(student.gender || '—', colX + 2, y);
    colX += 18;

    // Admission Date
    doc.text(student.admissionDate ? formatDate(student.admissionDate) : '—', colX + 2, y);
    colX += 26;

    // Guardian
    const guardianStr = `${student.guardianName || 'N/A'}${student.guardianRelation ? ` (${student.guardianRelation})` : ''}`;
    const truncatedGuardian = guardianStr.length > 25 ? guardianStr.substring(0, 23) + '..' : guardianStr;
    doc.setTextColor(71, 85, 105);
    doc.text(truncatedGuardian, colX + 2, y);
    colX += 50;

    // Contact
    doc.text(student.contactNumber || '—', colX + 2, y);
    colX += 34;

    // Status
    if (student.status === 'active') {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // Emerald-600
      doc.text('ACTIVE', colX + 2, y);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text((student.status || 'INACTIVE').toUpperCase(), colX + 2, y);
    }

    y += 6;
  });

  // 5. Verification Signatures Block
  if (y > pageHeight - 38) {
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`EduLedger Student Directory Audit Roster  •  Page ${currentPage}`, margin, pageHeight - 6);
    doc.text(`Official Administrative Record`, pageWidth - margin, pageHeight - 6, { align: 'right' });

    doc.addPage();
    currentPage += 1;
    drawHeader(false);
    y = 30;
  } else {
    y += 8;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const sigWidth = (pageWidth - margin * 2) / 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  // Signatory 1
  doc.line(margin + 5, y, margin + sigWidth - 15, y);
  doc.text('Prepared By: Administrative Registrar', margin + 5, y + 4.5);
  doc.text('Verified Enrollment Records & Demographics', margin + 5, y + 8.5);

  // Signatory 2
  doc.line(margin + sigWidth + 5, y, margin + sigWidth * 2 - 15, y);
  doc.text('Audited By: External Auditor / Inspector', margin + sigWidth + 5, y + 4.5);
  doc.text('Compliance Verification & File Audit', margin + sigWidth + 5, y + 8.5);

  // Signatory 3
  doc.line(margin + sigWidth * 2 + 5, y, margin + sigWidth * 3 - 5, y);
  doc.text('Approved By: Principal / Board Director', margin + sigWidth * 2 + 5, y + 4.5);
  doc.text('Official Seal & Institutional Attestation', margin + sigWidth * 2 + 5, y + 8.5);

  // Footer page number for last page
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Student Directory Audit Roster  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Official Institutional Document  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  // Generate File Name
  const cleanClass = (options.className || 'All_Classes').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = options.isSelectionOnly
    ? `Student_Roster_Selected_${students.length}_Audit.pdf`
    : `Student_Roster_${cleanClass}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}_Audit.pdf`;

  doc.save(filename);
}

export interface AttendanceAuditPdfOptions {
  title?: string;
  className?: string;
  section?: string;
  startDate?: string;
  endDate?: string;
  externalRecipient?: string;
  auditorNotes?: string;
  preparedBy?: string;
  certifiedBy?: string;
}

/**
 * Generates an official Student Attendance & Punctuality Audit Report PDF.
 */
export function generateStudentAttendanceAuditPdf(
  settings: SchoolSettings,
  students: Student[],
  attendanceRecords: StudentAttendanceRecord[],
  options: AttendanceAuditPdfOptions = {}
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;
  let y = 14;

  const academicYear = settings.currentAcademicYear || '2026-2027';
  const reportTitle = options.title || 'OFFICIAL STUDENT ATTENDANCE & PUNCTUALITY AUDIT REPORT';
  const timestamp = new Date().toLocaleString();

  // Aggregate stats per student
  const studentStats = students.map(s => {
    const studentRecords = attendanceRecords.filter(r => r.studentId === s.id);
    const present = studentRecords.filter(r => r.status === 'present').length;
    const absent = studentRecords.filter(r => r.status === 'absent').length;
    const leave = studentRecords.filter(r => r.status === 'leave').length;
    const total = studentRecords.length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
    return {
      student: s,
      present,
      absent,
      leave,
      total,
      percentage,
    };
  });

  const totalSessionsLogged = attendanceRecords.length;
  const totalPresent = attendanceRecords.filter(r => r.status === 'present').length;
  const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
  const totalLeave = attendanceRecords.filter(r => r.status === 'leave').length;
  const overallTurnoutRate = totalSessionsLogged > 0 ? Math.round((totalPresent / totalSessionsLogged) * 100) : 100;

  const drawHeader = (isFirstPage: boolean) => {
    const bannerHeight = isFirstPage ? (options.externalRecipient ? 29 : 26) : 18;
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(reportTitle, margin, isFirstPage ? 15 : 13);

    const dateScope = options.startDate && options.endDate ? `Period: ${formatDate(options.startDate)} to ${formatDate(options.endDate)}` : `Academic Session: ${academicYear}`;
    let subline = `${dateScope}  •  Class Scope: ${options.className || 'All Classes'}`;
    if (options.externalRecipient) {
      subline += `  •  External Recipient: ${options.externalRecipient}`;
    }
    doc.text(subline, margin, isFirstPage ? 21 : 16);

    if (isFirstPage && options.externalRecipient) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(147, 197, 253);
      doc.text(`Official Submission Copy — For External Regulatory / Accreditation Review`, margin, 26);
      doc.setFont('helvetica', 'normal');
    }

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Doc Ref: ATT-AUD-${Date.now().toString().slice(-6)}`, pageWidth - margin, isFirstPage ? 9 : 8, {
      align: 'right',
    });
    doc.text(`Exported: ${timestamp}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  const drawTableHeaders = (startY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let colX = margin;
    doc.text('#', colX + 2, startY + 5.5);
    colX += 10;
    doc.text('Roll No', colX + 2, startY + 5.5);
    colX += 24;
    doc.text('Student Full Name', colX + 2, startY + 5.5);
    colX += 60;
    doc.text('Class & Sec', colX + 2, startY + 5.5);
    colX += 30;
    doc.text('Present Days', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Absent Days', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Approved Leaves', colX + 2, startY + 5.5);
    colX += 32;
    doc.text('Logged Sessions', colX + 2, startY + 5.5);
    colX += 32;
    doc.text('Attendance Rate', colX + 2, startY + 5.5);
  };

  drawHeader(true);
  y = 30;

  // KPI Summary Strip
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 16;

  // Card 1: Overall Turnout Rate
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('OVERALL TURNOUT RATE', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70);
  doc.text(`${overallTurnoutRate}% Average`, margin + 3, y + 12);

  // Card 2: Total Present Records
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(margin + cardWidth + 4, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin + cardWidth + 4, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202);
  doc.text('TOTAL PRESENT SESSIONS', margin + cardWidth + 7, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text(`${totalPresent} Days Recorded`, margin + cardWidth + 7, y + 12);

  // Card 3: Absenteeism
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin + (cardWidth + 4) * 2, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin + (cardWidth + 4) * 2, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  doc.text('TOTAL ABSENTEE INCIDENTS', margin + (cardWidth + 4) * 2 + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(153, 27, 27);
  doc.text(`${totalAbsent} Unexcused`, margin + (cardWidth + 4) * 2 + 3, y + 12);

  // Card 4: Enrolled Students
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardWidth + 4) * 3, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + (cardWidth + 4) * 3, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('STUDENTS AUDITED', margin + (cardWidth + 4) * 3 + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${students.length} Total Enrolled`, margin + (cardWidth + 4) * 3 + 3, y + 12);

  y += cardHeight + 6;
  drawTableHeaders(y);
  y += 8;

  let currentPage = 1;
  const rowHeight = 6.2;

  studentStats.forEach((item, index) => {
    if (y + rowHeight > pageHeight - 20) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${currentPage}`, margin, pageHeight - 6);
      doc.text(`EduLedger Attendance System  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
        align: 'right',
      });

      doc.addPage();
      currentPage++;
      drawHeader(false);
      y = 22;
      drawTableHeaders(y);
      y += 8;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    let colX = margin;
    doc.text(String(index + 1), colX + 2, y + 4.3);
    colX += 10;

    doc.setFont('courier', 'bold');
    doc.text(item.student.rollNo, colX + 2, y + 4.3);
    colX += 24;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.student.fullName, colX + 2, y + 4.3);
    colX += 60;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.student.className} - ${item.student.section}`, colX + 2, y + 4.3);
    colX += 30;

    doc.setTextColor(5, 150, 105);
    doc.text(`${item.present} Days`, colX + 2, y + 4.3);
    colX += 28;

    doc.setTextColor(item.absent > 0 ? 220 : 100, item.absent > 0 ? 38 : 116, item.absent > 0 ? 38 : 139);
    doc.text(`${item.absent} Days`, colX + 2, y + 4.3);
    colX += 28;

    doc.setTextColor(71, 85, 105);
    doc.text(`${item.leave} Days`, colX + 2, y + 4.3);
    colX += 32;

    doc.text(`${item.total} Total`, colX + 2, y + 4.3);
    colX += 32;

    const rateColor = item.percentage >= 90 ? [5, 150, 105] : item.percentage >= 75 ? [217, 119, 6] : [220, 38, 38];
    doc.setTextColor(rateColor[0], rateColor[1], rateColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.percentage}%`, colX + 2, y + 4.3);

    y += rowHeight;
  });

  // Notes and Signatures for External Audit Reporting
  y += 6;
  if (y + 25 > pageHeight - 12) {
    doc.addPage('a4', 'l');
    currentPage++;
    y = 20;
  }

  if (options.auditorNotes) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('EXTERNAL COMPLIANCE & AUDIT NOTES:', margin + 3, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(options.auditorNotes.slice(0, 150), margin + 3, y + 8.5);
    y += 16;
  }

  // Formal Tripartite Verification Signatures
  const sigColWidth = (pageWidth - margin * 2) / 3;
  doc.setDrawColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);

  doc.line(margin + 5, y + 8, margin + sigColWidth - 15, y + 8);
  doc.text(options.preparedBy ? `Prepared: ${options.preparedBy}` : 'Prepared By: Registrar / Attendance Officer', margin + 5, y + 12);
  doc.text('Roll-Call Logs & Bio-Turnout Cross-Verified', margin + 5, y + 15.5);

  doc.line(margin + sigColWidth + 5, y + 8, margin + sigColWidth * 2 - 15, y + 8);
  doc.text(options.certifiedBy ? `Certified: ${options.certifiedBy}` : 'Certified By: Head of Institution / Principal', margin + sigColWidth + 5, y + 12);
  doc.text('Official Institutional Academic Seal Enacted', margin + sigColWidth + 5, y + 15.5);

  doc.line(margin + sigColWidth * 2 + 5, y + 8, margin + sigColWidth * 3 - 5, y + 8);
  doc.text(options.externalRecipient ? `Submitted To: ${options.externalRecipient}` : 'External Regulatory Authority Acknowledgment', margin + sigColWidth * 2 + 5, y + 12);
  doc.text('Received for Compliance & Accreditation Filing', margin + sigColWidth * 2 + 5, y + 15.5);

  // Footer page number for last page
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Attendance Audit Report  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Official Document  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  const cleanClass = (options.className || 'All_Classes').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Student_Attendance_Audit_${cleanClass}.pdf`);
}

export interface DailyAttendancePdfOptions {
  className: string;
  section: string;
  date: string;
  title?: string;
  externalRecipient?: string;
  auditorNotes?: string;
  preparedBy?: string;
  certifiedBy?: string;
}

/**
 * Generates an official, printable Daily Student Attendance Roll & Compliance Roster PDF.
 */
export function generateDailyAttendanceRosterPdf(
  settings: SchoolSettings,
  rosterStudents: Student[],
  attendanceMap: Record<string, { status: AttendanceStatus; remarks: string }>,
  options: DailyAttendancePdfOptions
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;
  let y = 14;

  const title = options.title || 'OFFICIAL DAILY STUDENT ATTENDANCE & ROLL CALL ROSTER';
  const timestamp = new Date().toLocaleString();

  const presentCount = rosterStudents.filter(s => attendanceMap[s.id]?.status === 'present').length;
  const absentCount = rosterStudents.filter(s => attendanceMap[s.id]?.status === 'absent').length;
  const leaveCount = rosterStudents.filter(s => attendanceMap[s.id]?.status === 'leave').length;
  const totalCount = rosterStudents.length;
  const turnoutRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const drawHeader = (isFirstPage: boolean) => {
    const bannerHeight = isFirstPage ? (options.externalRecipient ? 29 : 26) : 18;
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, bannerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(
      `${settings.schoolAddress || 'Administrative Campus'} • Tel: ${settings.schoolPhone || 'N/A'} • Email: ${settings.schoolEmail || 'office@eduledger.edu'}`,
      margin,
      isFirstPage ? 15 : 13
    );

    if (isFirstPage && options.externalRecipient) {
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.roundedRect(margin, 18, 160, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`CERTIFIED FOR EXTERNAL REPORTING TO: ${options.externalRecipient.toUpperCase()}`, margin + 3, 22.8);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 11 : 9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth - margin, isFirstPage ? 9 : 8, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Date of Session: ${formatDate(options.date)}  •  Class ${options.className} - Sec ${options.section}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  drawHeader(true);
  y = options.externalRecipient ? 35 : 32;

  // KPI Metrics Cards
  const cardW = (pageWidth - margin * 2 - 12) / 4;
  const cardH = 18;

  // Card 1: Total Enrolled
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CLASS ENROLLMENT', margin + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalCount} Students`, margin + 4, y + 14);

  // Card 2: Present
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + cardW + 4, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PRESENT ON ROLL', margin + cardW + 8, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`${presentCount} (${turnoutRate}%)`, margin + cardW + 8, y + 14);

  // Card 3: Absent & Leave
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardW + 4) * 2, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('ABSENT / ON LEAVE', margin + (cardW + 4) * 2 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(absentCount > 0 ? 220 : 71, absentCount > 0 ? 38 : 85, absentCount > 0 ? 38 : 105);
  doc.text(`${absentCount} Absent  •  ${leaveCount} Leave`, margin + (cardW + 4) * 2 + 4, y + 14);

  // Card 4: Daily Turnout Rate
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardW + 4) * 3, y, cardW, cardH, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DAILY COMPLIANCE RATING', margin + (cardW + 4) * 3 + 4, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(turnoutRate >= 90 ? 16 : turnoutRate >= 75 ? 217 : 220, turnoutRate >= 90 ? 185 : turnoutRate >= 75 ? 119 : 38, turnoutRate >= 90 ? 129 : turnoutRate >= 75 ? 6 : 38);
  doc.text(`${turnoutRate}% Turnout`, margin + (cardW + 4) * 3 + 4, y + 14);

  y += 24;

  const drawTableHeaders = (curY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, curY, pageWidth - margin * 2, 7.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    let colX = margin;
    doc.text('#', colX + 2, curY + 5);
    colX += 10;
    doc.text('ROLL NO', colX + 2, curY + 5);
    colX += 24;
    doc.text('STUDENT FULL NAME', colX + 2, curY + 5);
    colX += 58;
    doc.text('DAILY STATUS', colX + 2, curY + 5);
    colX += 34;
    doc.text('ROLL CALL REMARKS', colX + 2, curY + 5);
    colX += 54;
    doc.text('GUARDIAN NAME', colX + 2, curY + 5);
    colX += 45;
    doc.text('EMERGENCY CONTACT', colX + 2, curY + 5);
  };

  drawTableHeaders(y);
  y += 8;

  let currentPage = 1;
  const rowHeight = 6.4;

  rosterStudents.forEach((student, index) => {
    if (y + rowHeight > pageHeight - 20) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${currentPage}`, margin, pageHeight - 6);
      doc.text(`EduLedger Attendance System  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
        align: 'right',
      });

      doc.addPage();
      currentPage++;
      drawHeader(false);
      y = 22;
      drawTableHeaders(y);
      y += 8;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    }

    const entry = attendanceMap[student.id] || { status: 'present', remarks: '' };

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    let colX = margin;
    doc.text(String(index + 1), colX + 2, y + 4.4);
    colX += 10;

    doc.setFont('courier', 'bold');
    doc.text(student.rollNo || '-', colX + 2, y + 4.4);
    colX += 24;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(student.fullName, colX + 2, y + 4.4);
    colX += 58;

    // Status badge text
    doc.setFont('helvetica', 'bold');
    if (entry.status === 'present') {
      doc.setTextColor(5, 150, 105);
      doc.text('PRESENT', colX + 2, y + 4.4);
    } else if (entry.status === 'absent') {
      doc.setTextColor(220, 38, 38);
      doc.text('ABSENT', colX + 2, y + 4.4);
    } else {
      doc.setTextColor(217, 119, 6);
      doc.text('LEAVE', colX + 2, y + 4.4);
    }
    colX += 34;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(entry.remarks || '-', colX + 2, y + 4.4);
    colX += 54;

    doc.setTextColor(51, 65, 85);
    doc.text(student.guardianName || 'N/A', colX + 2, y + 4.4);
    colX += 45;

    doc.setFont('courier', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(student.contactNumber || 'N/A', colX + 2, y + 4.4);

    y += rowHeight;
  });

  // Signatures and auditor sign-off
  y += 6;
  if (y + 25 > pageHeight - 12) {
    doc.addPage('a4', 'l');
    currentPage++;
    y = 20;
  }

  if (options.auditorNotes) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Official Attestation: ${options.auditorNotes}`, margin + 4, y + 5.8);
    y += 13;
  }

  const sigColWidth = (pageWidth - margin * 2 - 12) / 3;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Sig 1
  doc.line(margin, y + 8, margin + sigColWidth, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(options.preparedBy || 'Class Teacher / Roll Invigilator', margin, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Roll Call Recorded & Verified', margin, y + 15.5);

  // Sig 2
  doc.line(margin + sigColWidth + 6, y + 8, margin + sigColWidth * 2 + 6, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(options.certifiedBy || 'Principal / Academic Head', margin + sigColWidth + 6, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Approved Institutional Records', margin + sigColWidth + 6, y + 15.5);

  // Sig 3
  doc.line(margin + (sigColWidth + 6) * 2, y + 8, margin + sigColWidth * 3 + 12, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(options.externalRecipient ? `Submitted To: ${options.externalRecipient}` : 'External Inspection & Audit Official', margin + (sigColWidth + 6) * 2, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Acknowledged for External Compliance', margin + (sigColWidth + 6) * 2, y + 15.5);

  // Footer page number for last page
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Daily Attendance Roll  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Official Document  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  const cleanClass = options.className.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanSec = options.section.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Daily_Attendance_Roster_${cleanClass}_Sec_${cleanSec}_${options.date}.pdf`);
}

export interface ExamReportPdfOptions {
  title?: string;
  examTitle?: string;
  className?: string;
}

/**
 * Generates an official Academic Examination Marks Ledger & Results Audit PDF.
 */
export function generateExamPerformancePdf(
  settings: SchoolSettings,
  results: ExamResult[],
  options: ExamReportPdfOptions = {}
): void {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
  const margin = 14;
  let y = 14;

  const academicYear = settings.currentAcademicYear || '2026-2027';
  const examTitle = options.examTitle || (results[0]?.examTitle) || 'Midterm Examination 2026';
  const className = options.className || (results[0]?.className) || 'All Classes';
  const timestamp = new Date().toLocaleString();

  const totalCandidates = results.length;
  const passCount = results.filter(r => r.status === 'Pass').length;
  const failCount = totalCandidates - passCount;
  const passRate = totalCandidates > 0 ? Math.round((passCount / totalCandidates) * 100) : 100;
  const averagePct = totalCandidates > 0 ? Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalCandidates) : 0;
  const highestMarks = totalCandidates > 0 ? Math.max(...results.map(r => r.totalObtainedMarks)) : 0;

  const drawHeader = (isFirstPage: boolean) => {
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, isFirstPage ? 26 : 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isFirstPage ? 14 : 11);
    doc.text(settings.schoolName || 'EduLedger International School', margin, isFirstPage ? 9 : 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(isFirstPage ? 8.5 : 7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`OFFICIAL ACADEMIC EXAMINATION & MARKS LEDGER: ${examTitle.toUpperCase()}`, margin, isFirstPage ? 15 : 13);
    doc.text(`Academic Session: ${academicYear}  •  Class: ${className}`, margin, isFirstPage ? 21 : 16);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Doc Ref: EXAM-LEDGER-${Date.now().toString().slice(-6)}`, pageWidth - margin, isFirstPage ? 9 : 8, {
      align: 'right',
    });
    doc.text(`Exported: ${timestamp}`, pageWidth - margin, isFirstPage ? 15 : 13, { align: 'right' });
  };

  const drawTableHeaders = (startY: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, startY + 8, pageWidth - margin, startY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let colX = margin;
    doc.text('Rank', colX + 2, startY + 5.5);
    colX += 14;
    doc.text('Roll No', colX + 2, startY + 5.5);
    colX += 24;
    doc.text('Student Full Name', colX + 2, startY + 5.5);
    colX += 65;
    doc.text('Class & Sec', colX + 2, startY + 5.5);
    colX += 30;
    doc.text('Total Marks', colX + 2, startY + 5.5);
    colX += 28;
    doc.text('Obtained', colX + 2, startY + 5.5);
    colX += 25;
    doc.text('Percentage', colX + 2, startY + 5.5);
    colX += 26;
    doc.text('Grade', colX + 2, startY + 5.5);
    colX += 18;
    doc.text('Status', colX + 2, startY + 5.5);
    colX += 20;
    doc.text('Teacher Remarks', colX + 2, startY + 5.5);
  };

  drawHeader(true);
  y = 30;

  // KPI Summary Strip
  const cardWidth = (pageWidth - margin * 2 - 12) / 4;
  const cardHeight = 16;

  // Card 1: Class Pass Rate
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('CLASS PASS RATE', margin + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(6, 95, 70);
  doc.text(`${passRate}% Passed`, margin + 3, y + 12);

  // Card 2: Average Score
  doc.setFillColor(238, 242, 255);
  doc.roundedRect(margin + cardWidth + 4, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin + cardWidth + 4, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202);
  doc.text('CLASS AVERAGE SCORE', margin + cardWidth + 7, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(49, 46, 129);
  doc.text(`${averagePct}% Mean Score`, margin + cardWidth + 7, y + 12);

  // Card 3: Highest Score
  doc.setFillColor(254, 243, 199);
  doc.roundedRect(margin + (cardWidth + 4) * 2, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(253, 230, 138);
  doc.roundedRect(margin + (cardWidth + 4) * 2, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('HIGHEST OBTAINED MARKS', margin + (cardWidth + 4) * 2 + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(146, 64, 14);
  doc.text(`${highestMarks} Marks`, margin + (cardWidth + 4) * 2 + 3, y + 12);

  // Card 4: Total Candidates Evaluated
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin + (cardWidth + 4) * 3, y, cardWidth, cardHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin + (cardWidth + 4) * 3, y, cardWidth, cardHeight, 2, 2, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CANDIDATES EVALUATED', margin + (cardWidth + 4) * 3 + 3, y + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalCandidates} Students`, margin + (cardWidth + 4) * 3 + 3, y + 12);

  y += cardHeight + 6;
  drawTableHeaders(y);
  y += 8;

  let currentPage = 1;
  const rowHeight = 6.2;

  // Sort by rank or percentage desc
  const sorted = [...results].sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.percentage - a.percentage);

  sorted.forEach((item, index) => {
    if (y + rowHeight > pageHeight - 20) {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${currentPage}`, margin, pageHeight - 6);
      doc.text(`EduLedger Academic Results System  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
        align: 'right',
      });

      doc.addPage();
      currentPage++;
      drawHeader(false);
      y = 22;
      drawTableHeaders(y);
      y += 8;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - margin * 2, rowHeight, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);

    let colX = margin;
    doc.text(`#${item.rank || index + 1}`, colX + 2, y + 4.3);
    colX += 14;

    doc.setFont('courier', 'bold');
    doc.text(item.studentRollNo, colX + 2, y + 4.3);
    colX += 24;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(item.studentName, colX + 2, y + 4.3);
    colX += 65;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${item.className} - ${item.section}`, colX + 2, y + 4.3);
    colX += 30;

    doc.text(String(item.totalMaxMarks), colX + 2, y + 4.3);
    colX += 28;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.totalObtainedMarks), colX + 2, y + 4.3);
    colX += 25;

    doc.text(`${item.percentage}%`, colX + 2, y + 4.3);
    colX += 26;

    doc.text(item.overallGrade, colX + 2, y + 4.3);
    colX += 18;

    const isPass = item.status === 'Pass';
    doc.setTextColor(isPass ? 5 : 220, isPass ? 150 : 38, isPass ? 105 : 38);
    doc.text(item.status, colX + 2, y + 4.3);
    colX += 20;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(item.teacherRemarks || 'Satisfactory', colX + 2, y + 4.3);

    y += rowHeight;
  });

  // Footer page number for last page
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`EduLedger Academic Examination Marks Ledger  •  Page ${currentPage}`, margin, pageHeight - 6);
  doc.text(`Official Attestation  •  ${timestamp}`, pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  const cleanExam = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Academic_Marks_Ledger_${cleanExam}.pdf`);
}

export interface StudentRecordCardPdfOptions {
  includeFeeHistory?: boolean;
  includeExams?: boolean;
  includeAttendance?: boolean;
  includeSignatures?: boolean;
}

/**
 * Generates an official, printable Student Cumulative Record Card (Student Dossier)
 * Formatted as a professional A4 Portrait document suitable for regulatory submission, parent conferences, or permanent school archives.
 */
export function generateStudentRecordCardPdf(
  student: Student,
  settings: SchoolSettings,
  attendanceRecords: StudentAttendanceRecord[] = [],
  examResults: ExamResult[] = [],
  totalFeesPaid: number = 0,
  pendingBalance: number = 0,
  options: StudentRecordCardPdfOptions = {}
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const schoolName = settings.schoolName || 'St. Augustine International Academy';
  const schoolAddress = settings.schoolAddress || '742 Evergreen Terrace, Academic District';
  const academicYear = settings.currentAcademicYear || '2026-2027';
  const currencySymbol = settings.currencySymbol || '$';

  // Outer border & double border for official document look
  doc.setDrawColor(30, 41, 59); // Slate-800
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4);
  doc.setLineWidth(0.3);
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

  // 1. Institution Header Bar
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, margin, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, margin + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // Slate-300
  doc.text(
    `${schoolAddress}  •  Tel: ${settings.schoolPhone || '+1 (555) 019-2831'}  •  Email: ${settings.schoolEmail || 'admin@school.edu'}`,
    pageWidth / 2,
    margin + 13.5,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(254, 240, 138); // Yellow-200
  doc.text(`OFFICIAL STUDENT CUMULATIVE RECORD CARD  •  ACADEMIC YEAR ${academicYear}`, pageWidth / 2, margin + 19, { align: 'center' });

  let y = margin + 26;

  // 2. Student Bio-Data & Identification Section
  // Photo placeholder box on right
  const photoW = 26;
  const photoH = 32;
  const photoX = pageWidth - margin - photoW - 3;
  const photoY = y + 1;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.setFillColor(241, 245, 249);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('OFFICIAL PHOTO', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' });
  doc.text('AFFIXED HERE', photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });

  // Student Full Name & Roll Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(student.fullName, margin + 3, y + 6);

  // Status Badge
  const statusColor = student.status === 'active' ? [5, 150, 105] : [100, 116, 139];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin + 3, y + 9, 22, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(student.status.toUpperCase(), margin + 14, y + 12.5, { align: 'center' });

  // Roll Number badge
  doc.setFillColor(238, 242, 255); // Indigo-50
  doc.setDrawColor(199, 210, 254);
  doc.roundedRect(margin + 28, y + 9, 32, 5, 1, 1, 'FD');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(67, 56, 202); // Indigo-700
  doc.text(`ROLL: ${student.rollNo}`, margin + 44, y + 12.5, { align: 'center' });

  // Metadata Grid
  const gridW = photoX - margin - 6;
  const colW = gridW / 2;
  const bioY = y + 17;

  const bioFields = [
    { label: 'Class & Section', val: `${student.className} - ${student.section}` },
    { label: 'Date of Birth', val: formatDate(student.dateOfBirth) },
    { label: 'Gender', val: student.gender },
    { label: 'Blood Group', val: student.bloodGroup || 'Not Recorded' },
    { label: 'Date of Admission', val: formatDate(student.admissionDate) },
    { label: 'Guardian Name', val: `${student.guardianName} (${student.guardianRelation})` },
    { label: 'Emergency Contact', val: student.contactNumber },
    { label: 'Email Address', val: student.email || 'None on record' },
  ];

  doc.setFontSize(7.5);
  bioFields.forEach((field, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const fx = margin + 3 + col * colW;
    const fy = bioY + row * 6.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${field.label}:`, fx, fy);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(field.val, fx + 26, fy);
  });

  y = bioY + 4 * 6.5 + 4;

  // Address Row
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Residential Address:', margin + 3, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(student.address || 'Campus Resident', margin + 32, y);

  y += 7;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 2, y, pageWidth - margin - 2, y);
  y += 4;

  // 3. Attendance Summary & Performance Metrics KPI Strip
  const studentAttRecords = attendanceRecords.filter(r => r.studentId === student.id);
  const presentCount = studentAttRecords.filter(r => r.status === 'present').length;
  const absentCount = studentAttRecords.filter(r => r.status === 'absent').length;
  const leaveCount = studentAttRecords.filter(r => r.status === 'leave').length;
  const totalAttSessions = studentAttRecords.length;
  const attPct = totalAttSessions > 0 ? Math.round((presentCount / totalAttSessions) * 100) : 100;

  // 4 KPI Cards: Attendance Rate, Sessions Logged, Fees Paid, Outstanding Due
  const kpiW = (contentWidth - 6) / 4;
  const kpiH = 14;

  const kpis = [
    { label: 'ATTENDANCE RATE', val: `${attPct}%`, sub: `${presentCount} / ${totalAttSessions} days`, color: [67, 56, 202] },
    { label: 'ABSENCES / LEAVES', val: `${absentCount} / ${leaveCount}`, sub: 'Unexcused / Sanctioned', color: [180, 83, 9] },
    { label: 'TOTAL FEES CLEARED', val: `${currencySymbol}${totalFeesPaid.toLocaleString()}`, sub: 'Settled Receipts', color: [5, 150, 105] },
    { label: 'OUTSTANDING BALANCE', val: `${currencySymbol}${pendingBalance.toLocaleString()}`, sub: pendingBalance > 0 ? 'Dues Pending' : 'Account Cleared', color: pendingBalance > 0 ? [220, 38, 38] : [15, 23, 42] },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiW + 2);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(kx, y, kpiW, kpiH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx + 3, y + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, kx + 3, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(kpi.sub, kx + 3, y + 12.5);
  });

  y += kpiH + 6;

  // 4. Academic Examination Performance History
  const studentResults = examResults.filter(r => r.studentId === student.id);

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('I. ACADEMIC EXAMINATION PROGRESS & SCHOLASTIC EVALUATIONS', margin + 3, y + 4.2);
  y += 7;

  // Table Headers
  const colXExam = margin;
  const examColWidths = [45, 30, 22, 22, 22, 18, 27];
  const examHeaders = ['Examination Title', 'Session / Term', 'Max Marks', 'Obtained', 'Percentage', 'Grade', 'Result Status'];

  doc.setFillColor(226, 232, 240);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);

  let curX = margin;
  examHeaders.forEach((h, i) => {
    doc.text(h, curX + 2, y + 3.8);
    curX += examColWidths[i];
  });
  y += 5.5;

  if (studentResults.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('No formal examinations compiled yet for this student candidate.', margin + 3, y + 4.5);
    y += 7;
  } else {
    studentResults.slice(0, 6).forEach((r, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);

      let rx = margin;
      doc.text(r.examTitle || 'Term Exam', rx + 2, y + 3.6);
      rx += examColWidths[0];
      doc.text(r.academicYear || academicYear, rx + 2, y + 3.6);
      rx += examColWidths[1];
      doc.text(String(r.totalMaxMarks), rx + 2, y + 3.6);
      rx += examColWidths[2];
      doc.setFont('helvetica', 'bold');
      doc.text(String(r.totalObtainedMarks), rx + 2, y + 3.6);
      rx += examColWidths[3];
      doc.text(`${r.percentage}%`, rx + 2, y + 3.6);
      rx += examColWidths[4];
      doc.text(r.overallGrade || 'N/A', rx + 2, y + 3.6);
      rx += examColWidths[5];

      const pass = r.status === 'Pass';
      doc.setTextColor(pass ? 5 : 220, pass ? 150 : 38, pass ? 105 : 38);
      doc.text(r.status || 'Evaluated', rx + 2, y + 3.6);

      y += 5;
    });
  }

  y += 3;

  // 5. Conduct, Character & Extra-Curricular Assessment
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('II. BEHAVIORAL CONDUCT & INSTITUTIONAL CLEARANCES', margin + 3, y + 4.2);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('General Conduct & Demeanor:', margin + 3, y + 3.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(5, 150, 105);
  doc.text('Exemplary • Demonstrates high integrity, punctuality, and peer collaboration.', margin + 45, y + 3.5);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Library & Accounts Clearance:', margin + 3, y + 3.5);
  doc.setFont('helvetica', 'bold');
  if (pendingBalance === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text('Fully Cleared • All tuition fees, library loans, and laboratory equipment settled.', margin + 45, y + 3.5);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text(`Pending Obligation • Outstanding fee balance of ${currencySymbol}${pendingBalance.toLocaleString()} on record.`, margin + 45, y + 3.5);
  }
  y += 8;

  // 6. Official Institutional Attestation & Signatures Box
  const sigY = pageHeight - margin - 32;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, sigY - 2, pageWidth - margin, sigY - 2);

  const sigW = contentWidth / 3;
  const sigBoxY = sigY + 12;

  // Left: Class Teacher
  doc.setDrawColor(71, 85, 105);
  doc.line(margin + 5, sigBoxY, margin + sigW - 10, sigBoxY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('CLASS TEACHER SIGNATURE', margin + sigW / 2 - 2, sigBoxY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Form Tutor Attestation', margin + sigW / 2 - 2, sigBoxY + 7.5, { align: 'center' });

  // Center: Official School Seal
  doc.setDrawColor(180, 83, 9);
  doc.setFillColor(254, 252, 232);
  doc.roundedRect(margin + sigW + 10, sigY + 1, sigW - 20, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(180, 83, 9);
  doc.text('OFFICIAL INSTITUTIONAL SEAL', margin + sigW + (sigW / 2), sigY + 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(120, 53, 15);
  doc.text('St. Augustine Academy Verified', margin + sigW + (sigW / 2), sigY + 11.5, { align: 'center' });
  doc.text(new Date().toLocaleDateString(), margin + sigW + (sigW / 2), sigY + 15, { align: 'center' });

  // Right: Principal / Head of School
  doc.line(pageWidth - margin - sigW + 10, sigBoxY, pageWidth - margin - 5, sigBoxY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PRINCIPAL / REGISTRAR', pageWidth - margin - (sigW / 2), sigBoxY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Head of Institution & Board Seal', pageWidth - margin - (sigW / 2), sigBoxY + 7.5, { align: 'center' });

  // Footer microtext
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Academic Dossier • Student ID: ${student.rollNo} • Generated on ${new Date().toLocaleString()} • St. Augustine Academy`,
    pageWidth / 2,
    pageHeight - margin + 2,
    { align: 'center' }
  );

  const cleanName = student.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Student_Record_Card_${student.rollNo}_${cleanName}.pdf`);
}

