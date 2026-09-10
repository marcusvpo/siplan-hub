export const getPrintEvidenceGridClass = (imageCount: number) => {
  if (imageCount <= 1) {
    return "grid-cols-1 max-w-md print:max-w-[85mm]";
  }
  if (imageCount === 2) {
    return "grid-cols-2";
  }
  if (imageCount === 3) {
    return "grid-cols-1 min-[420px]:grid-cols-3 print:grid-cols-3";
  }
  if (imageCount === 4) {
    return "grid-cols-2 min-[640px]:grid-cols-4 print:grid-cols-4";
  }
  return "grid-cols-2 min-[640px]:grid-cols-3 print:grid-cols-3";
};
