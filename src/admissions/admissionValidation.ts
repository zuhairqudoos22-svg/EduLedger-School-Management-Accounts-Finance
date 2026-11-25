import { Student } from '../types';
import { HabitatAdmissionDraft } from './admissionTemplates';

/**
 * Formats a 13-digit Pakistani CNIC / B-Form as 12345-1234567-1 while typing.
 */
export function formatCnicBForm(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

/**
 * Formats Pakistani mobile phone numbers (03XX-XXXXXXX) while typing.
 * Also preserves +92 3XX XXXXXXX style gracefully if user enters +92.
 */
export function formatPakPhone(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+92')) {
    const digits = trimmed.replace(/\D/g, '').slice(2, 12); // up to 10 digits after 92
    if (digits.length <= 3) return `+92 ${digits}`.trim();
    return `+92 ${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  const digits = trimmed.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export function normalizeCnicDigits(raw?: string): string {
  return (raw || '').replace(/\D/g, '');
}

export function isValidPakPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // Standard Pakistani mobile: 03XX-XXXXXXX (11 digits starting with 03) or +92 3XX-XXXXXXX
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) return true;
  if (digits.length === 12 && digits.startsWith('923')) return true;
  // Allow landline numbers with area code (9-11 digits starting with 0)
  if (digits.length >= 9 && digits.length <= 11 && digits.startsWith('0')) return true;
  return false;
}

export function isValidEmail(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/**
 * Returns expected typical age range [minAge, maxAge] for a given school class name.
 * Used as a soft advisory warning, not a hard block.
 */
export function getExpectedAgeRangeForClass(className: string): [number, number] | null {
  const lower = (className || '').trim().toLowerCase();
  if (!lower) return null;
  if (lower.includes('play') || lower.includes('pg') || lower.includes('pre-k')) return [2, 5];
  if (lower.includes('nursery')) return [3, 6];
  if (lower.includes('prep') || lower.includes('kg') || lower.includes('kinder')) return [4, 7];

  const gradeMatch = lower.match(/(?:grade|class|std)\s*(\d{1,2})/) || lower.match(/^(\d{1,2})$/);
  if (gradeMatch) {
    const grade = Number(gradeMatch[1]);
    if (grade >= 1 && grade <= 12) {
      const typical = grade + 5;
      return [Math.max(4, typical - 2), typical + 3];
    }
  }
  return null;
}

export function calculateAgeYears(dobIso: string): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso + 'T00:00:00');
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export interface DuplicateMatch {
  student: Student;
  reason: string;
}

export interface HabitatValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
  duplicates: DuplicateMatch[];
}

export function validateHabitatAdmission(
  draft: HabitatAdmissionDraft,
  existingStudents: Student[],
  editingStudentId?: string
): HabitatValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  const duplicates: DuplicateMatch[] = [];

  if (!draft.fullName.trim()) {
    errors.fullName = 'Full Name is required.';
  }
  if (!draft.fatherName.trim()) {
    errors.fatherName = "Father's Name is required.";
  }
  if (!draft.gender) {
    errors.gender = 'Please select Gender (Male or Female).';
  }
  if (!draft.dateOfBirth) {
    errors.dateOfBirth = 'Date of Birth is required.';
  } else {
    const dobDate = new Date(draft.dateOfBirth + 'T00:00:00');
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (Number.isNaN(dobDate.getTime())) {
      errors.dateOfBirth = 'Please enter a valid Date of Birth.';
    } else if (dobDate > today) {
      errors.dateOfBirth = 'Date of Birth cannot be in the future.';
    } else {
      const age = calculateAgeYears(draft.dateOfBirth);
      const range = getExpectedAgeRangeForClass(draft.className);
      if (age !== null && range && (age < range[0] || age > range[1])) {
        warnings.push(
          `Age (${age} yrs) is outside the typical range (${range[0]}–${range[1]} yrs) for ${draft.className}. Please verify.`
        );
      }
    }
  }

  if (!draft.contactNumber.trim()) {
    errors.contactNumber = 'Primary Phone Number is required.';
  } else if (!isValidPakPhone(draft.contactNumber)) {
    errors.contactNumber = 'Use valid Pakistani format (e.g. 0300-1234567).';
  }

  if (draft.phone2.trim() && !isValidPakPhone(draft.phone2)) {
    errors.phone2 = 'Use valid Pakistani format (e.g. 0300-1234567).';
  }

  if (draft.idNumber.trim()) {
    const cnicDigits = normalizeCnicDigits(draft.idNumber);
    if (cnicDigits.length !== 13) {
      errors.idNumber = 'CNIC / B-Form must be exactly 13 digits (12345-1234567-1).';
    }
  }

  if (draft.email.trim() && !isValidEmail(draft.email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (draft.monthlyIncome.trim() !== '') {
    const num = Number(draft.monthlyIncome.replace(/,/g, ''));
    if (!Number.isFinite(num) || num < 0) {
      errors.monthlyIncome = 'Monthly income must be a non-negative number.';
    }
  }

  // Duplicate check: same CNIC/B-Form OR same Name + Father's Name + DOB
  const targetCnic = normalizeCnicDigits(draft.idNumber);
  const targetName = draft.fullName.trim().toLowerCase();
  const targetFather = draft.fatherName.trim().toLowerCase();
  const targetDob = draft.dateOfBirth.trim();

  for (const s of existingStudents) {
    if (editingStudentId && s.id === editingStudentId) continue;

    const existingCnic = normalizeCnicDigits(s.idNumber);
    if (targetCnic.length === 13 && existingCnic === targetCnic) {
      duplicates.push({
        student: s,
        reason: `Matching CNIC / B-Form (${draft.idNumber}) with ${s.fullName} (Roll #${s.rollNo})`,
      });
      continue;
    }

    const existingName = (s.fullName || '').trim().toLowerCase();
    const existingFather = (s.fatherName || s.guardianName || '').trim().toLowerCase();
    const existingDob = (s.dateOfBirth || '').trim();

    if (
      targetName &&
      targetFather &&
      targetDob &&
      existingName === targetName &&
      existingFather === targetFather &&
      existingDob === targetDob
    ) {
      duplicates.push({
        student: s,
        reason: `Matching Name, Father's Name & DOB with ${s.fullName} (${s.className}, Roll #${s.rollNo})`,
      });
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
    duplicates,
  };
}

