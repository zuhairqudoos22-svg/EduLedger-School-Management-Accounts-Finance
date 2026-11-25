import { CustomExpenseCategory, ExpenseCategory, ExpenseTaxonomyConfig } from '../types';
import { getStoredTaxonomy } from './expenseTaxonomyStorage';

export interface CategoryMappingRule {
  targetCategory: string;
  targetSubCategory?: string;
  confidence: 'high' | 'medium' | 'low';
  matchedTerm: string;
  matchType: 'direct' | 'synonym' | 'content-inference' | 'fallback';
}

export interface UniqueCategoryMapping {
  rawCsvCategory: string;
  targetCategory: string;
  targetSubCategory?: string;
  count: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'csv-column' | 'inferred-from-title';
}

// Canonical category alias map for direct/fuzzy matching
const CATEGORY_ALIASES: Record<string, string> = {
  // Staff Salaries
  salary: 'Staff Salaries',
  salaries: 'Staff Salaries',
  payroll: 'Staff Salaries',
  'staff salary': 'Staff Salaries',
  'staff salaries': 'Staff Salaries',
  'teacher salary': 'Staff Salaries',
  'faculty salary': 'Staff Salaries',
  wages: 'Staff Salaries',
  stipend: 'Staff Salaries',
  stipends: 'Staff Salaries',
  remuneration: 'Staff Salaries',
  compensation: 'Staff Salaries',

  // Utilities
  utility: 'Utilities (Electricity/Water)',
  utilities: 'Utilities (Electricity/Water)',
  electricity: 'Utilities (Electricity/Water)',
  power: 'Utilities (Electricity/Water)',
  water: 'Utilities (Electricity/Water)',
  'water & electricity': 'Utilities (Electricity/Water)',
  'electricity & water': 'Utilities (Electricity/Water)',
  internet: 'Utilities (Electricity/Water)',
  wifi: 'Utilities (Electricity/Water)',
  broadband: 'Utilities (Electricity/Water)',
  gas: 'Utilities (Electricity/Water)',
  heating: 'Utilities (Electricity/Water)',
  sewer: 'Utilities (Electricity/Water)',
  sewage: 'Utilities (Electricity/Water)',
  telecom: 'Utilities (Electricity/Water)',

  // Building Maintenance
  maintenance: 'Building Maintenance',
  'building maintenance': 'Building Maintenance',
  repairs: 'Building Maintenance',
  'repairs & maintenance': 'Building Maintenance',
  repair: 'Building Maintenance',
  civil: 'Building Maintenance',
  plumbing: 'Building Maintenance',
  electrical: 'Building Maintenance',
  carpentry: 'Building Maintenance',
  renovation: 'Building Maintenance',
  painting: 'Building Maintenance',
  janitorial: 'Building Maintenance',
  hvac: 'Building Maintenance',

  // Educational Supplies
  supplies: 'Educational Supplies',
  'educational supplies': 'Educational Supplies',
  stationery: 'Educational Supplies',
  textbooks: 'Educational Supplies',
  books: 'Educational Supplies',
  library: 'Educational Supplies',
  curriculum: 'Educational Supplies',
  'teaching aids': 'Educational Supplies',
  'school supplies': 'Educational Supplies',

  // IT & Software
  it: 'IT & Software',
  'it & software': 'IT & Software',
  software: 'IT & Software',
  hardware: 'IT & Software',
  computers: 'IT & Software',
  technology: 'IT & Software',
  saas: 'IT & Software',
  cloud: 'IT & Software',
  hosting: 'IT & Software',
  licenses: 'IT & Software',
  'it infrastructure': 'IT & Software',

  // Transport & Fuel
  transport: 'Transport & Fuel',
  'transport & fuel': 'Transport & Fuel',
  transportation: 'Transport & Fuel',
  fuel: 'Transport & Fuel',
  diesel: 'Transport & Fuel',
  petrol: 'Transport & Fuel',
  bus: 'Transport & Fuel',
  buses: 'Transport & Fuel',
  fleet: 'Transport & Fuel',
  vehicles: 'Transport & Fuel',

  // Lab & Sports
  lab: 'Lab & Sports Equipment',
  laboratory: 'Lab & Sports Equipment',
  'lab equipment': 'Lab & Sports Equipment',
  science: 'Lab & Sports Equipment',
  'science lab': 'Lab & Sports Equipment',
  sports: 'Lab & Sports Equipment',
  athletics: 'Lab & Sports Equipment',
  gym: 'Lab & Sports Equipment',
  'sports equipment': 'Lab & Sports Equipment',
  'lab & sports equipment': 'Lab & Sports Equipment',

  // Marketing
  marketing: 'Marketing & Advertising',
  'marketing & advertising': 'Marketing & Advertising',
  advertising: 'Marketing & Advertising',
  promotion: 'Marketing & Advertising',
  promotions: 'Marketing & Advertising',
  branding: 'Marketing & Advertising',
  admissions: 'Marketing & Advertising',
  campaign: 'Marketing & Advertising',
  billboards: 'Marketing & Advertising',

  // Exam & Events
  exam: 'Exam & Events',
  exams: 'Exam & Events',
  'exam & events': 'Exam & Events',
  examination: 'Exam & Events',
  events: 'Exam & Events',
  functions: 'Exam & Events',
  annual: 'Exam & Events',
  ceremony: 'Exam & Events',
  celebrations: 'Exam & Events',

  // Miscellaneous
  misc: 'Miscellaneous',
  miscellaneous: 'Miscellaneous',
  other: 'Miscellaneous',
  'other expense': 'Miscellaneous',
  'general expense': 'Miscellaneous',
  contingency: 'Miscellaneous',
  office: 'Miscellaneous',
  hospitality: 'Miscellaneous',
  bank: 'Miscellaneous',
};

