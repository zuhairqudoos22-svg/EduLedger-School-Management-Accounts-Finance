import { Student, StudentStatus } from '../types';
import { DEFAULT_CLASS_NAMES } from '../db/seedData';

/**
 * Robust RFC-4180 CSV Parser
 * Handles quoted cells, commas inside quotes, escaped quotes (""), and varied line breaks (\r\n, \r, \n).
 */
export function parseCsvRows(text: string): string[][] {
  // Strip BOM if present
  let cleanText = text;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.slice(1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++; // skip next quote
        } else {
          // End of quotes
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // handle \r\n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Final cell & row if any
  currentRow.push(currentCell.trim());
  if (currentRow.some(cell => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export interface ParsedStudentRow {
  index: number;
  data: Omit<Student, 'id'>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  isDuplicateRoll: boolean;
  isNewClass: boolean;
}

export interface StudentCsvParseSummary {
  totalRows: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
  duplicateRollCount: number;
  newClassesFound: string[];
  rows: ParsedStudentRow[];
}

/**
 * Standard CSV Template Columns
 */
export const STUDENT_CSV_HEADERS = [
  'Roll / Admission No',
  'Full Name',
  'Gender (Male/Female/Other)',
  'Date of Birth (YYYY-MM-DD)',
  'Class / Grade',
  'Section',
  'Admission Date (YYYY-MM-DD)',
  'Guardian Name',
  'Guardian Relation (Father/Mother/Guardian)',
  'Contact Number',
  'Email Address',
  'Residential Address',
  'Blood Group',
  'Status (active/graduated/transferred/inactive)',
];

/**
 * Generate CSV Template with UTF-8 BOM
 */
export function generateStudentCsvTemplate(
  includeSamples: boolean = true,
  existingClasses: string[] = DEFAULT_CLASS_NAMES.slice(0, 4)
): string {
  const defaultClass1 = existingClasses[0] || DEFAULT_CLASS_NAMES[0];
  const defaultClass2 = existingClasses[1] || DEFAULT_CLASS_NAMES[1];

  const rows: string[][] = [STUDENT_CSV_HEADERS];

  if (includeSamples) {
    rows.push([
      '2026-101',
      'Hamza Tariq',
      'Male',
      '2014-06-12',
      defaultClass1,
      'A',
      '2026-09-01',
      'Tariq Mehmood',
      'Father',
      '+92 300 1234567',
      'hamza.t@family.org',
      'House #14, Street 9, Sector F-8, Islamabad',
      'B+',
      'active',
    ]);
    rows.push([
      '2026-102',
      'Ayesha Fatima',
      'Female',
      '2013-11-25',
      defaultClass2,
      'B',
      '2026-09-01',
      'Zubair Ahmed',
      'Father',
      '+92 321 7654321',
      'zubair.ahmed@gmail.com',
      'Flat 4B, Gulberg Heights, Lahore',
      'O+',
      'active',
    ]);
    rows.push([
      '2026-103',
      'Zainab Malik',
      'Female',
      '2015-02-18',
      defaultClass1,
      'A',
      '2026-09-01',
      'Mrs. Farhana Malik',
      'Mother',
      '+92 333 9988776',
      'farhana.malik@outlook.com',
      'Plot 88, Phase 5, DHA, Karachi',
      'A+',
      'active',
    ]);
  }

  const csvBody = rows
    .map(row =>
      row
        .map(cell => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\r\n');

  // Prepend UTF-8 BOM so Microsoft Excel and Office suites open it with UTF-8 character encoding
  return '\uFEFF' + csvBody;
}

/**
 * Trigger download of the official CSV template
 */
export function downloadStudentCsvTemplate(
  includeSamples: boolean = true,
  existingClasses: string[] = []
): void {
  const csvContent = generateStudentCsvTemplate(includeSamples, existingClasses);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    includeSamples
      ? 'eduledger_student_import_sample_template.csv'
      : 'eduledger_student_import_blank_template.csv'
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Header normalizer to match various column name styles
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Match column index from header row
 */
function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map(normalizeHeader);
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeader(headers[i]);
    if (normalizedAliases.includes(norm)) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse and validate CSV text into structured student records
 */
export function parseAndValidateStudentCsv(
  csvContent: string,
  existingStudents: Student[],
  availableClasses: string[],
  availableSections: string[] = ['A', 'B', 'C']
): StudentCsvParseSummary {
  const rawRows = parseCsvRows(csvContent);

  if (rawRows.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      warningCount: 0,
      duplicateRollCount: 0,
      newClassesFound: [],
      rows: [],
    };
  }

  const headerRow = rawRows[0];
  const dataRows = rawRows.slice(1);

  // Column mapping with synonyms
  const colRollNo = findColumnIndex(headerRow, [
    'rollno',
    'rollnumber',
    'admissionno',
    'admissionnumber',
    'rolladmissionno',
    'roll',
    'studentid',
  ]);
  const colFullName = findColumnIndex(headerRow, [
    'fullname',
    'name',
    'studentname',
    'fullstudentname',
  ]);
  const colGender = findColumnIndex(headerRow, ['gender', 'sex']);
  const colDob = findColumnIndex(headerRow, [
    'dateofbirth',
    'dob',
    'birthdate',
    'dateofbirthyyyymmdd',
  ]);
  const colClass = findColumnIndex(headerRow, [
    'class',
    'classname',
    'grade',
    'classgrade',
    'standard',
  ]);
  const colSection = findColumnIndex(headerRow, ['section', 'sec']);
  const colAdmDate = findColumnIndex(headerRow, [
    'admissiondate',
    'joiningdate',
    'enrollmentdate',
    'admissiondateyyyymmdd',
  ]);
  const colGuardian = findColumnIndex(headerRow, [
    'guardianname',
    'guardian',
    'fathername',
    'parentname',
  ]);
  const colRelation = findColumnIndex(headerRow, [
    'guardianrelation',
    'relation',
    'relationship',
  ]);
  const colPhone = findColumnIndex(headerRow, [
    'contactnumber',
    'phone',
    'phonenumber',
    'mobile',
    'contact',
    'whatsapp',
  ]);
  const colEmail = findColumnIndex(headerRow, ['emailaddress', 'email', 'mail']);
  const colAddress = findColumnIndex(headerRow, [
    'residentialaddress',
    'address',
    'homeaddress',
  ]);
  const colBlood = findColumnIndex(headerRow, ['bloodgroup', 'bloodtype', 'blood']);
  const colStatus = findColumnIndex(headerRow, ['status', 'enrollmentstatus']);

  // Set of existing roll numbers (case-insensitive)
  const existingRollSet = new Set(existingStudents.map(s => s.rollNo.trim().toLowerCase()));
  const seenRollNumbersInFile = new Set<string>();
  const newClassesFoundSet = new Set<string>();

  const parsedRows: ParsedStudentRow[] = [];
  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let duplicateRollCount = 0;

  dataRows.forEach((row, rowIdx) => {
    // Skip completely empty rows
    if (row.length === 0 || row.every(cell => !cell.trim())) {
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const rollNo = (colRollNo !== -1 ? row[colRollNo] : row[0])?.trim() || '';
    const fullName = (colFullName !== -1 ? row[colFullName] : row[1])?.trim() || '';
    let gender = ((colGender !== -1 ? row[colGender] : row[2])?.trim() || 'Male') as
      | 'Male'
      | 'Female'
      | 'Other';
    let dateOfBirth = (colDob !== -1 ? row[colDob] : row[3])?.trim() || '2015-01-01';
    let className =
      (colClass !== -1 ? row[colClass] : row[4])?.trim() ||
      availableClasses[0] ||
      DEFAULT_CLASS_NAMES[0];
    let section = (colSection !== -1 ? row[colSection] : row[5])?.trim().toUpperCase() || 'A';
    let admissionDate = (colAdmDate !== -1 ? row[colAdmDate] : row[6])?.trim() || '2026-09-01';
    let guardianName = (colGuardian !== -1 ? row[colGuardian] : row[7])?.trim() || '';
    let guardianRelation = (colRelation !== -1 ? row[colRelation] : row[8])?.trim() || 'Parent';
    let contactNumber = (colPhone !== -1 ? row[colPhone] : row[9])?.trim() || '';
    let email = (colEmail !== -1 ? row[colEmail] : row[10])?.trim() || '';
    let address = (colAddress !== -1 ? row[colAddress] : row[11])?.trim() || 'Residential Address';
    let bloodGroup = (colBlood !== -1 ? row[colBlood] : row[12])?.trim() || 'O+';
    let status = ((colStatus !== -1 ? row[colStatus] : row[13])?.trim().toLowerCase() ||
      'active') as StudentStatus;

    // Validate Full Name
    if (!fullName) {
      errors.push('Full Name is required.');
    }

    // Validate Roll Number
    let isDuplicateRoll = false;
    if (!rollNo) {
      errors.push('Roll / Admission Number is required.');
    } else {
      const lowerRoll = rollNo.toLowerCase();
      if (existingRollSet.has(lowerRoll)) {
        isDuplicateRoll = true;
        errors.push(`Roll No "${rollNo}" already exists in the student database.`);
        duplicateRollCount++;
      } else if (seenRollNumbersInFile.has(lowerRoll)) {
        isDuplicateRoll = true;
        errors.push(`Duplicate Roll No "${rollNo}" found multiple times in this CSV.`);
        duplicateRollCount++;
      } else {
        seenRollNumbersInFile.add(lowerRoll);
      }
    }

    // Validate Class
    let isNewClass = false;
    if (!className) {
      errors.push('Class name is required.');
    } else {
      const match = availableClasses.find(c => c.toLowerCase() === className.toLowerCase());
      if (match) {
        className = match; // format exact case
      } else {
        isNewClass = true;
        newClassesFoundSet.add(className);
        warnings.push(`Class "${className}" does not exist in curriculum yet. It will be added automatically.`);
      }
    }

    // Validate Section
    if (!section) {
      section = 'A';
    } else {
      const matchSec = availableSections.find(s => s.toUpperCase() === section.toUpperCase());
      if (matchSec) {
        section = matchSec;
      }
    }

    // Validate Gender
    const normGender = gender.toLowerCase();
    if (normGender.startsWith('m')) gender = 'Male';
    else if (normGender.startsWith('f')) gender = 'Female';
    else gender = 'Other';

    // Validate Guardian
    if (!guardianName) {
      warnings.push('Guardian name missing (defaults to "Guardian").');
      guardianName = 'Guardian';
    }

    // Validate Contact Number
    if (!contactNumber) {
      warnings.push('Contact number missing.');
      contactNumber = 'Not Provided';
    }

    // Validate Status
    const validStatuses: StudentStatus[] = ['active', 'graduated', 'transferred', 'inactive'];
    if (!validStatuses.includes(status)) {
      status = 'active';
    }

    // Date checks (fallback if invalid)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      warnings.push(`DOB "${dateOfBirth}" is not YYYY-MM-DD. Auto-standardized.`);
      dateOfBirth = '2015-01-01';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(admissionDate)) {
      warnings.push(`Admission Date "${admissionDate}" is not YYYY-MM-DD.`);
      admissionDate = '2026-09-01';
    }

    const isValid = errors.length === 0;
    if (isValid) {
      validCount++;
    } else {
      errorCount++;
    }
    if (warnings.length > 0) {
      warningCount++;
    }

    parsedRows.push({
      index: rowIdx + 2, // 1-based line number in file (1 is header)
      data: {
        rollNo,
        fullName,
        gender,
        dateOfBirth,
        className,
        section,
        admissionDate,
        guardianName,
        guardianRelation,
        contactNumber,
        email: email || undefined,
        address,
        photoUrl: undefined,
        status,
        bloodGroup,
      },
      isValid,
      errors,
      warnings,
      isDuplicateRoll,
      isNewClass,
    });
  });

  return {
    totalRows: parsedRows.length,
    validCount,
    errorCount,
    warningCount,
    duplicateRollCount,
    newClassesFound: Array.from(newClassesFoundSet),
    rows: parsedRows,
  };
}
