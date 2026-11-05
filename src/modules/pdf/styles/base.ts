import { StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from './tokens';

/**
 * Estilos base reutilizáveis para documentos gerados pelo @react-pdf/renderer.
 */
export const basePdfStyles = StyleSheet.create({
  page: {
    fontFamily: pdfTokens.fonts.family,
    fontSize: pdfTokens.fontSizes.base,
    color: pdfTokens.colors.text,
    backgroundColor: pdfTokens.colors.surface,
    paddingTop: pdfTokens.page.margin,
    paddingBottom: pdfTokens.page.margin + pdfTokens.page.footerHeight,
    paddingHorizontal: pdfTokens.page.margin,
    lineHeight: 1.4,
  },

  pageLandscape: {
    fontFamily: pdfTokens.fonts.family,
    fontSize: pdfTokens.fontSizes.base,
    color: pdfTokens.colors.text,
    backgroundColor: pdfTokens.colors.surface,
    paddingTop: pdfTokens.page.margin,
    paddingBottom: pdfTokens.page.margin + pdfTokens.page.footerHeight,
    paddingHorizontal: pdfTokens.page.margin,
    lineHeight: 1.35,
  },

  // Containers
  container: {
    width: '100%',
  },

  section: {
    marginBottom: pdfTokens.spacing.md,
  },

  card: {
    backgroundColor: pdfTokens.colors.surface,
    borderWidth: 1,
    borderColor: pdfTokens.colors.border,
    borderRadius: pdfTokens.radii.md,
    padding: pdfTokens.spacing.md,
    marginBottom: pdfTokens.spacing.md,
  },

  cardSubtle: {
    backgroundColor: pdfTokens.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: pdfTokens.colors.border,
    borderRadius: pdfTokens.radii.md,
    padding: pdfTokens.spacing.md,
    marginBottom: pdfTokens.spacing.md,
  },

  // Tipografia
  title: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xl,
    color: pdfTokens.colors.navy,
    marginBottom: pdfTokens.spacing.xs,
  },

  subtitle: {
    fontSize: pdfTokens.fontSizes.sm,
    color: pdfTokens.colors.textMuted,
    marginBottom: pdfTokens.spacing.sm,
  },

  sectionTitle: {
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.md,
    color: pdfTokens.colors.navy,
    borderBottomWidth: 1.5,
    borderBottomColor: pdfTokens.colors.primary,
    paddingBottom: pdfTokens.spacing.xs,
    marginBottom: pdfTokens.spacing.sm,
  },

  text: {
    fontSize: pdfTokens.fontSizes.base,
    color: pdfTokens.colors.text,
  },

  textMuted: {
    fontSize: pdfTokens.fontSizes.sm,
    color: pdfTokens.colors.textMuted,
  },

  textBold: {
    fontFamily: pdfTokens.fonts.familyBold,
  },

  // Divisores
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: pdfTokens.colors.border,
    marginVertical: pdfTokens.spacing.md,
  },

  // Layout Helpers
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  grid2: {
    flexDirection: 'row',
    gap: pdfTokens.spacing.md,
  },

  grid3: {
    flexDirection: 'row',
    gap: pdfTokens.spacing.sm,
  },

  col: {
    flex: 1,
  },
});