/**
 * Center-crops any image (uploaded File or video frame / dataURL) to a 4x4 square passport ratio
 * (300 x 300 px) and compresses client-side as JPEG (~0.75 quality, ~20–30 KB base64) so it fits
 * cleanly inside IndexedDB & Firestore without Cloud Storage.
 */
export async function compressStudentPassportPhoto(
  source: File | HTMLVideoElement | string,
  targetSize = 300,
  quality = 0.75
): Promise<{ dataUrl: string; sizeKb: number }> {
  const drawSourceToSquare = (
    drawable: HTMLImageElement | HTMLVideoElement,
    srcW: number,
    srcH: number
  ): { dataUrl: string; sizeKb: number } => {
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');

    const side = Math.min(srcW, srcH);
    const sx = Math.max(0, (srcW - side) / 2);
    const sy = Math.max(0, (srcH - side) / 2);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetSize, targetSize);
    ctx.drawImage(drawable, sx, sy, side, side, 0, 0, targetSize, targetSize);

    let q = quality;
    let dataUrl = canvas.toDataURL('image/jpeg', q);
    // Keep comfortably around 20-35 KB max
    while (dataUrl.length > 48000 && q > 0.45) {
      q -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', q);
    }
    const sizeKb = Math.round(((dataUrl.length * 3) / 4 / 1024) * 10) / 10;
    return { dataUrl, sizeKb };
  };

  const isVideoEl =
    typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
  if (isVideoEl) {
    const w = source.videoWidth || 640;
    const h = source.videoHeight || 480;
    return drawSourceToSquare(source, w, h);
  }

  const dataUrlInput: string =
    typeof source === 'string'
      ? source
      : await new Promise<string>((resolve, reject) => {
          if (!(source instanceof Blob)) {
            reject(new Error('Unsupported photo source.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Failed to read selected photo file.'));
          reader.readAsDataURL(source);
        });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode selected image.'));
    image.src = dataUrlInput;
  });

  return drawSourceToSquare(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
}

/**
 * Optimizes a manually uploaded school logo to max 400x400 px PNG preserving aspect ratio
 * and transparency so it renders sharply in both Standard & Habitat forms and embeds cleanly in jsPDF.
 */
export async function compressSchoolLogo(
  file: File,
  maxDimension = 400
): Promise<{ dataUrl: string; sizeKb: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a valid image file (PNG, JPG, WebP, or SVG).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected logo file.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode selected logo image.'));
    image.src = rawDataUrl;
  });

  const srcW = img.naturalWidth || img.width || maxDimension;
  const srcH = img.naturalHeight || img.height || maxDimension;
  const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  ctx.clearRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Use PNG to preserve transparent backgrounds cleanly for crests/seals
  let dataUrl = canvas.toDataURL('image/png');
  // If PNG is unusually large (> 180 KB), fall back to high-quality JPEG on white background
  if (dataUrl.length > 240000) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
    dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  }

  const sizeKb = Math.round(((dataUrl.length * 3) / 4 / 1024) * 10) / 10;
  return { dataUrl, sizeKb };
}

