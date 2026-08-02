export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 overflow-hidden">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl shimmer" />
        <div className="h-4 rounded w-1/2 shimmer" />
      </div>
      <div className="h-8 rounded w-3/4 mb-2 shimmer" />
      <div className="h-3 rounded w-1/2 shimmer" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 py-3 border-b border-gray-100 dark:border-slate-700">
      <div className="h-4 rounded w-1/4 shimmer" />
      <div className="h-4 rounded w-1/3 shimmer" />
      <div className="h-4 rounded w-1/4 shimmer" />
      <div className="h-4 rounded w-1/6 shimmer" />
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 overflow-hidden">
        <div className="h-6 rounded w-1/3 mb-4 shimmer" />
        <SkeletonTable rows={3} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-xl flex-shrink-0 shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-4 rounded w-1/2 shimmer" />
            <div className="h-3 rounded w-1/3 shimmer" />
          </div>
          <div className="w-16 h-8 rounded-lg shimmer" />
        </div>
      ))}
    </div>
  );
}
