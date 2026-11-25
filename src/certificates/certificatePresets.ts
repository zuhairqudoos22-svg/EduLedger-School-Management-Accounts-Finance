import { CertificateDesignId, CertificateType } from '../types';

export type CertificateAudience = 'student' | 'employee' | 'both';

export interface CertificateWordingBlock {
  title: string;
  subtitle: string;
  event: string;
  position: string;
  paragraph1: string;
  paragraph2: string;
  signatory1Title: string;
  signatory2Title: string;
  signatory3Title: string;
}

export interface CertificateTypePreset {
  id: CertificateType;
  label: string;
  shortLabel: string;
  category: 'Academic' | 'Co-Curricular' | 'Official' | 'Staff' | 'Custom';
  audience: CertificateAudience;
  recommendedDesign: CertificateDesignId;
  hasActivityField?: boolean;
  en: CertificateWordingBlock;
  ur: CertificateWordingBlock;
}

export const EXTRACURRICULAR_ACTIVITIES = [
  'Debate Competition',
  'Quiz Competition',
  'Art & Calligraphy Exhibition',
  'Drama & Theatre Festival',
  'Qirat & Naat Competition',
  'Scouts & Girl Guides Camp',
  'Essay Writing Contest',
  'Coding & Robotics Club',
  'Other Activity',
] as const;

