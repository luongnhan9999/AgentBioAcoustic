/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canopy: {
          950: '#030806', // Obsidian floor
          900: '#050D0A', // Deep canopy backdrop
          850: '#0D1C16', // Elevated dark moss card surface
          800: '#142B22', // Secondary moss widget
          750: '#1C3B2F', // Active hover surface
          700: '#264E3E', // Border lines
          600: '#346954',
          500: '#488F73',
        },
        bio: {
          thriving: '#10B981', // Biodiversity Thriving Emerald
          thrivingGlow: 'rgba(16, 185, 129, 0.25)',
          lime: '#84CC16',     // Bioluminescent Lime
          limeGlow: 'rgba(132, 204, 22, 0.25)',
          cyan: '#06B6D4',     // Bioacoustic Array Cyan
          cyanGlow: 'rgba(6, 182, 212, 0.25)',
          amber: '#F59E0B',    // Chainsaw Disturbance Warning Amber
          amberGlow: 'rgba(245, 158, 11, 0.25)',
          crisis: '#EF4444',   // Poaching Gunshot Alert Crimson
          crisisGlow: 'rgba(239, 68, 68, 0.30)',
          muted: '#8AA69B',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'bio-glow': '0 0 25px -5px rgba(16, 185, 129, 0.35)',
        'sonar-glow': '0 0 30px -5px rgba(6, 182, 212, 0.40)',
        'warning-glow': '0 0 25px -5px rgba(245, 158, 11, 0.35)',
        'crisis-glow': '0 0 35px -5px rgba(239, 68, 68, 0.45)',
        'hud': 'inset 0 0 20px rgba(16, 185, 129, 0.05), 0 0 20px rgba(0, 0, 0, 0.85)',
      },
      animation: {
        'soundwave': 'soundwave 2s ease-in-out infinite',
        'sonar-ping': 'sonarPing 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-alert': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scanLine 6s linear infinite',
      },
      keyframes: {
        soundwave: {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1.0)' },
        },
        sonarPing: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
      },
    },
  },
  plugins: [],
};
