import React, { useLayoutEffect, useRef, useState } from 'react';
import { IssuedCertificate, SchoolSettings } from '../types';
import {
  A4_LANDSCAPE_PX,
  DEFAULT_CERTIFICATE_SCHOOL_FALLBACK,
  getCertificateTemplate,
} from './certificateTemplates';
import {
  containsUrduOrArabic,
  formatCertificateDate,
  interpolateCertificateText,
} from './certificatePresets';

export interface CertificateCanvasProps {
  cert: IssuedCertificate;
  settings?: SchoolSettings;
  qrCodeDataUrl?: string;
  id?: string;
  onLayoutWarning?: (warning: string | null) => void;
  /** Disable dynamic DOM measurement (e.g. for tiny static thumbnails) */
  isThumbnail?: boolean;
}

/**
 * Computes an appropriate initial font size for the recipient name
 * based on character count and script so it stays on 1 line when possible
 * and wraps gracefully to 2 lines for extra-long names.
 */
function computeInitialNameSize(
  name: string,
  baseMax: number,
  baseMin: number,
  isUrdu: boolean
): number {
  const len = (name || '').trim().length;
  if (isUrdu) {
    if (len <= 18) return Math.min(baseMax - 4, 48);
    if (len <= 30) return Math.max(baseMin, 38);
    return Math.max(baseMin, 30);
  }
  if (len <= 18) return baseMax;
  if (len <= 26) return Math.round(baseMax * 0.86);
  if (len <= 36) return Math.round(baseMax * 0.72);
  if (len <= 48) return Math.round(baseMax * 0.6);
  return baseMin;
}

/**
 * Editable HTML/CSS/SVG Certificate Canvas Renderer
 * Exact A4 Landscape dimensions: 1123 x 794 px (297 x 210 mm at 96 DPI).
 *
 * Strict 2-Layer Safety Architecture:
 * - Layer 0 (zIndex: 0, pointerEvents: 'none', overflow: 'hidden'): Decorations & plain-opacity watermarks
 * - Layer 1 (zIndex: 1): Live dynamic text, logo, recipient name, TC grid, signatures & certificate no
 *   strictly inside safe zones (>= 8 mm clearance from decorations).
 */
