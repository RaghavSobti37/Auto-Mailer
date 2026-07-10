'use client';

export function QueryErrorDisplay({ error, retry }: { error: Error | null; retry?: () => void }) {
  if (!error) return null;
  
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
      <span className="text-red-500 mt-0.5">⚠</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Failed to load data</p>
        <p className="text-xs text-red-600 mt-0.5">{error.message}</p>
      </div>
      {retry && (
        <button onClick={retry} className="px-3 py-1.5 text-xs font-medium bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}
