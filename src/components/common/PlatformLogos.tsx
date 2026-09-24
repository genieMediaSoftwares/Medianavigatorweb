import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'subtle' | 'original';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

export const InstagramLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'light' 
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${sizeClasses[size]} ${className}`}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="ig-light-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity={variant === 'subtle' ? '0.7' : '0.9'} />
          <stop offset="35%" stopColor="#EC4899" stopOpacity={variant === 'subtle' ? '0.75' : '0.95'} />
          <stop offset="70%" stopColor="#8B5CF6" stopOpacity={variant === 'subtle' ? '0.8' : '0.95'} />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity={variant === 'subtle' ? '0.75' : '0.9'} />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5.5"
        stroke={variant === 'light' || variant === 'subtle' ? 'url(#ig-light-grad)' : 'currentColor'}
      />
      <circle
        cx="12"
        cy="12"
        r="4.5"
        stroke={variant === 'light' || variant === 'subtle' ? 'url(#ig-light-grad)' : 'currentColor'}
      />
      <circle
        cx="17.5"
        cy="6.5"
        r="1.2"
        fill={variant === 'light' || variant === 'subtle' ? '#EC4899' : 'currentColor'}
      />
    </svg>
  );
};

export const YouTubeLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'light' 
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
    >
      <path
        d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"
        fill={variant === 'subtle' ? '#FCA5A5' : '#EF4444'}
        fillOpacity={variant === 'subtle' ? '0.85' : '0.95'}
      />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="#FFFFFF" />
    </svg>
  );
};

export const LinkedInLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'light' 
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="4.5"
        fill={variant === 'subtle' ? '#7DD3FC' : '#0284C7'}
        fillOpacity={variant === 'subtle' ? '0.85' : '0.95'}
      />
      <path
        d="M7 9v8M7 6.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M11.5 17v-5.2c0-1.5 1-2.3 2.3-2.3s2.2.8 2.2 2.3V17M11.5 12.5a3 3 0 0 1 4.5 0"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const FacebookLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'light' 
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${sizeClasses[size]} ${className}`}
      fill="none"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        fill={variant === 'subtle' ? '#93C5FD' : '#2563EB'}
        fillOpacity={variant === 'subtle' ? '0.85' : '0.95'}
      />
      <path
        d="M15.5 12h-2.5v7h-3v-7H8v-2.5h2V7.8C10 5.6 11.3 4 14 4h2v2.8h-1.3c-1 0-1.2.5-1.2 1.2V9.5h2.5L15.5 12z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