export const CertificateCanvas: React.FC<CertificateCanvasProps> = ({
  cert,
  settings,
  qrCodeDataUrl,
  id,
  onLayoutWarning,
  isThumbnail = false,
}) => {
  const designId = cert.designId || 'geometric_triangles';
  const template = getCertificateTemplate(designId);

  const safeZoneRef = useRef<HTMLDivElement>(null);
  const contentInnerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  const isUrduCert =
    cert.language === 'ur' ||
    containsUrduOrArabic(cert.certificateTitle) ||
    containsUrduOrArabic(cert.citationText);
  const isUrduName = containsUrduOrArabic(cert.recipientName);

  const nameBounds =
    designId === 'geometric_triangles'
      ? { max: 58, min: 26 }
      : designId === 'diagonal_stripes'
      ? { max: 40, min: 22 }
      : { max: 44, min: 24 };

  const [fittedNamePx, setFittedNamePx] = useState<number>(() =>
    computeInitialNameSize(cert.recipientName, nameBounds.max, nameBounds.min, isUrduName)
  );
  const [bodyScale, setBodyScale] = useState<number>(1);

  // Resolve dynamic School Profile (Settings > School Profile takes precedence; sample fallback only if empty)
  const schoolName =
    (cert.schoolName || settings?.schoolName || '').trim() ||
    DEFAULT_CERTIFICATE_SCHOOL_FALLBACK.schoolName;
  const schoolAddress =
    (cert.schoolAddress || settings?.schoolAddress || '').trim() ||
    DEFAULT_CERTIFICATE_SCHOOL_FALLBACK.schoolAddress;
  const schoolLogo = (cert.schoolLogo || settings?.logoUrl || '').trim();

  // Accent override (preserves default sample palette when unset)
  const primaryColor = cert.accentColorOverride || template.palette.primary;
  const secondaryColor = template.palette.secondary;
  const darkColor = cert.accentColorOverride ? '#0F172A' : template.palette.dark;

  // Locale-formatted date
  const localeCode =
    cert.language === 'ur'
      ? 'ur-PK'
      : settings?.localeMetadata?.code === 'ur'
      ? 'ur-PK'
      : 'en-US';
  const formattedIssueDate = formatCertificateDate(cert.issueDate, localeCode);

  const yearDisplay =
    (cert.academicYear || '').trim() ||
    (cert.issueDate ? cert.issueDate.slice(0, 4) : String(new Date().getFullYear()));

  const interpCtx = {
    name: cert.recipientName || 'Recipient Name',
    fatherName: cert.guardianName || 'Father / Guardian Name',
    class: cert.classEnrolled
      ? `${cert.classEnrolled}${cert.section ? ` (${cert.section})` : ''}`
      : 'Class',
    rollNo: cert.rollNo || 'N/A',
    event: cert.competitionOrEvent || cert.achievementTitle || 'Annual School Event',
    position: cert.rankOrGrade || 'Excellence',
    year: yearDisplay,
    date: formattedIssueDate || cert.issueDate || '',
    schoolName,
    duration: cert.tenureDates || 'Academic Session',
    designation: cert.designation || 'Faculty Member',
    activity: cert.activityName || cert.competitionOrEvent || 'Extra-Curricular Activity',
    admissionNo: cert.admissionNo || 'N/A',
  };

  const renderedPara1 = interpolateCertificateText(cert.citationText || '', interpCtx);
  const renderedPara2 = interpolateCertificateText(cert.secondParagraph || '', interpCtx);
  const renderedEvent = interpolateCertificateText(
    cert.competitionOrEvent || cert.activityName || cert.achievementTitle || 'ANNUAL SPORTS FESTIVAL',
    interpCtx
  );
  const renderedPosition = interpolateCertificateText(cert.rankOrGrade || '', interpCtx);

  // Auto-fit recipient name & post-render collision/overflow safety check
  useLayoutEffect(() => {
    if (isThumbnail) return;

    const idealName = computeInitialNameSize(
      cert.recipientName,
      nameBounds.max,
      nameBounds.min,
      isUrduName
    );
    let currentNamePx = idealName;
    let currentBodyScale = 1;
    let shortened = false;

    const nameEl = nameRef.current;
    const safeEl = safeZoneRef.current;
    const innerEl = contentInnerRef.current;

    if (nameEl && safeEl) {
      const maxWidth = safeEl.clientWidth - 24;
      nameEl.style.fontSize = `${currentNamePx}px`;
      nameEl.style.whiteSpace = 'nowrap';

      // Shrink to fit single line first
      while (nameEl.scrollWidth > maxWidth && currentNamePx > nameBounds.min) {
        currentNamePx -= 2;
        nameEl.style.fontSize = `${currentNamePx}px`;
      }

      // If still wider at minimum single-line threshold, allow neat 2-line wrap
      if (nameEl.scrollWidth > maxWidth) {
        nameEl.style.whiteSpace = 'normal';
        shortened = true;
      }
    }

    if (safeEl && innerEl) {
      innerEl.style.fontSize = '100%';
      const safeRect = safeEl.getBoundingClientRect();
      let innerRect = innerEl.getBoundingClientRect();

      // Check vertical overflow against safe zone height (prevents colliding with bottom decoration/signatures)
      let guard = 0;
      while (innerRect.height > safeRect.height + 2 && currentBodyScale > 0.76 && guard < 8) {
        currentBodyScale = Number((currentBodyScale - 0.04).toFixed(2));
        innerEl.style.fontSize = `${Math.round(currentBodyScale * 100)}%`;
        innerRect = innerEl.getBoundingClientRect();
        shortened = true;
        guard++;
      }

      // Pairwise sibling overlap verification inside content stack
      const blocks = Array.from(innerEl.querySelectorAll<HTMLElement>('[data-cert-block]'));
      for (let i = 0; i < blocks.length - 1; i++) {
        const a = blocks[i].getBoundingClientRect();
        const b = blocks[i + 1].getBoundingClientRect();
        if (a.bottom > b.top + 2) {
          shortened = true;
        }
      }
    }

    setFittedNamePx(currentNamePx);
    setBodyScale(currentBodyScale);
    onLayoutWarning?.(shortened ? 'Text too long, shortened to fit' : null);
  }, [
    isThumbnail,
    designId,
    cert.recipientName,
    cert.certificateTitle,
    cert.subtitle,
    cert.type,
    renderedPara1,
    renderedPara2,
    renderedEvent,
    schoolName,
    schoolAddress,
    isUrduName,
    nameBounds.max,
    nameBounds.min,
    onLayoutWarning,
  ]);

  const isSchoolLeaving = cert.type === 'school_leaving';

  // Helper: Faint center watermark (plain opacity only — html2canvas safe)
  const renderWatermark = (showTextBanner: boolean) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: 0.075,
        zIndex: 0,
        padding: '60px 120px',
        textAlign: 'center',
      }}
    >
      {schoolLogo ? (
        <img
          src={schoolLogo}
          alt=""
          crossOrigin="anonymous"
          style={{
            width: 340,
            height: 340,
            objectFit: 'contain',
          }}
        />
      ) : null}
      {showTextBanner && (
        <div
          style={{
            marginTop: schoolLogo ? 12 : 0,
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: 56,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#111827',
            lineHeight: 1.05,
            maxWidth: 760,
          }}
        >
          {schoolName}
        </div>
      )}
    </div>
  );

  // Formal School Leaving (TC) structured data table — works cleanly inside any of the 3 designs
  const renderSchoolLeavingGrid = () => (
    <div
      data-cert-block="tc-grid"
      dir={isUrduCert ? 'rtl' : 'ltr'}
      style={{
        width: '100%',
        maxWidth: 780,
        margin: '6px auto 4px auto',
        border: `1px solid ${primaryColor}55`,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.78)',
        padding: '10px 16px',
        fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.body,
        fontSize: '12px',
        lineHeight: 1.45,
        color: '#111827',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 24,
          rowGap: 5,
          textAlign: isUrduCert ? 'right' : 'left',
        }}
      >
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Admission No:</strong>{' '}
          <span>{cert.admissionNo || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Roll No:</strong>{' '}
          <span>{cert.rollNo || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Father / Guardian:</strong>{' '}
          <span>{cert.guardianName || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Date of Birth:</strong>{' '}
          <span>{formatCertificateDate(cert.dateOfBirth, localeCode) || cert.dateOfBirth || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Date of Admission:</strong>{' '}
          <span>{formatCertificateDate(cert.dateOfAdmission, localeCode) || cert.dateOfAdmission || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Date of Leaving:</strong>{' '}
          <span>{formatCertificateDate(cert.dateOfLeaving, localeCode) || formattedIssueDate || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Last Class Attended:</strong>{' '}
          <span>{cert.classLeaving || cert.classEnrolled || 'N/A'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>General Conduct:</strong>{' '}
          <span>{cert.generalConduct || 'Exemplary'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>Reason for Leaving:</strong>{' '}
          <span>{cert.reasonForLeaving || 'Course Completed / Relocation'}</span>
        </div>
        <div style={{ borderBottom: '1px dotted #94A3B8', paddingBottom: 2 }}>
          <strong style={{ color: '#475569' }}>School Dues:</strong>{' '}
          <span>{cert.duesCleared !== false ? 'Cleared in Full' : 'Pending'}</span>
        </div>
      </div>
      {cert.remarks && (
        <div
          style={{
            marginTop: 5,
            fontSize: '11px',
            color: '#334155',
            textAlign: isUrduCert ? 'right' : 'left',
          }}
        >
          <strong>Remarks:</strong> {cert.remarks}
        </div>
      )}
    </div>
  );

  // Reserved non-overlapping Certificate Number + optional QR verification extension point
  const renderCertificateNumberAndQr = () => {
    const slot = template.zones.certNumberSlot;
    const posStyle: React.CSSProperties =
      slot === 'top-right'
        ? { top: 34, right: 44, alignItems: 'flex-end', textAlign: 'right' }
        : slot === 'top-left'
        ? { top: 44, left: 60, alignItems: 'flex-start', textAlign: 'left' }
        : { bottom: 26, left: 118, alignItems: 'flex-start', textAlign: 'left' };

    return (
      <div
        style={{
          position: 'absolute',
          ...posStyle,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: '#475569',
            letterSpacing: '0.06em',
            backgroundColor: 'rgba(255,255,255,0.72)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          No: {cert.certificateNumber}
        </div>
        {/* EXTENSION POINT: Public QR Verification badge (when enabled and QR data URL provided) */}
        {cert.showQrCode && qrCodeDataUrl && !isThumbnail && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#FFFFFF',
              padding: 3,
              borderRadius: 4,
              border: '1px solid #E2E8F0',
            }}
          >
            <img
              src={qrCodeDataUrl}
              alt="Verify QR"
              width={40}
              height={40}
              style={{ width: 40, height: 40, display: 'block' }}
            />
            <span
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 7.5,
                fontWeight: 700,
                color: '#334155',
                maxWidth: 46,
                lineHeight: 1.15,
                textTransform: 'uppercase',
              }}
            >
              Scan to Verify
            </span>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // DESIGN A: GEOMETRIC TRIANGLES (Faithful recreation of Sample Image 1)
  // =========================================================================
  if (designId === 'geometric_triangles') {
    return (
      <div
        id={id}
        data-cert-canvas="geometric_triangles"
        style={{
          position: 'relative',
          width: A4_LANDSCAPE_PX.width,
          height: A4_LANDSCAPE_PX.height,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          userSelect: 'none',
        }}
      >
        {/* LAYER 0: DECORATION LAYER (z-index: 0, pointer-events: none) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {renderWatermark(true)}
          <svg
            viewBox="0 0 1123 794"
            width="1123"
            height="794"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {/* TOP-LEFT & LEFT EDGE GEOMETRIC TRIANGLES */}
            <polygon points="0,0 245,0 82,174 0,25" fill={secondaryColor} />
            <polygon points="0,25 82,174 0,264" fill={primaryColor} />
            <polygon points="222,0 356,0 250,96" fill={darkColor} />
            <polygon points="356,0 562,0 250,96" fill={primaryColor} />
            <polygon points="562,0 594,0 508,26" fill={secondaryColor} />
            <polygon points="82,174 36,348 0,305 0,264" fill={darkColor} />
            <polygon points="0,305 36,348 0,362" fill={secondaryColor} />
            <polygon points="44,300 105,332 0,404 0,362" fill={darkColor} />
            <polygon points="105,332 0,524 0,404" fill={primaryColor} />
            <polygon points="0,524 10,506 0,536" fill={secondaryColor} />

            {/* Floating Left Accent Triangles */}
            <polygon points="138,136 226,102 172,176" fill={darkColor} />
            <polygon points="85,254 156,282 128,360" fill={primaryColor} />
            <polygon points="35,480 94,484 56,574" fill={darkColor} />

            {/* RIGHT EDGE & BOTTOM-RIGHT GEOMETRIC TRIANGLES */}
            <polygon points="1123,254 1018,468 1123,418" fill={primaryColor} />
            <polygon points="1123,254 1114,274 1123,294" fill={secondaryColor} />
            <polygon points="1123,418 1018,468 1068,510 1123,438" fill={darkColor} />
            <polygon points="1123,438 1068,510 1040,626 1123,558" fill={secondaryColor} />
            <polygon points="1123,558 1040,626 1123,772" fill={primaryColor} />
            <polygon points="1040,626 1123,772 1123,794 892,794" fill={darkColor} />
            <polygon points="892,794 786,794 868,704" fill={secondaryColor} />
            <polygon points="786,794 576,794 868,704" fill={primaryColor} />
            <polygon points="576,794 548,794 596,780" fill={secondaryColor} />

            {/* Floating Right Accent Triangles */}
            <polygon points="1064,224 1020,308 1084,316" fill={darkColor} />
            <polygon points="990,438 960,524 1034,548" fill={primaryColor} />
            <polygon points="956,620 894,696 982,664" fill={darkColor} />
          </svg>
        </div>

        {/* Top-Right School Logo (Safe Inset, omitted cleanly if no logo uploaded) */}
        {schoolLogo && (
          <div
            style={{
              position: 'absolute',
              top: 66,
              right: 118,
              width: 122,
              height: 122,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={schoolLogo}
              alt={schoolName}
              crossOrigin="anonymous"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        )}

        {renderCertificateNumberAndQr()}

        {/* LAYER 1: CONTENT LAYER (Strict Safe Zone >= 8mm from all triangles) */}
        <div
          ref={safeZoneRef}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            padding: `${template.zones.paddingTop}px ${template.zones.paddingRight}px ${template.zones.paddingBottom}px ${template.zones.paddingLeft}px`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            ref={contentInnerRef}
            style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'center',
            }}
          >
            {/* Header Block */}
            <div data-cert-block="header" style={{ width: '100%', marginTop: 18 }}>
              {!schoolLogo && (
                <div
                  style={{
                    fontFamily: template.fonts.schoolName,
                    fontSize: '0.82em',
                    fontWeight: 700,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: primaryColor,
                    marginBottom: 6,
                  }}
                >
                  {schoolName}
                </div>
              )}
              <div
                dir={isUrduCert ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.title,
                  fontSize: isUrduCert ? '3.1em' : '3.65em',
                  fontWeight: 600,
                  letterSpacing: isUrduCert ? '0' : '0.07em',
                  color: '#0B0B0B',
                  lineHeight: 1.08,
                }}
              >
                {cert.certificateTitle || 'CERTIFICATE'}
              </div>
              <div
                dir={isUrduCert ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.subtitle,
                  fontSize: '1.65em',
                  fontWeight: 400,
                  color: '#18181B',
                  marginTop: 4,
                  lineHeight: 1.25,
                }}
              >
                {cert.subtitle || 'of Appreciation'}
              </div>
            </div>

            {/* Middle Recognition + Auto-Fit Name + Body */}
            <div
              data-cert-block="body"
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isSchoolLeaving ? 8 : 16,
                marginTop: 10,
                marginBottom: 10,
              }}
            >
              {!isSchoolLeaving && renderedPara1 && (
                <p
                  dir={isUrduCert ? 'rtl' : 'ltr'}
                  style={{
                    fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.body,
                    fontSize: isUrduCert ? '1.08em' : '1.12em',
                    lineHeight: isUrduCert ? 1.85 : 1.55,
                    color: '#18181B',
                    maxWidth: 660,
                    margin: 0,
                  }}
                >
                  {renderedPara1}
                </p>
              )}

              {/* Very Large Bold Recipient Name + Dotted Underline */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 740,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: 2,
                }}
              >
                <div
                  ref={nameRef}
                  dir={isUrduName ? 'rtl' : 'ltr'}
                  style={{
                    fontFamily: isUrduName ? template.fonts.recipientUrdu : template.fonts.recipient,
                    fontSize: `${fittedNamePx}px`,
                    fontWeight: 800,
                    color: '#050505',
                    lineHeight: isUrduName ? 1.45 : 1.12,
                    letterSpacing: isUrduName ? '0' : '-0.01em',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                    paddingBottom: 6,
                  }}
                >
                  {cert.recipientName || 'Recipient Name'}
                </div>
                <div
                  style={{
                    width: '92%',
                    borderBottom: '1.5px dotted #64748B',
                  }}
                />
              </div>

              {isSchoolLeaving ? (
                renderSchoolLeavingGrid()
              ) : (
                renderedPara2 && (
                  <p
                    dir={isUrduCert ? 'rtl' : 'ltr'}
                    style={{
                      fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.body,
                      fontSize: isUrduCert ? '1.0em' : '0.96em',
                      lineHeight: isUrduCert ? 1.8 : 1.6,
                      color: '#27272A',
                      maxWidth: 690,
                      margin: 0,
                    }}
                  >
                    {renderedPara2}
                  </p>
                )
              )}
            </div>

            {/* Bottom Dual Signatures: Date (Left) & Principal (Right) */}
            <div
              data-cert-block="signatures"
              style={{
                width: '100%',
                maxWidth: 660,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: 48,
                paddingTop: 8,
              }}
            >
              <div style={{ width: 210, textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: template.fonts.signature,
                    fontSize: '0.88em',
                    fontWeight: 600,
                    color: '#1E293B',
                    minHeight: 20,
                    marginBottom: 4,
                  }}
                >
                  {formattedIssueDate}
                </div>
                <div style={{ borderTop: '1.5px dotted #475569', paddingTop: 5 }}>
                  <span
                    style={{
                      fontFamily: template.fonts.signature,
                      fontSize: '0.92em',
                      fontWeight: 700,
                      color: '#0F172A',
                    }}
                  >
                    {cert.signatory3Title || (isUrduCert ? 'تاریخ' : 'Date')}
                  </span>
                </div>
              </div>

              <div style={{ width: 210, textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: template.fonts.signature,
                    fontSize: '0.85em',
                    fontWeight: 600,
                    color: '#334155',
                    minHeight: 20,
                    marginBottom: 4,
                  }}
                >
                  {cert.signatory1Name || ''}
                </div>
                <div style={{ borderTop: '1.5px dotted #475569', paddingTop: 5 }}>
                  <span
                    style={{
                      fontFamily: template.fonts.signature,
                      fontSize: '0.92em',
                      fontWeight: 700,
                      color: '#0F172A',
                    }}
                  >
                    {cert.signatory1Title || (isUrduCert ? 'پرنسپل' : 'Principal')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN B: DIAGONAL STRIPES (Faithful recreation of Sample Image 2 / PDF 1)
  // =========================================================================
  if (designId === 'diagonal_stripes') {
    const deepGreen = cert.accentColorOverride ? darkColor : '#0B3D1D';
    const emeraldGreen = primaryColor;
    const goldColor = secondaryColor;

    return (
      <div
        id={id}
        data-cert-canvas="diagonal_stripes"
        style={{
          position: 'relative',
          width: A4_LANDSCAPE_PX.width,
          height: A4_LANDSCAPE_PX.height,
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxSizing: 'border-box',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          userSelect: 'none',
        }}
      >
        {/* LAYER 0: DECORATION LAYER (z-index: 0) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {renderWatermark(true)}
          <svg
            viewBox="0 0 1123 794"
            width="1123"
            height="794"
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {/* TOP-LEFT DIAGONAL STRIPES */}
            <polygon points="0,0 165,0 0,126" fill={deepGreen} />
            <polygon points="165,0 245,0 0,188 0,126" fill={emeraldGreen} />
            <polygon points="245,0 300,0 0,230 0,188" fill={goldColor} />

            {/* BOTTOM-RIGHT DIAGONAL STRIPES */}
            <polygon points="1123,794 958,794 1123,668" fill={deepGreen} />
            <polygon points="958,794 878,794 1123,606 1123,668" fill={emeraldGreen} />
            <polygon points="878,794 823,794 1123,564 1123,606" fill={goldColor} />

            {/* THIN GOLD INNER FRAME */}
            <rect
              x="22"
              y="22"
              width="1079"
              height="750"
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.2"
            />
          </svg>
        </div>

        {renderCertificateNumberAndQr()}

        {/* LAYER 1: CONTENT LAYER */}
        <div
          ref={safeZoneRef}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            height: '100%',
            padding: `${template.zones.paddingTop}px ${template.zones.paddingRight}px ${template.zones.paddingBottom}px ${template.zones.paddingLeft}px`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            ref={contentInnerRef}
            style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'center',
            }}
          >
            {/* Top School Header + Logo + Pill Event Badge */}
            <div
              data-cert-block="school-header"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                width: '100%',
              }}
            >
              {schoolLogo && (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  crossOrigin="anonymous"
                  style={{
                    height: 82,
                    maxWidth: 150,
                    objectFit: 'contain',
                    marginBottom: 2,
                  }}
                />
              )}
              <div
                style={{
                  fontFamily: template.fonts.schoolName,
                  fontSize: '1.52em',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  color: deepGreen,
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {schoolName}
              </div>
              {schoolAddress && (
                <div
                  style={{
                    fontFamily: template.fonts.body,
                    fontSize: '0.76em',
                    fontWeight: 500,
                    color: '#6B7280',
                    letterSpacing: '0.02em',
                  }}
                >
                  {schoolAddress}
                </div>
              )}

              {/* Dark Green Pill Badge with Event Name */}
              {renderedEvent && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 28px',
                    borderRadius: 9999,
                    backgroundColor: deepGreen,
                    color: '#F2C94C',
                    fontFamily: template.fonts.subtitle,
                    fontSize: '0.78em',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                  }}
                >
                  {renderedEvent}
                </div>
              )}
            </div>

            {/* Huge Spaced Title + Subtitle + Recipient Name + Citation */}
            <div
              data-cert-block="main-body"
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isSchoolLeaving ? 6 : 8,
              }}
            >
              <div
                dir={isUrduCert ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.title,
                  fontSize: isUrduCert ? '2.8em' : '3.75em',
                  fontWeight: 800,
                  letterSpacing: isUrduCert ? '0' : '0.16em',
                  color: emeraldGreen,
                  lineHeight: 1.05,
                  textTransform: 'uppercase',
                }}
              >
                {cert.certificateTitle || 'CERTIFICATE'}
              </div>

              <div
                dir={isUrduCert ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.subtitle,
                  fontSize: '1.05em',
                  fontWeight: 700,
                  letterSpacing: isUrduCert ? '0' : '0.36em',
                  color: '#D4A017',
                  textTransform: 'uppercase',
                }}
              >
                {cert.subtitle || 'OF ACHIEVEMENT'}
              </div>

              <div
                style={{
                  marginTop: 4,
                  fontFamily: template.fonts.body,
                  fontSize: '0.72em',
                  fontWeight: 600,
                  letterSpacing: '0.26em',
                  color: '#4B5563',
                  textTransform: 'uppercase',
                }}
              >
                {isUrduCert ? 'باعزاز پیش کی جاتی ہے' : 'PROUDLY PRESENTED TO'}
              </div>

              {/* Gradient Gold-to-Green Divider */}
              <div
                style={{
                  width: 560,
                  maxWidth: '82%',
                  height: 2,
                  background: `linear-gradient(90deg, rgba(234,179,8,0) 0%, ${goldColor} 28%, ${emeraldGreen} 72%, rgba(17,138,59,0) 100%)`,
                  marginTop: 4,
                  marginBottom: 2,
                }}
              />

              {/* Auto-Fit Recipient Name */}
              <div
                ref={nameRef}
                dir={isUrduName ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: isUrduName ? template.fonts.recipientUrdu : template.fonts.recipient,
                  fontSize: `${fittedNamePx}px`,
                  fontStyle: isUrduName ? 'normal' : 'italic',
                  fontWeight: 700,
                  color: '#111827',
                  lineHeight: isUrduName ? 1.4 : 1.15,
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                  padding: '2px 8px',
                }}
              >
                {cert.recipientName || 'Recipient Name'}
              </div>

              {isSchoolLeaving ? (
                renderSchoolLeavingGrid()
              ) : (
                <div
                  dir={isUrduCert ? 'rtl' : 'ltr'}
                  style={{
                    fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.body,
                    fontSize: isUrduCert ? '0.98em' : '0.94em',
                    lineHeight: isUrduCert ? 1.85 : 1.75,
                    color: '#374151',
                    maxWidth: 760,
                    marginTop: 2,
                  }}
                >
                  {renderedPara1}
                  {renderedPosition && !renderedPara1.includes(renderedPosition) && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginLeft: 6,
                        fontWeight: 700,
                        color: deepGreen,
                        borderBottom: '1px solid #94A3B8',
                        padding: '0 6px',
                      }}
                    >
                      {renderedPosition}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Gold Star Medal + 3 Signature Lines */}
            <div
              data-cert-block="signatures"
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {/* Gold Medal with Star SVG */}
              <svg width="78" height="86" viewBox="0 0 80 90" aria-hidden="true">
                {/* Green ribbon tails */}
                <polygon points="31,64 38,64 35,88 28,80" fill={emeraldGreen} />
                <polygon points="49,64 42,64 45,88 52,80" fill={emeraldGreen} />
                {/* Medal Outer Circle */}
                <circle cx="40" cy="38" r="31" fill={goldColor} stroke={deepGreen} strokeWidth="2.5" />
                {/* Inner Dashed Gold Circle */}
                <circle
                  cx="40"
                  cy="38"
                  r="25"
                  fill="none"
                  stroke="#FEF08A"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                {/* Center 5-Point Dark Green Star */}
                <polygon
                  points="40,21 44.6,31.5 56,32.7 47.4,40.4 49.9,51.6 40,45.8 30.1,51.6 32.6,40.4 24,32.7 35.4,31.5"
                  fill={deepGreen}
                />
              </svg>

              {/* 3 Signature Columns: Left (Sports In-charge), Center (Date), Right (Principal) */}
              <div
                style={{
                  width: '100%',
                  maxWidth: 820,
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 1fr',
                  alignItems: 'end',
                  columnGap: 48,
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: template.fonts.signature,
                      fontSize: '0.8em',
                      fontWeight: 600,
                      color: '#334155',
                      minHeight: 16,
                      marginBottom: 4,
                    }}
                  >
                    {cert.signatory2Name || ''}
                  </div>
                  <div style={{ borderTop: `1.5px solid ${deepGreen}`, paddingTop: 6 }}>
                    <span
                      style={{
                        fontFamily: template.fonts.signature,
                        fontSize: '0.78em',
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: deepGreen,
                        textTransform: 'uppercase',
                      }}
                    >
                      {cert.signatory2Title || 'SPORTS IN-CHARGE'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: template.fonts.signature,
                      fontSize: '0.74em',
                      fontWeight: 600,
                      color: '#334155',
                      minHeight: 16,
                      marginBottom: 4,
                    }}
                  >
                    {formattedIssueDate}
                  </div>
                  <div style={{ borderTop: '1.2px solid #6B7280', paddingTop: 6 }}>
                    <span
                      style={{
                        fontFamily: template.fonts.signature,
                        fontSize: '0.72em',
                        fontWeight: 600,
                        letterSpacing: '0.18em',
                        color: '#4B5563',
                        textTransform: 'uppercase',
                      }}
                    >
                      {cert.signatory3Title || 'DATE'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      fontFamily: template.fonts.signature,
                      fontSize: '0.8em',
                      fontWeight: 600,
                      color: '#334155',
                      minHeight: 16,
                      marginBottom: 4,
                    }}
                  >
                    {cert.signatory1Name || ''}
                  </div>
                  <div style={{ borderTop: `1.5px solid ${deepGreen}`, paddingTop: 6 }}>
                    <span
                      style={{
                        fontFamily: template.fonts.signature,
                        fontSize: '0.78em',
                        fontWeight: 700,
                        letterSpacing: '0.14em',
                        color: deepGreen,
                        textTransform: 'uppercase',
                      }}
                    >
                      {cert.signatory1Title || 'PRINCIPAL'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // DESIGN C: CLASSIC RIBBON & GOLD (Faithful recreation of Sample Image 3 / PDF 2)
  // =========================================================================
  const forestDark = cert.accentColorOverride ? darkColor : '#0B5D3B';
  const forestBright = cert.accentColorOverride || '#1F8A4C';
  const goldDeep = '#C9A227';
  const goldLight = '#F5D77A';

  return (
    <div
      id={id}
      data-cert-canvas="classic_ribbon_gold"
      style={{
        position: 'relative',
        width: A4_LANDSCAPE_PX.width,
        height: A4_LANDSCAPE_PX.height,
        backgroundColor: '#FDF9EC',
        overflow: 'hidden',
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        userSelect: 'none',
      }}
    >
      {/* LAYER 0: DECORATION LAYER (Double Green & Gold Border, Edge Stars, 3D Curled Ribbons) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
      >
        {renderWatermark(true)}
        <svg
          viewBox="0 0 1123 794"
          width="1123"
          height="794"
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id="ribbonGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9A7414" />
              <stop offset="35%" stopColor={goldLight} />
              <stop offset="70%" stopColor={goldDeep} />
              <stop offset="100%" stopColor="#8A650F" />
            </linearGradient>
            <linearGradient id="ribbonGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#07442B" />
              <stop offset="50%" stopColor={forestBright} />
              <stop offset="100%" stopColor={forestDark} />
            </linearGradient>
            <linearGradient id="goldStarGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={goldLight} />
              <stop offset="100%" stopColor={goldDeep} />
            </linearGradient>
          </defs>

          {/* Top-Left Scalloped Deep Green Corner Block */}
          <path d="M 32,28 L 90,28 A 58,58 0 0 1 32,86 Z" fill={forestDark} />

          {/* OUTER DEEP GREEN BORDER (split at 4 midpoints for star clusters) */}
          {/* Top */}
          <line x1="90" y1="28" x2="495" y2="28" stroke={forestDark} strokeWidth="4.5" />
          <line x1="628" y1="28" x2="1030" y2="28" stroke={forestDark} strokeWidth="4.5" />
          {/* Bottom */}
          <line x1="90" y1="766" x2="495" y2="766" stroke={forestDark} strokeWidth="4.5" />
          <line x1="628" y1="766" x2="1030" y2="766" stroke={forestDark} strokeWidth="4.5" />
          {/* Left */}
          <line x1="42" y1="86" x2="42" y2="334" stroke={forestDark} strokeWidth="4.5" />
          <line x1="42" y1="460" x2="42" y2="708" stroke={forestDark} strokeWidth="4.5" />
          {/* Right */}
          <line x1="1081" y1="86" x2="1081" y2="334" stroke={forestDark} strokeWidth="4.5" />
          <line x1="1081" y1="460" x2="1081" y2="708" stroke={forestDark} strokeWidth="4.5" />

          {/* INNER METALLIC GOLD BORDER */}
          {/* Top-left inner scallop */}
          <path
            d="M 55,92 A 54,54 0 0 0 98,42"
            fill="none"
            stroke="url(#ribbonGoldGrad)"
            strokeWidth="2.4"
          />
          <line x1="98" y1="42" x2="495" y2="42" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="628" y1="42" x2="1025" y2="42" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="98" y1="752" x2="495" y2="752" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="628" y1="752" x2="1025" y2="752" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="55" y1="92" x2="55" y2="334" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="55" y1="460" x2="55" y2="702" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="1068" y1="92" x2="1068" y2="334" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />
          <line x1="1068" y1="460" x2="1068" y2="702" stroke="url(#ribbonGoldGrad)" strokeWidth="2.4" />

          {/* FOUR EDGE GOLD STAR CLUSTERS (Top, Bottom, Left, Right) */}
          {/* Top Stars */}
          <polygon points="561.5,14 565.5,24 576,24.8 567.8,31.5 570.4,41.8 561.5,36 552.6,41.8 555.2,31.5 547,24.8 557.5,24" fill="url(#goldStarGrad)" />
          <polygon points="526,22 528.6,28.5 535.5,29 530.2,33.4 531.8,40 526,36.2 520.2,40 521.8,33.4 516.5,29 523.4,28.5" fill="url(#goldStarGrad)" />
          <polygon points="597,22 599.6,28.5 606.5,29 601.2,33.4 602.8,40 597,36.2 591.2,40 592.8,33.4 587.5,29 594.4,28.5" fill="url(#goldStarGrad)" />

          {/* Bottom Stars */}
          <polygon points="561.5,748 565.5,758 576,758.8 567.8,765.5 570.4,775.8 561.5,770 552.6,775.8 555.2,765.5 547,758.8 557.5,758" fill="url(#goldStarGrad)" />
          <polygon points="526,756 528.6,762.5 535.5,763 530.2,767.4 531.8,774 526,770.2 520.2,774 521.8,767.4 516.5,763 523.4,762.5" fill="url(#goldStarGrad)" />
          <polygon points="597,756 599.6,762.5 606.5,763 601.2,767.4 602.8,774 597,770.2 591.2,774 592.8,767.4 587.5,763 594.4,762.5" fill="url(#goldStarGrad)" />

          {/* Left Stars */}
          <polygon points="44,381 48,391 58.5,391.8 50.3,398.5 52.9,408.8 44,403 35.1,408.8 37.7,398.5 29.5,391.8 40,391" fill="url(#goldStarGrad)" />
          <polygon points="44,347 46.6,353.5 53.5,354 48.2,358.4 49.8,365 44,361.2 38.2,365 39.8,358.4 34.5,354 41.4,353.5" fill="url(#goldStarGrad)" />
          <polygon points="44,424 46.6,430.5 53.5,431 48.2,435.4 49.8,442 44,438.2 38.2,442 39.8,435.4 34.5,431 41.4,430.5" fill="url(#goldStarGrad)" />

          {/* Right Stars */}
          <polygon points="1079,381 1083,391 1093.5,391.8 1085.3,398.5 1087.9,408.8 1079,403 1070.1,408.8 1072.7,398.5 1064.5,391.8 1075,391" fill="url(#goldStarGrad)" />
          <polygon points="1079,347 1081.6,353.5 1088.5,354 1083.2,358.4 1084.8,365 1079,361.2 1073.2,365 1074.8,358.4 1069.5,354 1076.4,353.5" fill="url(#goldStarGrad)" />
          <polygon points="1079,424 1081.6,430.5 1088.5,431 1083.2,435.4 1084.8,442 1079,438.2 1073.2,442 1074.8,435.4 1069.5,431 1076.4,430.5" fill="url(#goldStarGrad)" />

          {/* TOP-RIGHT CURLED GREEN & GOLD CORNER RIBBON */}
          <g>
            <path d="M 850,0 L 1123,0 L 1123,275 C 1072,222 1030,188 1018,142 C 1004,88 948,46 850,0 Z" fill={forestDark} opacity="0.92" />
            <path
              d="M 845,0 C 920,18 955,68 978,94 C 1004,122 1038,108 1054,132 C 1072,158 1044,198 1123,286 L 1123,240 C 1062,180 1074,142 1052,110 C 1026,72 992,82 964,52 C 942,28 920,8 886,0 Z"
              fill="url(#ribbonGreenGrad)"
              stroke="url(#ribbonGoldGrad)"
              strokeWidth="5"
            />
            {/* Gold curled loop fold */}
            <path
              d="M 988,68 C 1006,36 1046,38 1066,68 C 1080,90 1064,124 1036,134 L 1016,104 C 1032,96 1034,78 1022,70 C 1012,64 1000,72 994,82 Z"
              fill="url(#ribbonGoldGrad)"
              stroke="#7A5A0A"
              strokeWidth="1.2"
            />
            <path
              d="M 998,136 C 1018,120 1058,126 1123,212 L 1123,262 C 1052,188 1012,174 996,154 Z"
              fill="url(#ribbonGreenGrad)"
              stroke="url(#ribbonGoldGrad)"
              strokeWidth="4"
            />
          </g>

          {/* BOTTOM-LEFT CURLED GREEN & GOLD CORNER RIBBON */}
          <g>
            <path d="M 0,530 L 0,794 L 240,794 C 180,750 132,712 96,656 C 58,596 28,560 0,530 Z" fill={forestDark} opacity="0.92" />
            <path
              d="M 0,520 C 34,580 70,636 86,676 C 104,720 156,746 238,794 L 182,794 C 120,756 80,724 60,680 C 42,640 20,602 0,564 Z"
              fill="url(#ribbonGreenGrad)"
              stroke="url(#ribbonGoldGrad)"
              strokeWidth="5"
            />
            <path
              d="M 28,708 C 52,690 88,704 108,736 C 122,758 106,778 86,776 C 68,774 44,748 24,734 Z"
              fill="url(#ribbonGoldGrad)"
              stroke="#7A5A0A"
              strokeWidth="1.2"
            />
          </g>

          {/* BOTTOM-RIGHT CURLED GREEN & GOLD CORNER RIBBON */}
          <g>
            <path d="M 1123,530 L 1123,794 L 883,794 C 943,750 991,712 1027,656 C 1065,596 1095,560 1123,530 Z" fill={forestDark} opacity="0.92" />
            <path
              d="M 1123,520 C 1089,580 1053,636 1037,676 C 1019,720 967,746 885,794 L 941,794 C 1003,756 1043,724 1063,680 C 1081,640 1103,602 1123,564 Z"
              fill="url(#ribbonGreenGrad)"
              stroke="url(#ribbonGoldGrad)"
              strokeWidth="5"
            />
            <path
              d="M 1095,708 C 1071,690 1035,704 1015,736 C 1001,758 1017,778 1037,776 C 1055,774 1079,748 1099,734 Z"
              fill="url(#ribbonGoldGrad)"
              stroke="#7A5A0A"
              strokeWidth="1.2"
            />
          </g>
        </svg>
      </div>

      {renderCertificateNumberAndQr()}

      {/* LAYER 1: CONTENT LAYER */}
      <div
        ref={safeZoneRef}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          padding: `${template.zones.paddingTop}px ${template.zones.paddingRight}px ${template.zones.paddingBottom}px ${template.zones.paddingLeft}px`,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          ref={contentInnerRef}
          style={{
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            textAlign: 'center',
          }}
        >
          {/* Logo + Elegant Serif School Name + Address */}
          <div
            data-cert-block="school-header"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              width: '100%',
            }}
          >
            {schoolLogo && (
              <img
                src={schoolLogo}
                alt={schoolName}
                crossOrigin="anonymous"
                style={{
                  height: 92,
                  maxWidth: 160,
                  objectFit: 'contain',
                  marginBottom: 4,
                }}
              />
            )}
            <div
              style={{
                fontFamily: template.fonts.schoolName,
                fontSize: '2.15em',
                fontWeight: 700,
                color: forestDark,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                lineHeight: 1.15,
              }}
            >
              {schoolName}
            </div>
            {schoolAddress && (
              <div
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: '0.88em',
                  fontWeight: 500,
                  color: '#1F2937',
                }}
              >
                {schoolAddress}
              </div>
            )}
          </div>

          {/* Title + Presented To + Recipient Name on Line + Citation + Event Row */}
          <div
            data-cert-block="main-body"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isSchoolLeaving ? 6 : 10,
            }}
          >
            <div
              dir={isUrduCert ? 'rtl' : 'ltr'}
              style={{
                fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.title,
                fontSize: isUrduCert ? '2.55em' : '2.45em',
                fontWeight: 700,
                color: '#0A0A0A',
                letterSpacing: isUrduCert ? '0' : '0.04em',
                lineHeight: 1.15,
                textTransform: 'uppercase',
              }}
            >
              {cert.certificateTitle || 'CERTIFICATE OF APPRECIATION'}
            </div>

            <div
              dir={isUrduCert ? 'rtl' : 'ltr'}
              style={{
                fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.subtitle,
                fontSize: '1.52em',
                fontStyle: isUrduCert ? 'normal' : 'italic',
                fontWeight: 500,
                color: '#1F2937',
                lineHeight: 1.2,
              }}
            >
              {cert.subtitle || 'is proudly presented to'}
            </div>

            {/* Recipient Name on Crisp Horizontal Line */}
            <div
              style={{
                width: '100%',
                maxWidth: 660,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginTop: 2,
              }}
            >
              <div
                ref={nameRef}
                dir={isUrduName ? 'rtl' : 'ltr'}
                style={{
                  fontFamily: isUrduName ? template.fonts.recipientUrdu : template.fonts.recipient,
                  fontSize: `${fittedNamePx}px`,
                  fontWeight: 700,
                  color: '#0F172A',
                  lineHeight: isUrduName ? 1.45 : 1.15,
                  paddingBottom: 4,
                  maxWidth: '100%',
                  wordBreak: 'break-word',
                }}
              >
                {cert.recipientName || 'Recipient Name'}
              </div>
              <div
                style={{
                  width: '92%',
                  borderBottom: '1.4px solid #334155',
                }}
              />
            </div>

            {isSchoolLeaving ? (
              renderSchoolLeavingGrid()
            ) : (
              <>
                <p
                  dir={isUrduCert ? 'rtl' : 'ltr'}
                  style={{
                    fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.body,
                    fontSize: isUrduCert ? '1.1em' : '1.38em',
                    lineHeight: isUrduCert ? 1.85 : 1.38,
                    color: '#111827',
                    maxWidth: 740,
                    margin: '2px 0 0 0',
                  }}
                >
                  {renderedPara1}
                </p>

                {/* Bold Capitals Event Name Flanked by Laurel / Torch / Runner SVG Icons */}
                {renderedEvent && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 14,
                      marginTop: 4,
                      maxWidth: '100%',
                    }}
                  >
                    {/* Left Laurel + Torch SVG */}
                    <svg width="46" height="32" viewBox="0 0 46 32" aria-hidden="true" style={{ flexShrink: 0 }}>
                      <path
                        d="M14,29 C6,24 3,15 6,5 C9,11 11,16 14,21 C10,16 10,10 13,6 C14,12 16,18 19,25"
                        fill="none"
                        stroke={forestDark}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="14" r="2.2" fill={forestDark} />
                      <circle cx="11" cy="21" r="2.2" fill={forestDark} />
                      <circle cx="15" cy="26" r="2.2" fill={forestDark} />
                      {/* Torch */}
                      <polygon points="31,14 39,14 36.5,30 33.5,30" fill={forestDark} />
                      <path d="M35,2 C38,6 39,10 35,13 C31,10 32,6 35,2 Z" fill={forestBright} />
                    </svg>

                    <span
                      dir={isUrduCert ? 'rtl' : 'ltr'}
                      style={{
                        fontFamily: isUrduCert ? template.fonts.recipientUrdu : template.fonts.title,
                        fontSize: isUrduCert ? '1.55em' : '1.78em',
                        fontWeight: 800,
                        color: '#0A0A0A',
                        letterSpacing: isUrduCert ? '0' : '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {renderedEvent}
                    </span>

                    {/* Right Runner + Laurel SVG */}
                    <svg width="46" height="32" viewBox="0 0 46 32" aria-hidden="true" style={{ flexShrink: 0 }}>
                      {/* Runner */}
                      <circle cx="14" cy="6" r="2.6" fill={forestDark} />
                      <path
                        d="M13,10 L17,14 L12,20 L6,26 M17,14 L22,19 L20,27 M10,12 L15,11 L21,13"
                        fill="none"
                        stroke={forestDark}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Right Laurel */}
                      <path
                        d="M32,29 C40,24 43,15 40,5 C37,11 35,16 32,21 C36,16 36,10 33,6 C32,12 30,18 27,25"
                        fill="none"
                        stroke={forestDark}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <circle cx="38" cy="14" r="2.2" fill={forestDark} />
                      <circle cx="35" cy="21" r="2.2" fill={forestDark} />
                      <circle cx="31" cy="26" r="2.2" fill={forestDark} />
                    </svg>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Date (Left) & Principal (Right) */}
          <div
            data-cert-block="signatures"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              paddingTop: 10,
              paddingLeft: 18,
              paddingRight: 18,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                fontFamily: template.fonts.signature,
                fontSize: '1.22em',
                color: '#111827',
              }}
            >
              <span>{cert.signatory3Title || (isUrduCert ? 'تاریخ:' : 'Date:')}</span>
              <span
                style={{
                  display: 'inline-block',
                  minWidth: 165,
                  borderBottom: '1.3px solid #1F2937',
                  textAlign: 'center',
                  fontSize: '0.88em',
                  fontWeight: 600,
                  paddingBottom: 2,
                }}
              >
                {formattedIssueDate}
              </span>
            </div>

            <div style={{ width: 220, textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: template.fonts.signature,
                  fontSize: '0.95em',
                  fontWeight: 600,
                  color: '#334155',
                  minHeight: 18,
                  marginBottom: 4,
                }}
              >
                {cert.signatory1Name || ''}
              </div>
              <div style={{ borderTop: '1.3px solid #1F2937', paddingTop: 5 }}>
                <span
                  style={{
                    fontFamily: template.fonts.signature,
                    fontSize: '1.22em',
                    color: '#111827',
                  }}
                >
                  {cert.signatory1Title || (isUrduCert ? 'پرنسپل:' : 'Principal:')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
