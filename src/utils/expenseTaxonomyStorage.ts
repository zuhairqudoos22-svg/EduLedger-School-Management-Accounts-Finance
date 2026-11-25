import { CustomExpenseCategory, CustomExpenseTag, ExpenseTaxonomyConfig } from '../types';

export const TAXONOMY_STORAGE_KEY = 'eduledger_expense_taxonomy';

export const DEFAULT_EXPENSE_CATEGORIES: CustomExpenseCategory[] = [
  {
    id: 'cat-salaries',
    name: 'Staff Salaries',
    color: '#6366F1', // Indigo
    subCategories: [
      'Teaching Faculty',
      'Administrative Staff',
      'Security & Safety',
      'Custodial & Janitorial',
      'Contract Specialists',
    ],
    description: 'Faculty, administrative, and operations personnel compensation and disbursements.',
    isDefault: true,
  },
  {
    id: 'cat-utilities',
    name: 'Utilities (Electricity/Water)',
    color: '#0EA5E9', // Sky blue
    subCategories: [
      'Electricity Grid',
      'Municipal Water',
      'High-Speed Internet / Fiber',
      'Heating & Natural Gas',
      'Waste & Recycling Disposal',
    ],
    description: 'Essential municipal services, power, connectivity, and environmental management.',
    isDefault: true,
  },
  {
    id: 'cat-maintenance',
    name: 'Building Maintenance',
    color: '#F59E0B', // Amber
    subCategories: [
      'HVAC & Air Conditioning',
      'Electrical Repairs',
      'Plumbing & Drainage',
      'Roofing & Structural',
      'Painting & Renovation',
      'Classroom Furniture Repairs',
    ],
    description: 'Civil works, campus facility upkeep, fixtures, and structural preservation.',
    isDefault: true,
  },
  {
    id: 'cat-supplies',
    name: 'Educational Supplies',
    color: '#10B981', // Emerald
    subCategories: [
      'Textbooks & Workbooks',
      'Classroom Stationery',
      'Art & Craft Materials',
      'Library Volumes & Periodicals',
      'Printing Paper & Ink Cartridges',
    ],
    description: 'Academic resources, learning kits, library acquisitions, and instructional material.',
    isDefault: true,
  },
  {
    id: 'cat-it',
    name: 'IT & Software',
    color: '#8B5CF6', // Purple
    subCategories: [
      'Cloud Hosting & Infrastructure',
      'LMS & SaaS Licenses',
      'Computer Lab Hardware',
      'Network Hardware & Switches',
      'Interactive Smartboards',
      'Antivirus & Cyber Security',
    ],
    description: 'Digital campus systems, server infrastructure, software licenses, and classroom tech.',
    isDefault: true,
  },
  {
    id: 'cat-transport',
    name: 'Transport & Fuel',
    color: '#EC4899', // Pink
    subCategories: [
      'Bus Fleet Fuel / Diesel',
      'Vehicle Servicing & MOT',
      'Driver Allowances & Overtime',
      'Tolls & Parking Permits',
      'Fleet Insurance & Road Tax',
    ],
    description: 'Student transport, school buses, fleet maintenance, and transportation logistics.',
    isDefault: true,
  },
  {
    id: 'cat-lab-sports',
    name: 'Lab & Sports Equipment',
    color: '#14B8A6', // Teal
    subCategories: [
      'Chemistry Lab Reagents',
      'Physics & Bio Apparatus',
      'Athletic & Track Gear',
      'Football & Basketball Kits',
      'First Aid & Athletic Safety',
    ],
    description: 'Science laboratory apparatus, chemicals, gym equipment, and sports uniforms.',
    isDefault: true,
  },
  {
    id: 'cat-marketing',
    name: 'Marketing & Advertising',
    color: '#F97316', // Orange
    subCategories: [
      'Social Media Ads & Campaigns',
      'Admissions Billboard & Signage',
      'Prospectus & Brochure Printing',
      'Local Newspaper Announcements',
      'Open House & School Fair Promotion',
    ],
    description: 'Student enrollment drives, branding, digital media campaigns, and public relations.',
    isDefault: true,
  },
  {
    id: 'cat-events',
    name: 'Exam & Events',
    color: '#3B82F6', // Blue
    subCategories: [
      'Term Exam Printing & Stationery',
      'Annual Sports Day Logistics',
      'Graduation Ceremony & Stage',
      'Science Fair & Exhibition',
      'Guest Speaker Honoraria',
    ],
    description: 'Standardized testing logistics, school celebrations, ceremonies, and workshops.',
    isDefault: true,
  },
  {
    id: 'cat-misc',
    name: 'Miscellaneous',
    color: '#64748B', // Slate
    subCategories: [
      'Bank & Card Processing Fees',
      'Staff Hospitality & Refreshments',
      'Audit, Legal & Tax Retainers',
      'Emergency Repairs & Contingency',
      'Courier & Postal Charges',
    ],
    description: 'Incidental expenditures, legal compliance, hospitality, and unclassified items.',
    isDefault: true,
  },
];

