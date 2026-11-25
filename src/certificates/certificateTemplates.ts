import { CertificateDesignId } from '../types';

/**
 * Default school profile fallback text used ONLY if Settings > School Profile fields are empty.
 * School name, address, and logo always load dynamically from Settings > School Profile first.
 */
export const DEFAULT_CERTIFICATE_SCHOOL_FALLBACK = {
  schoolName: 'The Habitat School System',
  schoolAddress: 'Building No. 1, Street No. 5, Main Sadiq Canal Road, Chack 11 East, Rahim Yar Khan',
};

/**
 * Exact A4 Landscape dimensions at 96 DPI:
 * 297 mm x 210 mm = 1123 px x 794 px.
 * Minimum mandatory clearance between decoration layer and content layer: 8 mm (~30 px).
 */
export const A4_LANDSCAPE_MM = { width: 297, height: 210 } as const;
export const A4_LANDSCAPE_PX = { width: 1123, height: 794 } as const;
export const SAFE_CLEARANCE_PX = 31; // >= 8 mm at 96 dpi

export interface CertificateSafeZones {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  certNumberSlot: 'bottom-left' | 'top-right' | 'top-left';
  qrSlot: 'bottom-right' | 'bottom-left' | 'top-left' | 'top-right';
}

export interface CertificateDesignPalette {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  textPrimary: string;
  textSecondary: string;
  goldStart: string;
  goldEnd: string;
}

export interface CertificateDesignFonts {
  title: string;
  subtitle: string;
  schoolName: string;
  recipient: string;
  recipientUrdu: string;
  body: string;
  signature: string;
}

