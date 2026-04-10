import React from 'react';
import Image from 'next/image';
import { useBranding } from '@/hooks/useBranding';

interface FortunLogoProps {
  variant?: 'full' | 'mini' | 'login';
  className?: string;
}

export function FortunLogo({ variant = 'full', className = '' }: FortunLogoProps) {
  const { data: branding } = useBranding();
  
  const sizes = {
    full: { width: 180, height: 40 },
    mini: { width: 40, height: 40 },
    login: { width: 260, height: 56 },
  };

  const { width, height } = sizes[variant];

  // Check for custom logo URL based on variant
  const customUrl = variant === 'login' 
    ? branding?.login_logo_url 
    : variant === 'mini' 
      ? branding?.mini_logo_url 
      : branding?.main_logo_url;

  // If custom logo exists, render an image
  if (customUrl) {
    return (
      <Image
        src={customUrl}
        alt="Logo"
        width={width}
        height={height}
        className={className}
        style={{ objectFit: 'contain' }}
        unoptimized
      />
    );
  }

  // Default SVG logos with infinity symbol
  if (variant === 'mini') {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Fortun Wishnet logo"
      >
        <defs>
          <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(197, 78%, 59%)" />
            <stop offset="100%" stopColor="hsl(197, 100%, 66%)" />
          </linearGradient>
        </defs>
        {/* Rounded square background with gradient */}
        <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#miniGrad)" />
        {/* Infinity symbol - proper lemniscate */}
        <path
          d="M20 20 C15 13, 8 13, 8 20 C8 27, 15 27, 20 20 C25 13, 32 13, 32 20 C32 27, 25 27, 20 20"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={variant === 'login' ? '0 0 260 56' : '0 0 180 40'}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Fortun Wishnet logo"
    >
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(197, 78%, 59%)" />
          <stop offset="100%" stopColor="hsl(197, 100%, 66%)" />
        </linearGradient>
      </defs>
      {/* Icon background */}
      <rect 
        x="0" 
        y={variant === 'login' ? '8' : '4'} 
        width={variant === 'login' ? '40' : '32'} 
        height={variant === 'login' ? '40' : '32'} 
        rx="8" 
        fill="url(#logoGrad)" 
      />
      {/* Infinity symbol - proper lemniscate */}
      {variant === 'login' ? (
        <path
          d="M20 28 C15 21, 8 21, 8 28 C8 35, 15 35, 20 28 C25 21, 32 21, 32 28 C32 35, 25 35, 20 28"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M16 20 C12 14, 6 14, 6 20 C6 26, 12 26, 16 20 C20 14, 26 14, 26 20 C26 26, 20 26, 16 20"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* Text */}
      <text
        x={variant === 'login' ? '52' : '40'}
        y={variant === 'login' ? '38' : '26'}
        fontFamily="'Poppins', system-ui, sans-serif"
        fontSize={variant === 'login' ? '26' : '18'}
        fontWeight="700"
        fill="hsl(197, 78%, 59%)"
      >
        Fortun Wishnet
      </text>
    </svg>
  );
}
