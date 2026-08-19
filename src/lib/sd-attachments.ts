export const SD_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const SD_ATTACHMENT_MAX_COUNT = 10;

const BLOCKED_EXTENSIONS = new Set([
  "bat",
  "cmd",
  "com",
  "exe",
  "hta",
  "msi",
  "msix",
  "ps1",
  "scr",
  "vbe",
  "vbs",
  "wsf",
  "wsh",
]);

export function formatSdAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateSdAttachment(file: File): string | null {
  if (file.size <= 0) return `O arquivo “${file.name}” está vazio.`;
  if (file.size > SD_ATTACHMENT_MAX_BYTES) {
    return `O arquivo “${file.name}” excede o limite de 20 MB.`;
  }

  const extension = file.name.split(".").pop()?.toLocaleLowerCase("pt-BR") || "";
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return `O formato .${extension} não é permitido por segurança.`;
  }

  return null;
}
