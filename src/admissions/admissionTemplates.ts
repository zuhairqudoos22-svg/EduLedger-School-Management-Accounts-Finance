import { AdmissionFormSettings, AdmissionTemplateId, SchoolSettings, Student } from '../types';
import { AdmissionFormData } from '../utils/admissionFormPdf';
import { getTodayDateString } from '../utils/formatters';

export interface AdmissionTemplateDefinition {
  id: AdmissionTemplateId;
  name: string;
  shortName: string;
  description: string;
  orientation: 'portrait' | 'landscape';
  size: 'A4';
  dimensionsPx: { width: number; height: number };
  dimensionsMm: { width: number; height: number };
  thumbnail: {
    primary: string;
    accent: string;
    paper: string;
    badge: string;
  };
  palette: {
    navy: string;
    green: string;
    border: string;
    muted: string;
    paper: string;
  };
  fonts: {
    heading: string;
    body: string;
    serif: string;
    urdu: string;
  };
  sections: string[];
  fields: string[];
  printLayout: {
    pageSize: string;
    marginMm: number;
    safeGapMm: number;
  };
}

export const ADMISSION_TEMPLATES: AdmissionTemplateDefinition[] = [
  {
    id: 'standard',
    name: 'Standard Form',
    shortName: 'Standard Form',
    description: 'Default EduLedger 1-page institutional admission & enrollment form.',
    orientation: 'portrait',
    size: 'A4',
    dimensionsPx: { width: 794, height: 1123 },
    dimensionsMm: { width: 210, height: 297 },
    thumbnail: {
      primary: '#1E293B',
      accent: '#4F46E5',
      paper: '#FFFFFF',
      badge: 'Default',
    },
    palette: {
      navy: '#0F172A',
      green: '#4F46E5',
      border: '#CBD5E1',
      muted: '#64748B',
      paper: '#FFFFFF',
    },
    fonts: {
      heading: "'Inter', sans-serif",
      body: "'Inter', sans-serif",
      serif: "'Playfair Display', Georgia, serif",
      urdu: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif",
    },
    sections: ['Student Details', 'Previous Academic Record', 'Parent / Guardian', 'Documents & Undertaking', 'Office Use'],
    fields: ['fullName', 'gender', 'dateOfBirth', 'className', 'section', 'guardianName', 'contactNumber', 'address'],
    printLayout: {
      pageSize: 'A4 portrait',
      marginMm: 0,
      safeGapMm: 6,
    },
  },
  {
    id: 'habitat_a4_portrait',
    name: 'Habitat Admission Form (A4 Portrait)',
    shortName: 'Habitat Admission Form',
    description: 'Clean white A4 portrait registration form with boxed dates, green accents & 4×4 photo box.',
    orientation: 'portrait',
    size: 'A4',
    dimensionsPx: { width: 794, height: 1123 },
    dimensionsMm: { width: 210, height: 297 },
    thumbnail: {
      primary: '#111827',
      accent: '#3DB86B',
      paper: '#FFFFFF',
      badge: 'A4 Portrait',
    },
    palette: {
      navy: '#111827',
      green: '#3DB86B',
      border: '#D1D5DB',
      muted: '#4B5563',
      paper: '#FFFFFF',
    },
    fonts: {
      heading: "'Montserrat', 'Inter', sans-serif",
      body: "'Montserrat', 'Inter', sans-serif",
      serif: "'Lora', 'Playfair Display', Georgia, serif",
      urdu: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif",
    },
    sections: ['Header', 'Personal Information', 'Undertaking', 'Note', 'Address', 'Footer'],
    fields: [
      'registrationDate',
      'fullName',
      'fatherName',
      'guardianName',
      'email',
      'nationality',
      'gender',
      'domicile',
      'dateOfBirth',
      'startDate',
      'country',
      'religion',
      'idNumber',
      'contactNumber',
      'address',
      'addressLine2',
      'occupation',
      'education',
      'monthlyIncome',
      'phone2',
      'photoUrl',
    ],
    printLayout: {
      pageSize: 'A4 portrait',
      marginMm: 0,
      safeGapMm: 6,
    },
  },
];

