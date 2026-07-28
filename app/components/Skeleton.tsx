export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-xl" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
      </div>
      <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 py-3 animate-pulse border-b border-gray-100 dark:border-slate-700">
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4" />
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/6" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Content */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
        <SkeletonTable rows={3} />
      </div>
    </div>
  );
}
