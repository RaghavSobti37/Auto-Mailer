export type SortDirection = 'asc' | 'desc';

export type SortState = {
  key: string;
  direction: SortDirection;
} | null;

/** Cycle: null (default) → asc → desc → null */
export function nextSortDirection(
  current: SortState,
  columnKey: string,
): SortDirection | null {
  if (current?.key !== columnKey) return 'asc';
  if (current.direction === 'asc') return 'desc';
  if (current.direction === 'desc') return null;
  return 'asc';
}

export function compareSortValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return sa.localeCompare(sb, undefined, { numeric: true });
}

export function sortRows<T>(
  data: T[],
  sortState: SortState,
  getVal: (row: T, key: string) => unknown,
): T[] {
  if (!sortState?.key || !sortState.direction) return data;
  const dir = sortState.direction === 'asc' ? 1 : -1;
  return [...data].sort((ra, rb) => compareSortValues(getVal(ra, sortState.key), getVal(rb, sortState.key)) * dir);
}
