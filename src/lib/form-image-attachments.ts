export interface TitledImageAttachment {
  title: string;
  url: string;
}

const readString = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const normalizeTitledImageAttachments = (
  value: unknown,
): TitledImageAttachment[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [{ title: "", url: item }];
    }

    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    return [
      {
        title: readString(record.title || record.titulo),
        url: readString(record.url),
      },
    ];
  });
};

export const getCompletedTitledImageAttachments = (
  value: unknown,
): TitledImageAttachment[] =>
  normalizeTitledImageAttachments(value).filter((attachment) => attachment.url.trim());

export const countIncompleteTitledImageAttachments = (value: unknown): number => {
  if (!value || typeof value !== "object") return 0;

  if (Array.isArray(value)) {
    return value.reduce(
      (total, item) => total + countIncompleteTitledImageAttachments(item),
      0,
    );
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (total, [key, nestedValue]) => {
      if (key === "imagens") {
        return (
          total +
          normalizeTitledImageAttachments(nestedValue).filter((attachment) => {
            const hasTitle = Boolean(attachment.title.trim());
            const hasUrl = Boolean(attachment.url.trim());
            return (hasTitle || hasUrl) && !(hasTitle && hasUrl);
          }).length
        );
      }

      return total + countIncompleteTitledImageAttachments(nestedValue);
    },
    0,
  );
};
