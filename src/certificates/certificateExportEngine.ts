import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { CertificateQuality, IssuedCertificate } from '../types';
import { A4_LANDSCAPE_MM, A4_LANDSCAPE_PX } from './certificateTemplates';
import { sanitizeHtml2CanvasClone } from '../utils/html2canvasSafeClone';

/**
 * Waits for all web fonts and every <img> inside the target element to fully decode
 * before capturing with html2canvas so the PDF matches the live preview pixel-for-pixel.
 */
export async function waitForCertificateAssets(container: HTMLElement): Promise<void> {
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch {
    // Non-fatal if Font Loading API is unavailable
  }

  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            if (typeof img.decode === 'function') {
              img.decode().then(() => resolve()).catch(() => resolve());
            } else {
              resolve();
            }
            return;
          }
          const timer = window.setTimeout(() => resolve(), 2500);
          img.onload = () => {
            window.clearTimeout(timer);
            resolve();
          };
          img.onerror = () => {
            window.clearTimeout(timer);
            resolve();
          };
        })
    )
  );
}

/**
 * Sanitizes strings for safe cross-platform PDF/ZIP filenames.
 */
function sanitizeFilenamePart(value: string, fallback: string): string {
  const cleaned = (value || fallback)
    .trim()
    .replace(/[^\w\u0600-\u06FF-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return cleaned || fallback;
}

export function buildCertificateFilename(cert: IssuedCertificate): string {
  const typePart = sanitizeFilenamePart(cert.type, 'Certificate');
  const namePart = sanitizeFilenamePart(cert.recipientName, 'Recipient');
  const numPart = sanitizeFilenamePart(cert.certificateNumber, '00001');
  return `Certificate_${typePart}_${namePart}_${numPart}.pdf`;
}

/**
 * Captures a rendered 1123x794 certificate DOM node into a compressed data URL
 * calibrated to keep file sizes in the ~300 KB to 1.2 MB range while maintaining sharp text.
 */
export async function captureCertificateImage(
  element: HTMLElement,
  quality: CertificateQuality = 'standard'
): Promise<{ dataUrl: string; format: 'JPEG' | 'PNG' }> {
  await waitForCertificateAssets(element);

  const scale = quality === 'high' ? 3 : 2;
  const jpegQuality = quality === 'high' ? 0.94 : 0.91;

  const canvas = await html2canvas(element, {
    scale,
    width: A4_LANDSCAPE_PX.width,
    height: A4_LANDSCAPE_PX.height,
    windowWidth: A4_LANDSCAPE_PX.width,
    windowHeight: A4_LANDSCAPE_PX.height,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#FFFFFF',
    logging: false,
    imageTimeout: 4000,
    onclone: (clonedDoc, clonedEl) => sanitizeHtml2CanvasClone(clonedDoc, clonedEl),
  });

  try {
    const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
    return { dataUrl, format: 'JPEG' };
  } finally {
    // Release canvas backing buffer memory immediately (essential for large bulk batches)
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Creates a single-page A4 Landscape jsPDF document (297 x 210 mm, margin 0) from a captured image.
 */
function createSinglePagePdfDoc(dataUrl: string, format: 'JPEG' | 'PNG'): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  doc.addImage(
    dataUrl,
    format,
    0,
    0,
    A4_LANDSCAPE_MM.width,
    A4_LANDSCAPE_MM.height,
    undefined,
    'MEDIUM'
  );
  return doc;
}

/**
 * Downloads a single rendered certificate DOM node as an exact A4 Landscape PDF.
 */
export async function exportSingleCertificatePdf(
  element: HTMLElement,
  cert: IssuedCertificate,
  quality: CertificateQuality = 'standard'
): Promise<void> {
  const { dataUrl, format } = await captureCertificateImage(element, quality);
  const doc = createSinglePagePdfDoc(dataUrl, format);
  doc.save(buildCertificateFilename(cert));
}

/**
 * Triggers native browser printing locked to exact A4 landscape (`@page { size: A4 landscape; margin: 0 }`).
 */
export async function printCertificateElement(element: HTMLElement | null): Promise<void> {
  if (element) {
    await waitForCertificateAssets(element);
  }
  document.body.classList.add('certificate-print-active');
  window.print();
  window.setTimeout(() => {
    document.body.classList.remove('certificate-print-active');
  }, 1400);
}

export interface BulkExportCallbacks {
  /** Mounts the given certificate into the hidden capture container and resolves once React paints it */
  renderCertificateForCapture: (cert: IssuedCertificate) => Promise<HTMLElement>;
  onProgress: (completed: number, total: number, currentName: string) => void;
  isCancelled: () => boolean;
}

/**
 * Yields to the browser event loop between chunks so the UI stays smooth and responsive
 * even when generating 30–100+ certificates.
 */
function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => window.setTimeout(resolve, 16));
    } else {
      window.setTimeout(resolve, 16);
    }
  });
}

/**
 * Chunked Bulk Export Engine:
 * Produces either:
 * - mode === 'merged_pdf': ONE merged multi-page A4 Landscape PDF (1 certificate per page)
 * - mode === 'zip': A ZIP archive of individual PDFs named Certificate_<Type>_<Name>_<No>.pdf
 *
 * Processes in chunks of 10 with memory cleanup after every page and supports cancellation.
 */
export async function runChunkedBulkCertificateExport(options: {
  certificates: IssuedCertificate[];
  mode: 'merged_pdf' | 'zip';
  quality: CertificateQuality;
  chunkSize?: number;
  callbacks: BulkExportCallbacks;
}): Promise<{ completed: number; cancelled: boolean }> {
  const { certificates, mode, quality, callbacks } = options;
  const chunkSize = options.chunkSize || 10;
  const total = certificates.length;
  if (total === 0) return { completed: 0, cancelled: false };

  let mergedDoc: jsPDF | null = null;
  const zip = mode === 'zip' ? new JSZip() : null;
  let completed = 0;

  for (let start = 0; start < total; start += chunkSize) {
    const chunk = certificates.slice(start, start + chunkSize);

    for (const cert of chunk) {
      if (callbacks.isCancelled()) {
        return { completed, cancelled: true };
      }

      callbacks.onProgress(completed, total, cert.recipientName);
      const node = await callbacks.renderCertificateForCapture(cert);
      const { dataUrl, format } = await captureCertificateImage(node, quality);

      if (mode === 'merged_pdf') {
        if (!mergedDoc) {
          mergedDoc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
            compress: true,
          });
        } else {
          mergedDoc.addPage('a4', 'landscape');
        }
        mergedDoc.addImage(
          dataUrl,
          format,
          0,
          0,
          A4_LANDSCAPE_MM.width,
          A4_LANDSCAPE_MM.height,
          undefined,
          'MEDIUM'
        );
      } else if (zip) {
        const singleDoc = createSinglePagePdfDoc(dataUrl, format);
        const arrayBuf = singleDoc.output('arraybuffer');
        zip.file(buildCertificateFilename(cert), arrayBuf);
      }

      completed++;
      callbacks.onProgress(completed, total, cert.recipientName);
      await yieldToMainThread();
    }

    // Extra breath between chunks of 10 to allow GC
    await yieldToMainThread();
  }

  if (callbacks.isCancelled()) {
    return { completed, cancelled: true };
  }

  const stamp = new Date().toISOString().split('T')[0];
  if (mode === 'merged_pdf' && mergedDoc) {
    mergedDoc.save(`EduLedger_Certificates_Batch_${total}_${stamp}.pdf`);
  } else if (mode === 'zip' && zip) {
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EduLedger_Certificates_ZIP_${total}_${stamp}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { completed, cancelled: false };
}
