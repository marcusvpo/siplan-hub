import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { pdfTokens } from '../styles/tokens';

export interface PdfTableColumn<T = any> {
  id: string;
  header: string;
  width?: string; // ex: '30%', '150px' ou peso flex
  align?: 'left' | 'center' | 'right';
  renderCell?: (row: T, index: number) => React.ReactNode;
}

export interface PdfTableProps<T = any> {
  columns: PdfTableColumn<T>[];
  data: T[];
  striped?: boolean;
  emptyMessage?: string;
}

const styles = StyleSheet.create({
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: pdfTokens.colors.border,
    borderRadius: pdfTokens.radii.sm,
    marginBottom: pdfTokens.spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: pdfTokens.colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: pdfTokens.colors.primary,
  },
  headerCell: {
    paddingVertical: pdfTokens.spacing.xs,
    paddingHorizontal: pdfTokens.spacing.sm,
    fontFamily: pdfTokens.fonts.familyBold,
    fontSize: pdfTokens.fontSizes.xxs,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: pdfTokens.colors.border,
    minHeight: 22,
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: pdfTokens.colors.surface,
  },
  rowOdd: {
    backgroundColor: pdfTokens.colors.surfaceSubtle,
  },
  cell: {
    paddingVertical: 5,
    paddingHorizontal: pdfTokens.spacing.sm,
    fontSize: pdfTokens.fontSizes.xs,
    color: pdfTokens.colors.text,
  },
  emptyRow: {
    padding: pdfTokens.spacing.md,
    textAlign: 'center',
    color: pdfTokens.colors.textMuted,
    fontSize: pdfTokens.fontSizes.xs,
  },
});

export function PdfTable<T = any>({
  columns,
  data,
  striped = true,
  emptyMessage = 'Nenhum registro encontrado.',
}: PdfTableProps<T>) {
  return (
    <View style={styles.table}>
      {/* Cabeçalho */}
      <View style={styles.headerRow}>
        {columns.map((col) => {
          const colWidth = col.width ? { width: col.width } : { flex: 1 };
          const alignStyle = col.align ? { textAlign: col.align } : { textAlign: 'left' as const };

          return (
            <View key={col.id} style={colWidth}>
              <Text style={[styles.headerCell, alignStyle]}>{col.header}</Text>
            </View>
          );
        })}
      </View>

      {/* Linhas de Dados */}
      {data.length === 0 ? (
        <Text style={styles.emptyRow}>{emptyMessage}</Text>
      ) : (
        data.map((row, rowIndex) => {
          const rowStyle = [
            styles.row,
            striped && rowIndex % 2 === 1 ? styles.rowOdd : styles.rowEven,
          ];

          return (
            <View key={rowIndex} style={rowStyle}>
              {columns.map((col) => {
                const colWidth = col.width ? { width: col.width } : { flex: 1 };
                const alignStyle = col.align ? { textAlign: col.align } : { textAlign: 'left' as const };

                if (col.renderCell) {
                  return (
                    <View key={col.id} style={[colWidth, { paddingHorizontal: pdfTokens.spacing.sm }]}>
                      {col.renderCell(row, rowIndex)}
                    </View>
                  );
                }

                const rawVal = row[col.id];
                const displayVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '—';

                return (
                  <View key={col.id} style={colWidth}>
                    <Text style={[styles.cell, alignStyle]}>{displayVal}</Text>
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </View>
  );
}
