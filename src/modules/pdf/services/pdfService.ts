import React from 'react';
import { pdf, renderToBuffer } from '@react-pdf/renderer';

/**
 * Camada de serviço unificada para renderização e exportação de PDFs via @react-pdf/renderer.
 * Projetada para operar tanto no navegador (download/preview) quanto programaticamente
 * em fluxos headless, agendamentos automáticos, Supabase Storage e workers Node.js.
 */

/**
 * Gera um Blob do documento React-PDF fornecido.
 */
export async function generatePdfBlob(doc: React.ReactElement): Promise<Blob> {
  const instance = pdf(doc);
  return await instance.toBlob();
}

/**
 * Converte um Blob para ArrayBuffer de forma compatível entre Browser e Node (vitest/jsdom).
 */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return await blob.arrayBuffer();
  }

  if (typeof Response !== 'undefined') {
    return await new Response(blob).arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Gera um Uint8Array do documento React-PDF.
 * Utiliza renderToBuffer no ambiente Node ou conversão universal de Blob no browser.
 * Ideal para automações, scheduled tasks, envio para o Supabase Storage ou rotinas headless.
 */
export async function generatePdfBuffer(doc: React.ReactElement): Promise<Uint8Array> {
  if (typeof renderToBuffer === 'function') {
    try {
      const buffer = await renderToBuffer(doc);
      return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } catch {
      // Fallback para toBlob se renderToBuffer não puder ser executado no ambiente atual
    }
  }

  const blob = await generatePdfBlob(doc);
  const arrayBuffer = await blobToArrayBuffer(blob);
  return new Uint8Array(arrayBuffer);
}

/**
 * Dispara o download imediato do arquivo PDF no navegador do usuário.
 */
export async function downloadPdfDocument(
  doc: React.ReactElement,
  fileName: string
): Promise<void> {
  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  const blob = await generatePdfBlob(doc);

  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = safeFileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Abre o PDF gerado em uma nova aba do navegador para visualização prévia ou impressão direta.
 */
export async function openPdfPreview(doc: React.ReactElement): Promise<void> {
  const blob = await generatePdfBlob(doc);

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Mantém a URL viva temporariamente para a nova aba carregar
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
