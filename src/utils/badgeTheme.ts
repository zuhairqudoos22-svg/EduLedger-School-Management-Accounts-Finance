/**
 * EduLedger - Attendance QR Code & ID Badge Color Theme Utilities
 * Provides coordinated color palettes, custom brand color generation,
 * and jsPDF / HTML styling integration for printable student & faculty badges.
 */

export type BadgeThemeKey =
  | 'navy'
  | 'indigo'
  | 'emerald'
  | 'crimson'
  | 'purple'
  | 'teal'
  | 'amber'
  | 'slate'
  | 'black'
  | 'custom';

export interface BadgeThemeConfig {
  id: BadgeThemeKey;
  name: string;
  primaryHex: string;         // Header background, attendee name, photo frame, ID pill
  primaryDarkHex: string;     // Base gradient & darker accents
  accentHex: string;          // Gold / highlight wave, school subtitle, ESTD badge border
  secondaryHex: string;       // Secondary decorative background wave
  bannerGradient: string;     // Tailwind gradient representation
  accentText: string;         // Tailwind text color
  accentBorder: string;       // Tailwind border color
  badgeTagBg: string;         // Tailwind tag style
}

export const BADGE_THEMES: Record<Exclude<BadgeThemeKey, 'custom'>, BadgeThemeConfig> = {
  navy: {
    id: 'navy',
    name: 'Royal Navy (Classic)',
    primaryHex: '#0A2E63',
    primaryDarkHex: '#071E42',
    accentHex: '#F2C037',
    secondaryHex: '#85C3FA',
    bannerGradient: 'from-[#103D82] to-[#0A2E63]',
    accentText: 'text-blue-600 dark:text-blue-400',
    accentBorder: 'border-blue-500',
    badgeTagBg: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  },
  indigo: {
    id: 'indigo',
    name: 'EduLedger Indigo',
    primaryHex: '#4338CA',
    primaryDarkHex: '#312E81',
    accentHex: '#FBBF24',
    secondaryHex: '#A5B4FC',
    bannerGradient: 'from-indigo-600 to-indigo-950',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    accentBorder: 'border-indigo-500',
    badgeTagBg: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Campus',
    primaryHex: '#047857',
    primaryDarkHex: '#064E3B',
    accentHex: '#F59E0B',
    secondaryHex: '#6EE7B7',
    bannerGradient: 'from-emerald-600 to-teal-950',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    accentBorder: 'border-emerald-500',
    badgeTagBg: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300',
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Academy',
    primaryHex: '#9F1239',
    primaryDarkHex: '#4C0519',
    accentHex: '#FACC15',
    secondaryHex: '#FDA4AF',
    bannerGradient: 'from-rose-600 to-rose-950',
    accentText: 'text-rose-600 dark:text-rose-400',
    accentBorder: 'border-rose-500',
    badgeTagBg: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300',
  },
  purple: {
    id: 'purple',
    name: 'Regal Purple',
    primaryHex: '#6B21A8',
    primaryDarkHex: '#3B0764',
    accentHex: '#FBBF24',
    secondaryHex: '#D8B4FE',
    bannerGradient: 'from-purple-600 to-purple-950',
    accentText: 'text-purple-600 dark:text-purple-400',
    accentBorder: 'border-purple-500',
    badgeTagBg: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
  },
  teal: {
    id: 'teal',
    name: 'Ocean Teal',
    primaryHex: '#0F766E',
    primaryDarkHex: '#134E4A',
    accentHex: '#F59E0B',
    secondaryHex: '#5EEAD4',
    bannerGradient: 'from-teal-600 to-teal-950',
    accentText: 'text-teal-600 dark:text-teal-400',
    accentBorder: 'border-teal-500',
    badgeTagBg: 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300',
  },
  amber: {
    id: 'amber',
    name: 'Golden Amber',
    primaryHex: '#9A3412',
    primaryDarkHex: '#431407',
    accentHex: '#FDE047',
    secondaryHex: '#FDBA74',
    bannerGradient: 'from-amber-600 to-orange-950',
    accentText: 'text-amber-600 dark:text-amber-400',
    accentBorder: 'border-amber-500',
    badgeTagBg: 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
  },
  slate: {
    id: 'slate',
    name: 'Executive Slate',
    primaryHex: '#334155',
    primaryDarkHex: '#0F172A',
    accentHex: '#38BDF8',
    secondaryHex: '#94A3B8',
    bannerGradient: 'from-slate-700 to-slate-950',
    accentText: 'text-slate-700 dark:text-slate-300',
    accentBorder: 'border-slate-600',
    badgeTagBg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
  },
  black: {
    id: 'black',
    name: 'Black & Gold',
    primaryHex: '#18181B',
    primaryDarkHex: '#09090B',
    accentHex: '#EAB308',
    secondaryHex: '#71717A',
    bannerGradient: 'from-zinc-800 to-black',
    accentText: 'text-zinc-800 dark:text-zinc-200',
    accentBorder: 'border-zinc-700',
    badgeTagBg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
  },
};

