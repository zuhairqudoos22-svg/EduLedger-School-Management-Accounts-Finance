import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { sanitizeHtml2CanvasClone } from '../utils/html2canvasSafeClone';

const A4_PORTRAIT_MM = { width: 210, height: 297 };
const A4_PORTRAIT_PX = { width: 794, height: 1123 };

export function sanitizeFilenamePart(value: string, fallback = 'Form'): string {
  const cleaned = (value || '')
    .trim()
    .replace(/[^a-zA-Z0-9\u0600-\u06FF_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
  return cleaned || fallback;
}

export function buildAdmissionFilename(studentName?: string, admissionNo?: string, mode: 'filled' | 'blank' | 'partial' = 'filled'): string {
  if (mode === 'blank') {
    return 'Admission_Form_Blank_Template.pdf';
  }
  const safeName = sanitizeFilenamePart(studentName || '', 'Student');
  const safeNo = sanitizeFilenamePart(admissionNo || '', 'Draft');
  return `Admission_Form_${safeName}_${safeNo}.pdf`;
}

export async function waitForAdmissionAssets(container: HTMLElement): Promise<void> {
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {
    // Fallback if fonts API unavailable
  }

  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>(resolve => {
        const timer = window.setTimeout(resolve, 2500);
        const done = () => {
          window.clearTimeout(timer);
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    })
  );

  // Give browser two animation frames to finalize layout & glyph metrics
  await new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
}

/**
 * Captures a 794 x 1123 px Habitat Admission Form element into a sharp canvas
 * suitable for embedding onto an exact A4 portrait PDF page (210 x 297 mm).
 */
async function captureAdmissionPageCanvas(element: HTMLElement, scale = 2.5): Promise<HTMLCanvasElement> {
  await waitForAdmissionAssets(element);
  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#FFFFFF',
    width: A4_PORTRAIT_PX.width,
    height: A4_PORTRAIT_PX.height,
    windowWidth: A4_PORTRAIT_PX.width,
    windowHeight: A4_PORTRAIT_PX.height,
    scrollX: 0,
    scrollY: 0,
    logging: false,
    onclone: (clonedDoc, clonedEl) => sanitizeHtml2CanvasClone(clonedDoc, clonedEl),
  });
}

/**
 * Exports a single A4 Portrait Habitat Admission Form PDF (target ~300 KB - 1 MB).
 */
export async function exportHabitatAdmissionPdf(
  element: HTMLElement,
  filename: string
): Promise<{ sizeKb: number }> {
  const canvas = await captureAdmissionPageCanvas(element, 2.4);
  const imgData = canvas.toDataURL('image/jpeg', 0.9);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.addImage(imgData, 'JPEG', 0, 0, A4_PORTRAIT_MM.width, A4_PORTRAIT_MM.height, undefined, 'FAST');
  const blob = doc.output('blob');
  doc.save(filename);
  return { sizeKb: Math.round(blob.size / 1024) };
}

/**
 * Generates one merged A4 Portrait PDF with N blank copies (reuses 1 raster capture for speed).
 */
export async function exportBlankHabitatCopiesPdf(
  element: HTMLElement,
  copies: number
): Promise<{ sizeKb: number }> {
  const safeCopies = Math.max(1, Math.min(50, Math.floor(copies)));
  const canvas = await captureAdmissionPageCanvas(element, 2.2);
  const imgData = canvas.toDataURL('image/jpeg', 0.88);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  for (let i = 0; i < safeCopies; i++) {
    if (i > 0) doc.addPage('a4', 'portrait');
    doc.addImage(imgData, 'JPEG', 0, 0, A4_PORTRAIT_MM.width, A4_PORTRAIT_MM.height, 'blank-page', 'FAST');
  }

  const blob = doc.output('blob');
  doc.save(
    safeCopies === 1
      ? 'Admission_Form_Blank_Template.pdf'
      : `Admission_Forms_Blank_${safeCopies}_Copies.pdf`
  );
  return { sizeKb: Math.round(blob.size / 1024) };
}

/**
 * Bulk generates one merged A4 Portrait PDF for multiple selected students in chunks
 * so the UI stays responsive and supports user cancellation.
 */
export async function exportBulkFilledHabitatPdf<T>(
  items: T[],
  renderItemIntoContainer: (item: T, index: number) => Promise<HTMLElement>,
  options: {
    filename?: string;
    onProgress?: (completed: number, total: number) => void;
    shouldCancel?: () => boolean;
  } = {}
): Promise<{ completed: number; cancelled: boolean; sizeKb: number }> {
  const total = items.length;
  if (total === 0) return { completed: 0, cancelled: false, sizeKb: 0 };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  let completed = 0;
  for (let i = 0; i < total; i++) {
    if (options.shouldCancel?.()) {
      return { completed, cancelled: true, sizeKb: 0 };
    }

    const pageEl = await renderItemIntoContainer(items[i], i);
    const canvas = await captureAdmissionPageCanvas(pageEl, 2.1);
    const imgData = canvas.toDataURL('image/jpeg', 0.86);

    if (i > 0) doc.addPage('a4', 'portrait');
    doc.addImage(imgData, 'JPEG', 0, 0, A4_PORTRAIT_MM.width, A4_PORTRAIT_MM.height, undefined, 'FAST');

    completed = i + 1;
    options.onProgress?.(completed, total);

    // Yield to browser main thread between chunks so progress & cancel stay responsive
    await new Promise(resolve => window.setTimeout(resolve, 24));
  }

  const blob = doc.output('blob');
  doc.save(options.filename || `Admission_Forms_Bulk_${total}_Students.pdf`);
  return { completed, cancelled: false, sizeKb: Math.round(blob.size / 1024) };
}

/**
 * Triggers native browser print-to-PDF using the dedicated #habitat-admission-print-target
 * with exact A4 portrait @page { size: A4 portrait; margin: 0 }.
 */
export async function printHabitatAdmissionElement(targetElement: HTMLElement): Promise<void> {
  await waitForAdmissionAssets(targetElement);
  document.body.classList.add('habitat-admission-print-active');
  // Small delay ensures print media class takes effect before dialog snapshots DOM
  await new Promise(resolve => window.setTimeout(resolve, 60));
  window.print();
  window.setTimeout(() => {
    document.body.classList.remove('habitat-admission-print-active');
  }, 800);
}
