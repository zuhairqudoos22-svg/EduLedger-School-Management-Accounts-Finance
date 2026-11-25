import { z } from 'zod';

/**
 * Zod validation schema for Student Admission & Registration Form.
 * Enforces mandatory presence of student photograph, mandatory verification documents,
 * and essential biographical and parental records before saving or printing.
 */
export const admissionFormSchema = z.object({
  // Identification
  formNo: z.string().trim().min(3, 'Form Number is required (min 3 chars).'),
  admissionDate: z.string().trim().min(1, 'Admission date is required.'),

  // Student Particulars
  fullName: z
    .string()
    .trim()
    .min(2, 'Student full name is required (min 2 characters).')
    .max(100, 'Student name cannot exceed 100 characters.'),
  gender: z.enum(['Male', 'Female', 'Other']),
  dateOfBirth: z
    .string()
    .trim()
    .min(1, 'Student date of birth is required.')
    .refine(dob => !isNaN(Date.parse(dob)), 'Please enter a valid calendar date of birth.'),
  placeOfBirth: z.string().trim().optional(),
  nationality: z.string().trim().min(1, 'Nationality is required.'),
  religion: z.string().trim().optional(),
  bloodGroup: z.string().trim().min(1, 'Blood group is required (e.g. A+, B+, O+).'),
  nationalIdNo: z.string().trim().optional(),
  className: z.string().trim().min(1, 'Class / Grade applied is required.'),
  section: z.string().trim().min(1, 'Section is required.'),

  // Photo Requirement (Mandatory: Must either provide uploaded photoUrl OR have photo confirmed)
  photoUrl: z.string().trim().optional(),
  hasPhotoAttached: z.boolean().refine(val => val === true, {
    message: 'Mandatory: 4x4 cm / Passport photograph must be attached to the application.',
  }),

  // Previous Academic History (Optional if first admission, but if provided should be valid)
  previousSchool: z.string().trim().optional(),
  previousClass: z.string().trim().optional(),
  previousMarksOrGrade: z.string().trim().optional(),
  previousLeavingCertNo: z.string().trim().optional(),

  // Parent / Guardian Particulars
  guardianName: z
    .string()
    .trim()
    .min(2, 'Father / Guardian full name is required.')
    .max(100, 'Guardian name cannot exceed 100 characters.'),
  guardianRelation: z.string().trim().min(1, 'Relationship with guardian is required.'),
  guardianOccupation: z.string().trim().optional(),
  guardianEmployer: z.string().trim().optional(),
  guardianCnic: z.string().trim().optional(),
  contactNumber: z
    .string()
    .trim()
    .min(5, 'Primary phone / mobile contact number is required.'),
  alternateContactNumber: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Please provide a valid email address or leave blank.',
    }),
  residentialAddress: z
    .string()
    .trim()
    .min(5, 'Residential street / house address is required.'),
  permanentAddress: z.string().trim().optional(),

  // Mandatory Verification Checklist
  hasBirthCertAttached: z.boolean().refine(val => val === true, {
    message: 'Mandatory: Official Birth Certificate or NADRA B-Form copy must be marked as attached.',
  }),
  hasSchoolLeavingCertAttached: z.boolean(),
  hasGuardianCnicAttached: z.boolean().refine(val => val === true, {
    message: 'Mandatory: Attested copy of Father / Guardian CNIC or National ID must be attached.',
  }),
  hasReportCardAttached: z.boolean(),
  hasMedicalRecordAttached: z.boolean(),

  // Office Use
  officeStatus: z.enum(['Approved', 'Provisional', 'Pending', 'Rejected'] as const).optional(),
  officeRollNo: z.string().trim().optional(),
  officeRemarks: z.string().trim().optional(),
}).superRefine((data, ctx) => {
  // If previous school is specified, Leaving certificate must also be checked or note provided
  if (data.previousSchool && data.previousSchool.trim().length > 0) {
    if (!data.hasSchoolLeavingCertAttached && !data.previousLeavingCertNo?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['hasSchoolLeavingCertAttached'],
        message: 'Previous school was specified: Please attach the School Leaving Certificate (SLC) or enter SLC No.',
      });
    }
  }

  // Must have an actual photo uploaded OR explicitly marked attached
  if (!data.photoUrl && !data.hasPhotoAttached) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['photoUrl'],
      message: 'A 4x4 cm student photo must be uploaded or attached before saving or printing.',
    });
  }
});

export type AdmissionFormSchemaValues = z.infer<typeof admissionFormSchema>;

export interface FormValidationError {
  field?: string;
  message: string;
}

/**
 * Validates admission form data against the schema.
 * Returns an object with `isValid` flag and a list of formatted errors.
 */
export function validateAdmissionForm(data: unknown): {
  isValid: boolean;
  errors: Record<string, string>;
  errorList: string[];
} {
  const result = admissionFormSchema.safeParse(data);
  if (result.success) {
    return {
      isValid: true,
      errors: {},
      errorList: [],
    };
  }

  const errors: Record<string, string> = {};
  const errorList: string[] = [];

  for (const issue of result.error.issues) {
    const fieldKey = issue.path.join('.') || 'general';
    if (!errors[fieldKey]) {
      errors[fieldKey] = issue.message;
    }
    if (!errorList.includes(issue.message)) {
      errorList.push(issue.message);
    }
  }

  return {
    isValid: false,
    errors,
    errorList,
  };
}