// Keyword patterns for inferring category and subcategory from Title/Description/Payee
const KEYWORD_INFERENCE_RULES: {
  category: string;
  keywords: string[];
  subCategories?: { sub: string; keywords: string[] }[];
}[] = [
  {
    category: 'Staff Salaries',
    keywords: [
      'salary',
      'salaries',
      'payroll',
      'wage',
      'wages',
      'stipend',
      'remuneration',
      'compensation',
      'faculty pay',
      'honorarium',
      'staff disburse',
    ],
    subCategories: [
      { sub: 'Teaching Faculty', keywords: ['teacher', 'faculty', 'professor', 'tutor', 'instructor', 'educator', 'lecturer'] },
      { sub: 'Administrative Staff', keywords: ['admin', 'registrar', 'clerk', 'accountant', 'bursar', 'office staff', 'manager'] },
      { sub: 'Security & Safety', keywords: ['security', 'guard', 'watchman', 'patrol', 'surveillance'] },
      { sub: 'Custodial & Janitorial', keywords: ['janitor', 'cleaning', 'cleaner', 'custodian', 'sweeper', 'maid'] },
      { sub: 'Contract Specialists', keywords: ['specialist', 'coach', 'counselor', 'contractor', 'consultant'] },
    ],
  },
  {
    category: 'Utilities (Electricity/Water)',
    keywords: [
      'electricity',
      'electric',
      'power bill',
      'water bill',
      'broadband',
      'internet',
      'wifi',
      'natural gas',
      'utility',
      'sewer',
      'sewage',
      'kwh',
      'generator fuel',
      'waste disposal',
    ],
    subCategories: [
      { sub: 'Electricity Grid', keywords: ['electricity', 'electric', 'power', 'kwh', 'substation', 'transformer', 'grid'] },
      { sub: 'Municipal Water', keywords: ['water', 'meter', 'hydrant', 'pipeline water', 'municipal water'] },
      { sub: 'High-Speed Internet / Fiber', keywords: ['internet', 'wifi', 'broadband', 'fiber', 'isp', 'router connectivity'] },
      { sub: 'Heating & Natural Gas', keywords: ['gas', 'heating', 'natural gas', 'boiler', 'propane', 'cylinder'] },
      { sub: 'Waste & Recycling Disposal', keywords: ['waste', 'recycling', 'garbage', 'trash', 'dumpster', 'sanitation'] },
    ],
  },
  {
    category: 'Building Maintenance',
    keywords: [
      'maintenance',
      'repair',
      'repairs',
      'plumbing',
      'carpentry',
      'masonry',
      'renovation',
      'leak',
      'roofing',
      'whitewash',
      'hvac',
      'ac service',
      'locksmith',
      'glazier',
      'window glass',
      'door repair',
      'pest control',
    ],
    subCategories: [
      { sub: 'HVAC & Air Conditioning', keywords: ['hvac', 'ac', 'air conditioning', 'cooling', 'chiller', 'freon'] },
      { sub: 'Electrical Repairs', keywords: ['wiring', 'breaker', 'fuse', 'switchboard', 'lighting repair', 'bulb replacement'] },
      { sub: 'Plumbing & Drainage', keywords: ['plumbing', 'pipe', 'leak', 'drain', 'faucet', 'tap', 'flush', 'sink', 'sewerage'] },
      { sub: 'Roofing & Structural', keywords: ['roof', 'ceiling', 'waterproofing', 'concrete', 'crack', 'structure', 'wall repair'] },
      { sub: 'Painting & Renovation', keywords: ['paint', 'whitewash', 'distemper', 'primer', 'renovation', 'refurbish'] },
      { sub: 'Classroom Furniture Repairs', keywords: ['desk', 'chair', 'bench', 'table', 'furniture', 'whiteboard mount'] },
    ],
  },
  {
    category: 'Educational Supplies',
    keywords: [
      'stationery',
      'textbook',
      'textbooks',
      'workbook',
      'notebook',
      'paper ream',
      'chalk',
      'duster',
      'marker',
      'pen',
      'pencil',
      'library book',
      'curriculum',
      'craft paper',
      'educational supply',
    ],
    subCategories: [
      { sub: 'Textbooks & Workbooks', keywords: ['textbook', 'workbook', 'syllabus', 'course book', 'curriculum book'] },
      { sub: 'Classroom Stationery', keywords: ['stationery', 'paper ream', 'chalk', 'duster', 'marker', 'pen', 'stapler'] },
      { sub: 'Art & Craft Materials', keywords: ['art', 'craft', 'clay', 'canvas', 'poster paint', 'brush', 'drawing sheet'] },
      { sub: 'Library Volumes & Periodicals', keywords: ['library', 'journal', 'magazine', 'periodical', 'encyclopedia', 'novel'] },
      { sub: 'Printing Paper & Ink Cartridges', keywords: ['a4 paper', 'photocopy paper', 'ream', 'toner', 'ink cartridge', 'master roll'] },
    ],
  },
  {
    category: 'IT & Software',
    keywords: [
      'software',
      'cloud',
      'hosting',
      'aws',
      'google workspace',
      'microsoft 365',
      'zoom',
      'saas',
      'domain',
      'antivirus',
      'firewall',
      'computer lab',
      'laptop',
      'desktop',
      'server',
      'smartboard',
      'projector',
      'cctv',
      'lms license',
    ],
    subCategories: [
      { sub: 'Cloud Hosting & Infrastructure', keywords: ['cloud', 'aws', 'azure', 'hosting', 'server', 'vps', 'domain renewal'] },
      { sub: 'LMS & SaaS Licenses', keywords: ['lms', 'saas', 'license', 'subscription', 'google workspace', 'zoom', 'moodle'] },
      { sub: 'Computer Lab Hardware', keywords: ['computer', 'pc', 'monitor', 'keyboard', 'mouse', 'ram', 'ssd', 'desktop'] },
      { sub: 'Interactive Smartboards', keywords: ['smartboard', 'interactive display', 'projector', 'stylus', 'touch screen'] },
      { sub: 'Antivirus & Cyber Security', keywords: ['antivirus', 'firewall', 'security certificate', 'ssl', 'backup drive'] },
    ],
  },
  {
    category: 'Transport & Fuel',
    keywords: [
      'fuel',
      'diesel',
      'petrol',
      'bus',
      'van',
      'fleet',
      'vehicle',
      'driver overtime',
      'tire',
      'tyre',
      'toll tax',
      'transport',
      'commute',
      'oil change',
    ],
    subCategories: [
      { sub: 'Bus Fleet Fuel / Diesel', keywords: ['diesel', 'fuel', 'petrol', 'gas station', 'refuel', 'fleet fuel'] },
      { sub: 'Vehicle Servicing & MOT', keywords: ['servicing', 'oil change', 'engine', 'brake', 'clutch', 'tire', 'tyre', 'mot inspection'] },
      { sub: 'Driver Allowances & Overtime', keywords: ['driver allowance', 'conductor', 'driver overtime', 'night shift driver'] },
      { sub: 'Tolls & Parking Permits', keywords: ['toll', 'parking permit', 'fastag', 'highway toll'] },
      { sub: 'Fleet Insurance & Road Tax', keywords: ['bus insurance', 'vehicle tax', 'road permit', 'fitness certificate'] },
    ],
  },
  {
    category: 'Lab & Sports Equipment',
    keywords: [
      'lab',
      'laboratory',
      'reagent',
      'chemical',
      'microscope',
      'physics apparatus',
      'chemistry kit',
      'biology specimen',
      'sports gear',
      'football',
      'basketball',
      'cricket',
      'badminton',
      'athletics',
      'gym equipment',
      'first aid kit',
    ],
    subCategories: [
      { sub: 'Chemistry Lab Reagents', keywords: ['chemical', 'reagent', 'acid', 'base', 'test tube', 'bunsen', 'pipette', 'beaker'] },
      { sub: 'Physics & Bio Apparatus', keywords: ['microscope', 'lens', 'prism', 'magnet', 'skeleton', 'specimen', 'vernier'] },
      { sub: 'Athletic & Track Gear', keywords: ['track', 'hurdle', 'relay baton', 'stopwatch', 'high jump', 'starting block'] },
      { sub: 'Football & Basketball Kits', keywords: ['football', 'basketball', 'volleyball', 'ball', 'net', 'jersey', 'goal post'] },
      { sub: 'First Aid & Athletic Safety', keywords: ['first aid', 'bandage', 'antiseptic', 'stretcher', 'ice pack', 'splint'] },
    ],
  },
  {
    category: 'Marketing & Advertising',
    keywords: [
      'marketing',
      'advertising',
      'ad campaign',
      'billboard',
      'brochure',
      'prospectus printing',
      'social media ad',
      'facebook ad',
      'google ad',
      'flyer distribution',
      'newspaper notice',
      'open house banner',
      'admission drive',
    ],
    subCategories: [
      { sub: 'Social Media Ads & Campaigns', keywords: ['facebook ad', 'instagram', 'social media', 'google ads', 'meta ads', 'digital campaign'] },
      { sub: 'Admissions Billboard & Signage', keywords: ['billboard', 'hoarding', 'flex banner', 'outdoor signage', 'street banner'] },
      { sub: 'Prospectus & Brochure Printing', keywords: ['prospectus', 'brochure', 'pamphlet', 'leaflet', 'admission folder'] },
      { sub: 'Open House & School Fair Promotion', keywords: ['open house', 'school fair', 'orientation banner', 'admission stall'] },
    ],
  },
  {
    category: 'Exam & Events',
    keywords: [
      'exam',
      'examination',
      'question paper',
      'answer sheet',
      'sports day',
      'annual day',
      'graduation',
      'convocation',
      'science fair',
      'ceremony',
      'auditorium sound',
      'stage decoration',
      'chief guest',
      'trophy printing',
    ],
    subCategories: [
      { sub: 'Term Exam Printing & Stationery', keywords: ['question paper', 'answer sheet', 'invigilator', 'exam printing', 'hall ticket'] },
      { sub: 'Annual Sports Day Logistics', keywords: ['sports day', 'tent', 'sound system', 'ground marking', 'refreshment sports'] },
      { sub: 'Graduation Ceremony & Stage', keywords: ['graduation', 'convocation', 'gown', 'hood', 'stage lighting', 'diploma certificate'] },
      { sub: 'Science Fair & Exhibition', keywords: ['science fair', 'exhibition booth', 'project board', 'exhibit table'] },
      { sub: 'Guest Speaker Honoraria', keywords: ['speaker', 'guest lecture', 'honorarium', 'memento', 'bouquet'] },
    ],
  },
  {
    category: 'Miscellaneous',
    keywords: [
      'miscellaneous',
      'misc',
      'refreshments',
      'tea coffee',
      'hospitality',
      'bank charges',
      'wire transfer fee',
      'notary',
      'legal retainer',
      'audit retainer',
      'courier postage',
      'contingency',
      'petty cash',
    ],
    subCategories: [
      { sub: 'Bank & Card Processing Fees', keywords: ['bank charge', 'transfer fee', 'merchant fee', 'transaction charge', 'card fee'] },
      { sub: 'Staff Hospitality & Refreshments', keywords: ['tea', 'coffee', 'refreshment', 'staff room snack', 'lunch meeting'] },
      { sub: 'Audit, Legal & Tax Retainers', keywords: ['audit fee', 'lawyer', 'legal fee', 'retainer', 'tax consultant'] },
      { sub: 'Emergency Repairs & Contingency', keywords: ['emergency', 'contingency', 'urgent petty', 'unforeseen'] },
      { sub: 'Courier & Postal Charges', keywords: ['courier', 'postage', 'stamp', 'dhl', 'fedex', 'registered post'] },
    ],
  },
];