export const DEFAULT_HABITAT_ADMISSION_SETTINGS: AdmissionFormSettings = {
  defaultTemplateId: 'standard',
  schoolPhone2: '',
  startDateLabel: 'Admission Date',
  showUndertaking: true,
  undertakingText:
    'I hereby undertake to comply with all existing and future rules and regulations of the institute. I affirm that all information provided in this admission form is true and accurate to the best of my knowledge, and I will ensure regular attendance, discipline, and timely payment of school dues.',
  showFeeNote: true,
  feeNoteText:
    'A 10% increase in the student fee will be implemented every year in the month of November.',
  documentsRequiredText:
    "One 4x4 Photo, Father's CNIC, Student's B.Form, previous class Result Card",
  footerThankYouText: 'THANK YOU FOR REGISTRATION',
  bilingualLabels: false,
};

export function resolveAdmissionFormSettings(
  settings: SchoolSettings | null | undefined
): AdmissionFormSettings {
  const custom = settings?.admissionFormSettings;
  return {
    defaultTemplateId:
      custom?.defaultTemplateId === 'habitat_a4_portrait' ? 'habitat_a4_portrait' : 'standard',
    schoolPhone2: custom?.schoolPhone2 ?? '',
    startDateLabel: (custom?.startDateLabel || '').trim() || DEFAULT_HABITAT_ADMISSION_SETTINGS.startDateLabel,
    showUndertaking: custom?.showUndertaking ?? DEFAULT_HABITAT_ADMISSION_SETTINGS.showUndertaking,
    undertakingText:
      (custom?.undertakingText || '').trim() || DEFAULT_HABITAT_ADMISSION_SETTINGS.undertakingText,
    showFeeNote: custom?.showFeeNote ?? DEFAULT_HABITAT_ADMISSION_SETTINGS.showFeeNote,
    feeNoteText: (custom?.feeNoteText || '').trim() || DEFAULT_HABITAT_ADMISSION_SETTINGS.feeNoteText,
    documentsRequiredText:
      (custom?.documentsRequiredText || '').trim() ||
      DEFAULT_HABITAT_ADMISSION_SETTINGS.documentsRequiredText,
    footerThankYouText:
      (custom?.footerThankYouText || '').trim() ||
      DEFAULT_HABITAT_ADMISSION_SETTINGS.footerThankYouText,
    bilingualLabels: custom?.bilingualLabels ?? false,
  };
}

/**
 * Automatically splits any school name cleanly into two balanced lines for the
 * two-tone Habitat header (line 1 in navy #111827, line 2 in green #3DB86B).
 */
export function splitSchoolNameTwoLines(rawName: string): [string, string] {
  const cleaned = (rawName || 'SCHOOL NAME').trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ');
  if (words.length <= 1) {
    return [cleaned.toUpperCase(), ''];
  }
  if (words.length === 2) {
    return [words[0].toUpperCase(), words[1].toUpperCase()];
  }
  // Prefer a natural split (e.g., "THE HABITAT" / "SCHOOL SYSTEM")
  const splitIdx = Math.ceil(words.length / 2);
  const line1 = words.slice(0, splitIdx).join(' ').toUpperCase();
  const line2 = words.slice(splitIdx).join(' ').toUpperCase();
  return [line1, line2];
}

const TEMPLATE_PREF_KEY_PREFIX = 'eduledger_admission_template_pref_v1_';

export function getRememberedAdmissionTemplate(
  userId: string | undefined,
  schoolDefault: AdmissionTemplateId
): AdmissionTemplateId {
  try {
    const key = `${TEMPLATE_PREF_KEY_PREFIX}${userId || 'guest'}`;
    const stored = window.localStorage.getItem(key);
    if (stored === 'standard' || stored === 'habitat_a4_portrait') {
      return stored;
    }
  } catch {
    // Ignore storage restriction
  }
  return schoolDefault;
}

export function setRememberedAdmissionTemplate(
  userId: string | undefined,
  templateId: AdmissionTemplateId
): void {
  try {
    const key = `${TEMPLATE_PREF_KEY_PREFIX}${userId || 'guest'}`;
    window.localStorage.setItem(key, templateId);
  } catch {
    // Ignore storage restriction
  }
}

export interface HabitatAdmissionDraft {
  editingStudentId?: string;
  rollNo: string;
  className: string;
  section: string;
  registrationDate: string; // YYYY-MM-DD
  fullName: string;
  fatherName: string;
  guardianName: string;
  email: string;
  nationality: string;
  gender: 'Male' | 'Female' | '';
  domicile: string;
  dateOfBirth: string; // YYYY-MM-DD
  startDate: string; // Admission Date / Session Start / custom
  country: string;
  religion: string;
  idNumber: string; // CNIC / B-Form
  contactNumber: string; // Phone No 1
  phone2: string; // Phone No 2
  address: string; // Present Address Line 1
  addressLine2: string; // Present Address Line 2
  occupation: string;
  education: string;
  monthlyIncome: string; // string in form input, converted to number on save
  photoUrl: string;
  undertakingAccepted: boolean;
  officerName: string;
}