export interface CertificateDesignTemplate {
  id: CertificateDesignId;
  code: 'A' | 'B' | 'C';
  name: string;
  shortTag: string;
  description: string;
  orientation: 'landscape';
  size: 'A4';
  widthPx: number;
  heightPx: number;
  palette: CertificateDesignPalette;
  fonts: CertificateDesignFonts;
  zones: CertificateSafeZones;
  decorationLayer: {
    type: 'geometric_triangles' | 'diagonal_stripes' | 'classic_ribbon_gold';
    hasWatermark: boolean;
    hasMedal: boolean;
    hasCornerRibbons: boolean;
  };
  contentLayer: {
    logoPlacement: 'top-right' | 'top-center';
    signatureColumns: 2 | 3;
    supportsEventBadge: boolean;
    supportsEventIcons: boolean;
  };
  previewThumb: {
    bg: string;
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const CERTIFICATE_TEMPLATES: readonly CertificateDesignTemplate[] = [
  {
    id: 'geometric_triangles',
    code: 'A',
    name: 'Geometric Triangles',
    shortTag: 'Design A • Modern',
    description:
      'Crisp white canvas with green, yellow, and black geometric edge triangles, top-right school logo, classic serif heading, bold auto-fit name, and dual signature lines.',
    orientation: 'landscape',
    size: 'A4',
    widthPx: A4_LANDSCAPE_PX.width,
    heightPx: A4_LANDSCAPE_PX.height,
    palette: {
      background: '#FFFFFF',
      primary: '#119947',
      secondary: '#F7B900',
      accent: '#119947',
      dark: '#0A0A0A',
      textPrimary: '#111111',
      textSecondary: '#27272A',
      goldStart: '#F7B900',
      goldEnd: '#E0A100',
    },
    fonts: {
      title: "'Cinzel', 'Playfair Display', Georgia, serif",
      subtitle: "'Montserrat', 'Inter', sans-serif",
      schoolName: "'Montserrat', 'Inter', sans-serif",
      recipient: "'Montserrat', 'Inter', sans-serif",
      recipientUrdu: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif",
      body: "'Montserrat', 'Inter', sans-serif",
      signature: "'Montserrat', 'Inter', sans-serif",
    },
    zones: {
      paddingTop: 64,
      paddingRight: 168,
      paddingBottom: 88,
      paddingLeft: 168,
      certNumberSlot: 'bottom-left',
      qrSlot: 'bottom-left',
    },
    decorationLayer: {
      type: 'geometric_triangles',
      hasWatermark: true,
      hasMedal: false,
      hasCornerRibbons: false,
    },
    contentLayer: {
      logoPlacement: 'top-right',
      signatureColumns: 2,
      supportsEventBadge: false,
      supportsEventIcons: false,
    },
    previewThumb: {
      bg: '#FFFFFF',
      primary: '#119947',
      secondary: '#F7B900',
      accent: '#111111',
    },
  },
  {
    id: 'diagonal_stripes',
    code: 'B',
    name: 'Diagonal Stripes',
    shortTag: 'Design B • Executive',
    description:
      'White canvas framed in fine gold with dark-green, emerald, and gold corner diagonal stripes, event pill badge, bold spaced title, gold star medal, and 3 signature lines.',
    orientation: 'landscape',
    size: 'A4',
    widthPx: A4_LANDSCAPE_PX.width,
    heightPx: A4_LANDSCAPE_PX.height,
    palette: {
      background: '#FFFFFF',
      primary: '#118A3B',
      secondary: '#EAB308',
      accent: '#0B3D1D',
      dark: '#0B3D1D',
      textPrimary: '#0F172A',
      textSecondary: '#4B5563',
      goldStart: '#EAB308',
      goldEnd: '#CA8A04',
    },
    fonts: {
      title: "'Montserrat', 'Inter', sans-serif",
      subtitle: "'Montserrat', 'Inter', sans-serif",
      schoolName: "'Montserrat', 'Inter', sans-serif",
      recipient: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
      recipientUrdu: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif",
      body: "'Montserrat', 'Inter', sans-serif",
      signature: "'Montserrat', 'Inter', sans-serif",
    },
    zones: {
      paddingTop: 48,
      paddingRight: 112,
      paddingBottom: 56,
      paddingLeft: 112,
      certNumberSlot: 'top-right',
      qrSlot: 'top-right',
    },
    decorationLayer: {
      type: 'diagonal_stripes',
      hasWatermark: true,
      hasMedal: true,
      hasCornerRibbons: false,
    },
    contentLayer: {
      logoPlacement: 'top-center',
      signatureColumns: 3,
      supportsEventBadge: true,
      supportsEventIcons: false,
    },
    previewThumb: {
      bg: '#FFFFFF',
      primary: '#0B3D1D',
      secondary: '#118A3B',
      accent: '#EAB308',
    },
  },
  {
    id: 'classic_ribbon_gold',
    code: 'C',
    name: 'Classic Ribbon & Gold',
    shortTag: 'Design C • Ceremonial',
    description:
      'Warm ivory parchment with deep green and metallic gold double border, border stars, curled green-and-gold corner ribbons, classic serif title, and decorative event emblems.',
    orientation: 'landscape',
    size: 'A4',
    widthPx: A4_LANDSCAPE_PX.width,
    heightPx: A4_LANDSCAPE_PX.height,
    palette: {
      background: '#FDF9EC',
      primary: '#0B5D3B',
      secondary: '#C9A227',
      accent: '#1F8A4C',
      dark: '#0A3F29',
      textPrimary: '#0F172A',
      textSecondary: '#1F2937',
      goldStart: '#C9A227',
      goldEnd: '#F5D77A',
    },
    fonts: {
      title: "'Cinzel', 'Playfair Display', Georgia, serif",
      subtitle: "'Cormorant Garamond', Georgia, serif",
      schoolName: "'Cinzel', 'Playfair Display', Georgia, serif",
      recipient: "'Playfair Display', 'Cormorant Garamond', Georgia, serif",
      recipientUrdu: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif",
      body: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
      signature: "'Cormorant Garamond', Georgia, serif",
    },
    zones: {
      paddingTop: 58,
      paddingRight: 138,
      paddingBottom: 68,
      paddingLeft: 138,
      certNumberSlot: 'top-left',
      qrSlot: 'top-left',
    },
    decorationLayer: {
      type: 'classic_ribbon_gold',
      hasWatermark: true,
      hasMedal: false,
      hasCornerRibbons: true,
    },
    contentLayer: {
      logoPlacement: 'top-center',
      signatureColumns: 2,
      supportsEventBadge: false,
      supportsEventIcons: true,
    },
    previewThumb: {
      bg: '#FDF9EC',
      primary: '#0B5D3B',
      secondary: '#C9A227',
      accent: '#1F8A4C',
    },
  },
] as const;

export function getCertificateTemplate(designId?: CertificateDesignId): CertificateDesignTemplate {
  return (
    CERTIFICATE_TEMPLATES.find((t) => t.id === designId) || CERTIFICATE_TEMPLATES[0]
  );
}
