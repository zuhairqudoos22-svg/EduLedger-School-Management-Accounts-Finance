import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SchoolSettings } from '../types';
import {
  HabitatAdmissionDraft,
  resolveAdmissionFormSettings,
  splitSchoolNameTwoLines,
} from './admissionTemplates';

export type HabitatRenderMode = 'filled' | 'blank' | 'partial';

export interface HabitatAdmissionCanvasProps {
  settings: SchoolSettings;
  draft: HabitatAdmissionDraft;
  mode?: HabitatRenderMode;
  printClassAndSection?: boolean;
  bilingualOverride?: boolean;
  onLayoutWarning?: (warning: string | null) => void;
  className?: string;
}

const URDU_REGEX = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

function containsUrdu(text?: string): boolean {
  return Boolean(text && URDU_REGEX.test(text));
}

function parseIsoDateDigits(iso?: string): string[] {
  if (!iso) return ['', '', '', '', '', '', '', ''];
  const clean = iso.trim();
  // Accept YYYY-MM-DD
  const m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) {
    // Also accept DD/MM/YYYY or DD-MM-YYYY
    const m2 = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!m2) return ['', '', '', '', '', '', '', ''];
    const dd = m2[1].padStart(2, '0');
    const mm = m2[2].padStart(2, '0');
    const yyyy = m2[3];
    return [...dd, ...mm, ...yyyy];
  }
  const yyyy = m[1];
  const mm = m[2].padStart(2, '0');
  const dd = m[3].padStart(2, '0');
  return [...dd, ...mm, ...yyyy];
}

function formatReadableDate(iso?: string): string {
  if (!iso) return '';
  const m = iso.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return iso;
  return `${m[3].padStart(2, '0')} / ${m[2].padStart(2, '0')} / ${m[1]}`;
}

function computeFieldFontSize(value: string, basePx: number, minPx: number, thresholdLen: number): number {
  const len = (value || '').trim().length;
  if (len <= thresholdLen) return basePx;
  const excess = len - thresholdLen;
  const reduced = basePx - Math.ceil(excess / 10) * 1.1;
  return Math.max(minPx, Math.round(reduced * 10) / 10);
}

const URDU_LABELS: Record<string, string> = {
  fullName: 'پورا نام',
  fatherName: 'ولدیت',
  guardianName: 'سرپرست کا نام',
  email: 'ای میل',
  nationality: 'قومیت',
  gender: 'جنس',
  domicile: 'ڈومیسائل',
  dateOfBirth: 'تاریخ پیدائش',
  startDate: 'تاریخ داخلہ',
  country: 'ملک',
  religion: 'مذہب',
  idNumber: 'شناختی کارڈ / ب فارم',
  phone: 'فون نمبر',
  address: 'موجودہ پتہ',
  occupation: 'پیشہ',
  education: 'تعلیم',
  phone1: 'فون نمبر ۱',
  income: 'ماہانہ آمدنی',
  phone2: 'فون نمبر ۲',
  regDate: 'تاریخ رجسٹریشن',
  male: 'مرد',
  female: 'عورت',
};

interface DateBoxesProps {
  digits: string[];
  compact?: boolean;
  align?: 'left' | 'right';
}

const BoxedDateDisplay: React.FC<DateBoxesProps> = ({ digits, compact = false, align = 'left' }) => {
  const boxW = compact ? 18 : 20;
  const boxH = compact ? 22 : 24;
  const boxStyle: React.CSSProperties = {
    width: `${boxW}px`,
    height: `${boxH}px`,
    border: '1px solid #C7CFD9',
    borderRadius: '4px',
    backgroundColor: '#FFFFFF',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: compact ? '10.5px' : '11.5px',
    fontWeight: 600,
    color: '#111827',
    fontFamily: "'Montserrat', 'Inter', sans-serif",
    lineHeight: 1,
  };
  const sepStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 700,
    color: '#6B7280',
    margin: '0 3px',
    lineHeight: 1,
  };

  const renderGroup = (indices: number[], placeholder: string) =>
    indices.map((idx, pos) => (
      <span key={idx} style={boxStyle}>
        {digits[idx] || <span style={{ color: '#D1D5DB', fontSize: '9px', fontWeight: 500 }}>{placeholder[pos]}</span>}
      </span>
    ));

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        gap: '2.5px',
      }}
    >
      {renderGroup([0, 1], 'dd')}
      <span style={sepStyle}>/</span>
      {renderGroup([2, 3], 'mm')}
      <span style={sepStyle}>/</span>
      {renderGroup([4, 5, 6, 7], 'yyyy')}
    </div>
  );
};

