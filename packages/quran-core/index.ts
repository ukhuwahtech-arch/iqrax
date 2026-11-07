export const TOTAL_PAGES = 604 as const;

export function toArabicIndic(num: number): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
  return num
    .toString()
    .split('')
    .map((digit) => {
      const parsed = parseInt(digit, 10);
      return Number.isNaN(parsed) ? '' : arabicNumbers[parsed];
    })
    .join('');
}

export function getMushafPageUrl(page: number): string {
  return `/mushaf/${page}.webp`;
}