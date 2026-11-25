import React, { useState } from 'react';
import { BRANDING_CONFIG } from '../../config/branding';
import { useTranslation } from '../../i18n';

export type DeveloperLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
export type DeveloperLogoResolution = '128' | '256' | '512';

export interface DeveloperLogoProps {
  size?: DeveloperLogoSize;
  resolution?: DeveloperLogoResolution;
  showCredit?: boolean;
  creditVariant?: 'developedBy' | 'poweredBy' | 'compact' | 'none';
  showLink?: boolean;
  className?: string;
  badgeClassName?: string;
  loading?: 'lazy' | 'eager';
  isForPrint?: boolean;
}

const SIZE_MAP: Record<string, { px: number; badgePadding: string; textSize: string }> = {
  xs: { px: 18, badgePadding: 'p-0.5', textSize: 'text-[9px]' },
  sm: { px: 24, badgePadding: 'p-0.5', textSize: 'text-[10px]' },
  md: { px: 32, badgePadding: 'p-1', textSize: 'text-xs' },
  lg: { px: 64, badgePadding: 'p-1.5', textSize: 'text-sm' },
  xl: { px: 112, badgePadding: 'p-2', textSize: 'text-base' },
};

export const DeveloperLogo: React.FC<DeveloperLogoProps> = ({
  size = 'md',
  resolution,
  showCredit = false,
  creditVariant = 'developedBy',
  showLink = false,
  className = '',
  badgeClassName = '',
  loading = 'lazy',
  isForPrint = false,
}) => {
  const { t } = useTranslation();
  const [imgErrorLevel, setImgErrorLevel] = useState<0 | 1 | 2>(0); // 0 = original, 1 = fallback dataUri, 2 = text-only

  const sizeConfig = typeof size === 'number'
    ? { px: size, badgePadding: 'p-1', textSize: size < 24 ? 'text-[9px]' : 'text-xs' }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const targetPx = sizeConfig.px;

  // For print or large sizes, select high-DPI assets (256 or 512)
  const effectiveResolution: '128' | '256' | '512' =
    resolution || (isForPrint || targetPx >= 64 ? '512' : targetPx > 28 ? '256' : '128');

  const asset = BRANDING_CONFIG.logos[effectiveResolution];

  // Primary source vs data URI fallback
  const webpSrc = imgErrorLevel === 0 ? asset.webp : BRANDING_CONFIG.fallbackDataUri128;
  const jpgSrc = imgErrorLevel === 0 ? asset.jpg : BRANDING_CONFIG.fallbackDataUri128;

  const handleImgError = () => {
    if (imgErrorLevel === 0) {
      console.warn(`[NextGenAI Branding] Primary logo asset failed to load (${asset.jpg}), switching to embedded offline data URI fallback.`);
      setImgErrorLevel(1);
    } else if (imgErrorLevel === 1) {
      console.warn('[NextGenAI Branding] Data URI logo rendering failed, switching to accessible text-only NextGenAI badge.');
      setImgErrorLevel(2);
    }
  };

  const getCreditText = () => {
    switch (creditVariant) {
      case 'poweredBy':
        return t('credit.poweredBy', 'Powered by NextGenAI');
      case 'compact':
        return 'NextGenAI';
      case 'developedBy':
      default:
        return t('credit.developedBy', 'Developed by NextGenAI');
    }
  };

  const badgeContent = (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title={BRANDING_CONFIG.creditText}
    >
      {/* Dark charcoal rounded badge housing the NextGenAI logo */}
      <div
        className={`relative inline-flex items-center justify-center shrink-0 rounded-xl bg-[#0b0f19] border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden ${
          isForPrint ? 'print-badge' : ''
        } ${sizeConfig.badgePadding} ${badgeClassName}`}
        style={{
          width: targetPx + 8,
          height: targetPx + 8,
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}
      >
        {imgErrorLevel < 2 ? (
          <picture className="w-full h-full flex items-center justify-center">
            <source type="image/webp" srcSet={webpSrc} />
            <img
              src={jpgSrc}
              alt="NextGenAI logo"
              width={targetPx}
              height={targetPx}
              loading={loading}
              onError={handleImgError}
              className="w-full h-full object-contain rounded-lg aspect-square"
              style={{
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              }}
            />
          </picture>
        ) : (
          <span className="font-black text-white text-[10px] tracking-tighter">
            AI
          </span>
        )}
      </div>

      {showCredit && (
        <span
          className={`font-semibold tracking-tight text-slate-600 dark:text-slate-300 ${sizeConfig.textSize} ${
            isForPrint ? 'text-slate-700' : ''
          }`}
        >
          {getCreditText()}
        </span>
      )}
    </div>
  );

  if (showLink && BRANDING_CONFIG.websiteUrl) {
    return (
      <a
        href={BRANDING_CONFIG.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center hover:opacity-85 transition-opacity cursor-pointer group"
        title={`${BRANDING_CONFIG.creditText} — ${BRANDING_CONFIG.websiteUrl}`}
      >
        {badgeContent}
      </a>
    );
  }

  return badgeContent;
};