/**
 * Converts a hex color string into [r, g, b] array
 */
export function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  if (isNaN(intVal)) return [10, 46, 99];
  const r = (intVal >> 16) & 255;
  const g = (intVal >> 8) & 255;
  const b = intVal & 255;
  return [r, g, b];
}

/**
 * Adjusts brightness of a hex color by factor (-1 to +1)
 */
function adjustBrightness(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adjust = (c: number) => {
    if (factor > 0) {
      return Math.min(255, Math.round(c + (255 - c) * factor));
    }
    return Math.max(0, Math.round(c * (1 + factor)));
  };
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * Creates a complete harmonious badge theme configuration from any custom primary color
 */
export function createCustomBadgeTheme(primaryHex: string, name = 'Custom School Theme'): BadgeThemeConfig {
  const validHex = primaryHex.startsWith('#') ? primaryHex : `#${primaryHex}`;
  const darkHex = adjustBrightness(validHex, -0.45);
  const lightHex = adjustBrightness(validHex, 0.55);

  return {
    id: 'custom',
    name,
    primaryHex: validHex,
    primaryDarkHex: darkHex,
    accentHex: '#F2C037', // Gold highlight
    secondaryHex: lightHex,
    bannerGradient: 'from-slate-800 to-slate-950',
    accentText: 'text-slate-700 dark:text-slate-300',
    accentBorder: 'border-slate-500',
    badgeTagBg: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
  };
}

/**
 * Resolves the active theme configuration given a theme key and optional custom hex
 */
export function resolveBadgeTheme(themeKey: BadgeThemeKey, customColor?: string): BadgeThemeConfig {
  if (themeKey === 'custom' && customColor) {
    return createCustomBadgeTheme(customColor, 'Custom Color');
  }
  if (themeKey in BADGE_THEMES) {
    return BADGE_THEMES[themeKey as Exclude<BadgeThemeKey, 'custom'>];
  }
  return BADGE_THEMES.navy;
}

const STORAGE_KEY_THEME = 'eduledger_badge_color_theme';
const STORAGE_KEY_CUSTOM_HEX = 'eduledger_badge_custom_hex';

/**
 * Retrieve saved badge theme preference from localStorage
 */
export function getStoredBadgeTheme(): { theme: BadgeThemeKey; customColor: string } {
  if (typeof window === 'undefined') {
    return { theme: 'navy', customColor: '#0A2E63' };
  }
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) as BadgeThemeKey | null;
    const customHex = localStorage.getItem(STORAGE_KEY_CUSTOM_HEX) || '#0A2E63';
    if (savedTheme && (savedTheme === 'custom' || savedTheme in BADGE_THEMES)) {
      return { theme: savedTheme, customColor: customHex };
    }
  } catch {
    // fallback
  }
  return { theme: 'navy', customColor: '#0A2E63' };
}

/**
 * Persist badge theme preference to localStorage
 */
export function saveStoredBadgeTheme(theme: BadgeThemeKey, customColor?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (customColor) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_HEX, customColor);
    }
  } catch {
    // Ignore storage errors in private browsing
  }
}