export const HabitatAdmissionCanvas: React.FC<HabitatAdmissionCanvasProps> = ({
  settings,
  draft,
  mode = 'filled',
  printClassAndSection = false,
  bilingualOverride,
  onLayoutWarning,
  className = '',
}) => {
  const pageRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [compactLevel, setCompactLevel] = useState<0 | 1 | 2>(0);

  const admSettings = useMemo(() => resolveAdmissionFormSettings(settings), [settings]);
  const bilingual = bilingualOverride !== undefined ? bilingualOverride : admSettings.bilingualLabels;
  const isBlank = mode === 'blank';

  const [schoolLine1, schoolLine2] = useMemo(
    () => splitSchoolNameTwoLines(settings.schoolName || 'THE HABITAT SCHOOL SYSTEM'),
    [settings.schoolName]
  );

  // Auto-fit school name heading font size
  const schoolNameFontSize = useMemo(() => {
    const longest = Math.max(schoolLine1.length, schoolLine2.length);
    if (longest > 26) return 18;
    if (longest > 20) return 21;
    if (longest > 15) return 24;
    return 27;
  }, [schoolLine1, schoolLine2]);

  // Split long present address automatically onto 2 lines if addressLine2 is empty
  const [addrLine1, addrLine2] = useMemo(() => {
    if (isBlank) return ['', ''];
    const a1 = (draft.address || '').trim();
    const a2 = (draft.addressLine2 || '').trim();
    if (a2) return [a1, a2];
    if (a1.length > 74) {
      const cutAt = a1.lastIndexOf(' ', 72);
      const splitPoint = cutAt > 35 ? cutAt : 72;
      return [a1.slice(0, splitPoint).trim(), a1.slice(splitPoint).trim()];
    }
    return [a1, ''];
  }, [draft.address, draft.addressLine2, isBlank]);

  const val = (v?: string): string => (isBlank ? '' : (v || '').trim());

  const regDigits = isBlank ? ['', '', '', '', '', '', '', ''] : parseIsoDateDigits(draft.registrationDate);
  const dobDigits = isBlank ? ['', '', '', '', '', '', '', ''] : parseIsoDateDigits(draft.dateOfBirth);

  // Reset compact level whenever key content toggles change so we always prefer spacious layout first
  useEffect(() => {
    setCompactLevel(0);
  }, [
    bilingual,
    printClassAndSection,
    admSettings.showUndertaking,
    admSettings.showFeeNote,
    admSettings.undertakingText,
    admSettings.feeNoteText,
    admSettings.documentsRequiredText,
    draft.fullName,
    draft.address,
    draft.addressLine2,
  ]);

  // Post-render overflow & collision detection (enforces >= safe spacing and zero overlap)
  useLayoutEffect(() => {
    const pageEl = pageRef.current;
    const contentEl = contentRef.current;
    if (!pageEl || !contentEl) return;

    const pageHeight = 1123;
    const contentOverflow = contentEl.scrollHeight > pageHeight - 4;

    // Check pairwise bounding-rect overlap between major safe blocks
    const blocks = Array.from(contentEl.querySelectorAll<HTMLElement>('[data-habitat-safe-block]'));
    let hasCollision = false;
    for (let i = 0; i < blocks.length; i++) {
      const r1 = blocks[i].getBoundingClientRect();
      for (let j = i + 1; j < blocks.length; j++) {
        const r2 = blocks[j].getBoundingClientRect();
        // Ignore nested blocks
        if (blocks[i].contains(blocks[j]) || blocks[j].contains(blocks[i])) continue;
        const overlapX = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left);
        const overlapY = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
        if (overlapX > 1 && overlapY > 1) {
          hasCollision = true;
          break;
        }
      }
      if (hasCollision) break;
    }

    if ((contentOverflow || hasCollision) && compactLevel < 2) {
      setCompactLevel(prev => (prev < 2 ? ((prev + 1) as 0 | 1 | 2) : prev));
      return;
    }

    if (onLayoutWarning) {
      if (hasCollision) {
        onLayoutWarning(
          'Layout guard detected tight spacing between sections. Consider shortening custom Undertaking/Note text in Settings.'
        );
      } else if (contentOverflow) {
        onLayoutWarning(
          'Content slightly approaches the bottom edge of A4 portrait. Consider shortening long texts or disabling Bilingual Labels.'
        );
      } else {
        onLayoutWarning(null);
      }
    }
  }, [
    compactLevel,
    bilingual,
    printClassAndSection,
    admSettings,
    draft,
    mode,
    onLayoutWarning,
  ]);

  // Density tokens controlled by compactLevel (0 = spacious sample match, 1 = compact, 2 = ultra-fit)
  const padY = compactLevel === 0 ? 28 : compactLevel === 1 ? 22 : 17;
  const padX = 38;
  const sectionGap = compactLevel === 0 ? 13 : compactLevel === 1 ? 9 : 7;
  const rowGap = compactLevel === 0 ? 7 : compactLevel === 1 ? 5.5 : 4.5;
  const inputHeight = compactLevel === 0 ? 25 : compactLevel === 1 ? 23 : 21;
  const serifFontSize = compactLevel === 0 ? 10.6 : compactLevel === 1 ? 9.9 : 9.3;

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: '4px',
    fontSize: compactLevel === 2 ? '8.5px' : '9px',
    fontWeight: 700,
    color: '#1F2937',
    letterSpacing: '0.02em',
    marginBottom: '2.5px',
    fontFamily: "'Montserrat', 'Inter', sans-serif",
    lineHeight: 1.15,
  };

  const renderFieldLabel = (en: string, urduKey?: string) => (
    <div style={labelStyle}>
      <span>{en}</span>
      {bilingual && urduKey && URDU_LABELS[urduKey] && (
        <span
          dir="rtl"
          style={{
            fontFamily: "'Noto Naskh Arabic', 'Noto Nastaliq Urdu', serif",
            fontSize: '9.5px',
            fontWeight: 600,
            color: '#4B5563',
            lineHeight: 1.2,
          }}
        >
          {URDU_LABELS[urduKey]}
        </span>
      )}
    </div>
  );

  const renderValueBox = (
    textValue: string,
    options?: { fullWidth?: boolean; mono?: boolean; minHeight?: number }
  ) => {
    const isRtl = containsUrdu(textValue);
    const threshold = options?.fullWidth ? 52 : 26;
    const computedPx = computeFieldFontSize(
      textValue,
      isRtl ? 12.5 : 11.2,
      isRtl ? 10 : 8.8,
      threshold
    );

    return (
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          minHeight: `${options?.minHeight ?? inputHeight}px`,
          border: '1px solid #C7CFD9',
          borderRadius: '4.5px',
          backgroundColor: '#FFFFFF',
          padding: isRtl ? '2px 9px' : '3px 9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isRtl ? 'flex-start' : 'flex-start',
          fontSize: `${computedPx}px`,
          fontWeight: 600,
          color: '#111827',
          fontFamily: isRtl
            ? "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif"
            : options?.mono
              ? "'JetBrains Mono', 'Inter', monospace"
              : "'Montserrat', 'Inter', sans-serif",
          lineHeight: isRtl ? 1.55 : 1.22,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          boxSizing: 'border-box',
        }}
      >
        {textValue || '\u00A0'}
      </div>
    );
  };

  const renderCheckBox = (checked: boolean, text: string, urduText?: string) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: '15px',
          height: '15px',
          border: `1.4px solid ${checked ? '#3DB86B' : '#9CA3AF'}`,
          borderRadius: '3px',
          backgroundColor: checked ? '#3DB86B' : '#FFFFFF',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.2 6.3L4.8 8.9L9.8 3.2"
              stroke="#FFFFFF"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        style={{
          fontSize: '10.5px',
          fontWeight: 600,
          color: '#111827',
          fontFamily: "'Montserrat', 'Inter', sans-serif",
        }}
      >
        {text}
        {bilingual && urduText && (
          <span
            dir="rtl"
            style={{
              fontFamily: "'Noto Naskh Arabic', serif",
              fontSize: '10px',
              color: '#4B5563',
              marginLeft: '4px',
            }}
          >
            ({urduText})
          </span>
        )}
      </span>
    </div>
  );

  const phonesDisplay = [settings.schoolPhone, admSettings.schoolPhone2]
    .map(p => (p || '').trim())
    .filter(Boolean)
    .join('  |  ');

  const formattedIncome = (() => {
    const raw = val(draft.monthlyIncome);
    if (!raw) return '';
    const num = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(num)) return raw;
    return `${settings.currencySymbol || 'Rs.'} ${num.toLocaleString()}`;
  })();

  return (
    <div
      ref={pageRef}
      className={`habitat-admission-sheet ${className}`}
      style={{
        position: 'relative',
        width: '794px',
        height: '1123px',
        backgroundColor: '#FFFFFF',
        color: '#111827',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: "'Montserrat', 'Inter', sans-serif",
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* ================================================================= */}
      {/* LAYER 0: DECORATION & WATERMARK LAYER (z-index: 0, non-interactive)*/}
      {/* ================================================================= */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {/* Subtle top & bottom green accent rules matching sample crisp stationery look */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            backgroundColor: '#3DB86B',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '5px',
            backgroundColor: '#111827',
          }}
        />

        {/* Faint centered school logo watermark behind content if school logo exists */}
        {settings.logoUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.04,
            }}
          >
            <img
              src={settings.logoUrl}
              alt=""
              style={{
                width: '340px',
                height: '340px',
                objectFit: 'contain',
              }}
            />
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* LAYER 1: CONTENT LAYER (z-index: 1, strict safe zones >= 6mm gaps)*/}
      {/* ================================================================= */}
      <div
        ref={contentRef}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minHeight: '1123px',
          padding: `${padY}px ${padX}px ${Math.max(18, padY - 4)}px ${padX}px`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: `${sectionGap}px`,
        }}
      >
        {/* --------------------------------------------------------------- */}
        {/* 1. HEADER SECTION                                               */}
        {/* --------------------------------------------------------------- */}
        <div data-habitat-safe-block="header">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            {/* Left: Optional Square Green Logo + Two-Tone 2-Line School Name + ADMISSION FORM */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {settings.logoUrl && (
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '10px',
                      backgroundColor: '#3DB86B',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        padding: '3px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <img
                        src={settings.logoUrl}
                        alt="School Logo"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: `${schoolNameFontSize}px`,
                      fontWeight: 900,
                      lineHeight: 1.08,
                      letterSpacing: '0.02em',
                      color: '#111827',
                      fontFamily: "'Montserrat', 'Inter', sans-serif",
                      wordBreak: 'break-word',
                    }}
                  >
                    {schoolLine1}
                  </div>
                  {schoolLine2 && (
                    <div
                      style={{
                        fontSize: `${schoolNameFontSize}px`,
                        fontWeight: 900,
                        lineHeight: 1.08,
                        letterSpacing: '0.02em',
                        color: '#3DB86B',
                        fontFamily: "'Montserrat', 'Inter', sans-serif",
                        wordBreak: 'break-word',
                      }}
                    >
                      {schoolLine2}
                    </div>
                  )}
                </div>
              </div>

              {/* ADMISSION FORM Title Row */}
              <div
                style={{
                  marginTop: compactLevel === 2 ? '8px' : '12px',
                  display: 'flex',
                  alignItems: 'baseline',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    fontSize: compactLevel === 2 ? '20px' : '22px',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    lineHeight: 1.1,
                    fontFamily: "'Montserrat', 'Inter', sans-serif",
                  }}
                >
                  <span style={{ color: '#111827' }}>ADMISSION </span>
                  <span style={{ color: '#3DB86B' }}>FORM</span>
                </div>

                {/* Optional Class & Section badge ONLY when explicitly toggled ON (default OFF) */}
                {printClassAndSection && (
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#374151',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#F9FAFB',
                    }}
                  >
                    Class: {val(draft.className) || '________'} | Sec: {val(draft.section) || '____'}
                    {val(draft.rollNo) ? ` | Reg#: ${val(draft.rollNo)}` : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Right: 4x4 Student Photo Box + DATE OF REGISTRATION */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
                flexShrink: 0,
              }}
            >
              {/* Student Photo 4x4 Box */}
              <div
                style={{
                  width: '106px',
                  height: '106px',
                  border: '1.5px solid #9CA3AF',
                  borderRadius: '6px',
                  backgroundColor: '#FAFAFA',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {!isBlank && draft.photoUrl ? (
                  <img
                    src={draft.photoUrl}
                    alt="Student"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div style={{ padding: '8px' }}>
                    <div
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#6B7280',
                        lineHeight: 1.25,
                      }}
                    >
                      Student Photo
                    </div>
                    <div
                      style={{
                        fontSize: '8.5px',
                        color: '#9CA3AF',
                        marginTop: '3px',
                      }}
                    >
                      (4 × 4)
                    </div>
                  </div>
                )}
              </div>

              {/* DATE OF REGISTRATION */}
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '8.5px',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    color: '#111827',
                    marginBottom: '3px',
                  }}
                >
                  DATE OF REGISTRATION
                  {bilingual && (
                    <span
                      dir="rtl"
                      style={{
                        fontFamily: "'Noto Naskh Arabic', serif",
                        fontWeight: 600,
                        color: '#4B5563',
                        marginLeft: '5px',
                      }}
                    >
                      ({URDU_LABELS.regDate})
                    </span>
                  )}
                </div>
                <BoxedDateDisplay digits={regDigits} compact={compactLevel >= 1} align="right" />
              </div>
            </div>
          </div>

          {/* Crisp divider separating header from Personal Information */}
          <div
            style={{
              height: '1.5px',
              backgroundColor: '#E5E7EB',
              marginTop: compactLevel === 2 ? '7px' : '10px',
            }}
          />
        </div>

        {/* --------------------------------------------------------------- */}
        {/* 2. PERSONAL INFORMATION SECTION                                 */}
        {/* --------------------------------------------------------------- */}
        <div data-habitat-safe-block="personal-info">
          <div
            style={{
              fontSize: compactLevel === 2 ? '12.5px' : '13.5px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              marginBottom: compactLevel === 2 ? '6px' : '8px',
            }}
          >
            <span style={{ color: '#3DB86B' }}>PERSONAL </span>
            <span style={{ color: '#111827' }}>INFORMATION</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: `${rowGap}px` }}>
            {/* Full-width: Full Name */}
            <div>
              {renderFieldLabel('Full Name', 'fullName')}
              {renderValueBox(val(draft.fullName), { fullWidth: true })}
            </div>

            {/* Full-width: Father's Name */}
            <div>
              {renderFieldLabel("Father's Name", 'fatherName')}
              {renderValueBox(val(draft.fatherName), { fullWidth: true })}
            </div>

            {/* Full-width: Guardian Name */}
            <div>
              {renderFieldLabel('Guardian Name', 'guardianName')}
              {renderValueBox(val(draft.guardianName), { fullWidth: true })}
            </div>

            {/* Row: Email | Nationality */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                {renderFieldLabel('Email', 'email')}
                {renderValueBox(val(draft.email))}
              </div>
              <div>
                {renderFieldLabel('Nationality', 'nationality')}
                {renderValueBox(val(draft.nationality))}
              </div>
            </div>

            {/* Row: Gender (Male/Female checkboxes) | Domicile */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div>
                {renderFieldLabel('Gender', 'gender')}
                <div
                  style={{
                    minHeight: `${inputHeight}px`,
                    border: '1px solid #C7CFD9',
                    borderRadius: '4.5px',
                    backgroundColor: '#FFFFFF',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '22px',
                    boxSizing: 'border-box',
                  }}
                >
                  {renderCheckBox(!isBlank && draft.gender === 'Male', 'Male', URDU_LABELS.male)}
                  {renderCheckBox(!isBlank && draft.gender === 'Female', 'Female', URDU_LABELS.female)}
                </div>
              </div>
              <div>
                {renderFieldLabel('Domicile', 'domicile')}
                {renderValueBox(val(draft.domicile))}
              </div>
            </div>

            {/* Row: Date of Birth (boxed dd/mm/yyyy) | Start Field (configurable label) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
              <div>
                {renderFieldLabel('Date of Birth', 'dateOfBirth')}
                <div style={{ paddingTop: '1px' }}>
                  <BoxedDateDisplay digits={dobDigits} compact={compactLevel >= 1} />
                </div>
              </div>
              <div>
                {renderFieldLabel(admSettings.startDateLabel || 'Admission Date', 'startDate')}
                {renderValueBox(isBlank ? '' : formatReadableDate(draft.startDate))}
              </div>
            </div>

            {/* Row: Country | Religion */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                {renderFieldLabel('Country', 'country')}
                {renderValueBox(val(draft.country))}
              </div>
              <div>
                {renderFieldLabel('Religion', 'religion')}
                {renderValueBox(val(draft.religion))}
              </div>
            </div>

            {/* Row: CNIC / B.Form | Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                {renderFieldLabel('CNIC / B.Form', 'idNumber')}
                {renderValueBox(val(draft.idNumber), { mono: true })}
              </div>
              <div>
                {renderFieldLabel('Phone', 'phone')}
                {renderValueBox(val(draft.contactNumber), { mono: true })}
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* 3. UNDERTAKING SECTION (Toggleable from Settings)               */}
        {/* --------------------------------------------------------------- */}
        {admSettings.showUndertaking && (
          <div data-habitat-safe-block="undertaking">
            <div
              style={{
                fontSize: compactLevel === 2 ? '11.5px' : '12.5px',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#3DB86B',
                marginBottom: '4px',
              }}
            >
              UNDERTAKING
            </div>
            <p
              style={{
                margin: 0,
                fontFamily: "'Lora', 'Playfair Display', Georgia, serif",
                fontSize: `${serifFontSize}px`,
                lineHeight: compactLevel === 2 ? 1.38 : 1.48,
                color: '#1F2937',
                textAlign: 'justify',
              }}
            >
              {admSettings.undertakingText}
            </p>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* 4. NOTE + FATHER/GUARDIAN SIGNATURE ROW (Toggleable)            */}
        {/* --------------------------------------------------------------- */}
        {admSettings.showFeeNote && (
          <div
            data-habitat-safe-block="fee-note"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '28px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: '#111827',
                  marginBottom: '2px',
                }}
              >
                NOTE:
              </div>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Lora', 'Playfair Display', Georgia, serif",
                  fontSize: `${serifFontSize}px`,
                  fontStyle: 'italic',
                  lineHeight: 1.42,
                  color: '#1F2937',
                }}
              >
                {admSettings.feeNoteText}
              </p>
            </div>

            <div style={{ width: '215px', flexShrink: 0, textAlign: 'center', paddingTop: '14px' }}>
              <div style={{ borderBottom: '1.2px solid #374151', marginBottom: '4px' }} />
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#374151',
                  fontFamily: "'Montserrat', 'Inter', sans-serif",
                }}
              >
                Father/Guardian Signature
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------- */}
        {/* 5. ADDRESS SECTION                                              */}
        {/* --------------------------------------------------------------- */}
        <div data-habitat-safe-block="address">
          <div
            style={{
              fontSize: compactLevel === 2 ? '12px' : '13px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: '#3DB86B',
              marginBottom: compactLevel === 2 ? '5px' : '7px',
            }}
          >
            ADDRESS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: `${rowGap}px` }}>
            {/* Present Address (2 lines) */}
            <div>
              {renderFieldLabel('Present Address', 'address')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {renderValueBox(addrLine1, { fullWidth: true })}
                {renderValueBox(addrLine2, { fullWidth: true })}
              </div>
            </div>

            {/* Occupation | Education */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                {renderFieldLabel('Occupation', 'occupation')}
                {renderValueBox(val(draft.occupation))}
              </div>
              <div>
                {renderFieldLabel('Education', 'education')}
                {renderValueBox(val(draft.education))}
              </div>
            </div>

            {/* Phone No 1 | Income */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                {renderFieldLabel('Phone No 1', 'phone1')}
                {renderValueBox(val(draft.contactNumber), { mono: true })}
              </div>
              <div>
                {renderFieldLabel('Income', 'income')}
                {renderValueBox(formattedIncome)}
              </div>
            </div>

            {/* Phone No 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                {renderFieldLabel('Phone No 2', 'phone2')}
                {renderValueBox(val(draft.phone2), { mono: true })}
              </div>
              <div />
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------- */}
        {/* 6. FOOTER: SCHOOL ADDRESS, SIGNATURES, THANK YOU, DOCUMENTS     */}
        {/* --------------------------------------------------------------- */}
        <div
          data-habitat-safe-block="footer"
          style={{
            borderTop: '1.5px solid #E5E7EB',
            paddingTop: compactLevel === 2 ? '8px' : '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: compactLevel === 2 ? '8px' : '11px',
          }}
        >
          {/* School Address + Phones */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#3DB86B',
                  marginBottom: '2px',
                }}
              >
                SCHOOL ADDRESS
              </div>
              <div
                style={{
                  fontFamily: "'Lora', 'Playfair Display', Georgia, serif",
                  fontSize: `${Math.max(9.2, serifFontSize - 0.3)}px`,
                  color: '#1F2937',
                  lineHeight: 1.38,
                }}
              >
                {settings.schoolAddress || 'School Campus Address (Configure in Settings > School Profile)'}
                {phonesDisplay ? ` — Tel: ${phonesDisplay}` : ''}
              </div>
            </div>
          </div>

          {/* Two Signature Lines with clear breathing room */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '64px',
              marginTop: compactLevel === 2 ? '12px' : '18px',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1.2px solid #374151', marginBottom: '4px', minHeight: '14px' }} />
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151' }}>
                Father/Guardian Signature
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  borderBottom: '1.2px solid #374151',
                  marginBottom: '4px',
                  minHeight: '14px',
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#111827',
                  paddingBottom: '2px',
                }}
              >
                {!isBlank && draft.officerName ? draft.officerName : '\u00A0'}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151' }}>
                Officer Signature
              </div>
            </div>
          </div>

          {/* THANK YOU FOR REGISTRATION */}
          <div
            style={{
              textAlign: 'center',
              fontSize: compactLevel === 2 ? '11px' : '12px',
              fontWeight: 900,
              letterSpacing: '0.12em',
              color: '#3DB86B',
              textTransform: 'uppercase',
            }}
          >
            {admSettings.footerThankYouText}
          </div>

          {/* DOCUMENTS REQUIRED */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              padding: compactLevel === 2 ? '6px 10px' : '7px 12px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#111827',
                marginRight: '6px',
              }}
            >
              DOCUMENTS REQUIRED:
            </span>
            <span
              style={{
                fontFamily: "'Lora', 'Playfair Display', Georgia, serif",
                fontSize: `${Math.max(9.2, serifFontSize - 0.3)}px`,
                color: '#374151',
                lineHeight: 1.38,
              }}
            >
              {admSettings.documentsRequiredText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
