import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';

export interface PdfSignatureParty {
  role: string;
  name: string;
  documentId?: string; // CPF ou OAB se aplicável
  date?: string;
}

export interface PdfSignatureBlockProps {
  title?: string;
  disclaimer?: string;
  parties: PdfSignatureParty[];
}

const styles = StyleSheet.create({
  container: {
    marginTop: pdfTokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: pdfTokens.colors.border,
    paddingTop: pdfTokens.spacing.md,
  },
  title: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.sm,
    color: pdfTokens.colors.navy,
    marginBottom: pdfTokens.spacing.xs,
    textTransform: 'uppercase',
  },
  disclaimer: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
    marginBottom: pdfTokens.spacing.lg,
    lineHeight: 1.3,
  },
  signaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: pdfTokens.spacing.lg,
    marginTop: pdfTokens.spacing.sm,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  line: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: pdfTokens.colors.navyLight,
    marginBottom: pdfTokens.spacing.xs,
  },
  name: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.navy,
    textAlign: 'center',
  },
  role: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
    textAlign: 'center',
  },
  docId: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textLight,
    textAlign: 'center',
  },
  date: {
    fontSize: pdfTokens.fontSizes.xxs,
    color: pdfTokens.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});

export const PdfSignatureBlock: React.FC<PdfSignatureBlockProps> = ({
  title = 'Termo de Validação e Encerramento',
  disclaimer = 'As partes abaixo declaram ter validado as informações e entregas descritas neste documento segundo os padrões acordados no projeto de implantação Siplan.',
  parties,
}) => {
  return (
    <View style={styles.container} wrap={false}>
      {title && <Text style={styles.title}>{title}</Text>}
      {disclaimer && <Text style={styles.disclaimer}>{disclaimer}</Text>}

      <View style={styles.signaturesRow}>
        {parties.map((party, index) => (
          <View key={index} style={styles.signatureCol}>
            <View style={styles.line} />
            <Text style={styles.name}>{party.name}</Text>
            <Text style={styles.role}>{party.role}</Text>
            {party.documentId && <Text style={styles.docId}>{party.documentId}</Text>}
            {party.date && <Text style={styles.date}>Data: {party.date}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
};
