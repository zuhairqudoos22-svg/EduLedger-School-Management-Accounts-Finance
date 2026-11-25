import React, { useState } from 'react';

export interface EduLedgerLogoProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  fallbackTextClassName?: string;
}

/**
 * Resilient EduLedger application logo.
 * Renders the icon image with explicit dimensions and automatically falls back
 * to the original "EL" monogram badge if the image asset is missing or fails to load,
 * preventing broken-image icons or raw alt text from ever appearing.
 */
export const EduLedgerLogo: React.FC<EduLedgerLogoProps> = ({
  src = '/pwa-192x192.png',
  alt = 'EduLedger Logo',
  size = 36,
  className = 'w-9 h-9 rounded-xl shadow-md shadow-indigo-600/30 object-contain shrink-0',
  fallbackTextClassName = 'text-sm',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={`inline-flex items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-black tracking-tight select-none ${fallbackTextClassName} ${className}`}
      >
        EL
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      onError={() => setHasError(true)}
      className={className}
    />
  );
};
