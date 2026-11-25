import jsPDF from 'jspdf';
import { SchoolSettings, Student } from '../types';
import { formatDate } from './formatters';

export interface AdmissionFormData {
  formNo: string;
  admissionDate: string;
  // Student Details
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  religion: string;
  bloodGroup: string;
  nationalIdNo: string; // B-form / Birth Cert / CNIC
  className: string;
  section: string;
  photoUrl?: string;

  // Previous Academic History
  previousSchool: string;
  previousClass: string;
  previousMarksOrGrade: string;
  previousLeavingCertNo: string;

  // Parent / Guardian Details
  guardianName: string;
  guardianRelation: string;
  guardianOccupation: string;
  guardianEmployer: string;
  guardianCnic: string;
  contactNumber: string;
  alternateContactNumber: string;
  email: string;
  residentialAddress: string;
  permanentAddress: string;

  // Verification Checklist
  hasPhotoAttached: boolean;
  hasBirthCertAttached: boolean;
  hasSchoolLeavingCertAttached: boolean;
  hasGuardianCnicAttached: boolean;
  hasReportCardAttached: boolean;
  hasMedicalRecordAttached: boolean;

  // Office Use
  officeStatus?: 'Approved' | 'Provisional' | 'Pending' | 'Rejected';
  officeRollNo?: string;
  officeRemarks?: string;
}

/**
 * Generates an official, strictly ONE-PAGE Portrait (A4) Student Admission / Registration Form
 * Formatted with high-density administrative layout, school account branding, rules and regulations.
 */
