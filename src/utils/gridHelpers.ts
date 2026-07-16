export function padToColumns<T>(items: T[], columns: number): (T | null)[] {
  const remainder = items.length % columns;
  if (remainder === 0) return items;
  return [...items, ...Array(columns - remainder).fill(null)];
}
