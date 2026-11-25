import jsPDF from 'jspdf';
import { SchoolSettings, Staff } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from './formatters';

export type HRLetterType = 'service_record' | 'appointment' | 'experience' | 'leave_sanction';

export interface HRLetterPdfOptions {
  refNo?: string;
  issueDate?: string;
  signatoryName?: string;
  signatoryTitle?: string;
}

/**
 * Generates an official, publication-quality A4 PDF for HR Letters and Service Records.
 * Includes complete institutional letterhead, uploaded school logo, employee credentials,
 * compensation breakdown, official seal, and audit verification bar.
 */
export function generateHRLetterPdf(
  settings: SchoolSettings,
  member: Staff,
  letterType: HRLetterType,
  options: HRLetterPdfOptions = {}
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 18;
  const contentWidth = pageWidth - margin * 2; // 174 mm
  let y = 16;

  const schoolName = settings.schoolName || 'St. Augustine International Academy';
  const schoolTagline = settings.schoolTagline || 'Excellence in Education & Character Building';
  const schoolAddress = settings.schoolAddress || '742 Evergreen Boulevard, Springfield, IL 62704';
  const schoolPhone = settings.schoolPhone || '+1 (555) 234-5678';
  const schoolEmail = settings.schoolEmail || 'admin@staugustine.edu';

  const issueDate = options.issueDate || getTodayDateString();
  const typeCode = letterType.toUpperCase().slice(0, 4);
  const refNo = options.refNo || `HR-${member.employeeCode}-${typeCode}-${new Date().getFullYear()}`;

  // =========================================================================
  // 1. TOP INSTITUTIONAL LETTERHEAD
  // =========================================================================
  const logoSize = 20;
  let logoDrawn = false;

  if (settings.logoUrl && settings.logoUrl.startsWith('data:image/')) {
    try {
      const format = settings.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(settings.logoUrl, format, margin, y, logoSize, logoSize, undefined, 'FAST');
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }

  // Fallback monogram badge if no custom image is available
  if (!logoDrawn) {
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(margin, y, logoSize, logoSize, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const initials = schoolName
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SA';
    doc.text(initials, margin + logoSize / 2, y + 12.5, { align: 'center' });
  }

  // Header Typography (School Name & Info)
  const headerTextX = margin + logoSize + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(schoolName.toUpperCase(), headerTextX, y + 6);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(schoolTagline, headerTextX, y + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`${schoolAddress}  •  Tel: ${schoolPhone}  •  Email: ${schoolEmail}`, headerTextX, y + 17);

  y += logoSize + 6;

  // Double Institutional Rule Divider
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setDrawColor(79, 70, 229); // indigo-600
  doc.setLineWidth(0.3);
  doc.line(margin, y + 1.2, pageWidth - margin, y + 1.2);

  y += 10;

  // =========================================================================
  // 2. REFERENCE NUMBER & DATE STRIP
  // =========================================================================
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('DOCUMENT REF NO: ', margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(refNo, margin + 34, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUE DATE: ', pageWidth - margin - 42, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(issueDate), pageWidth - margin, y, { align: 'right' });

  y += 12;

  // =========================================================================
  // 3. DOCUMENT TITLE
  // =========================================================================
  let documentTitle = 'OFFICIAL EMPLOYEE SERVICE RECORD & DOSSIER';
  if (letterType === 'appointment') {
    documentTitle = 'FORMAL LETTER OF FACULTY APPOINTMENT';
  } else if (letterType === 'experience') {
    documentTitle = 'EXPERIENCE & SERVICE RECOGNITION CERTIFICATE';
  } else if (letterType === 'leave_sanction') {
    documentTitle = 'FORMAL LEAVE SANCTION ORDER';
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(documentTitle, pageWidth / 2, y, { align: 'center' });

  // Underline decoration
  const titleWidth = doc.getTextWidth(documentTitle);
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - titleWidth / 2, y + 2, pageWidth / 2 + titleWidth / 2, y + 2);

  y += 12;

  // =========================================================================
  // 4. DOCUMENT BODY & STRUCTURED DATA
  // =========================================================================
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  if (letterType === 'service_record') {
    const p1 = `This is an official institutional transcript of service certified by the Board of Directors of ${schoolName}. The records summarized below reflect verified employment data maintained in the permanent HR archive:`;
    const splitP1 = doc.splitTextToSize(p1, contentWidth);
    doc.text(splitP1, margin, y);
    y += splitP1.length * 5 + 4;

    // Structured Dossier Table Box
    const tableY = y;
    const tableHeight = 44;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.roundedRect(margin, tableY, contentWidth, tableHeight, 2, 2, 'FD');

    const col1 = margin + 5;
    const col2 = margin + contentWidth / 2 + 5;
    const rowH = 9.5;

    // Row 1
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Full Legal Name:', col1, tableY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(member.fullName, col1 + 32, tableY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Employee Code:', col2, tableY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(79, 70, 229);
    doc.text(member.employeeCode, col2 + 32, tableY + 5.5);

    // Row 2
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Designation:', col1, tableY + 5.5 + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(member.designation, col1 + 32, tableY + 5.5 + rowH);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Department:', col2, tableY + 5.5 + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(member.department, col2 + 32, tableY + 5.5 + rowH);

    // Row 3
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Date of Joining:', col1, tableY + 5.5 + rowH * 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(formatDate(member.joiningDate), col1 + 32, tableY + 5.5 + rowH * 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Status:', col2, tableY + 5.5 + rowH * 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(member.status === 'active' ? 16 : 79, member.status === 'active' ? 185 : 70, member.status === 'active' ? 129 : 229);
    doc.text(member.status.toUpperCase(), col2 + 32, tableY + 5.5 + rowH * 2);

    // Row 4
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Qualification:', col1, tableY + 5.5 + rowH * 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(member.qualification || 'Master of Science / Arts', col1 + 32, tableY + 5.5 + rowH * 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Compensation:', col2, tableY + 5.5 + rowH * 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${formatCurrency(member.monthlySalary, settings.currencySymbol)} / month`, col2 + 32, tableY + 5.5 + rowH * 3);

    y += tableHeight + 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    const p2 = `During the tenure of service, the employee's pedagogical conduct, ethical responsibility, and administrative cooperation have been evaluated as Exemplary and in strict adherence to academic regulations.`;
    const splitP2 = doc.splitTextToSize(p2, contentWidth);
    doc.text(splitP2, margin, y);
    y += splitP2.length * 5 + 6;

    const p3 = `This dossier is issued upon verified institutional request for statutory audits, governmental accreditation, or official verification purposes.`;
    const splitP3 = doc.splitTextToSize(p3, contentWidth);
    doc.text(splitP3, margin, y);
    y += splitP3.length * 5 + 8;

  } else if (letterType === 'appointment') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`Dear ${member.fullName},`, margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    const p1 = `We are pleased to formally confirm your appointment at ${schoolName} in the capacity of ${member.designation} within the Department of ${member.department}, with effect from ${formatDate(member.joiningDate)}.`;
    const splitP1 = doc.splitTextToSize(p1, contentWidth);
    doc.text(splitP1, margin, y);
    y += splitP1.length * 5.2 + 5;

    const p2 = `Your compensation package consists of a monthly base remuneration of ${formatCurrency(member.monthlySalary, settings.currencySymbol)} plus applicable allowances, subject to statutory tax deductions and social security bylaws.`;
    const splitP2 = doc.splitTextToSize(p2, contentWidth);
    doc.text(splitP2, margin, y);
    y += splitP2.length * 5.2 + 5;

    const p3 = `You will be entitled to institutional leave benefits, faculty medical coverage, and curriculum development programs in accordance with the Faculty Regulations and Staff Code of Conduct.`;
    const splitP3 = doc.splitTextToSize(p3, contentWidth);
    doc.text(splitP3, margin, y);
    y += splitP3.length * 5.2 + 5;

    const p4 = `We congratulate you on your appointment and look forward to your valuable academic contributions toward scholastic excellence at our institution.`;
    const splitP4 = doc.splitTextToSize(p4, contentWidth);
    doc.text(splitP4, margin, y);
    y += splitP4.length * 5.2 + 8;

  } else if (letterType === 'experience') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TO WHOM IT MAY CONCERN:', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    const p1 = `This is to certify that ${member.fullName} (Employee Code: ${member.employeeCode}) has been an integral and esteemed member of the faculty at ${schoolName}, serving diligently as ${member.designation} in the Department of ${member.department} from ${formatDate(member.joiningDate)} to the present date.`;
    const splitP1 = doc.splitTextToSize(p1, contentWidth);
    doc.text(splitP1, margin, y);
    y += splitP1.length * 5.4 + 5;

    const p2 = `Throughout their pedagogical tenure, ${member.fullName} has carried out assigned teaching and departmental responsibilities with exemplary professionalism, scholarly integrity, and steadfast dedication to student mentorship.`;
    const splitP2 = doc.splitTextToSize(p2, contentWidth);
    doc.text(splitP2, margin, y);
    y += splitP2.length * 5.4 + 5;

    const p3 = `They have consistently maintained harmonious professional relations with administrative officers, faculty peers, and guardians. We record our highest appreciation for their institutional services and convey our best wishes for their future career aspirations.`;
    const splitP3 = doc.splitTextToSize(p3, contentWidth);
    doc.text(splitP3, margin, y);
    y += splitP3.length * 5.4 + 8;

  } else if (letterType === 'leave_sanction') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('OFFICIAL SANCTION ORDER:', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    const p1 = `Sanction is hereby formally accorded for the grant of official leave to ${member.fullName}, ${member.designation}, Department of ${member.department} (Employee Code: ${member.employeeCode}).`;
    const splitP1 = doc.splitTextToSize(p1, contentWidth);
    doc.text(splitP1, margin, y);
    y += splitP1.length * 5.4 + 5;

    const p2 = `The sanctioned duration is debited against the employee's verified leave credit ledger. Prior substitute academic coverage and pedagogical contingency plans have been submitted and certified by the departmental chairperson.`;
    const splitP2 = doc.splitTextToSize(p2, contentWidth);
    doc.text(splitP2, margin, y);
    y += splitP2.length * 5.4 + 5;

    const p3 = `The employee shall resume full teaching and departmental duties immediately upon the expiration of the sanctioned leave period.`;
    const splitP3 = doc.splitTextToSize(p3, contentWidth);
    doc.text(splitP3, margin, y);
    y += splitP3.length * 5.4 + 8;
  }

  // =========================================================================
  // 5. SIGNATORIES & OFFICIAL REGISTRAR SEAL
  // =========================================================================
  const bottomY = Math.max(y + 12, pageHeight - 65);

  // Divider above signatories
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, bottomY - 6, pageWidth - margin, bottomY - 6);

  // Circular Official Seal (Left side)
  const sealCenterX = margin + 18;
  const sealCenterY = bottomY + 14;
  const sealRadius = 13;

  doc.setDrawColor(30, 27, 75); // indigo-950
  doc.setLineWidth(0.8);
  doc.circle(sealCenterX, sealCenterY, sealRadius, 'S');

  doc.setLineWidth(0.3);
  doc.circle(sealCenterX, sealCenterY, sealRadius - 1.8, 'S');

  // Subtle watermark logo in seal if available
  if (settings.logoUrl && settings.logoUrl.startsWith('data:image/')) {
    try {
      const format = settings.logoUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(
        settings.logoUrl,
        format,
        sealCenterX - 6.5,
        sealCenterY - 6.5,
        13,
        13,
        undefined,
        'FAST'
      );
    } catch {
      // ignore
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(30, 27, 75);
  doc.text(schoolName.slice(0, 24).toUpperCase(), sealCenterX, sealCenterY - 4.5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(190, 18, 60); // rose-700
  doc.text('OFFICIAL SEAL', sealCenterX, sealCenterY + 1.2, { align: 'center' });

  doc.setFontSize(5.5);
  doc.setTextColor(30, 27, 75);
  doc.text('REGISTRAR', sealCenterX, sealCenterY + 6, { align: 'center' });

  // Center Signature: Registrar / Bursar
  const centerSigX = margin + contentWidth / 2 - 10;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(centerSigX, bottomY + 22, centerSigX + 42, bottomY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bursar / Registrar', centerSigX + 21, bottomY + 26, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Faculty Records Registry', centerSigX + 21, bottomY + 30, { align: 'center' });

  // Right Signature: Principal / Director
  const rightSigX = pageWidth - margin - 52;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(rightSigX, bottomY + 22, rightSigX + 52, bottomY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(options.signatoryName || 'Dr. Arthur Sterling, Ph.D.', rightSigX + 26, bottomY + 26, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    options.signatoryTitle || 'Principal & Director of Administration',
    rightSigX + 26,
    bottomY + 30,
    { align: 'center' }
  );

  // =========================================================================
  // 6. FOOTER AUDIT BAR
  // =========================================================================
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Official Academic & Personnel Audit Document  •  Ref: ${refNo}  •  Generated: ${new Date().toLocaleString()}`,
    margin,
    pageHeight - 6
  );
  doc.text('Verified & Archived under School HR Bylaws', pageWidth - margin, pageHeight - 6, {
    align: 'right',
  });

  // Save File
  const cleanName = member.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `HR_${letterType.toUpperCase()}_${member.employeeCode}_${cleanName}.pdf`;
  doc.save(fileName);
}
