import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';

export type PdfStatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface PdfStatusBadgeProps {
  label: string;
  variant?: PdfStatusVariant;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: pdfTokens.radii.full,
    paddingHorizontal: pdfTokens.spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
  },
  text: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
  },

  // Variantes
  success: {
    backgroundColor: pdfTokens.colors.successBg,
    borderColor: pdfTokens.colors.successBorder,
  },
  successText: {
    color: pdfTokens.colors.successText,
  },

  warning: {
    backgroundColor: pdfTokens.colors.warningBg,
    borderColor: pdfTokens.colors.warningBorder,
  },
  warningText: {
    color: pdfTokens.colors.warningText,
  },

  danger: {
    backgroundColor: pdfTokens.colors.dangerBg,
    borderColor: pdfTokens.colors.dangerBorder,
  },
  dangerText: {
    color: pdfTokens.colors.dangerText,
  },

  info: {
    backgroundColor: pdfTokens.colors.infoBg,
    borderColor: pdfTokens.colors.infoBorder,
  },
  infoText: {
    color: pdfTokens.colors.infoText,
  },

  default: {
    backgroundColor: pdfTokens.colors.surfaceSubtle,
    borderColor: pdfTokens.colors.border,
  },
  defaultText: {
    color: pdfTokens.colors.textMuted,
  },
});

export const PdfStatusBadge: React.FC<PdfStatusBadgeProps> = ({
  label,
  variant = 'default',
}) => {
  const badgeStyle = [styles.badge, styles[variant]];
  const textStyle = [styles.text, styles[`${variant}Text` as keyof typeof styles]];

  return (
    <View style={badgeStyle}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
};
