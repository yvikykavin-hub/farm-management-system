export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-3" />
      <div className="h-8 bg-gray-200 rounded-lg w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded-lg w-2/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 py-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded w-1/4" />
      <div className="h-4 bg-gray-200 rounded w-1/6" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
