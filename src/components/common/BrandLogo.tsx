import React from 'react';

/** Compass-needle mark on an orange tile. `compact` hides the wordmark. */
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <span className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand shrink-0 ${className}`}>
    <svg viewBox="0 0 24 24" fill="none" className="w-[58%] h-[58%]" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.6" />
      <path d="M15.8 8.2 13.4 13.4 8.2 15.8 10.6 10.6 15.8 8.2Z" fill="currentColor" />
    </svg>
  </span>
);

export const BrandLogo: React.FC<{ collapsed?: boolean; compact?: boolean; onClick?: () => void; className?: string; tone?: 'dark' | 'light' }> = ({
  collapsed, compact, onClick, className = '', tone = 'dark',
}) => {
  const hideText = collapsed || compact;
  const Tag: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={`inline-flex items-center gap-2.5 select-none text-left ${onClick ? 'cursor-pointer' : ''} ${className}`} aria-label={onClick ? 'Media Navigator home' : undefined}>
      <BrandMark />
      {!hideText && (
        <span className={`text-[17px] font-extrabold tracking-tight leading-none ${tone === 'light' ? 'text-white' : 'text-ink'}`}>
          Media<span className="text-brand-500">Navigator</span>
        </span>
      )}
    </Tag>
  );
};
