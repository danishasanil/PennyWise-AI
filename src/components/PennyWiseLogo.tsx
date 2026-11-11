import React from 'react';

export interface PennyWiseLogoProps {
  variant?: 'full' | 'symbol' | 'app-icon' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  theme?: 'light' | 'dark';
  className?: string;
  showTagline?: boolean;
}

/**
 * PennyWise AI Official Brand Logo
 * 
 * An original, distinctive abstract mark combining:
 * 1. Stylized Coin Arc: Circular financial foundation & wealth security
 * 2. Ascending Growth Arrow: Financial momentum & positive upward trajectory
 * 3. AI Intelligence Sparkle: Four-point guiding star at the growth apex
 */
export const PennyWiseLogo: React.FC<PennyWiseLogoProps> = ({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className = '',
  showTagline = false,
}) => {
  // Determine pixel size
  let pixelSize = 32;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'xs':
        pixelSize = 20;
        break;
      case 'sm':
        pixelSize = 28;
        break;
      case 'md':
        pixelSize = 36;
        break;
      case 'lg':
        pixelSize = 48;
        break;
      case 'xl':
        pixelSize = 64;
        break;
    }
  }

  // Unique gradient ID prefix to avoid SVG DOM collisions
  const gradientId = `pw-logo-grad-${theme}`;
  const starGradientId = `pw-star-grad-${theme}`;
  const coinGradId = `pw-coin-grad-${theme}`;

  // SVG Symbol Core
  const Symbol = (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
      aria-label="PennyWise AI Brand Mark"
    >
      <defs>
        {/* Main Growth Trajectory Gradient */}
        <linearGradient id={gradientId} x1="8" y1="40" x2="38" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#064E3B" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Coin Foundation Arc Gradient */}
        <linearGradient id={coinGradId} x1="10" y1="12" x2="38" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>

        {/* AI Sparkle Apex Radiant Gradient */}
        <linearGradient id={starGradientId} x1="31" y1="7" x2="41" y2="17" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="60%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        {/* Subtle drop glow for the AI star */}
        <filter id="ai-glow" x="26" y="2" width="20" height="20" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Stylized Outer Coin Arc (Cradling Financial Base) */}
      <path
        d="M 17 9.5 C 10.5 12.5 6 19 6 26.5 C 6 36.16 13.84 44 23.5 44 C 33.16 44 41 36.16 41 26.5 C 41 22.8 39.8 19.4 37.8 16.5"
        stroke={`url(#${coinGradId})`}
        strokeWidth="3.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 2. Inner Coin Minting Ridge Arc */}
      <path
        d="M 19 14.5 C 14.5 17 11.5 21.8 11.5 27.2 C 11.5 34.5 17.2 40.2 24.5 40.2 C 31.8 40.2 37.2 34.5 37.2 27.2 C 37.2 24.8 36.5 22.5 35.2 20.5"
        stroke={theme === 'dark' ? '#34D399' : '#059669'}
        strokeWidth="1.5"
        strokeOpacity="0.4"
        strokeLinecap="round"
        strokeDasharray="2 3"
      />

      {/* 3. Upward Financial Progress Arrow (Ascending Growth Path) */}
      <path
        d="M 14 33 C 16.5 29 20.5 23 29.5 17.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Dynamic Arrowhead */}
      <path
        d="M 23 16.5 L 31.5 16 L 31 24.5"
        stroke={`url(#${gradientId})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Center Micro Financial Seed/Pillar Accent */}
      <circle cx="21" cy="28" r="2.25" fill={theme === 'dark' ? '#34D399' : '#047857'} />

      {/* 5. AI Guiding Sparkle Star at the Summit (Intelligence & Advisory) */}
      <path
        d="M 37 6 C 37 9.2 39.8 12 43 12 C 39.8 12 37 14.8 37 18 C 37 14.8 34.2 12 31 12 C 34.2 12 37 9.2 37 6 Z"
        fill={`url(#${starGradientId})`}
        filter="url(#ai-glow)"
      />
    </svg>
  );

  // App Icon variation: Symbol centered inside an elegant squircle
  if (variant === 'app-icon') {
    return (
      <div
        className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#164E3A] via-[#103D2E] to-[#062D21] border border-emerald-500/20 shadow-md shadow-emerald-950/20 overflow-hidden ${className}`}
        style={{ width: pixelSize * 1.35, height: pixelSize * 1.35 }}
      >
        {/* Subtle interior lens reflection */}
        <div className="absolute inset-0 bg-radial from-white/15 to-transparent pointer-events-none" />
        {Symbol}
      </div>
    );
  }

  // Symbol-only variation
  if (variant === 'symbol') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {Symbol}
      </div>
    );
  }

  // Badge variation (Symbol + small text badge)
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/70 ${className}`}
      >
        <div className="scale-75 -ml-1">{Symbol}</div>
        <span className="text-xs font-semibold text-emerald-900 tracking-tight">PennyWise AI</span>
      </div>
    );
  }

  // Full Primary Logo: Symbol + Wordmark
  const isDark = theme === 'dark';
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {Symbol}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1">
          <span
            className={`font-extrabold tracking-tight font-sans ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            style={{ fontSize: Math.max(14, pixelSize * 0.52) }}
          >
            PennyWise
          </span>
          <span
            className="font-bold tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] uppercase ring-1 ring-emerald-500/20"
            style={{ fontSize: Math.max(9, pixelSize * 0.28) }}
          >
            AI
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[10px] tracking-tight mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Personal Finance Companion
          </span>
        )}
      </div>
    </div>
  );
};

export default PennyWiseLogo;
