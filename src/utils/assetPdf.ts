import jsPDF from 'jspdf';
import { SchoolAsset, SchoolSettings, AssetCategory } from '../types';
import { formatDateDisplay } from './formatters';

interface AssetRegisterPdfOptions {
  settings: SchoolSettings;
  assets: SchoolAsset[];
  categoryFilter?: AssetCategory | 'All';
  searchQuery?: string;
  generatedBy?: string;
}

/**
 * Generates and downloads an official institutional asset register PDF document
 */
export function generateSchoolAssetRegisterPdf({
  settings,
  assets,
  categoryFilter = 'All',
  searchQuery = '',
  generatedBy = 'Asset Administrator',
}: AssetRegisterPdfOptions): jsPDF {
  // A4 Landscape is ideal for wide asset registers with financial and warranty data
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm
  const margin = 12;
  let y = margin;

  const currencySymbol = settings.currencySymbol || '$';
  const schoolName = settings.schoolName || 'NextGen International Academy';

  // Calculate totals
  const totalItems = assets.reduce((sum, a) => sum + (a.quantity || 1), 0);
  const totalValuation = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const totalCost = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
  const inServiceCount = assets.filter(a => a.status === 'Active').length;
  const maintenanceCount = assets.filter(a => a.status === 'Under Maintenance').length;

  // Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Accent line
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 25, pageWidth, 1.5, 'F');

  // School Name and Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(schoolName.toUpperCase(), margin, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('OFFICIAL PHYSICAL INVENTORY & ASSET AUDIT REGISTER', margin, 16);

  const rightText = `ACADEMIC YEAR: ${settings.currentAcademicYear || '2026-2027'}  |  DATE: ${new Date().toLocaleDateString()}`;
  doc.text(rightText, pageWidth - margin - doc.getTextWidth(rightText), 16);

  y = 33;

  // KPI Summary Bar
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 15, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600

  const kpis = [
    { label: 'REGISTER CATEGORY', val: categoryFilter === 'All' ? 'Complete Inventory' : categoryFilter },
    { label: 'TOTAL ASSET ITEMS', val: `${totalItems} units (${assets.length} records)` },
    { label: 'ACTIVE IN USE', val: `${inServiceCount} units` },
    { label: 'MAINTENANCE / ATTN', val: `${maintenanceCount} units` },
    { label: 'TOTAL VALUATION', val: `${currencySymbol} ${totalValuation.toLocaleString()}` },
    { label: 'ORIGINAL CAPEX', val: `${currencySymbol} ${totalCost.toLocaleString()}` },
  ];

  const colWidth = (pageWidth - 2 * margin) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * colWidth + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, kx, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, kx, y + 11);
  });

  y += 20;

  // Table Columns Definition
  const cols = [
    { header: '#', width: 8, align: 'center' as const },
    { header: 'ASSET ID', width: 22, align: 'left' as const },
    { header: 'ASSET NAME & SPECIFICATION', width: 62, align: 'left' as const },
    { header: 'CATEGORY', width: 26, align: 'left' as const },
    { header: 'QTY', width: 12, align: 'center' as const },
    { header: 'LOCATION / ROOM', width: 34, align: 'left' as const },
    { header: 'PURCHASE DATE', width: 24, align: 'center' as const },
    { header: 'SUPPLIER', width: 30, align: 'left' as const },
    { header: 'WARRANTY', width: 22, align: 'center' as const },
    { header: 'VALUE', width: 20, align: 'right' as const },
    { header: 'STATUS', width: 18, align: 'center' as const },
  ];

  // Draw Table Header
  const renderTableHeader = () => {
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(margin, y, pageWidth - 2 * margin, 7.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y + 7.5, pageWidth - margin, y + 7.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    let curX = margin;
    cols.forEach(col => {
      let tx = curX + 1.5;
      if (col.align === 'center') tx = curX + col.width / 2;
      if (col.align === 'right') tx = curX + col.width - 2;
      doc.text(col.header, tx, y + 5, { align: col.align });
      curX += col.width;
    });

    y += 8;
  };

  renderTableHeader();

  // Table Body Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  assets.forEach((asset, idx) => {
    // Check if we need a new page
    if (y > pageHeight - 32) {
      // Add footer to current page
      renderPageFooter(doc, pageWidth, pageHeight, margin);
      doc.addPage('a4', 'landscape');
      y = margin;

      // Small secondary header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${schoolName.toUpperCase()} — ASSET AUDIT REGISTER (CONTINUED)`, margin, 8);
      y = 17;
      renderTableHeader();
    }

    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');

    let curX = margin;

    // #
    doc.text(String(idx + 1), curX + cols[0].width / 2, y + 4.2, { align: 'center' });
    curX += cols[0].width;

    // Asset ID
    doc.setFont('helvetica', 'bold');
    doc.text(asset.assetId || '-', curX + 1.5, y + 4.2);
    doc.setFont('helvetica', 'normal');
    curX += cols[1].width;

    // Name (truncated if too long)
    const truncatedName = asset.name.length > 36 ? asset.name.substring(0, 34) + '...' : asset.name;
    doc.text(truncatedName, curX + 1.5, y + 4.2);
    curX += cols[2].width;

    // Category
    doc.text(asset.category, curX + 1.5, y + 4.2);
    curX += cols[3].width;

    // Qty
    doc.text(String(asset.quantity || 1), curX + cols[4].width / 2, y + 4.2, { align: 'center' });
    curX += cols[4].width;

    // Location
    const rawLoc = asset.location || '-';
    const loc = rawLoc.length > 22 ? rawLoc.substring(0, 20) + '...' : rawLoc;
    doc.text(loc, curX + 1.5, y + 4.2);
    curX += cols[5].width;

    // Purchase Date
    doc.text(formatDateDisplay(asset.purchaseDate) || '-', curX + cols[6].width / 2, y + 4.2, { align: 'center' });
    curX += cols[6].width;

    // Supplier
    const sup = (asset.supplier || '-').length > 18 ? asset.supplier.substring(0, 16) + '...' : (asset.supplier || '-');
    doc.text(sup, curX + 1.5, y + 4.2);
    curX += cols[7].width;

    // Warranty
    const war = asset.warrantyExpiry ? formatDateDisplay(asset.warrantyExpiry) : 'None';
    doc.text(war, curX + cols[8].width / 2, y + 4.2, { align: 'center' });
    curX += cols[8].width;

    // Value
    doc.setFont('helvetica', 'bold');
    doc.text(`${currencySymbol} ${(asset.currentValue || 0).toLocaleString()}`, curX + cols[9].width - 2, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    curX += cols[9].width;

    // Status
    doc.text(asset.status || 'Active', curX + cols[10].width / 2, y + 4.2, { align: 'center' });

    y += 6;
  });

  // Check if we need room for summary / signatures block
  if (y > pageHeight - 34) {
    renderPageFooter(doc, pageWidth, pageHeight, margin);
    doc.addPage('a4', 'landscape');
    y = margin + 5;
  }

  // Institutional Sign-off Block
  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const signColWidth = (pageWidth - 2 * margin) / 3;
  const signTitles = [
    { role: 'PREPARED BY', title: 'Asset Inventory Officer', sub: generatedBy },
    { role: 'VERIFIED & AUDITED BY', title: 'Internal School Auditor', sub: 'Finance & Compliance Board' },
    { role: 'SANCTIONED & APPROVED BY', title: "Principal / Bursar", sub: 'Official Seal & Stamp' },
  ];

  signTitles.forEach((sign, idx) => {
    const sx = margin + idx * signColWidth;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(sign.role, sx + 5, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(sign.title, sx + 5, y + 5);

    // Signature line
    doc.setDrawColor(148, 163, 184);
    doc.line(sx + 5, y + 14, sx + signColWidth - 15, y + 14);

    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Sign & Date: _________________  (${sign.sub})`, sx + 5, y + 18);
  });

  // Final page footer
  renderPageFooter(doc, pageWidth, pageHeight, margin);

  // Trigger download
  const cleanCat = categoryFilter.replace(/\s+/g, '_');
  const filename = `Institutional_Asset_Register_${cleanCat}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  return doc;
}

function renderPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, margin: number) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerText = 'CONFIDENTIAL INSTITUTIONAL ASSET REGISTER — FOR OFFICIAL AUDITING & INVENTORY GOVERNANCE ONLY';
  doc.text(footerText, margin, pageHeight - 5);
  const pageNum = `Generated ${new Date().toLocaleString()}`;
  doc.text(pageNum, pageWidth - margin - doc.getTextWidth(pageNum), pageHeight - 5);
}