export function createEmptyHabitatDraft(
  defaultClass: string,
  defaultSection: string,
  nextRollNo: string,
  officerName = ''
): HabitatAdmissionDraft {
  const today = getTodayDateString();
  return {
    editingStudentId: undefined,
    rollNo: nextRollNo,
    className: defaultClass,
    section: defaultSection || 'A',
    registrationDate: today,
    fullName: '',
    fatherName: '',
    guardianName: '',
    email: '',
    nationality: 'Pakistani',
    gender: '',
    domicile: '',
    dateOfBirth: '',
    startDate: today,
    country: 'Pakistan',
    religion: 'Islam',
    idNumber: '',
    contactNumber: '',
    phone2: '',
    address: '',
    addressLine2: '',
    occupation: '',
    education: '',
    monthlyIncome: '',
    photoUrl: '',
    undertakingAccepted: true,
    officerName,
  };
}

export function studentToHabitatDraft(student: Student): HabitatAdmissionDraft {
  const fatherOrGuardian =
    student.fatherName ||
    (student.guardianRelation?.toLowerCase() === 'father' ? student.guardianName : '') ||
    '';
  const rawAddress = student.address || '';
  let line1 = rawAddress;
  let line2 = student.addressLine2 || '';
  if (!line2 && rawAddress.includes('\n')) {
    const parts = rawAddress.split('\n');
    line1 = parts[0] || '';
    line2 = parts.slice(1).join(' ').trim();
  }

  return {
    editingStudentId: student.id,
    rollNo: student.rollNo || '',
    className: student.className || '',
    section: student.section || 'A',
    registrationDate: student.registrationDate || student.admissionDate || getTodayDateString(),
    fullName: student.fullName || '',
    fatherName: fatherOrGuardian,
    guardianName: student.guardianName || fatherOrGuardian,
    email: student.email || '',
    nationality: student.nationality || '',
    gender: student.gender === 'Male' || student.gender === 'Female' ? student.gender : '',
    domicile: student.domicile || '',
    dateOfBirth: student.dateOfBirth || '',
    startDate: student.startDate || student.admissionDate || '',
    country: student.country || '',
    religion: student.religion || '',
    idNumber: student.idNumber || '',
    contactNumber: student.contactNumber || '',
    phone2: student.phone2 || '',
    address: line1,
    addressLine2: line2,
    occupation: student.occupation || '',
    education: student.education || '',
    monthlyIncome:
      student.monthlyIncome !== undefined && student.monthlyIncome !== null
        ? String(student.monthlyIncome)
        : '',
    photoUrl: student.photoUrl || '',
    undertakingAccepted: student.undertakingAccepted ?? true,
    officerName: student.officerName || '',
  };
}

export function habitatDraftToStudentPayload(
  draft: HabitatAdmissionDraft,
  existingStudent?: Student | null
): Omit<Student, 'id'> {
  const combinedAddress = [draft.address.trim(), draft.addressLine2.trim()]
    .filter(Boolean)
    .join(', ');
  const parsedIncome = draft.monthlyIncome.trim() !== '' ? Number(draft.monthlyIncome.replace(/,/g, '')) : undefined;

  return {
    ...(existingStudent
      ? {
          bloodGroup: existingStudent.bloodGroup,
          motherName: existingStudent.motherName,
          monthlyFee: existingStudent.monthlyFee,
          feeDiscount: existingStudent.feeDiscount,
          concessionReason: existingStudent.concessionReason,
          isDemo: existingStudent.isDemo,
        }
      : {}),
    rollNo: draft.rollNo.trim(),
    fullName: draft.fullName.trim(),
    fatherName: draft.fatherName.trim() || undefined,
    guardianName: (draft.guardianName.trim() || draft.fatherName.trim() || 'Guardian'),
    guardianRelation:
      draft.guardianName.trim() &&
      draft.fatherName.trim() &&
      draft.guardianName.trim().toLowerCase() !== draft.fatherName.trim().toLowerCase()
        ? 'Guardian'
        : 'Father',
    gender: draft.gender === 'Female' ? 'Female' : 'Male',
    dateOfBirth: draft.dateOfBirth,
    className: draft.className,
    section: draft.section || 'A',
    admissionDate: draft.startDate || draft.registrationDate || getTodayDateString(),
    registrationDate: draft.registrationDate || getTodayDateString(),
    startDate: draft.startDate || undefined,
    contactNumber: draft.contactNumber.trim(),
    phone2: draft.phone2.trim() || undefined,
    email: draft.email.trim() || undefined,
    address: combinedAddress || draft.address.trim() || 'N/A',
    addressLine2: draft.addressLine2.trim() || undefined,
    photoUrl: draft.photoUrl || undefined,
    status: existingStudent?.status || 'active',
    idNumber: draft.idNumber.trim() || undefined,
    nationality: draft.nationality.trim() || undefined,
    domicile: draft.domicile.trim() || undefined,
    religion: draft.religion.trim() || undefined,
    country: draft.country.trim() || undefined,
    occupation: draft.occupation.trim() || undefined,
    education: draft.education.trim() || undefined,
    monthlyIncome:
      parsedIncome !== undefined && Number.isFinite(parsedIncome) && parsedIncome >= 0
        ? parsedIncome
        : undefined,
    undertakingAccepted: draft.undertakingAccepted,
    officerName: draft.officerName.trim() || undefined,
    formTemplateId: 'habitat_a4_portrait',
  };
}