export const DEFAULT_EXPENSE_TAGS: CustomExpenseTag[] = [
  {
    id: 'tag-urgent',
    name: 'Urgent',
    color: '#EF4444', // Red
    description: 'Requires immediate financial clearance or emergency dispatch.',
  },
  {
    id: 'tag-reimbursable',
    name: 'Reimbursable',
    color: '#3B82F6', // Blue
    description: 'Out-of-pocket payment by staff member eligible for institutional reimbursement.',
  },
  {
    id: 'tag-tax-deductible',
    name: 'Tax-Deductible',
    color: '#10B981', // Emerald
    description: 'Qualifies for non-profit educational tax exemption or deduction schedule.',
  },
  {
    id: 'tag-audit-flagged',
    name: 'Audit-Flagged',
    color: '#F59E0B', // Amber
    description: 'Flagged for internal compliance review or external statutory audit.',
  },
  {
    id: 'tag-grant-funded',
    name: 'Grant-Funded',
    color: '#8B5CF6', // Purple
    description: 'Covered under specialized government or philanthropic grant funding.',
  },
  {
    id: 'tag-board-approved',
    name: 'Board-Approved',
    color: '#14B8A6', // Teal
    description: 'Major capital or operational expenditure sanctioned by school board.',
  },
  {
    id: 'tag-recurring-sched',
    name: 'Recurring-Scheduled',
    color: '#6366F1', // Indigo
    description: 'Automated contractual recurring disbursement (monthly/quarterly).',
  },
  {
    id: 'tag-emergency-repair',
    name: 'Emergency-Repair',
    color: '#EC4899', // Pink
    description: 'Unplanned breakdown repair vital to campus operation or safety.',
  },
];

export const PRESET_COLOR_SWATCHES = [
  '#6366F1', // Indigo
  '#0EA5E9', // Sky blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#3B82F6', // Blue
  '#64748B', // Slate
  '#84CC16', // Lime
];

/**
 * Retrieve saved expense taxonomies (categories, sub-categories, and tags) from localStorage
 */
