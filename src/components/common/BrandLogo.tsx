import React from 'react';

export const BrandLogo: React.FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Abstract navigation / orbit icon with modern sky/cyan gradient */}
      <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0284C7] to-[#06B6D4] flex items-center justify-center shadow-xs text-white shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-4.5 h-4.5 text-white"
          strokeWidth="1.75"
        >
          {/* Subtle orbital ring */}
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
          />
          {/* Elliptical tilted orbit */}
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="4.5"
            stroke="currentColor"
            strokeOpacity="0.8"
            transform="rotate(-28 12 12)"
          />
          {/* Central guidance node */}
          <circle cx="12" cy="12" r="2.2" fill="white" />
          {/* Navigational direction pointer */}
          <path
            d="M12 4.5L13.5 8.5L12 7.8L10.5 8.5L12 4.5Z"
            fill="white"
          />
        </svg>
      </div>

      {!collapsed && (
        <div className="flex flex-col">
          <span className="text-[13px] font-extrabold tracking-[0.08em] text-[#0B132B] uppercase leading-none font-sans">
            Media Navigator
          </span>
          <span className="text-[10px] tracking-wider text-[#64748B] font-semibold mt-0.5">
            Command Center
          </span>
        </div>
      )}
    </div>
  );
};
