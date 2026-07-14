'use client';

export const DEFAULT_TABLE_PAGE_SIZE = 25;

type TablePaginationProps = {
  pageSize?: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  rowCount?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function TablePagination({
  pageSize = DEFAULT_TABLE_PAGE_SIZE,
  currentPage,
  totalPages,
  totalItems,
  rowCount = 0,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + (rowCount || pageSize), totalItems);

  return (
    <div
      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t px-3 py-3 text-xs font-semibold text-muted-ledger"
      style={{ borderColor: 'var(--line)', background: 'var(--surface, #fff)' }}
    >
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
        <span>Show</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="input px-2 py-1 text-[11px] font-bold w-auto min-w-0"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>entries</span>
        <span className="text-[10px] font-bold opacity-60 sm:ml-2">
          (Showing {totalItems === 0 ? 0 : startIndex + 1}-{endIndex} of {totalItems.toLocaleString()})
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="btn-secondary px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-40"
        >
          First
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="btn-secondary px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-3 text-xs">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="btn-secondary px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-40"
        >
          Next
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="btn-secondary px-2 py-1 text-[10px] uppercase tracking-wider disabled:opacity-40"
        >
          Last
        </button>
      </div>
    </div>
  );
}
