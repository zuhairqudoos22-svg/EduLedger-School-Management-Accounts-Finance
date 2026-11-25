import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Student, Staff, SchoolSettings } from '../types';
import { formatDate } from './formatters';
import {
  BadgeThemeKey,
  BadgeThemeConfig,
  resolveBadgeTheme,
  hexToRgb,
  createCustomBadgeTheme,
} from './badgeTheme';

/**
 * Normalizes input theme parameter to a complete BadgeThemeConfig
 */
function normalizeThemeConfig(themeInput?: BadgeThemeKey | BadgeThemeConfig | string): BadgeThemeConfig {
  if (!themeInput) return resolveBadgeTheme('navy');
  if (typeof themeInput === 'object' && 'primaryHex' in themeInput) {
    return themeInput as BadgeThemeConfig;
  }
  if (typeof themeInput === 'string') {
    if (themeInput.startsWith('#')) {
      return createCustomBadgeTheme(themeInput, 'Custom Theme');
    }
    return resolveBadgeTheme(themeInput as BadgeThemeKey);
  }
  return resolveBadgeTheme('navy');
}

/**
 * Draw a single Bright Future style portrait ID card (54mm x 85.6mm) onto a jsPDF document.
 */
async function drawBrightFutureCard(
  doc: jsPDF,
  attendee: Student | Staff,
  type: 'student' | 'staff',
  settings: SchoolSettings,
  originX: number,
  originY: number,
  themeInput?: BadgeThemeKey | BadgeThemeConfig | string
): Promise<void> {
  const theme = normalizeThemeConfig(themeInput);
  const primaryRgb = hexToRgb(theme.primaryHex);
  const darkRgb = hexToRgb(theme.primaryDarkHex);
  const accentRgb = hexToRgb(theme.accentHex);
  const secondaryRgb = hexToRgb(theme.secondaryHex);

  const isStudent = type === 'student';
  const student = isStudent ? (attendee as Student) : null;
  const staff = !isStudent ? (attendee as Staff) : null;

  const cardW = 54;
  const cardH = 85.6;

  const schoolName = (settings.schoolName || 'BRIGHT FUTURE').toUpperCase();
  const schoolSubtitle = (settings.schoolTagline || 'PUBLIC SCHOOL').toUpperCase();
  const schoolMotto = 'Knowledge Today, Success Tomorrow';
  const session = settings.currentAcademicYear || '2025-26';

  const fatherName = isStudent
    ? student?.fatherName || student?.guardianName || 'Rajesh Sharma'
    : staff?.fatherOrSpouseName || staff?.emergencyContact?.name || 'Dr. K. Sharma';
  const motherName = isStudent ? student?.motherName || 'Pooja Sharma' : '';
  const dobFormatted = attendee.dateOfBirth
    ? formatDate(attendee.dateOfBirth)
    : isStudent
    ? '15-08-2012'
    : '22-06-1988';
  const bloodGroup = attendee.bloodGroup || 'O+';
  const address = attendee.address || '123, Green Park, New Delhi - 110016';
  const idNumber =
    (isStudent ? student?.idNumber : staff?.idNumber) ||
    (isStudent
      ? `BFPS/${session.slice(2, 4)}/${student?.rollNo || '0789'}`
      : `BFPS/STAFF/${staff?.employeeCode || '101'}`);

  // Base White Card with rounded corners
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(210, 218, 228);
  doc.roundedRect(originX, originY, cardW, cardH, 3.5, 3.5, 'FD');

  // Top Themed Header
  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.rect(originX, originY, cardW, 19, 'F');

  // Lanyard Slot Cutout indicator (White pill)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(originX + cardW / 2 - 5, originY + 1.2, 10, 1.8, 0.9, 0.9, 'F');

  // Decorative Golden & Secondary Color Wave Arcs
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(originX, originY + 18.2, cardW, 0.8, 'F');
  doc.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.rect(originX, originY + 19, cardW, 0.5, 'F');

  // School Logo on Left of Header
  const logoX = originX + 2.5;
  const logoY = originY + 4;
  let logoDrawn = false;

  if (settings.logoUrl && settings.logoUrl.startsWith('data:image')) {
    try {
      const format = settings.logoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(settings.logoUrl, format, logoX, logoY, 7, 9);
      logoDrawn = true;
    } catch {
      // Fallback to vector emblem
    }
  }

  if (!logoDrawn) {
    // Vector shield with accent border
    doc.setFillColor(darkRgb[0], darkRgb[1], darkRgb[2]);
    doc.setDrawColor(accentRgb[0], accentRgb[1], accentRgb[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(logoX, logoY, 6.5, 8.5, 1, 1, 'FD');
    doc.setLineWidth(0.1);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.text('ESTD', logoX + 3.25, logoY + 7.5, { align: 'center' });
  }

  // School Name, Subtitle, Slogan in Header
  const textLeftX = originX + 10.5;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text(schoolName, textLeftX, originY + 7.5);

  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.setFontSize(5.2);
  doc.text(schoolSubtitle, textLeftX, originY + 10.8);

  doc.setTextColor(225, 235, 245);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.8);
  doc.text(schoolMotto, textLeftX, originY + 13.5);

  // Generate QR Code Payload
  let qrPayload = '';
  if (isStudent && student) {
    qrPayload = JSON.stringify({
      type: 'STUDENT_ID',
      id: student.id,
      rollNo: student.rollNo,
      name: student.fullName,
      className: student.className,
      section: student.section,
      bloodGroup: student.bloodGroup || 'O+',
      school: schoolName,
      session: session,
    });
  } else if (staff) {
    qrPayload = JSON.stringify({
      type: 'STAFF_ID',
      id: staff.id,
      employeeCode: staff.employeeCode,
      name: staff.fullName,
      department: staff.department,
      designation: staff.designation,
      school: schoolName,
      session: session,
    });
  }

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 200,
    margin: 1,
    color: { dark: theme.primaryHex, light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

  // Photo & QR Block Placement
  const photoW = 20;
  const photoH = 22;
  const photoX = originX + 3.5;
  const photoY = originY + 21.5;

  let photoDrawn = false;
  if (attendee.photoUrl && attendee.photoUrl.startsWith('data:image')) {
    try {
      const format = attendee.photoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(attendee.photoUrl, format, photoX, photoY, photoW, photoH);
      photoDrawn = true;
    } catch {
      // Fallback
    }
  }

  if (!photoDrawn) {
    doc.setFillColor(241, 245, 249);
    doc.rect(photoX, photoY, photoW, photoH, 'F');
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(attendee.fullName.charAt(0), photoX + photoW / 2, photoY + photoH / 2 + 5, {
      align: 'center',
    });
  }

  // Photo Border matching theme primary color
  doc.setDrawColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setLineWidth(0.4);
  doc.rect(photoX, photoY, photoW, photoH, 'D');

  // SESSION Label on Right
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.text('SESSION', originX + 41, originY + 23.5, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(5.5);
  doc.text(session, originX + 41, originY + 26.5, { align: 'center' });

  // QR Code Image on Right
  const qrW = 15;
  const qrH = 15;
  const qrX = originX + 33.5;
  const qrY = originY + 28;

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrW, qrH);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(qrX - 0.5, qrY - 0.5, qrW + 1, qrH + 1, 'D');

  // Attendee Full Name (Centered & Themed)
  doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text(attendee.fullName.toUpperCase(), originX + cardW / 2, originY + 47.5, {
    align: 'center',
  });

  // Class or Designation
  const roleText = isStudent
    ? student?.className?.toLowerCase().includes('class')
      ? `${student.className} (${student.section || 'A'})`
      : `Class : ${student?.className} (${student?.section || 'A'})`
    : `Designation : ${staff?.designation || 'Faculty'}`;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(5.2);
  doc.text(roleText, originX + cardW / 2, originY + 50.5, { align: 'center' });

  // Two-column Details Table
  const tableY = originY + 53;
  const tableW = cardW - 6;
  const tableH = 19;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.15);
  doc.roundedRect(originX + 3, tableY, tableW, tableH, 1.5, 1.5, 'FD');

  const keyX = originX + 4.5;
  const colonX = originX + 22;
  const valX = originX + 23.5;
  let lineY = tableY + 3.2;
  const lineSpacing = 3.2;

  const printDetailRow = (key: string, val: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(3.8);
    doc.setTextColor(71, 85, 105);
    doc.text(key, keyX, lineY);
    doc.text(':', colonX, lineY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, valX, lineY);
    lineY += lineSpacing;
  };

  printDetailRow(isStudent ? "Father's Name" : 'Father / Spouse', fatherName);
  if (isStudent) {
    printDetailRow("Mother's Name", motherName);
  } else {
    printDetailRow('Department', staff?.department || 'Academics');
  }
  printDetailRow('Date of Birth', dobFormatted);
  printDetailRow('Blood Group', bloodGroup);

  // Address (clipped or wrapped)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Address', keyX, lineY);
  doc.text(':', colonX, lineY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const truncatedAddr = address.length > 32 ? address.slice(0, 30) + '...' : address;
  doc.text(truncatedAddr, valX, lineY);

  // Footer Section
  const footerY = originY + 75;

  // Principal Signature on Left
  let signatureDrawn = false;
  if (settings.principalSignatureUrl) {
    try {
      doc.addImage(settings.principalSignatureUrl, originX + 4, footerY - 0.5, 13, 5);
      signatureDrawn = true;
    } catch {
      signatureDrawn = false;
    }
  }

  if (!signatureDrawn) {
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.3);
    doc.line(originX + 4, footerY + 5, originX + 17, footerY + 5);
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.2);
  doc.line(originX + 4, footerY + 5.5, originX + 17, footerY + 5.5);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.2);
  doc.text(settings.principalName || 'Principal', originX + 10.5, footerY + 7.8, { align: 'center' });

  // Accent Arc at Bottom
  doc.setFillColor(secondaryRgb[0], secondaryRgb[1], secondaryRgb[2]);
  doc.rect(originX + 25, originY + cardH - 1.5, cardW - 25, 1.5, 'F');

  // Right ID No. Badge matching theme primary color
  const badgeW = 26;
  const badgeH = 8.5;
  const badgeX = originX + cardW - badgeW - 1.5;
  const badgeY = originY + cardH - badgeH - 1.5;

  doc.setFillColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'F');

  doc.setTextColor(225, 235, 245);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text('ID No.', badgeX + badgeW - 2, badgeY + 3.2, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.2);
  doc.text(idNumber, badgeX + badgeW - 2, badgeY + 6.8, { align: 'right' });
}

