import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Core text & backgrounds
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    background: '#F8FAFC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1F5F9',
    card: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',

    // Brand / Primary
    primary: '#4F46E5',
    primaryHover: '#4338CA',
    primaryMuted: '#EEF2FF',
    primaryText: '#FFFFFF',

    // Semantic status
    success: '#059669',
    successBg: '#ECFDF5',
    successBorder: '#A7F3D0',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    danger: '#DC2626',
    dangerBg: '#FEF2F2',
    dangerBorder: '#FECACA',
    neutral: '#64748B',
    neutralBg: '#F8FAFC',
    neutralBorder: '#E2E8F0',
  },
  dark: {
    // Core text & backgrounds
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    background: '#090D1A',
    backgroundElement: '#12182B',
    backgroundSelected: '#1C2541',
    card: '#12182B',
    border: '#1F293D',
    borderStrong: '#334155',

    // Brand / Primary
    primary: '#6366F1',
    primaryHover: '#818CF8',
    primaryMuted: '#1E1B4B',
    primaryText: '#FFFFFF',

    // Semantic status
    success: '#10B981',
    successBg: '#064E3B40',
    successBorder: '#065F46',
    warning: '#F59E0B',
    warningBg: '#78350F40',
    warningBorder: '#92400E',
    danger: '#EF4444',
    dangerBg: '#7F1D1D40',
    dangerBorder: '#991B1B',
    neutral: '#94A3B8',
    neutralBg: '#1E293B50',
    neutralBorder: '#334155',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display, system-ui, sans-serif)',
    serif: 'var(--font-serif, Georgia, serif)',
    rounded: 'var(--font-rounded, sans-serif)',
    mono: 'var(--font-mono, monospace)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
