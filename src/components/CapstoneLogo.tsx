import React from 'react';

interface CapstoneLogoProps {
  className?: string;
  variant?: 'horizontal' | 'stacked';
  theme?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CapstoneLogo: React.FC<CapstoneLogoProps> = ({
  className = '',
  variant = 'horizontal',
  theme = 'light',
  size = 'md',
}) => {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const accentColor = '#0070F3'; // Vibrant electric blue matching the Capstone logo

  if (variant === 'stacked') {
    const dimensions = {
      sm: { w: 120, h: 48 },
      md: { w: 160, h: 64 },
      lg: { w: 200, h: 80 },
      xl: { w: 260, h: 104 },
    }[size] || { w: 160, h: 64 };

    return (
      <svg
        viewBox="0 0 240 96"
        width={dimensions.w}
        height={dimensions.h}
        className={`select-none ${className}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Line 1: C ▲ PSTONE */}
        <g transform="translate(10, 42)">
          {/* C */}
          <text
            x="0"
            y="0"
            fontFamily="system-ui, -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif"
            fontWeight="900"
            fontSize="40"
            letterSpacing="-0.5px"
            fill={textColor}
          >
            C
          </text>
          {/* Blue Triangle for A */}
          <polygon
            points="37,0 52,-34 67,0"
            fill={accentColor}
          />
          {/* PSTONE */}
          <text
            x="72"
            y="0"
            fontFamily="system-ui, -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif"
            fontWeight="900"
            fontSize="40"
            letterSpacing="-0.5px"
            fill={textColor}
          >
            PSTONE
          </text>
        </g>

        {/* Line 2: PAINTING */}
        <text
          x="120"
          y="84"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="36"
          letterSpacing="1px"
          fill={textColor}
        >
          PAINTING
        </text>
      </svg>
    );
  }

  // Horizontal variant
  const dimensions = {
    sm: { w: 160, h: 26 },
    md: { w: 220, h: 36 },
    lg: { w: 280, h: 46 },
    xl: { w: 340, h: 56 },
  }[size] || { w: 220, h: 36 };

  return (
    <svg
      viewBox="0 0 420 64"
      width={dimensions.w}
      height={dimensions.h}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(5, 48)">
        {/* C */}
        <text
          x="0"
          y="0"
          fontFamily="system-ui, -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="44"
          letterSpacing="-0.5px"
          fill={textColor}
        >
          C
        </text>
        {/* Blue Triangle for A */}
        <polygon
          points="40,0 56.5,-37 73,0"
          fill={accentColor}
        />
        {/* PSTONE */}
        <text
          x="78"
          y="0"
          fontFamily="system-ui, -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="44"
          letterSpacing="-0.5px"
          fill={textColor}
        >
          PSTONE
        </text>
        {/* PAINTING */}
        <text
          x="250"
          y="0"
          fontFamily="system-ui, -apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontWeight="900"
          fontSize="44"
          letterSpacing="-0.5px"
          fill={textColor}
        >
          PAINTING
        </text>
      </g>
    </svg>
  );
};
