import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';

export interface PdfFooterProps {
  confidentialityNotice?: string;
  systemTag?: string;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: pdfTokens.page.margin / 2,
    left: pdfTokens.page.margin,
    right: pdfTokens.page.margin,
    borderTopWidth: 0.5,
    borderTopColor: pdfTokens.colors.border,
    paddingTop: pdfTokens.spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pdfTokens.spacing.xs,
  },
  systemTag: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.primary,
  },
  notice: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
  },
  pageNumber: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
  },
});

export const PdfFooter: React.FC<PdfFooterProps> = ({
  confidentialityNotice = 'Documento Interno e Confidencial',
  systemTag = 'Siplan HUB',
}) => {
  return (
    <View style={styles.container} fixed>
      <View style={styles.leftCol}>
        <Text style={styles.systemTag}>{systemTag}</Text>
        <Text style={styles.notice}>• {confidentialityNotice}</Text>
      </View>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
};