/**
 * Automatically maps a raw CSV category string or infers category & subcategory from title/notes.
 */
export function autoMapExpenseCategory(
  rawCategory: string = '',
  title: string = '',
  notes: string = '',
  taxonomy?: ExpenseTaxonomyConfig
): CategoryMappingRule {
  const tax = taxonomy || getStoredTaxonomy();
  const validSystemCategories = tax.categories.map(c => c.name);

  const cleanRaw = rawCategory.trim().toLowerCase();
  const combinedText = `${cleanRaw} ${title.trim().toLowerCase()} ${notes.trim().toLowerCase()}`;

  // 1. Direct match with system categories
  if (cleanRaw) {
    const directMatch = validSystemCategories.find(
      c => c.toLowerCase() === cleanRaw
    );
    if (directMatch) {
      // Find possible subcategory in combined text
      const sub = inferSubCategory(directMatch, combinedText, tax);
      return {
        targetCategory: directMatch,
        targetSubCategory: sub,
        confidence: 'high',
        matchedTerm: cleanRaw,
        matchType: 'direct',
      };
    }

    // 2. Direct match via aliases map
    if (CATEGORY_ALIASES[cleanRaw]) {
      const aliasTarget = CATEGORY_ALIASES[cleanRaw];
      const verified = validSystemCategories.includes(aliasTarget)
        ? aliasTarget
        : validSystemCategories[0];
      const sub = inferSubCategory(verified, combinedText, tax);
      return {
        targetCategory: verified,
        targetSubCategory: sub,
        confidence: 'high',
        matchedTerm: cleanRaw,
        matchType: 'synonym',
      };
    }

    // 3. Partial / contains match in aliases
    for (const [alias, canonical] of Object.entries(CATEGORY_ALIASES)) {
      if (cleanRaw.includes(alias) || alias.includes(cleanRaw)) {
        const verified = validSystemCategories.includes(canonical)
          ? canonical
          : validSystemCategories[0];
        const sub = inferSubCategory(verified, combinedText, tax);
        return {
          targetCategory: verified,
          targetSubCategory: sub,
          confidence: 'high',
          matchedTerm: alias,
          matchType: 'synonym',
        };
      }
    }
  }

  // 4. Keyword inference from combined text (Title + Description + Notes)
  for (const rule of KEYWORD_INFERENCE_RULES) {
    const matched = rule.keywords.find(kw => combinedText.includes(kw));
    if (matched) {
      const canonical = validSystemCategories.includes(rule.category)
        ? rule.category
        : validSystemCategories.find(c => c.toLowerCase().includes(rule.category.toLowerCase().slice(0, 5))) ||
          validSystemCategories[0];

      // Check subcategory within this rule
      let subCategory: string | undefined;
      if (rule.subCategories) {
        for (const sc of rule.subCategories) {
          if (sc.keywords.some(k => combinedText.includes(k))) {
            subCategory = sc.sub;
            break;
          }
        }
      }

      return {
        targetCategory: canonical,
        targetSubCategory: subCategory,
        confidence: 'medium',
        matchedTerm: matched,
        matchType: 'content-inference',
      };
    }
  }

  // 5. Fallback to Miscellaneous
  const fallbackCat = validSystemCategories.find(c => c.toLowerCase().includes('misc')) ||
    validSystemCategories[validSystemCategories.length - 1] ||
    'Miscellaneous';

  return {
    targetCategory: fallbackCat,
    confidence: 'low',
    matchedTerm: 'none',
    matchType: 'fallback',
  };
}

