/**
 * Tokens de design para documentos e relatórios PDF gerados com @react-pdf/renderer.
 * Alinhados à identidade visual institucional do Siplan HUB.
 */

export const pdfTokens = {
  colors: {
    // Cores Principais (Bordô Siplan)
    primary: '#881337',
    primaryDark: '#4c0519',
    primaryLight: '#9f1239',
    primaryBg: '#fff1f2',
    primaryBorder: '#fecdd3',

    // Neutros e Superfícies (Slate)
    navy: '#0f172a',
    navyLight: '#1e293b',
    text: '#0f172a',
    textMuted: '#64748b',
    textLight: '#94a3b8',
    surface: '#ffffff',
    background: '#f8fafc',
    surfaceSubtle: '#f1f5f9',
    border: '#e2e8f0',
    borderDark: '#cbd5e1',

    // Estados e Semântica
    success: '#16a34a',
    successBg: '#f0fdf4',
    successBorder: '#bbf7d0',
    successText: '#15803d',

    warning: '#d97706',
    warningBg: '#fffbeb',
    warningBorder: '#fde68a',
    warningText: '#b45309',

    danger: '#dc2626',
    dangerBg: '#fef2f2',
    dangerBorder: '#fecaca',
    dangerText: '#b91c1c',

    info: '#0284c7',
    infoBg: '#f0f9ff',
    infoBorder: '#bae6fd',
    infoText: '#0369a1',
  },

  fonts: {
    // Usamos Helvetica por padrão no react-pdf para portabilidade total sem dependência externa
    family: 'Helvetica',
    familyBold: 'Helvetica-Bold',
    familyOblique: 'Helvetica-Oblique',
  },

  fontSizes: {
    xxs: 7,
    xs: 8,
    sm: 9,
    base: 10,
    md: 11,
    lg: 13,
    xl: 16,
    xxl: 20,
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
  },

  radii: {
    sm: 4,
    md: 6,
    lg: 8,
    full: 999,
  },

  page: {
    margin: 24, // ~8.5mm
    footerHeight: 28,
  },
} as const;

export type PdfTokens = typeof pdfTokens;