/**
 * Generate a single high-resolution portrait vector ID card PDF (CR80 standard 54mm x 85.6mm).
 */
export async function generateSingleBadgePdf(
  attendee: Student | Staff,
  type: 'student' | 'staff',
  settings: SchoolSettings,
  themeInput?: BadgeThemeKey | BadgeThemeConfig | string
): Promise<void> {
  const isStudent = type === 'student';
  const student = isStudent ? (attendee as Student) : null;
  const staff = !isStudent ? (attendee as Staff) : null;

  // CR80 Portrait: 54mm x 85.6mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [54, 85.6],
  });

  await drawBrightFutureCard(doc, attendee, type, settings, 0, 0, themeInput);

  const filename = isStudent
    ? `ID_Card_${student?.rollNo || 'student'}_${student?.fullName.replace(/\s+/g, '_')}.pdf`
    : `ID_Card_${staff?.employeeCode || 'staff'}_${staff?.fullName.replace(/\s+/g, '_')}.pdf`;

  doc.save(filename);
}

/**
 * Generate a multi-page A4 print sheet with a 3x3 grid (9 cards per page) with cut guides.
 */
export async function generateBatchBadgesPdf(
  attendees: (Student | Staff)[],
  type: 'student' | 'staff',
  settings: SchoolSettings,
  themeInput?: BadgeThemeKey | BadgeThemeConfig | string,
  customFilename?: string
): Promise<void> {
  if (attendees.length === 0) return;

  const isStudent = type === 'student';
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const cardW = 54;
  const cardH = 85.6;

  // 3 columns x 3 rows = 9 cards per A4 page
  const cols = 3;
  const rows = 3;
  const gapX = 8;
  const gapY = 6;
  const marginX = (210 - (cols * cardW + (cols - 1) * gapX)) / 2; // ~16mm
  const marginY = (297 - (rows * cardH + (rows - 1) * gapY)) / 2; // ~14mm

  let count = 0;

  for (let i = 0; i < attendees.length; i++) {
    const attendee = attendees[i];

    if (count > 0 && count % (cols * rows) === 0) {
      doc.addPage();
    }

    const slotIndex = count % (cols * rows);
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);

    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    await drawBrightFutureCard(doc, attendee, type, settings, x, y, themeInput);

    // Subtle crop cut guide around each card
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.15);
    // 4 corner cut marks
    doc.line(x - 2, y, x, y);
    doc.line(x, y - 2, x, y);
    doc.line(x + cardW, y, x + cardW + 2, y);
    doc.line(x + cardW, y - 2, x + cardW, y);
    doc.line(x - 2, y + cardH, x, y + cardH);
    doc.line(x, y + cardH, x, y + cardH + 2);
    doc.line(x + cardW, y + cardH, x + cardW + 2, y + cardH);
    doc.line(x + cardW, y + cardH, x + cardW + 2, y + cardH + 2);

    count++;
  }

  const defaultFilename = isStudent
    ? `Batch_Student_ID_Cards_${settings.currentAcademicYear || 'session'}.pdf`
    : `Batch_Staff_ID_Cards_${settings.currentAcademicYear || 'session'}.pdf`;

  doc.save(customFilename || defaultFilename);
}

/**
 * Generate a single PDF containing QR badges for all students in the selected class.
 */
export async function generateClassBadgesPdf(
  students: Student[],
  className: string,
  settings: SchoolSettings,
  themeInput?: BadgeThemeKey | BadgeThemeConfig | string
): Promise<void> {
  const classLabel = className === 'All' ? 'All_Classes' : className.replace(/\s+/g, '_');
  const filename = `Attendance_ID_Cards_${classLabel}_${settings.currentAcademicYear || 'session'}.pdf`;
  return generateBatchBadgesPdf(students, 'student', settings, themeInput, filename);
}
