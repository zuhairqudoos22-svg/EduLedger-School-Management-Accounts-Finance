import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// Import all 15 locale JSON files
import en from './en.json';
import ur from './ur.json';
import hi from './hi.json';
import ar from './ar.json';
import ta from './ta.json';
import te from './te.json';
import kn from './kn.json';
import ml from './ml.json';
import bn from './bn.json';
import fr from './fr.json';
import es from './es.json';
import pt from './pt.json';
import ru from './ru.json';
import sw from './sw.json';
import ha from './ha.json';

export type SupportedLanguage =
  | 'en'
  | 'ur'
  | 'hi'
  | 'ar'
  | 'ta'
  | 'te'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'fr'
  | 'es'
  | 'pt'
  | 'ru'
  | 'sw'
  | 'ha';

export type Direction = 'ltr' | 'rtl';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  dir: Direction;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr', flag: '🇬🇧' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl', flag: '🇵🇰' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr', flag: '🇮🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl', flag: '🇸🇦' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', dir: 'ltr', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', dir: 'ltr', flag: '🇮🇳' },
  { code: 'bn', name: 'Bangla', nativeName: 'বাংলা', dir: 'ltr', flag: '🇧🇩' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr', flag: '🇪🇸' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr', flag: '🇷🇺' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', dir: 'ltr', flag: '🇰🇪' },
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', dir: 'ltr', flag: '🇳🇬' },
];

export const RTL_LANGUAGES: SupportedLanguage[] = ['ur', 'ar'];

export const isRtlLanguage = (lang: string): boolean => {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage);
};

export const TRANSLATION_RESOURCES: Record<SupportedLanguage, Record<string, any>> = {
  en,
  ur,
  hi,
  ar,
  ta,
  te,
  kn,
  ml,
  bn,
  fr,
  es,
  pt,
  ru,
  sw,
  ha,
};

function getNestedValue(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

export type TFunction = (
  key: string,
  paramsOrFallback?: Record<string, string | number> | string,
  params?: Record<string, string | number>
) => string;

export interface TranslationContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  direction: Direction;
  isRTL: boolean;
  languages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
  t: TFunction;
}

const STORAGE_KEY = 'eduledger_language';

const TranslationContext = createContext<TranslationContextType | null>(null);

interface TranslationProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
  defaultLanguage = 'en',
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && stored in TRANSLATION_RESOURCES) {
          return stored as SupportedLanguage;
        }
      } catch {
        // Fallback to default
      }
    }
    return defaultLanguage;
  });

  const direction: Direction = useMemo(() => {
    return isRtlLanguage(language) ? 'rtl' : 'ltr';
  }, [language]);

  const isRTL = direction === 'rtl';

  const currentLanguageInfo = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find(l => l.code === language) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [language]);

  // Synchronize document dir, lang, and root attributes for RTL/LTR layout handling
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('dir', direction);
      document.documentElement.setAttribute('lang', language);
      document.body.setAttribute('dir', direction);
      
      if (isRTL) {
        document.documentElement.classList.add('rtl-layout');
        document.body.classList.add('rtl-layout');
      } else {
        document.documentElement.classList.remove('rtl-layout');
        document.body.classList.remove('rtl-layout');
      }
    }
  }, [direction, language, isRTL]);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    if (newLang in TRANSLATION_RESOURCES) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
      } catch {
        // Ignore storage errors in private mode
      }
    }
  }, []);

  const t: TFunction = useCallback(
    (key: string, paramsOrFallback?: Record<string, string | number> | string, params?: Record<string, string | number>) => {
      let fallback: string | undefined = undefined;
      let variables: Record<string, string | number> | undefined = undefined;

      if (typeof paramsOrFallback === 'string') {
        fallback = paramsOrFallback;
        variables = params;
      } else if (typeof paramsOrFallback === 'object') {
        variables = paramsOrFallback;
      }

      // 1. Look up in active language dictionary
      const activeResource = TRANSLATION_RESOURCES[language];
      let val = getNestedValue(activeResource, key);

      // 2. Fall back to English dictionary if not found in active language
      if (val === undefined && language !== 'en') {
        val = getNestedValue(TRANSLATION_RESOURCES.en, key);
      }

      // 3. Fall back to provided fallback string or key itself
      if (val === undefined) {
        val = fallback !== undefined ? fallback : key;
      }

      return interpolate(val, variables);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      direction,
      isRTL,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageInfo,
      t,
    }),
    [language, setLanguage, direction, isRTL, currentLanguageInfo, t]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

/**
 * useTranslation hook provides full access to translation function, active language, and layout direction
 */
export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

/**
 * useLanguage hook (convenience alias for useTranslation)
 */
export const useLanguage = useTranslation;

/**
 * t() hook for direct text replacement in functional components
 */
export const useT = (): TFunction => {
  const { t } = useTranslation();
  return t;
};

/**
 * Locale metadata representation for syncing user preferences across devices
 */
export interface LocaleMetadata {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: Direction;
  flag: string;
  updatedAt: string;
}

/**
 * Helper function to retrieve locale metadata for any supported language code
 */
export function getLocaleMetadata(langCode: SupportedLanguage): LocaleMetadata {
  const info = SUPPORTED_LANGUAGES.find(l => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  return {
    code: info.code,
    name: info.name,
    nativeName: info.nativeName,
    direction: info.dir,
    flag: info.flag,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Helper function to export current language locale metadata (name, nativeName, direction)
 * to the school settings configuration so user preferences can be synced across devices.
 *
 * @param languageCode The language code to export metadata for (defaults to active or provided)
 * @param existingSettings Optional existing school settings to merge with
 * @returns The updated school settings configuration with localized metadata
 */
export function exportLanguageLocaleMetadata<T extends Record<string, any>>(
  languageCode: SupportedLanguage,
  existingSettings?: T
): T & {
  preferredLanguage: SupportedLanguage;
  localeMetadata: LocaleMetadata;
} {
  const metadata = getLocaleMetadata(languageCode);
  const base = existingSettings ? { ...existingSettings } : ({} as T);

  return {
    ...base,
    preferredLanguage: languageCode,
    localeMetadata: metadata,
  };
}

/**
 * Helper function to export current language locale metadata directly from active state
 */
export function exportCurrentLocaleMetadata(lang: SupportedLanguage = 'en'): LocaleMetadata {
  return getLocaleMetadata(lang);
}

export default TranslationProvider;