/**
 * Infer subcategory for a given category based on text content
 */
function inferSubCategory(
  categoryName: string,
  text: string,
  taxonomy: ExpenseTaxonomyConfig
): string | undefined {
  const cat = taxonomy.categories.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (!cat || !cat.subCategories || cat.subCategories.length === 0) return undefined;

  // Direct subcategory name match
  for (const sc of cat.subCategories) {
    if (text.includes(sc.toLowerCase())) {
      return sc;
    }
  }

  // Keyword rule lookup for this category
  const rule = KEYWORD_INFERENCE_RULES.find(
    r => r.category.toLowerCase() === categoryName.toLowerCase()
  );
  if (rule?.subCategories) {
    for (const sc of rule.subCategories) {
      if (sc.keywords.some(k => text.includes(k))) {
        // Find if this sub exists in user's category
        const exact = cat.subCategories.find(s => s.toLowerCase() === sc.sub.toLowerCase());
        return exact || sc.sub;
      }
    }
  }

  return undefined;
}

/**
 * Aggregates unique CSV categories found across rows with their auto-mapped target categories
 */
export function analyzeCsvCategories(
  rows: { rawCategory: string; title: string; notes?: string }[],
  taxonomy?: ExpenseTaxonomyConfig
): UniqueCategoryMapping[] {
  const tax = taxonomy || getStoredTaxonomy();
  const map = new Map<string, { count: number; autoRule: CategoryMappingRule; sampleTitle: string }>();

  for (const r of rows) {
    const key = r.rawCategory.trim() || `(Empty / Inferred from Title)`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      const autoRule = autoMapExpenseCategory(r.rawCategory, r.title, r.notes || '', tax);
      map.set(key, { count: 1, autoRule, sampleTitle: r.title });
    }
  }

  return Array.from(map.entries()).map(([rawCsvCategory, data]) => ({
    rawCsvCategory,
    targetCategory: data.autoRule.targetCategory,
    targetSubCategory: data.autoRule.targetSubCategory,
    count: data.count,
    confidence: data.autoRule.confidence,
    source: rawCsvCategory.startsWith('(Empty') ? 'inferred-from-title' : 'csv-column',
  }));
}
