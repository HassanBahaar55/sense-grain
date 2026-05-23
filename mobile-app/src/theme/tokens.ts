export const colors = {
  primary: '#1f5135',
  primaryLight: '#2f7d4f',
  primaryDark: '#163a25',

  background: '#f6f8f3',
  surface: '#ffffff',
  surfaceSecondary: '#f0f4ee',

  ink: '#172118',
  textPrimary: '#172118',
  textSecondary: '#5e6b5f',
  textMuted: '#8e9b8f',

  border: '#d8e0d2',
  borderLight: '#eaf0e6',

  gold: '#d5a12f',
  warning: '#b87918',
  warningBg: '#fef9ee',

  danger: '#b42318',
  dangerBg: '#fef2f2',

  sky: '#2f80ed',
  infoBg: '#eff6ff',

  success: '#1f5135',
  successBg: '#f0faf4',

  critical: '#b42318',
  high: '#d97706',
  medium: '#ca8a04',
  low: '#2f7d4f',

  white: '#ffffff',
  black: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
};

export const mobileTheme = {
  brandName: 'Sense Grain',
  colors,
  spacing,
};
