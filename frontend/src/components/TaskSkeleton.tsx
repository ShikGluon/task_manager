/** Animated placeholder card shown while the task list is loading. */
export function TaskSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-4 h-4 rounded bg-gray-700 shrink-0" />
          <div className="h-4 bg-gray-700 rounded w-2/3" />
        </div>
        <div className="w-16 h-5 bg-gray-700 rounded-full" />
      </div>
      <div className="mt-3 h-3 bg-gray-800 rounded w-full" />
      <div className="mt-2 h-3 bg-gray-800 rounded w-4/5" />
      <div className="mt-4 flex gap-2">
        <div className="h-4 w-14 bg-gray-800 rounded-full" />
        <div className="h-4 w-20 bg-gray-800 rounded-full" />
      </div>
    </div>
  )
}
