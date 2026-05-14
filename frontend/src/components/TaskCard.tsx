import type { Task } from '../hooks/useTasks'

const priorityStyles: Record<string, string> = {
  Low: 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
  High: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
}

interface Props {
  task: Task
  onToggle: (task: Task) => void
  onDelete: (id: string) => void
}

export function TaskCard({ task, onToggle, onDelete }: Props) {
  const isCompleted = task.status === 'Completed'
  const isOverdue = task.dueDate && !isCompleted && new Date(task.dueDate) < new Date()

  return (
    <div
      className={`bg-gray-900 rounded-xl border p-5 transition-opacity ${
        isCompleted ? 'opacity-50' : 'opacity-100'
      } ${isOverdue ? 'border-red-500/40' : 'border-gray-800'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={() => onToggle(task)}
            className="w-4 h-4 rounded border-gray-600 accent-indigo-500 cursor-pointer shrink-0"
          />
          <span
            className={`font-medium truncate ${
              isCompleted ? 'line-through text-gray-600' : 'text-gray-100'
            }`}
          >
            {task.title}
          </span>
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
            priorityStyles[task.priority] ?? 'bg-gray-700 text-gray-400'
          }`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{task.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-3 text-xs text-gray-600">
          {task.dueDate && (
            <span className={isOverdue ? 'text-red-400 font-medium' : 'text-gray-500'}>
              Due {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
        </div>

        <button
          onClick={() => onDelete(task.id)}
          className="text-gray-600 hover:text-red-400 transition-colors text-xs"
          aria-label="Delete task"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
