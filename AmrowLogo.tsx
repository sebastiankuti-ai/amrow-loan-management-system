import React from "react";

interface LogoProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export const AmrowLogoLight: React.FC<LogoProps> = ({ className = "", height = "auto", width = "100%" }) => {
  return (
    <svg
      id="amrow-logo-light"
      viewBox="0 0 800 240"
      width={width}
      height={height}
      className={`${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Shiny gold gradient */}
        <linearGradient id="goldGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#AA771C" />
          <stop offset="25%" stopColor="#F3E5AB" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="75%" stopColor="#FFDF00" />
          <stop offset="100%" stopColor="#8A5A00" />
        </linearGradient>

        {/* Metallic blue gradient */}
        <linearGradient id="blueGradientLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B1C3F" />
          <stop offset="50%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Shadow filter for 3D depth */}
        <filter id="dropShadowLight" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#dropShadowLight)">
        {/* Logo Icon (Triangle + Bars) */}
        <g id="logo-symbol" transform="translate(15, 10)">
          {/* Left Blue Leg of Triangle */}
          <path
            d="M 110 20 L 30 170 L 60 170 L 110 75 Z"
            fill="url(#blueGradientLight)"
          />
          <path
            d="M 110 75 L 140 130 L 165 110 Z"
            fill="url(#blueGradientLight)"
            opacity="0.9"
          />

          {/* Right Gold Leg of Triangle */}
          <path
            d="M 110 20 L 180 155 L 210 170 L 140 35 Z"
            fill="url(#goldGradientLight)"
          />

          {/* 3 Rising Gold Bars */}
          <rect x="75" y="130" width="12" height="25" rx="2" fill="url(#goldGradientLight)" />
          <rect x="95" y="110" width="12" height="45" rx="2" fill="url(#goldGradientLight)" />
          <rect x="115" y="85" width="12" height="70" rx="2" fill="url(#goldGradientLight)" />

          {/* Rising Gold Swoosh / Arrow */}
          <path
            d="M 25 170 Q 110 150 210 50 Q 150 120 70 170 Z"
            fill="url(#goldGradientLight)"
          />
          {/* Base support line */}
          <path
            d="M 70 162 L 132 162 L 132 165 L 70 165 Z"
            fill="url(#goldGradientLight)"
          />
        </g>

        {/* Brand Name Text: AMROW */}
        <text
          x="245"
          y="118"
          fill="url(#blueGradientLight)"
          fontSize="82"
          fontWeight="900"
          fontFamily="'Inter', 'Space Grotesk', system-ui, sans-serif"
          letterSpacing="4"
        >
          AMROW
        </text>

        {/* Subtitle: — CAPITAL LTD — */}
        <g id="subtitle" transform="translate(245, 138)">
          {/* Left divider line */}
          <line x1="0" y1="20" x2="60" y2="20" stroke="url(#goldGradientLight)" strokeWidth="3" />
          
          <text
            x="75"
            y="26"
            fill="url(#goldGradientLight)"
            fontSize="26"
            fontWeight="bold"
            fontFamily="'Inter', 'Space Grotesk', system-ui, sans-serif"
            letterSpacing="8"
          >
            CAPITAL LTD
          </text>

          {/* Right divider line */}
          <line x1="420" y1="20" x2="480" y2="20" stroke="url(#goldGradientLight)" strokeWidth="3" />
        </g>

        {/* Tagline: EMPOWERING GROWTH. FINANCING DREAMS. */}
        <text
          x="245"
          y="202"
          fill="#475569"
          fontSize="15"
          fontWeight="bold"
          fontFamily="'Inter', 'JetBrains Mono', system-ui, sans-serif"
          letterSpacing="5"
        >
          EMPOWERING GROWTH. FINANCING DREAMS.
        </text>
      </g>
    </svg>
  );
};

export const AmrowLogoDark: React.FC<LogoProps> = ({ className = "", height = "auto", width = "100%" }) => {
  return (
    <svg
      id="amrow-logo-dark"
      viewBox="0 0 800 240"
      width={width}
      height={height}
      className={`${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Super premium gold gradient */}
        <linearGradient id="goldGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C5A059" />
          <stop offset="30%" stopColor="#FCEBB6" />
          <stop offset="50%" stopColor="#D4AF37" />
          <stop offset="75%" stopColor="#F3E5AB" />
          <stop offset="100%" stopColor="#9A7B3E" />
        </linearGradient>

        {/* Metallic blue gradient with bright blue core */}
        <linearGradient id="blueGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="40%" stopColor="#3B82F6" />
          <stop offset="70%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>

        {/* Glow and Drop Shadow filters for high-contrast dark theme */}
        <filter id="dropShadowDark" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.6" />
        </filter>
        
        <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <g filter="url(#dropShadowDark)">
        {/* Logo Icon (Triangle + Bars) */}
        <g id="logo-symbol-dark" transform="translate(15, 10)">
          {/* Left Blue Leg of Triangle */}
          <path
            d="M 110 20 L 30 170 L 60 170 L 110 75 Z"
            fill="url(#blueGradientDark)"
          />
          <path
            d="M 110 75 L 140 130 L 165 110 Z"
            fill="url(#blueGradientDark)"
            opacity="0.8"
          />

          {/* Right Gold Leg of Triangle */}
          <path
            d="M 110 20 L 180 155 L 210 170 L 140 35 Z"
            fill="url(#goldGradientDark)"
            filter="url(#goldGlow)"
          />

          {/* 3 Rising Gold Bars */}
          <rect x="75" y="130" width="12" height="25" rx="2" fill="url(#goldGradientDark)" />
          <rect x="95" y="110" width="12" height="45" rx="2" fill="url(#goldGradientDark)" />
          <rect x="115" y="85" width="12" height="70" rx="2" fill="url(#goldGradientDark)" />

          {/* Rising Gold Swoosh / Arrow */}
          <path
            d="M 25 170 Q 110 150 210 50 Q 150 120 70 170 Z"
            fill="url(#goldGradientDark)"
            filter="url(#goldGlow)"
          />
          {/* Base support line */}
          <path
            d="M 70 162 L 132 162 L 132 165 L 70 165 Z"
            fill="url(#goldGradientDark)"
          />
        </g>

        {/* Brand Name Text: AMROW */}
        <text
          x="245"
          y="118"
          fill="url(#blueGradientDark)"
          fontSize="82"
          fontWeight="900"
          fontFamily="'Inter', 'Space Grotesk', system-ui, sans-serif"
          letterSpacing="4"
        >
          AMROW
        </text>

        {/* Subtitle: — CAPITAL LTD — */}
        <g id="subtitle-dark" transform="translate(245, 138)">
          {/* Left divider line */}
          <line x1="0" y1="20" x2="60" y2="20" stroke="url(#goldGradientDark)" strokeWidth="3" />
          
          <text
            x="75"
            y="26"
            fill="url(#goldGradientDark)"
            fontSize="26"
            fontWeight="bold"
            fontFamily="'Inter', 'Space Grotesk', system-ui, sans-serif"
            letterSpacing="8"
            filter="url(#goldGlow)"
          >
            CAPITAL LTD
          </text>

          {/* Right divider line */}
          <line x1="420" y1="20" x2="480" y2="20" stroke="url(#goldGradientDark)" strokeWidth="3" />
        </g>

        {/* Tagline: EMPOWERING GROWTH. FINANCING DREAMS. */}
        <text
          x="245"
          y="202"
          fill="#94A3B8"
          fontSize="15"
          fontWeight="bold"
          fontFamily="'Inter', 'JetBrains Mono', system-ui, sans-serif"
          letterSpacing="5"
        >
          EMPOWERING GROWTH. FINANCING DREAMS.
        </text>
      </g>
    </svg>
  );
};