/**
 * Bidirectional sync helpers so switching between Standard Form and Habitat Form
 * never loses entered student data.
 */
export function standardFormToHabitatDraft(
  std: AdmissionFormData,
  prevHabitat: HabitatAdmissionDraft
): HabitatAdmissionDraft {
  return {
    ...prevHabitat,
    rollNo: std.officeRollNo || prevHabitat.rollNo,
    className: std.className || prevHabitat.className,
    section: std.section || prevHabitat.section,
    registrationDate: std.admissionDate || prevHabitat.registrationDate,
    startDate: std.admissionDate || prevHabitat.startDate,
    fullName: std.fullName || prevHabitat.fullName,
    fatherName:
      std.guardianRelation?.toLowerCase() === 'father' && std.guardianName
        ? std.guardianName
        : prevHabitat.fatherName,
    guardianName: std.guardianName || prevHabitat.guardianName,
    email: std.email || prevHabitat.email,
    nationality: std.nationality || prevHabitat.nationality,
    gender: std.gender === 'Male' || std.gender === 'Female' ? std.gender : prevHabitat.gender,
    dateOfBirth: std.dateOfBirth || prevHabitat.dateOfBirth,
    religion: std.religion || prevHabitat.religion,
    idNumber: std.nationalIdNo || std.guardianCnic || prevHabitat.idNumber,
    contactNumber: std.contactNumber || prevHabitat.contactNumber,
    phone2: std.alternateContactNumber || prevHabitat.phone2,
    address: std.residentialAddress || prevHabitat.address,
    occupation: std.guardianOccupation || prevHabitat.occupation,
    photoUrl: std.photoUrl || prevHabitat.photoUrl,
  };
}

export function habitatDraftToStandardForm(
  hab: HabitatAdmissionDraft,
  prevStd: AdmissionFormData
): AdmissionFormData {
  const combinedAddress = [hab.address.trim(), hab.addressLine2.trim()]
    .filter(Boolean)
    .join(', ');
  return {
    ...prevStd,
    officeRollNo: hab.rollNo || prevStd.officeRollNo,
    className: hab.className || prevStd.className,
    section: hab.section || prevStd.section,
    admissionDate: hab.registrationDate || hab.startDate || prevStd.admissionDate,
    fullName: hab.fullName,
    gender: hab.gender === 'Female' ? 'Female' : 'Male',
    dateOfBirth: hab.dateOfBirth,
    nationality: hab.nationality || prevStd.nationality,
    religion: hab.religion || prevStd.religion,
    nationalIdNo: hab.idNumber || prevStd.nationalIdNo,
    photoUrl: hab.photoUrl,
    hasPhotoAttached: Boolean(hab.photoUrl),
    guardianName: hab.guardianName || hab.fatherName,
    guardianRelation:
      hab.guardianName && hab.fatherName && hab.guardianName !== hab.fatherName ? 'Guardian' : 'Father',
    guardianOccupation: hab.occupation || prevStd.guardianOccupation,
    contactNumber: hab.contactNumber,
    alternateContactNumber: hab.phone2,
    email: hab.email,
    residentialAddress: combinedAddress || hab.address,
  };
}