export function generateAdmissionFormPdf(
  settings: SchoolSettings,
  data: AdmissionFormData
): void {
  // A4 dimensions in mm: 210 x 297
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190 mm

  // Helper colors
  const primaryNavy: [number, number, number] = [30, 41, 59]; // slate-800
  const headerBg: [number, number, number] = [241, 245, 249]; // slate-100
  const borderGrey: [number, number, number] = [148, 163, 184]; // slate-400
  const textDark: [number, number, number] = [15, 23, 42]; // slate-900
  const textMuted: [number, number, number] = [71, 85, 105]; // slate-600

  // 1. Top Outer Frame (Double border for official look)
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.6);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin - 2) * 2);
  doc.setLineWidth(0.2);
  doc.rect(margin - 0.5, margin - 0.5, contentWidth + 1, pageHeight - (margin - 0.5) * 2);

  let y = margin + 2;

  // 2. School Header Banner
  // Logo or Crest on Left (32mm x 24mm)
  const logoBoxWidth = 24;
  const logoBoxHeight = 22;
  const logoX = margin + 2;

  if (settings.logoUrl && (settings.logoUrl.startsWith('data:image') || settings.logoUrl.startsWith('http'))) {
    try {
      const imgFormat =
        settings.logoUrl.startsWith('data:image/jpeg') ||
        settings.logoUrl.startsWith('data:image/jpg')
          ? 'JPEG'
          : 'PNG';
      doc.addImage(settings.logoUrl, imgFormat, logoX, y, logoBoxWidth, logoBoxHeight);
    } catch {
      drawAcademicCrest(doc, logoX, y, logoBoxWidth, logoBoxHeight);
    }
  } else {
    drawAcademicCrest(doc, logoX, y, logoBoxWidth, logoBoxHeight);
  }

  // 4x4 Photo Box on Right (28mm x 28mm ~ 4x4 aspect)
  const photoBoxWidth = 26;
  const photoBoxHeight = 28;
  const photoX = pageWidth - margin - photoBoxWidth - 2;

  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.4);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(photoX, y - 1, photoBoxWidth, photoBoxHeight, 1, 1, 'FD');

  if (data.photoUrl && (data.photoUrl.startsWith('data:image') || data.photoUrl.startsWith('http'))) {
    try {
      doc.addImage(data.photoUrl, 'JPEG', photoX + 0.5, y - 0.5, photoBoxWidth - 1, photoBoxHeight - 1);
    } catch {
      drawPhotoPlaceholder(doc, photoX, y, photoBoxWidth, photoBoxHeight);
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, y, photoBoxWidth, photoBoxHeight);
  }

  // School Information (Center-Aligned between Logo & Photo)
  const headerCenterX = margin + logoBoxWidth + (photoX - (margin + logoBoxWidth)) / 2;

  doc.setTextColor(...primaryNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.schoolName || 'EDULEDGER INTERNATIONAL ACADEMY', headerCenterX, y + 4, {
    align: 'center',
  });

  if (settings.schoolTagline) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...textMuted);
    doc.text(`"${settings.schoolTagline}"`, headerCenterX, y + 8, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  const addressText = settings.schoolAddress || 'Official Administrative Campus';
  doc.text(addressText, headerCenterX, y + 12, { align: 'center' });

  const contactText = `Tel: ${settings.schoolPhone || 'N/A'}  |  Email: ${settings.schoolEmail || 'admissions@school.edu'}  |  Web: ${settings.schoolWebsite || 'www.eduledger.ac'}`;
  doc.text(contactText, headerCenterX, y + 15.5, { align: 'center' });

  const sessionText = `ACADEMIC SESSION: ${settings.currentAcademicYear || '2026-2027'}  |  GOVT REG / AFFILIATION: ACC-2026-ED`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...primaryNavy);
  doc.text(sessionText, headerCenterX, y + 19, { align: 'center' });

  y += 24;

  // 3. Application Title Ribbon
  doc.setFillColor(...primaryNavy);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL STUDENT ADMISSION & REGISTRATION FORM', margin + contentWidth / 2, y + 3.8, {
    align: 'center',
  });

  y += 6.5;

  // Metadata Sub-row: Form No, Admission Date, Class Applied
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.setFillColor(...headerBg);
  doc.rect(margin, y, contentWidth, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...textDark);
  doc.text(`FORM NO:`, margin + 2, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.formNo || 'ADM-2026-____', margin + 18, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`ADMISSION DATE:`, margin + 55, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.admissionDate) || 'DD/MM/YYYY', margin + 81, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.text(`CLASS APPLIED:`, margin + 120, y + 3.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.className || '_________'}  (Sec: ${data.section || '___'})`, margin + 145, y + 3.5);

  y += 6.5;

  // Helper for Section Titles
  const drawSectionHeading = (title: string, currentY: number): number => {
    doc.setFillColor(226, 232, 240); // slate-200
    doc.setDrawColor(...borderGrey);
    doc.setLineWidth(0.3);
    doc.rect(margin, currentY, contentWidth, 4.2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryNavy);
    doc.text(title, margin + 2, currentY + 3.1);
    return currentY + 4.2;
  };

  // Helper for Table Grid Rows
  const drawDataRow = (
    label1: string,
    val1: string,
    label2: string,
    val2: string,
    currentY: number,
    rowHeight = 4.6
  ): number => {
    const col1Width = 32;
    const col2Width = 63;
    const col3Width = 32;
    const col4Width = 63;

    doc.setDrawColor(...borderGrey);
    doc.setLineWidth(0.2);
    doc.rect(margin, currentY, contentWidth, rowHeight);
    doc.line(margin + col1Width, currentY, margin + col1Width, currentY + rowHeight);
    doc.line(margin + col1Width + col2Width, currentY, margin + col1Width + col2Width, currentY + rowHeight);
    doc.line(margin + col1Width + col2Width + col3Width, currentY, margin + col1Width + col2Width + col3Width, currentY + rowHeight);

    // Label 1
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 0.1, currentY + 0.1, col1Width - 0.2, rowHeight - 0.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...textDark);
    doc.text(label1, margin + 1.5, currentY + 3.2);

    // Val 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(truncateText(doc, val1 || '', col2Width - 3), margin + col1Width + 1.5, currentY + 3.2);

    // Label 2
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + col1Width + col2Width + 0.1, currentY + 0.1, col3Width - 0.2, rowHeight - 0.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(label2, margin + col1Width + col2Width + 1.5, currentY + 3.2);

    // Val 2
    doc.setFont('helvetica', 'normal');
    doc.text(truncateText(doc, val2 || '', col4Width - 3), margin + col1Width + col2Width + col3Width + 1.5, currentY + 3.2);

    return currentY + rowHeight;
  };

  // 4. SECTION 1: STUDENT BIODATA & PERSONAL DETAILS
  y = drawSectionHeading('1. STUDENT PERSONAL INFORMATION & BIODATA', y);
  y = drawDataRow("Full Student Name:", data.fullName.toUpperCase() || '____________________', "Gender:", data.gender || '________', y);
  y = drawDataRow("Date of Birth:", data.dateOfBirth ? `${formatDate(data.dateOfBirth)}` : '____/____/____', "Blood Group:", data.bloodGroup || '________', y);
  y = drawDataRow("Birth Cert / B-Form No:", data.nationalIdNo || '____________________', "Place of Birth / City:", data.placeOfBirth || '____________________', y);
  y = drawDataRow("Nationality:", data.nationality || 'Pakistani / Standard', "Religion / Faith:", data.religion || '____________________', y);

  y += 1.5;

  // 5. SECTION 2: PREVIOUS ACADEMIC DETAILS
  y = drawSectionHeading('2. PREVIOUS ACADEMIC RECORD & PREVIOUS INSTITUTION', y);
  y = drawDataRow("Previous School Attended:", data.previousSchool || 'N/A (First Admission)', "Previous Class & Medium:", data.previousClass || 'N/A', y);
  y = drawDataRow("Leaving Cert / TC No:", data.previousLeavingCertNo || 'N/A', "Marks / Grade Obtained:", data.previousMarksOrGrade || 'N/A', y);

  y += 1.5;

  // 6. SECTION 3: PARENT / GUARDIAN INFORMATION
  y = drawSectionHeading('3. PARENT / GUARDIAN PARTICULARS', y);
  y = drawDataRow("Father / Guardian Name:", data.guardianName || '____________________', "Relationship to Student:", data.guardianRelation || 'Father', y);
  y = drawDataRow("Occupation / Profession:", data.guardianOccupation || '____________________', "Employer / Workplace:", data.guardianEmployer || '____________________', y);
  y = drawDataRow("CNIC / National ID No:", data.guardianCnic || '____________________', "Primary Mobile / Phone:", data.contactNumber || '____________________', y);
  y = drawDataRow("Emergency Contact No:", data.alternateContactNumber || '____________________', "Guardian Email Address:", data.email || '____________________', y);

  // Residential Address (Full row)
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.2);
  doc.rect(margin, y, contentWidth, 4.6);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin + 0.1, y + 0.1, 32 - 0.2, 4.4, 'F');
  doc.line(margin + 32, y, margin + 32, y + 4.6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(...textDark);
  doc.text("Residential Address:", margin + 1.5, y + 3.2);
  doc.setFont('helvetica', 'normal');
  doc.text(truncateText(doc, data.residentialAddress || '__________________________________________________________________', contentWidth - 36), margin + 33.5, y + 3.2);
  y += 4.6;

  y += 1.5;

  // 7. SECTION 4: MANDATORY ADMISSION REQUIREMENTS & CHECKLIST
  y = drawSectionHeading('4. MANDATORY ADMISSION REQUIREMENTS & ATTACHMENTS CHECKLIST', y);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 10.5, 'FD');

  const checkItems = [
    { label: "1x Recent 4x4 cm / Passport size photograph", checked: data.hasPhotoAttached },
    { label: "Attested Birth Certificate / NADRA B-Form copy", checked: data.hasBirthCertAttached },
    { label: "Previous School Leaving Certificate (SLC/TC)", checked: data.hasSchoolLeavingCertAttached },
    { label: "Copy of Father / Guardian CNIC / National ID Card", checked: data.hasGuardianCnicAttached },
    { label: "Previous Academic Marksheet / Report Card", checked: data.hasReportCardAttached },
    { label: "Medical / Vaccination Record & Blood Group proof", checked: data.hasMedicalRecordAttached },
  ];

  const colWidthCheck = contentWidth / 2;
  checkItems.forEach((item, idx) => {
    const isCol2 = idx >= 3;
    const rowOffset = (idx % 3) * 3.2;
    const itemX = margin + (isCol2 ? colWidthCheck + 2 : 2);
    const itemY = y + 2.5 + rowOffset;

    // Checkbox box
    doc.setDrawColor(71, 85, 105);
    doc.setLineWidth(0.25);
    doc.rect(itemX, itemY - 1.8, 2.3, 2.3);
    if (item.checked) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(16, 185, 129); // emerald
      doc.text('v', itemX + 0.4, itemY - 0.2);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textDark);
    doc.text(item.label, itemX + 3.8, itemY);
  });

  y += 11.5;

  // 8. SECTION 5: RULES & REGULATIONS (CRITICAL REQUIREMENT)
  y = drawSectionHeading('5. MANDATORY RULES & REGULATIONS OF ADMISSION', y);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.2);
  doc.setFillColor(254, 252, 232); // amber-50 background for highlighted rules
  doc.rect(margin, y, contentWidth, 17.5, 'FD');

  const rules = [
    "1. Annual Fee Policy: An annual tuition & composite fee increase of 10% will be applied at the beginning of every new academic year / January to adjust for economic and facility costs.",
    "2. Monthly Tuition Due Date: All school tuition dues must be cleared on or before the 10th of every calendar month. A late payment fine applies thereafter.",
    "3. Mandatory Attendance: Minimum 80% attendance is strictly required for admission to terminal/board examinations and class promotion.",
    "4. Code of Conduct: The student must strictly wear the prescribed school uniform and abide by all discipline, punctuality, and campus ethics standards.",
    "5. Withdrawal Notice: One month advance written notice or one month fee in lieu is mandatory prior to withdrawal or issuance of a School Leaving Certificate.",
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(30, 41, 59);

  rules.forEach((rule, rIdx) => {
    const ruleY = y + 2.8 + rIdx * 3.1;
    // Highlight the 10% increase rule in bold
    if (rIdx === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(rule, margin + 2, ruleY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    } else {
      doc.text(rule, margin + 2, ruleY);
    }
  });

  y += 18.5;

  // 9. SECTION 6: PARENT UNDERTAKING & SIGNATURES
  y = drawSectionHeading('6. PARENT / GUARDIAN UNDERTAKING & DECLARATION', y);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.2);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, y, contentWidth, 14, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.2);
  doc.setTextColor(...textMuted);
  const declarationText =
    "I solemnly affirm that the information provided in this admission form is authentic, true, and complete. I have carefully read and accepted the School Rules & Regulations (including the mandatory 10% annual fee adjustment and monthly payment schedules). I undertake to cooperate with the school management in maintaining disciplinary excellence.";
  doc.text(doc.splitTextToSize(declarationText, contentWidth - 4), margin + 2, y + 2.6);

  // Signature Lines
  const sigY = y + 10.5;
  // Student Sign
  doc.setDrawColor(...borderGrey);
  doc.line(margin + 6, sigY, margin + 45, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(...textDark);
  doc.text("Candidate / Student Signature", margin + 8, sigY + 2.6);

  // Date
  doc.line(margin + 58, sigY, margin + 88, sigY);
  doc.text(`Date: ${formatDate(data.admissionDate)}`, margin + 60, sigY + 2.6);

  // Father / Guardian Sign
  doc.line(margin + 110, sigY, margin + 175, sigY);
  doc.setFont('helvetica', 'bold');
  doc.text("Father / Guardian Signature & Thumb Impression", margin + 112, sigY + 2.6);

  y += 15;

  // 10. SECTION 7: FOR OFFICE / ADMINISTRATIVE USE ONLY
  y = drawSectionHeading('7. FOR OFFICE / REGISTRAR USE ONLY (NOT FOR APPLICANT)', y);
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 15, 'FD');

  // Office Fields Row 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...textDark);
  doc.text(`Admission Status: [  ] Approved    [  ] Provisional    [  ] Rejected`, margin + 3, y + 3.4);
  doc.text(`Assigned Roll No: ${data.officeRollNo || '____________'}`, margin + 95, y + 3.4);
  doc.text(`Assigned Section: ${data.section || '___'}`, margin + 150, y + 3.4);

  // Office Fields Row 2
  doc.text(`Admission Fee Paid: Yes [  ] No [  ]   |   Receipt No: ____________   |   Date: ____/____/2026`, margin + 3, y + 7.2);

  // Signatures of Authority Row
  const officeSigY = y + 12;
  doc.line(margin + 5, officeSigY, margin + 50, officeSigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text("Admission Incharge Signature", margin + 8, officeSigY + 2.2);

  doc.line(margin + 65, officeSigY, margin + 110, officeSigY);
  doc.text("Accounts Officer Clearance", margin + 70, officeSigY + 2.2);

  doc.line(margin + 125, officeSigY, margin + 180, officeSigY);
  doc.setFont('helvetica', 'bold');
  doc.text("Principal / Headmaster Signature & Seal", margin + 128, officeSigY + 2.2);

  // Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.5);
  doc.setTextColor(...textMuted);
  doc.text(
    `EduLedger ERP Verification System  •  Generated on ${new Date().toLocaleDateString()}  •  Strictly 1-Page Official Form`,
    pageWidth / 2,
    pageHeight - margin + 0.5,
    { align: 'center' }
  );

  // Save PDF
  const filename = `Admission_Form_${data.fullName ? data.fullName.replace(/\s+/g, '_') : 'Blank'}_${data.formNo || '2026'}.pdf`;
  doc.save(filename);
}

// Helpers
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

function drawAcademicCrest(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setFillColor(30, 41, 59);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(x + 2, y + 1, w - 4, h - 2, 2, 2, 'FD');

  doc.setFillColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('EDULEDGER', x + w / 2, y + 8, { align: 'center' });

  doc.setFontSize(5.5);
  doc.text('OFFICIAL', x + w / 2, y + 12, { align: 'center' });
  doc.text('ADMISSION', x + w / 2, y + 15, { align: 'center' });
  doc.text('★ ★ ★', x + w / 2, y + 18, { align: 'center' });
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('AFFIX RECENT', x + w / 2, y + 7, { align: 'center' });
  doc.text('4x4 cm / PASSPORT', x + w / 2, y + 11, { align: 'center' });
  doc.text('PHOTOGRAPH', x + w / 2, y + 15, { align: 'center' });
  doc.text('HERE', x + w / 2, y + 19, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.text('(Blue Background)', x + w / 2, y + 23, { align: 'center' });
}
