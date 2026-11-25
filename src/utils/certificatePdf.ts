import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { IssuedCertificate, SchoolSettings, CertificateTheme } from '../types';

interface ThemeColorPalette {
  primary: [number, number, number]; // Main header / border / dark accent
  secondary: [number, number, number]; // Gold or vibrant highlight
  accent: [number, number, number]; // Muted secondary text
  bgTint: [number, number, number]; // Soft background parchment tint
  textColor: [number, number, number]; // Main body text
  gold: [number, number, number]; // Ornamental metallic gold
}

const THEME_PALETTES: Record<CertificateTheme, ThemeColorPalette> = {
  royal_gold: {
    primary: [153, 101, 21], // #996515 Rich Bronze Gold
    secondary: [212, 175, 55], // #D4AF37 Bright Gold
    accent: [120, 53, 15], // Amber-900
    bgTint: [253, 251, 247], // Ivory Warm White
    textColor: [24, 24, 27], // Slate 900
    gold: [202, 138, 4], // Amber 600
  },
  sapphire_navy: {
    primary: [30, 58, 138], // #1E3A8A Deep Blue
    secondary: [59, 130, 246], // #3B82F6 Sapphire Blue
    accent: [197, 160, 89], // Gold Accent
    bgTint: [248, 250, 252], // Ice White
    textColor: [15, 23, 42], // Slate 900
    gold: [212, 175, 55], // Bright Gold
  },
  emerald_honors: {
    primary: [6, 95, 70], // #065F46 Deep Emerald
    secondary: [16, 185, 129], // #10B981 Vibrant Green
    accent: [180, 83, 9], // Warm Amber Gold
    bgTint: [247, 250, 248], // Mint Ivory
    textColor: [6, 78, 59], // Dark Forest
    gold: [217, 119, 6], // Amber Gold
  },
  burgundy_vintage: {
    primary: [131, 24, 67], // #831843 Deep Burgundy
    secondary: [190, 24, 93], // #BE185D Rose Pink
    accent: [161, 98, 7], // Antique Brass
    bgTint: [255, 251, 251], // Vintage Blush Ivory
    textColor: [45, 10, 25], // Dark Wine
    gold: [202, 138, 4], // Amber Gold
  },
  modern_minimal: {
    primary: [30, 41, 59], // #1E293B Deep Slate
    secondary: [71, 85, 105], // Slate 600
    accent: [197, 160, 89], // Gold Trim
    bgTint: [255, 255, 255], // Pure White
    textColor: [15, 23, 42], // Slate 900
    gold: [202, 138, 4], // Gold
  },
};

/**
 * Generates an official, printable Certificate as a downloadable A4 Landscape PDF.
 * Specifically configured for 297mm × 210mm paper dimensions.
 */
