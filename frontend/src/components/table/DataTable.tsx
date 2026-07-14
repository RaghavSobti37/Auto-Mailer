'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { nextSortDirection, sortRows, type SortState } from '@/lib/columnSort';
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from './TablePagination';

export type DataTableColumn<T> = {
  key?: string;
  header: ReactNode;
  sortKey?: string;
  sortable?: boolean;
  sortFn?: (row: T) => unknown;
  align?: 'left' | 'right' | 'center';
  headerClassName?: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data?: T[];
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  defaultPageSize?: number;
  paginated?: boolean;
  serverSide?: boolean;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortState?: SortState;
  onSortChange?: (state: SortState) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
};

function SortIndicator({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
  if (!active) return <span className="opacity-40 ml-0.5" aria-hidden>↕</span>;
  return <span className="text-postmark ml-0.5" aria-hidden>{direction === 'asc' ? '^' : 'v'}</span>;
}

export function DataTable<T extends object>({
  columns,
  data = [],
  getRowId,
  onRowClick,
  className = '',
  defaultPageSize = DEFAULT_TABLE_PAGE_SIZE,
  paginated = true,
  serverSide = false,
  totalItems: customTotalItems,
  totalPages: customTotalPages,
  currentPage: customCurrentPage,
  pageSize: customPageSize,
  onPageChange,
  onPageSizeChange,
  sortState: controlledSortState,
  onSortChange,
  emptyTitle = 'No results',
  emptyDescription = 'Nothing matches your filters yet.',
  isLoading = false,
}: DataTableProps<T>) {
  const [localSortState, setLocalSortState] = useState<SortState>(null);
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(defaultPageSize);
  const sortState = controlledSortState !== undefined ? controlledSortState : localSortState;
  const setSortState = onSortChange || setLocalSortState;

  const sortedData = useMemo(() => {
    if (serverSide || !sortState?.key || !sortState.direction) return data;
    const col = columns.find((c) => (c.sortKey || c.key) === sortState.key);
    return sortRows(data, sortState, (row, key) => {
      if (col?.sortFn) return col.sortFn(row);
      if (col?.key) return row[col.key as keyof T];
      return row[key as keyof T];
    });
  }, [data, sortState, serverSide, columns]);

  const handleSortClick = useCallback(
    (col: DataTableColumn<T>) => {
      const key = col.sortKey || col.key;
      if (!key || col.sortable === false) return;
      const nextDir = nextSortDirection(sortState, key);
      setSortState(nextDir ? { key, direction: nextDir } : null);
      if (!serverSide) setLocalCurrentPage(1);
    },
    [sortState, setSortState, serverSide, setLocalCurrentPage],
  );

  const requestedCurrentPage = serverSide ? (customCurrentPage || 1) : localCurrentPage;
  const pageSize = serverSide ? (customPageSize || defaultPageSize) : localPageSize;

  const tableData = sortedData;
  const totalItems = serverSide ? (customTotalItems || 0) : tableData.length;
  const totalPages = Math.max(
    1,
    serverSide ? (customTotalPages || 1) : (Math.ceil(totalItems / pageSize) || 1),
  );
  const currentPage = Math.min(Math.max(requestedCurrentPage, 1), totalPages);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      const clamped = Math.min(Math.max(nextPage, 1), totalPages);
      if (serverSide) onPageChange?.(clamped);
      else setLocalCurrentPage(clamped);
    },
    [serverSide, onPageChange, totalPages, setLocalCurrentPage],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      if (serverSide) onPageSizeChange?.(size);
      else {
        setLocalPageSize(size);
        setLocalCurrentPage(1);
      }
    },
    [serverSide, onPageSizeChange, setLocalCurrentPage, setLocalPageSize],
  );

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = paginated && !serverSide
    ? tableData.slice(startIndex, startIndex + pageSize)
    : tableData;
  const showEmpty = !isLoading && paginatedData.length === 0;

  return (
    <div className={`ledger-shell overflow-hidden flex flex-col ${className}`}>
      <div className="overflow-x-auto">
        <table className="ledger-table w-full">
          <thead>
            <tr>
              {columns.map((col, i) => {
                const sortKey = col.sortKey || col.key;
                const sortable = Boolean(sortKey && col.sortable !== false);
                const active = Boolean(sortState?.key && sortKey && sortState.key === sortKey && sortState.direction);
                const align = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '';
                return (
                  <th
                    key={i}
                    className={`${align} ${col.headerClassName || ''} ${sortable ? 'cursor-pointer select-none hover:text-postmark' : ''}`}
                    onClick={sortable ? () => handleSortClick(col) : undefined}
                    aria-sort={active ? (sortState!.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.header}
                      {sortable && <SortIndicator active={active} direction={sortState?.direction} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-muted-ledger">
                  Loading…
                </td>
              </tr>
            ) : showEmpty ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <p className="font-semibold">{emptyTitle}</p>
                  {emptyDescription && <p className="mt-1 text-xs text-muted-ledger">{emptyDescription}</p>}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowId = getRowId?.(row);
                return (
                  <tr
                    key={rowId ?? rowIndex}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {columns.map((col, colIndex) => {
                      const align = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '';
                      return (
                        <td key={colIndex} className={`${align} ${col.className || ''}`}>
                          {col.render
                            ? col.render(row)
                            : col.key
                              ? String(row[col.key as keyof T] ?? '-')
                              : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {paginated && totalItems > 0 && (
        <TablePagination
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          rowCount={paginatedData.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  );
}
