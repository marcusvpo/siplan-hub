import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';

export interface PdfHeaderProps {
  title: string;
  subtitle?: string;
  clientName?: string;
  projectName?: string;
  moduleName?: string;
  generatedAt?: string;
  badge?: string;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: pdfTokens.colors.navy,
    borderRadius: pdfTokens.radii.md,
    padding: pdfTokens.spacing.md,
    marginBottom: pdfTokens.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: pdfTokens.colors.primary,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pdfTokens.spacing.xs,
  },
  brandName: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.sm,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: pdfTokens.colors.primary,
    borderRadius: pdfTokens.radii.full,
    paddingHorizontal: pdfTokens.spacing.sm,
    paddingVertical: pdfTokens.spacing.xxs,
  },
  badgeText: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.lg,
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.textLight,
    marginBottom: pdfTokens.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#334155',
    paddingTop: pdfTokens.spacing.xs,
    marginTop: pdfTokens.spacing.xs,
  },
  metaText: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textLight,
  },
  metaHighlight: {
    fontFamily: pdfTokens.fonts.familyBold,
    color: '#ffffff',
  },
});

export const PdfHeader: React.FC<PdfHeaderProps> = ({
  title,
  subtitle,
  clientName,
  projectName,
  moduleName = 'Siplan HUB',
  generatedAt,
  badge,
}) => {
  const dateStr = generatedAt || new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.brandName}>{moduleName}</Text>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {clientName && (
            <>
              Cartório / Cliente: <Text style={styles.metaHighlight}>{clientName}</Text>
              {projectName && ' • '}
            </>
          )}
          {projectName && (
            <>
              Projeto: <Text style={styles.metaHighlight}>{projectName}</Text>
            </>
          )}
        </Text>
        <Text style={styles.metaText}>Gerado em: {dateStr}</Text>
      </View>
    </View>
  );
};
