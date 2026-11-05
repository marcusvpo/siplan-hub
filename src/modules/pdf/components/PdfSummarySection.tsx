import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';
import { PdfStatusVariant } from './PdfStatusBadge';

export interface PdfSummaryItem {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: PdfStatusVariant;
}

export interface PdfSummarySectionProps {
  title?: string;
  items: PdfSummaryItem[];
}

const styles = StyleSheet.create({
  container: {
    marginBottom: pdfTokens.spacing.md,
  },
  sectionTitle: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.sm,
    color: pdfTokens.colors.navy,
    marginBottom: pdfTokens.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: pdfTokens.spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: 100,
    backgroundColor: pdfTokens.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: pdfTokens.colors.border,
    borderRadius: pdfTokens.radii.sm,
    padding: pdfTokens.spacing.sm,
  },
  cardBorderSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.colors.success,
  },
  cardBorderWarning: {
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.colors.warning,
  },
  cardBorderDanger: {
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.colors.danger,
  },
  cardBorderInfo: {
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.colors.info,
  },
  cardBorderDefault: {
    borderLeftWidth: 3,
    borderLeftColor: pdfTokens.colors.primary,
  },
  label: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.md,
    color: pdfTokens.colors.navy,
  },
  subtext: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textLight,
    marginTop: 2,
  },
});

export const PdfSummarySection: React.FC<PdfSummarySectionProps> = ({
  title,
  items,
}) => {
  return (
    <View style={styles.container}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.grid}>
        {items.map((item, index) => {
          const borderStyle = item.variant
            ? styles[`cardBorder${item.variant.charAt(0).toUpperCase() + item.variant.slice(1)}` as keyof typeof styles]
            : styles.cardBorderDefault;

          return (
            <View key={index} style={[styles.card, borderStyle]}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
              {item.subtext && <Text style={styles.subtext}>{item.subtext}</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
};