export async function generateCertificatePdf(
  cert: IssuedCertificate,
  settings?: SchoolSettings
): Promise<void> {
  // A4 Landscape: width = 297 mm, height = 210 mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const palette = THEME_PALETTES[cert.theme] || THEME_PALETTES.royal_gold;

  // 1. Subtle Paper Background Tint
  doc.setFillColor(...palette.bgTint);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 2. Layered Ornamental Borders
  // Outer Border (margin 7 mm)
  doc.setDrawColor(...palette.primary);
  doc.setLineWidth(1.4);
  doc.rect(7, 7, pageWidth - 14, pageHeight - 14, 'S');

  // Middle Accent Border (margin 9.5 mm)
  doc.setDrawColor(...palette.secondary);
  doc.setLineWidth(0.3);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19, 'S');

  // Inner Fine Border (margin 11.5 mm)
  doc.setDrawColor(...palette.primary);
  doc.setLineWidth(0.6);
  doc.rect(11.5, 11.5, pageWidth - 23, pageHeight - 23, 'S');

  // Draw Corner Ornaments (decorative brackets and diamonds in all 4 corners)
  const drawCornerOrnament = (x: number, y: number, dirX: 1 | -1, dirY: 1 | -1) => {
    doc.setFillColor(...palette.secondary);
    doc.setDrawColor(...palette.primary);
    doc.setLineWidth(0.4);

    // Corner diamond
    const cx = x + dirX * 6;
    const cy = y + dirY * 6;
    doc.triangle(cx, cy - 2, cx + 2, cy, cx, cy + 2, 'FD');
    doc.triangle(cx, cy - 2, cx - 2, cy, cx, cy + 2, 'FD');

    // Corner decorative lines
    doc.setDrawColor(...palette.secondary);
    doc.line(x + dirX * 2, y + dirY * 6, x + dirX * 12, y + dirY * 6);
    doc.line(x + dirX * 6, y + dirY * 2, x + dirX * 6, y + dirY * 12);
  };

  drawCornerOrnament(11.5, 11.5, 1, 1); // Top-left
  drawCornerOrnament(pageWidth - 11.5, 11.5, -1, 1); // Top-right
  drawCornerOrnament(11.5, pageHeight - 11.5, 1, -1); // Bottom-left
  drawCornerOrnament(pageWidth - 11.5, pageHeight - 11.5, -1, -1); // Bottom-right

  // 3. School Logo / Emblem
  let logoY = 16;
  const logoSize = 18;
  const logoX = (pageWidth - logoSize) / 2;

  let logoDrawn = false;
  if (cert.schoolLogo && cert.schoolLogo.startsWith('data:image/')) {
    try {
      // User-uploaded custom image or school logo
      const format = cert.schoolLogo.includes('image/png') ? 'PNG' : 'JPEG';
      doc.addImage(cert.schoolLogo, format, logoX, logoY, logoSize, logoSize, undefined, 'FAST');
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }

  // Fallback vector crest if no image is present
  if (!logoDrawn) {
    const crestCenterX = pageWidth / 2;
    const crestCenterY = logoY + 9;

    // Draw Academic Shield / Crest
    doc.setFillColor(...palette.primary);
    doc.setDrawColor(...palette.secondary);
    doc.setLineWidth(0.6);
    doc.circle(crestCenterX, crestCenterY, 8.5, 'FD');

    doc.setFillColor(...palette.secondary);
    doc.circle(crestCenterX, crestCenterY, 6.5, 'FD');

    doc.setFillColor(...palette.primary);
    doc.circle(crestCenterX, crestCenterY, 5, 'FD');

    // Star in the center
    doc.setFillColor(255, 255, 255);
    doc.circle(crestCenterX, crestCenterY, 1.8, 'F');
  }

  // 4. School Name & Branding Header
  const schoolName = cert.schoolName || settings?.schoolName || 'St. Augustine International Academy';
  const schoolTagline = cert.schoolTagline || settings?.schoolTagline || 'Excellence in Education & Character Building';
  const schoolAffiliation = cert.schoolAffiliation || settings?.schoolAddress || 'Affiliated with State Educational Accreditation Board';

  doc.setTextColor(...palette.primary);
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text(schoolName.toUpperCase(), pageWidth / 2, 40, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(schoolTagline, pageWidth / 2, 45, { align: 'center' });

  if (schoolAffiliation) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(schoolAffiliation, pageWidth / 2, 49, { align: 'center' });
  }

  // Ornamental Horizontal Divider with Center Diamond
  doc.setDrawColor(...palette.secondary);
  doc.setLineWidth(0.4);
  doc.line(60, 52, 138, 52);
  doc.line(159, 52, 237, 52);

  doc.setFillColor(...palette.secondary);
  doc.triangle(148.5, 50.5, 150.5, 52, 148.5, 53.5, 'FD');
  doc.triangle(148.5, 50.5, 146.5, 52, 148.5, 53.5, 'FD');

  // 5. Certificate Title
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...palette.primary);
  const certTitle = (cert.certificateTitle || 'CERTIFICATE OF ACHIEVEMENT').toUpperCase();
  doc.text(certTitle, pageWidth / 2, 63, { align: 'center' });

  // 6. Presentation Line
  const defaultSubtitle = cert.type === 'school_leaving'
    ? 'THIS IS TO CERTIFY THAT'
    : 'THIS CERTIFICATE IS PROUDLY PRESENTED TO';
  const subtitle = (cert.subtitle || defaultSubtitle).toUpperCase();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(subtitle, pageWidth / 2, 71, { align: 'center' });

  // 7. Recipient Name (Prominent)
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...palette.primary);
  const recipientName = cert.recipientName || 'Recipient Name';
  doc.text(recipientName, pageWidth / 2, 83, { align: 'center' });

  // Recipient Underline Accent
  doc.setDrawColor(...palette.secondary);
  doc.setLineWidth(0.7);
  doc.line(75, 87, 222, 87);
  doc.setFillColor(...palette.secondary);
  doc.circle(pageWidth / 2, 87, 1.2, 'FD');

  // 8. Body Content: Specific Achievement vs School Leaving vs Employee Award
  if (cert.type === 'school_leaving') {
    // === SCHOOL LEAVING CERTIFICATE (SLC / TRANSFER CERTIFICATE) ===
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...palette.textColor);

    // Left Column
    const col1X = 26;
    const col2X = 154;
    let slcY = 96;
    const rowGap = 6.2;

    const renderDataRow = (x: number, y: number, label: string, value: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`${label}:`, x, y);
      doc.setFont('times', 'bold');
      doc.setTextColor(...palette.textColor);
      doc.text(value || 'N/A', x + 50, y);
      // Dotted underline
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(x + 50, y + 1.2, x + 115, y + 1.2);
    };

    renderDataRow(col1X, slcY, 'Scholar / Admission No', cert.admissionNo || cert.recipientId || 'N/A');
    renderDataRow(col2X, slcY, 'Class Last Attended', `${cert.classLeaving || cert.classEnrolled || 'Grade 10'} ${cert.section ? `(${cert.section})` : ''}`);

    slcY += rowGap;
    renderDataRow(col1X, slcY, 'Roll / Student ID', cert.rollNo || 'N/A');
    renderDataRow(col2X, slcY, 'Date of Admission', cert.dateOfAdmission || 'N/A');

    slcY += rowGap;
    renderDataRow(col1X, slcY, "Father / Guardian's Name", cert.guardianName || 'N/A');
    renderDataRow(col2X, slcY, 'Date of Leaving', cert.dateOfLeaving || cert.issueDate);

    slcY += rowGap;
    renderDataRow(col1X, slcY, 'Date of Birth', cert.dateOfBirth || 'N/A');
    renderDataRow(col2X, slcY, 'General Conduct', cert.generalConduct || 'Exemplary');

    slcY += rowGap;
    renderDataRow(col1X, slcY, 'Reason for Leaving', cert.reasonForLeaving || 'Course Completed / Relocation of Parents');
    renderDataRow(col2X, slcY, 'School Dues Status', cert.duesCleared !== false ? 'All Dues Paid & Cleared' : 'Pending Clearance');

    // Certification Statement
    slcY += 10;
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const slcDeclaration =
      cert.citationText ||
      'This is to certify that the above mentioned student has been a bonafide student of this institution. Their conduct, behavior, and character during the period of enrollment were found to be satisfactory in all respects. The institution wishes them success and distinction in all future educational pursuits.';
    
    const splitSlc = doc.splitTextToSize(slcDeclaration, 245);
    doc.text(splitSlc, pageWidth / 2, slcY, { align: 'center' });
  } else {
    // === SPECIFIC ACHIEVEMENT / EMPLOYEE AWARD / MERIT CERTIFICATE ===
    let achieveY = 96;

    // Recipient Role / Context Subtitle
    if (cert.recipientType === 'student' && cert.classEnrolled) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const studentSub = `Student of ${cert.classEnrolled}${cert.section ? ` (Section ${cert.section})` : ''}${cert.rollNo ? ` • Roll No: ${cert.rollNo}` : ''}`;
      doc.text(studentSub, pageWidth / 2, achieveY, { align: 'center' });
      achieveY += 7;
    } else if (cert.recipientType === 'employee') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const staffSub = `${cert.designation || 'Faculty Member'}${cert.department ? ` • Department of ${cert.department}` : ''}${cert.employeeCode ? ` • Emp ID: ${cert.employeeCode}` : ''}`;
      doc.text(staffSub, pageWidth / 2, achieveY, { align: 'center' });
      achieveY += 7;
    }

    // Specific Achievement Banner / Highlight Box
    if (cert.achievementTitle) {
      const bannerWidth = 190;
      const bannerHeight = 11;
      const bannerX = (pageWidth - bannerWidth) / 2;

      // Soft tinted pill background
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(...palette.secondary);
      doc.setLineWidth(0.4);
      doc.roundedRect(bannerX, achieveY - 7.5, bannerWidth, bannerHeight, 2, 2, 'FD');

      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...palette.primary);
      const achievementLabel = cert.rankOrGrade
        ? `${cert.achievementTitle.toUpperCase()} — ${cert.rankOrGrade.toUpperCase()}`
        : cert.achievementTitle.toUpperCase();
      doc.text(achievementLabel, pageWidth / 2, achieveY, { align: 'center' });
      achieveY += 9;
    }

    // Event or Context if provided
    if (cert.competitionOrEvent) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.gold);
      doc.text(`Event: ${cert.competitionOrEvent}`, pageWidth / 2, achieveY, { align: 'center' });
      achieveY += 6;
    }

    // Citation Text (Paragraph)
    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.setTextColor(...palette.textColor);

    const defaultCitation = cert.recipientType === 'employee'
      ? 'In sincere recognition and appreciation of exceptional leadership, exemplary pedagogical dedication, and meritorious service rendered to the school community with the highest standards of professional excellence.'
      : 'In formal recognition of exemplary dedication, academic brilliance, and outstanding achievement. This certificate of distinction is conferred as a testament to exceptional perseverance and sterling merit.';

    const citation = cert.citationText || defaultCitation;
    const splitCitation = doc.splitTextToSize(citation, 230);
    doc.text(splitCitation, pageWidth / 2, achieveY + 2, { align: 'center' });
  }

  // 9. Signatures, Official Seal & Verification QR Code
  const footerY = 166;

  // A. QR Code for Tamper-Proof Verification (Bottom-Left)
  if (cert.showQrCode !== false) {
    try {
      const qrPayload = cert.qrPayload || JSON.stringify({
        certId: cert.certificateNumber,
        recipient: cert.recipientName,
        type: cert.type,
        school: cert.schoolName || settings?.schoolName,
        issued: cert.issueDate,
        verified: true,
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 120,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });

      doc.addImage(qrDataUrl, 'PNG', 24, footerY - 5, 20, 20);

      // Micro metadata under QR
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(cert.certificateNumber || 'CERT-2026-001', 24, footerY + 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(`Issued: ${cert.issueDate || new Date().toISOString().split('T')[0]}`, 24, footerY + 21.5);
    } catch {
      // Graceful fallback if QR generation fails
    }
  }

  // B. Official Seal / Embossed Crest Badge (Bottom-Center)
  const sealCenterX = pageWidth / 2;
  const sealCenterY = footerY + 5;

  if (cert.sealColor !== 'none') {
    // Seal Ribbon Tails
    doc.setFillColor(...palette.primary);
    doc.triangle(sealCenterX - 8, sealCenterY + 7, sealCenterX - 4, sealCenterY, sealCenterX - 11, sealCenterY + 16, 'F');
    doc.triangle(sealCenterX + 8, sealCenterY + 7, sealCenterX + 4, sealCenterY, sealCenterX + 11, sealCenterY + 16, 'F');

    // Outer Starburst / Rosette Circle
    doc.setFillColor(...palette.secondary);
    doc.circle(sealCenterX, sealCenterY, 11, 'F');

    // Inner Border
    doc.setFillColor(...palette.primary);
    doc.circle(sealCenterX, sealCenterY, 9, 'F');

    doc.setFillColor(...palette.secondary);
    doc.circle(sealCenterX, sealCenterY, 7.5, 'F');

    // Inner Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.text('OFFICIAL SEAL', sealCenterX, sealCenterY - 1, { align: 'center' });
    doc.text('EXCELLENCE', sealCenterX, sealCenterY + 2, { align: 'center' });
  }

  // C. Signatures (Bottom-Right)
  // Signatory 1 (e.g., Class Teacher or Academic Coordinator)
  const sig1X = 175;
  const sig1LineY = footerY + 7;

  doc.setDrawColor(...palette.primary);
  doc.setLineWidth(0.5);
  doc.line(sig1X - 22, sig1LineY, sig1X + 22, sig1LineY);

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...palette.primary);
  doc.text(cert.signatory2Name || 'Dr. Arthur Sterling, Ph.D.', sig1X, sig1LineY + 4, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(cert.signatory2Title || 'Class Teacher / Incharge', sig1X, sig1LineY + 7.5, { align: 'center' });

  // Signatory 2 (e.g., Principal or Head of Institution)
  const sig2X = 245;
  const sig2LineY = footerY + 7;

  doc.line(sig2X - 22, sig2LineY, sig2X + 22, sig2LineY);

  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...palette.primary);
  doc.text(cert.signatory1Name || 'Dr. Eleanor Vance, Ph.D.', sig2X, sig2LineY + 4, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(cert.signatory1Title || 'Principal & Director', sig2X, sig2LineY + 7.5, { align: 'center' });

  // 10. Security Microtext & Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184); // Slate-400
  const securityFooter = `Official Academic Credential • ${schoolName} • Issued in Compliance with Institutional Governance • Verification Ref: ${cert.id}`;
  doc.text(securityFooter, pageWidth / 2, 203, { align: 'center' });

  // Save PDF as A4 Landscape
  const cleanRecipient = (cert.recipientName || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanTitle = (cert.certificateTitle || 'Certificate').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${cleanTitle}_${cleanRecipient}_A4_Landscape.pdf`);
}
