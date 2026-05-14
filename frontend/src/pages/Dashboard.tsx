import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useTasks } from '../hooks/useTasks'
import { TaskCard } from '../components/TaskCard'
import { TaskSkeleton } from '../components/TaskSkeleton'

const STATUS_FILTERS = ['All', 'Pending', 'Completed']
const PRIORITIES = ['Low', 'Medium', 'High']

export function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('All')
  const [sort, setSort] = useState('')
  const { tasks, loading, createTask, toggleTask, deleteTask } = useTasks(statusFilter, sort)

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await createTask({ title, description, priority, dueDate: dueDate || undefined })
      setTitle('')
      setDescription('')
      setPriority('Medium')
      setDueDate('')
      setShowForm(false)
      toast.success('Task created')
    } catch {
      toast.error('Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (task: Parameters<typeof toggleTask>[0]) => {
    try {
      await toggleTask(task)
    } catch {
      toast.error('Failed to update task')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id)
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete task')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-100">My Tasks</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Filter buttons */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === f
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort toggle */}
            <button
              onClick={() => setSort((s) => (s === 'dueDate' ? '' : 'dueDate'))}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                sort === 'dueDate'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-gray-700 text-gray-500 hover:text-gray-300'
              }`}
            >
              Sort by due date
            </button>

            {/* Add task */}
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
            >
              {showForm ? 'Cancel' : '+ New task'}
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3"
          >
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title *"
              maxLength={200}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-3">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                autoComplete="off"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating…' : 'Create task'}
            </button>
          </form>
        )}

        {/* Task list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <TaskSkeleton key={i} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-4xl mb-3">✓</p>
            <p className="text-sm">No tasks here. Add one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
