export const uid = (prefix = ''): string =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const now = (): string => new Date().toISOString();

export const today = (): string => new Date().toISOString().slice(0, 10);

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatNum = (n: number, dp = 0): string => {
  if (n === null || n === undefined || isNaN(n)) return '0';
  return n.toLocaleString('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: dp });
};

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

export const sumSizeQty = (sizes: { qty: number }[]): number => sum(sizes.map((s) => s.qty));

export const clone = <T,>(obj: T): T => JSON.parse(JSON.stringify(obj));

export const safe = <T,>(v: T | undefined | null, fallback: T): T => v ?? fallback;