export function getStoredTaxonomy(): ExpenseTaxonomyConfig {
  try {
    const raw = localStorage.getItem(TAXONOMY_STORAGE_KEY);
    if (!raw) {
      const initial: ExpenseTaxonomyConfig = {
        categories: DEFAULT_EXPENSE_CATEGORIES,
        tags: DEFAULT_EXPENSE_TAGS,
      };
      saveStoredTaxonomy(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : DEFAULT_EXPENSE_CATEGORIES,
      tags: Array.isArray(parsed.tags) && parsed.tags.length > 0
        ? parsed.tags
        : DEFAULT_EXPENSE_TAGS,
    };
  } catch (err) {
    console.error('Failed to parse stored expense taxonomy, falling back to defaults:', err);
    return {
      categories: DEFAULT_EXPENSE_CATEGORIES,
      tags: DEFAULT_EXPENSE_TAGS,
    };
  }
}

/**
 * Persist expense taxonomies to localStorage and trigger storage sync event
 */
export function saveStoredTaxonomy(config: ExpenseTaxonomyConfig): void {
  try {
    localStorage.setItem(TAXONOMY_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('eduledger:taxonomy-updated', { detail: config }));
  } catch (err) {
    console.error('Failed to write expense taxonomy to localStorage:', err);
  }
}

/**
 * Add a new custom category
 */
export function addCategory(
  category: Omit<CustomExpenseCategory, 'id'>
): { config: ExpenseTaxonomyConfig; created: CustomExpenseCategory } {
  const current = getStoredTaxonomy();
  const id = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const created: CustomExpenseCategory = {
    ...category,
    id,
    subCategories: Array.isArray(category.subCategories) ? category.subCategories : [],
    isDefault: false,
  };
  const updatedCategories = [...current.categories, created];
  const newConfig = { ...current, categories: updatedCategories };
  saveStoredTaxonomy(newConfig);
  return { config: newConfig, created };
}

/**
 * Update an existing category
 */
export function updateCategory(
  id: string,
  updates: Partial<CustomExpenseCategory>
): ExpenseTaxonomyConfig {
  const current = getStoredTaxonomy();
  const updatedCategories = current.categories.map(c => (c.id === id ? { ...c, ...updates } : c));
  const newConfig = { ...current, categories: updatedCategories };
  saveStoredTaxonomy(newConfig);
  return newConfig;
}

/**
 * Delete a custom category (prevent deleting default if required, or allow deletion)
 */
export function deleteCategory(id: string): ExpenseTaxonomyConfig {
  const current = getStoredTaxonomy();
  const updatedCategories = current.categories.filter(c => c.id !== id);
  const newConfig = { ...current, categories: updatedCategories };
  saveStoredTaxonomy(newConfig);
  return newConfig;
}

/**
 * Add a subcategory to a category
 */
export function addSubCategory(categoryId: string, subCategoryName: string): ExpenseTaxonomyConfig {
  const trimmed = subCategoryName.trim();
  if (!trimmed) return getStoredTaxonomy();

  const current = getStoredTaxonomy();
  const updatedCategories = current.categories.map(c => {
    if (c.id === categoryId) {
      const exists = c.subCategories.some(s => s.toLowerCase() === trimmed.toLowerCase());
      if (exists) return c;
      return {
        ...c,
        subCategories: [...c.subCategories, trimmed],
      };
    }
    return c;
  });

  const newConfig = { ...current, categories: updatedCategories };
  saveStoredTaxonomy(newConfig);
  return newConfig;
}

/**
 * Remove a subcategory from a category
 */
export function removeSubCategory(
  categoryId: string,
  subCategoryName: string
): ExpenseTaxonomyConfig {
  const current = getStoredTaxonomy();
  const updatedCategories = current.categories.map(c => {
    if (c.id === categoryId) {
      return {
        ...c,
        subCategories: c.subCategories.filter(s => s !== subCategoryName),
      };
    }
    return c;
  });

  const newConfig = { ...current, categories: updatedCategories };
  saveStoredTaxonomy(newConfig);
  return newConfig;
}

/**
 * Add a new custom tag
 */
export function addTag(
  tag: Omit<CustomExpenseTag, 'id'>
): { config: ExpenseTaxonomyConfig; created: CustomExpenseTag } {
  const current = getStoredTaxonomy();
  const id = `tag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const created: CustomExpenseTag = {
    ...tag,
    id,
  };
  const updatedTags = [...current.tags, created];
  const newConfig = { ...current, tags: updatedTags };
  saveStoredTaxonomy(newConfig);
  return { config: newConfig, created };
}

/**
 * Update an existing tag
 */
export function updateTag(id: string, updates: Partial<CustomExpenseTag>): ExpenseTaxonomyConfig {
  const current = getStoredTaxonomy();
  const updatedTags = current.tags.map(t => (t.id === id ? { ...t, ...updates } : t));
  const newConfig = { ...current, tags: updatedTags };
  saveStoredTaxonomy(newConfig);
  return newConfig;
}

/**
 * Delete a tag
 */
export function deleteTag(id: string): ExpenseTaxonomyConfig {
  const current = getStoredTaxonomy();
  const updatedTags = current.tags.filter(t => t.id !== id);
  const newConfig = { ...current, tags: updatedTags };
  saveStoredTaxonomy(newConfig);
  return newConfig;
}

/**
 * Reset all taxonomies to standard defaults
 */
export function resetTaxonomyToDefaults(): ExpenseTaxonomyConfig {
  const defaults: ExpenseTaxonomyConfig = {
    categories: DEFAULT_EXPENSE_CATEGORIES,
    tags: DEFAULT_EXPENSE_TAGS,
  };
  saveStoredTaxonomy(defaults);
  return defaults;
}

/**
 * Resolve display color for category
 */
export function getCategoryColor(
  categoryName: string,
  taxonomy?: ExpenseTaxonomyConfig
): string {
  const config = taxonomy || getStoredTaxonomy();
  const match = config.categories.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (match?.color) return match.color;

  // Stable hash color generation if not matched
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_COLOR_SWATCHES.length;
  return PRESET_COLOR_SWATCHES[index];
}

/**
 * Resolve display color for a tag
 */
export function getTagColor(
  tagName: string,
  taxonomy?: ExpenseTaxonomyConfig
): string {
  const config = taxonomy || getStoredTaxonomy();
  const match = config.tags.find(
    t => t.name.toLowerCase() === tagName.toLowerCase()
  );
  if (match?.color) return match.color;

  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PRESET_COLOR_SWATCHES.length;
  return PRESET_COLOR_SWATCHES[index];
}

/**
 * Find subcategories for a given category name
 */
export function getSubCategoriesForCategory(
  categoryName: string,
  taxonomy?: ExpenseTaxonomyConfig
): string[] {
  const config = taxonomy || getStoredTaxonomy();
  const match = config.categories.find(
    c => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  return match?.subCategories || [];
}