export const CERTIFICATE_TYPE_PRESETS: readonly CertificateTypePreset[] = [
  {
    id: 'sports_festival',
    label: 'Sports Festival Appreciation / Achievement',
    shortLabel: 'Sports Festival',
    category: 'Co-Curricular',
    audience: 'both',
    recommendedDesign: 'diagonal_stripes',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'OF ACHIEVEMENT',
      event: 'ANNUAL SPORTS FESTIVAL',
      position: '1st Position',
      paragraph1:
        'In recognition of outstanding performance, discipline, and sportsmanship, securing {position} in {event} ({year}) at {schoolName}.',
      paragraph2:
        'Your unwavering commitment, enthusiasm, and team spirit have greatly contributed to the memorable success of {event} {year}.',
      signatory1Title: 'Principal',
      signatory2Title: 'Sports In-charge',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ امتیاز',
      subtitle: 'برائے نمایاں کارکردگی',
      event: 'سالانہ سپورٹس فیسٹیول',
      position: 'پہلی پوزیشن',
      paragraph1:
        '{schoolName} کے زیرِ اہتمام {event} ({year}) میں {position} حاصل کرنے اور بہترین نظم و ضبط و کھیل کی روح کے مظاہرے پر یہ سند پیش کی جاتی ہے۔',
      paragraph2:
        'آپ کی لگن، جذبے اور ٹیم اسپرٹ نے اس تقریب کو یادگار اور کامیاب بنایا۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'سپورٹس انچارج',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'science_olympiad',
    label: 'Science Olympiad',
    shortLabel: 'Science Olympiad',
    category: 'Academic',
    audience: 'student',
    recommendedDesign: 'diagonal_stripes',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'OF ACHIEVEMENT',
      event: 'ANNUAL SCIENCE & STEM OLYMPIAD',
      position: '1st Position',
      paragraph1:
        'In recognition of exemplary scientific inquiry, analytical brilliance, and problem-solving in securing {position} at the {event} ({year}) representing {class}.',
      paragraph2:
        'We commend your curiosity, innovation, and dedication to scientific excellence at {schoolName}.',
      signatory1Title: 'Principal',
      signatory2Title: 'Head of Science',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ امتیاز',
      subtitle: 'سائنس اولمپیاڈ',
      event: 'سالانہ سائنس اور اسٹیم اولمپیاڈ',
      position: 'پہلی پوزیشن',
      paragraph1:
        'جماعت {class} کی نمائندگی کرتے ہوئے {event} ({year}) میں غیر معمولی سائنسی مہارت اور تحقیق کے ساتھ {position} حاصل کرنے پر یہ سند پیش کی جاتی ہے۔',
      paragraph2:
        '{schoolName} آپ کی تخلیقی صلاحیت اور علمی لگن کو سراہتا ہے۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'سربراہ شعبہ سائنس',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'academic_honors',
    label: 'Academic Honors',
    shortLabel: 'Academic Honors',
    category: 'Academic',
    audience: 'student',
    recommendedDesign: 'classic_ribbon_gold',
    en: {
      title: 'CERTIFICATE OF ACADEMIC HONORS',
      subtitle: 'is proudly presented to',
      event: 'ANNUAL ACADEMIC EXCELLENCE AWARDS',
      position: 'Distinction / 1st Position',
      paragraph1:
        'For achieving {position} in {class} (Roll No. {rollNo}) and demonstrating outstanding scholastic merit throughout the {year} academic session at {schoolName}.',
      paragraph2:
        'May this recognition inspire continued pursuit of knowledge, integrity, and lifelong excellence.',
      signatory1Title: 'Principal',
      signatory2Title: 'Controller of Examinations',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ تعلیمی اعزاز',
      subtitle: 'باعزاز پیش کی جاتی ہے',
      event: 'سالانہ تعلیمی ایوارڈز',
      position: 'امتیازی پوزیشن',
      paragraph1:
        '{schoolName} کے تعلیمی سال {year} میں جماعت {class} (رول نمبر {rollNo}) میں {position} حاصل کرنے اور شاندار تعلیمی کارکردگی پر یہ سند عطا کی جاتی ہے۔',
      paragraph2:
        'دعا ہے کہ آپ مستقبل میں بھی علم و عمل کے میدان میں نمایاں کامیابیاں حاصل کریں۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'ناظم امتحانات',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'school_leaving',
    label: 'School Leaving Certificate (TC)',
    shortLabel: 'School Leaving (TC)',
    category: 'Official',
    audience: 'student',
    recommendedDesign: 'classic_ribbon_gold',
    en: {
      title: 'SCHOOL LEAVING CERTIFICATE',
      subtitle: 'THIS IS TO OFFICIALLY CERTIFY THAT',
      event: 'TRANSFER & CHARACTER RECORD',
      position: 'Good Standing',
      paragraph1:
        'This is to certify that {name}, son/daughter of {fatherName}, was a bonafide student of {schoolName} in {class} (Admission No. {admissionNo}). Their conduct and moral character remained exemplary during enrollment.',
      paragraph2:
        'All institutional dues have been cleared in full as of {date}. We wish the student every success in future academic endeavors.',
      signatory1Title: 'Principal',
      signatory2Title: 'Admission Registrar',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'اسکول چھوڑنے کا سرٹیفکیٹ (TC)',
      subtitle: 'تصدیق کی جاتی ہے کہ',
      event: 'سرکاری تعلیمی ریکارڈ',
      position: 'تسلی بخش',
      paragraph1:
        'تصدیق کی جاتی ہے کہ {name} ولد/دختر {fatherName} {schoolName} کی جماعت {class} (داخلہ نمبر {admissionNo}) کے باقاعدہ طالب علم رہے ہیں۔ دورانِ تعلیم ان کا چال چلن مثالی رہا۔',
      paragraph2:
        'مورخہ {date} تک تمام واجبات ادا کر دیے گئے ہیں۔ ادارہ ان کے روشن مستقبل کے لیے دعاگو ہے۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'رجسٹرار داخلہ',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'employee_award',
    label: 'Educator Award',
    shortLabel: 'Educator Award',
    category: 'Staff',
    audience: 'employee',
    recommendedDesign: 'geometric_triangles',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'of Appreciation',
      event: 'ANNUAL EDUCATOR EXCELLENCE AWARD',
      position: 'Distinguished Educator',
      paragraph1:
        'In recognition of your exceptional leadership, dedication, and pedagogical excellence as {designation} demonstrated in the planning, mentorship, and execution of {event} ({year}). This certificate is proudly awarded to',
      paragraph2:
        'Your unwavering commitment, enthusiasm, and ability to inspire both students and colleagues have greatly contributed to the outstanding success of {schoolName}.',
      signatory1Title: 'Principal',
      signatory2Title: 'Director of Academics',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ تحسین',
      subtitle: 'بہترین معلم ایوارڈ',
      event: 'سالانہ تعلیمی و تدریسی اعزاز',
      position: 'ممتاز معلم',
      paragraph1:
        'بطور {designation} شاندار تدریسی خدمات، قیادت اور {event} ({year}) کی کامیابی میں مثالی کردار ادا کرنے پر یہ سندِ تحسین پیش کی جاتی ہے',
      paragraph2:
        'طلبہ اور اساتذہ کی رہنمائی کے لیے آپ کا جذبہ اور محنت {schoolName} کا قیمتی سرمایہ ہے۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'ڈائریکٹر تعلیمات',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'perfect_attendance',
    label: '100% Attendance',
    shortLabel: '100% Attendance',
    category: 'Academic',
    audience: 'student',
    recommendedDesign: 'diagonal_stripes',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'OF PERFECT ATTENDANCE',
      event: '100% SCHOLASTIC ATTENDANCE HONOR',
      position: 'Zero Absences',
      paragraph1:
        'For demonstrating exemplary punctuality, discipline, and 100% attendance in {class} (Roll No. {rollNo}) throughout the {year} academic year at {schoolName}.',
      paragraph2:
        'Your steadfast commitment and reliability set an inspiring example for the entire student community.',
      signatory1Title: 'Principal',
      signatory2Title: 'Class Teacher',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ سو فیصد حاضری',
      subtitle: 'مثالی پابندیِ وقت',
      event: 'سالانہ حاضری اعزاز',
      position: 'سو فیصد حاضری',
      paragraph1:
        '{schoolName} کے تعلیمی سال {year} کے دوران جماعت {class} (رول نمبر {rollNo}) میں مکمل سو فیصد حاضری اور مثالی نظم و ضبط برقرار رکھنے پر یہ سند پیش کی جاتی ہے۔',
      paragraph2:
        'آپ کی پابندیِ وقت اور ذمہ داری تمام طلبہ کے لیے قابلِ تقلید مثال ہے۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'کلاس ٹیچر',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'employee_service',
    label: 'Service Experience',
    shortLabel: 'Service Experience',
    category: 'Staff',
    audience: 'employee',
    recommendedDesign: 'classic_ribbon_gold',
    en: {
      title: 'EXPERIENCE & SERVICE CERTIFICATE',
      subtitle: 'is proudly presented to',
      event: 'MERITORIOUS INSTITUTIONAL SERVICE',
      position: 'Dedicated Service',
      paragraph1:
        'This is to certify that {name} served {schoolName} diligently in the capacity of {designation} for {duration}, fulfilling all academic and administrative responsibilities with professionalism and integrity.',
      paragraph2:
        'Issued on {date}. We express our sincere appreciation for their service and wish them continued success.',
      signatory1Title: 'Principal',
      signatory2Title: 'HR & Administration',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ تجربہ و ملازمت',
      subtitle: 'باعزاز جاری کی جاتی ہے',
      event: 'قابلِ تحسین ادارہ جاتی خدمات',
      position: 'بہترین خدمات',
      paragraph1:
        'تصدیق کی جاتی ہے کہ {name} نے {schoolName} میں بطور {designation} مدت {duration} تک نہایت دیانتداری، محنت اور پیشہ ورانہ مہارت سے خدمات سرانجام دیں۔',
      paragraph2:
        'مورخہ {date} کو جاری کی گئی۔ ادارہ ان کے روشن مستقبل کے لیے نیک تمنائیں رکھتا ہے۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'ایچ آر و انتظامیہ',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'extracurricular',
    label: 'Extra-Curricular Activity',
    shortLabel: 'Extra-Curricular',
    category: 'Co-Curricular',
    audience: 'student',
    recommendedDesign: 'classic_ribbon_gold',
    hasActivityField: true,
    en: {
      title: 'CERTIFICATE OF APPRECIATION',
      subtitle: 'is proudly presented to',
      event: 'INTER-HOUSE CO-CURRICULAR FESTIVAL',
      position: '1st Position',
      paragraph1:
        'For remarkable talent, creativity, and active participation in {activity} — securing {position} during {event} ({year}) as a student of {class}.',
      paragraph2:
        'Your confidence and expressive spirit enrich the cultural and co-curricular life of {schoolName}.',
      signatory1Title: 'Principal',
      signatory2Title: 'Activity Coordinator',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ ہم نصابی سرگرمیاں',
      subtitle: 'باعزاز پیش کی جاتی ہے',
      event: 'سالانہ ہم نصابی مقابلہ جات',
      position: 'پہلی پوزیشن',
      paragraph1:
        'جماعت {class} کی جانب سے {activity} میں شاندار صلاحیت کا مظاہرہ کرتے ہوئے {event} ({year}) میں {position} حاصل کرنے پر یہ سند پیش کی جاتی ہے۔',
      paragraph2:
        'آپ کا اعتماد اور تخلیقی ذوق {schoolName} کی ہم نصابی روایات کا روشن باب ہے۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'کوآرڈینیٹر سرگرمیاں',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'appreciation',
    label: 'Certificate of Appreciation',
    shortLabel: 'Appreciation',
    category: 'Official',
    audience: 'both',
    recommendedDesign: 'geometric_triangles',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'of Appreciation',
      event: 'ANNUAL SCHOOL RECOGNITION',
      position: 'Special Recognition',
      paragraph1:
        'In recognition of your exceptional leadership, dedication, and organizational skills demonstrated in the planning, management, and successful execution of {event} ({year}). This certificate is proudly awarded to',
      paragraph2:
        'Your unwavering commitment, enthusiasm, and ability to inspire others have greatly contributed to the outstanding success of this occasion at {schoolName}.',
      signatory1Title: 'Principal',
      signatory2Title: 'Coordinator',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ تحسین',
      subtitle: 'برائے قابلِ قدر خدمات',
      event: 'سالانہ تقریبِ تقسیمِ انعامات',
      position: 'خصوصی اعتراف',
      paragraph1:
        '{event} ({year}) کے بہترین انعقاد، قیادت اور مخلصانہ کاوشوں کے اعتراف میں یہ سندِ تحسین پیش کی جاتی ہے',
      paragraph2:
        'آپ کی محنت اور خلوص نے {schoolName} کی اس تقریب کو نہایت کامیاب بنایا۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'کوآرڈینیٹر',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'achievement',
    label: 'General Achievement',
    shortLabel: 'Achievement',
    category: 'Academic',
    audience: 'student',
    recommendedDesign: 'diagonal_stripes',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'OF ACHIEVEMENT',
      event: 'ANNUAL SCHOLASTIC HONORS',
      position: '1st Place',
      paragraph1:
        'In formal recognition of exemplary dedication and achievement, securing {position} in {event} ({year}) as a student of {class} at {schoolName}.',
      paragraph2:
        'Conferred on {date} as a testament to perseverance, discipline, and sterling merit.',
      signatory1Title: 'Principal',
      signatory2Title: 'Academic Coordinator',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'سندِ کامیابی',
      subtitle: 'برائے نمایاں کامیابی',
      event: 'سالانہ تعلیمی و ہم نصابی ایوارڈز',
      position: 'پہلی پوزیشن',
      paragraph1:
        '{schoolName} کی جماعت {class} کے طالب علم کی حیثیت سے {event} ({year}) میں {position} حاصل کرنے پر یہ سندِ کامیابی عطا کی جاتی ہے۔',
      paragraph2:
        'مورخہ {date} کو آپ کی محنت اور استقامت کے اعتراف میں جاری کی گئی۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'اکیڈمک کوآرڈینیٹر',
      signatory3Title: 'تاریخ',
    },
  },
  {
    id: 'custom',
    label: 'Custom Certificate',
    shortLabel: 'Custom',
    category: 'Custom',
    audience: 'both',
    recommendedDesign: 'geometric_triangles',
    en: {
      title: 'CERTIFICATE',
      subtitle: 'of Recognition',
      event: 'SPECIAL INSTITUTIONAL EVENT',
      position: 'Honored Recipient',
      paragraph1:
        'This certificate is proudly presented to {name} of {schoolName} in recognition of noteworthy dedication and contribution to {event} ({year}).',
      paragraph2:
        'Issued on {date} with best wishes for continued success and excellence.',
      signatory1Title: 'Principal',
      signatory2Title: 'Event In-charge',
      signatory3Title: 'Date',
    },
    ur: {
      title: 'خصوصی سند',
      subtitle: 'برائے اعترافِ خدمات',
      event: 'خصوصی تقریب',
      position: 'معزز شریک',
      paragraph1:
        '{schoolName} کی جانب سے {event} ({year}) میں شاندار شرکت اور کارکردگی پر یہ سند {name} کو پیش کی جاتی ہے۔',
      paragraph2:
        'مورخہ {date} کو نیک تمناؤں کے ساتھ جاری کی گئی۔',
      signatory1Title: 'پرنسپل',
      signatory2Title: 'انچارج تقریب',
      signatory3Title: 'تاریخ',
    },
  },
];

export function getCertificateTypePreset(type: CertificateType): CertificateTypePreset {
  return (
    CERTIFICATE_TYPE_PRESETS.find((p) => p.id === type) || CERTIFICATE_TYPE_PRESETS[0]
  );
}

/**
 * Detects whether a string contains Urdu / Arabic script characters.
 */
export function containsUrduOrArabic(text?: string): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
}

/**
 * Formats an ISO date (YYYY-MM-DD) using Intl.DateTimeFormat matching school locale.
 */
export function formatCertificateDate(
  isoDate?: string,
  locale: string = 'en-US'
): string {
  if (!isoDate) return '';
  try {
    const parsed = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return isoDate;
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(parsed);
  } catch {
    return isoDate;
  }
}

export interface CertificateInterpolationContext {
  name?: string;
  fatherName?: string;
  class?: string;
  rollNo?: string;
  event?: string;
  position?: string;
  year?: string;
  date?: string;
  schoolName?: string;
  duration?: string;
  designation?: string;
  activity?: string;
  admissionNo?: string;
}

/**
 * Replaces supported dynamic placeholders ({name}, {fatherName}, {class}, {rollNo},
 * {event}, {position}, {year}, {date}, {schoolName}, {duration}, {designation}, {activity}, {admissionNo}).
 */
export function interpolateCertificateText(
  template: string,
  ctx: CertificateInterpolationContext
): string {
  if (!template) return '';
  const map: Record<string, string> = {
    name: ctx.name || '',
    fatherName: ctx.fatherName || '',
    class: ctx.class || '',
    rollNo: ctx.rollNo || '',
    event: ctx.event || '',
    position: ctx.position || '',
    year: ctx.year || String(new Date().getFullYear()),
    date: ctx.date || '',
    schoolName: ctx.schoolName || '',
    duration: ctx.duration || '',
    designation: ctx.designation || '',
    activity: ctx.activity || '',
    admissionNo: ctx.admissionNo || '',
  };

  return template.replace(/\{([a-zA-Z]+)\}/g, (full, key) => {
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key] || full;
    }
    return full;
  });
}

// =========================================================================
// REUSABLE USER-SAVED WORDING PRESETS (LOCAL STORAGE, SAFE TRY/CATCH)
// =========================================================================
export interface SavedWordingPreset {
  id: string;
  name: string;
  type: CertificateType;
  language: 'en' | 'ur';
  title: string;
  subtitle: string;
  event: string;
  position: string;
  activityName?: string;
  paragraph1: string;
  paragraph2: string;
  signatory1Title: string;
  signatory2Title: string;
  createdAt: string;
}

const SAVED_PRESETS_STORAGE_KEY = 'eduledger_cert_custom_presets_v1';

export function loadSavedWordingPresets(): SavedWordingPreset[] {
  try {
    const raw = localStorage.getItem(SAVED_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWordingPreset(preset: SavedWordingPreset): SavedWordingPreset[] {
  const existing = loadSavedWordingPresets();
  const next = [preset, ...existing.filter((p) => p.id !== preset.id)].slice(0, 30);
  try {
    localStorage.setItem(SAVED_PRESETS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  return next;
}

export function deleteSavedWordingPreset(id: string): SavedWordingPreset[] {
  const next = loadSavedWordingPresets().filter((p) => p.id !== id);
  try {
    localStorage.setItem(SAVED_PRESETS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}
