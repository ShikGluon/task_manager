# Frontend — Architecture & Code Walkthrough

Built with React 19, TypeScript, and Vite. State management is done with React's built-in
`useReducer` and `useContext` — no third-party state library. Styling uses Tailwind CSS v4
with a CSS-first config (no `tailwind.config.js`).

---

## Directory structure

```
src/
├── api/
│   └── client.ts           # Axios instance — JWT interceptor + 401 auto-logout
├── context/
│   └── AuthContext.tsx      # Auth state, login/register/logout actions, token validation
├── hooks/
│   └── useTasks.ts          # useReducer state + optimistic CRUD mutations
├── components/
│   ├── TaskCard.tsx          # Single task row — checkbox, priority badge, delete button
│   └── TaskSkeleton.tsx      # Animated placeholder shown while tasks are loading
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── Dashboard.tsx        # Main authenticated view — filter, sort, create, list
├── App.tsx                  # Route definitions
└── main.tsx                 # React root mount + provider tree
```

---

## Entry point — `main.tsx` and `App.tsx`

`main.tsx` mounts the React app and wraps it in providers:

```
<BrowserRouter>
  <AuthProvider>      ← auth state available everywhere
    <Toaster />       ← toast notifications
    <App />
  </AuthProvider>
</BrowserRouter>
```

`App.tsx` defines three routes: `/login`, `/register`, and `/` (the dashboard). The dashboard
route uses a `<PrivateRoute>` guard that redirects unauthenticated users to `/login`.

---

## HTTP client — `api/client.ts`

All API calls go through a single Axios instance configured with `baseURL: '/api'`.
Vite proxies `/api` to `http://localhost:5208` in development; in Docker the Nginx reverse
proxy handles the same routing.

Two interceptors are attached at startup:

**Request interceptor** — reads the JWT from `localStorage` and attaches it as a
`Bearer` token on every request. If no token is stored (unauthenticated), the header is
simply omitted.

**Response interceptor** — when the API returns `401` *and* a token is already in
`localStorage`, it clears the stored credentials and redirects to `/login`. The "token
already present" check is intentional: it prevents a failed login attempt from triggering
a redirect loop instead of displaying an error toast.

---

## Auth state — `context/AuthContext.tsx`

`AuthProvider` is a React context provider that holds the current user object and exposes
four actions: `login`, `register`, `logout`, and the implicit token-validation on mount.

**Persistence** — on a successful login or register, the JWT and a `{ email }` user
object are written to `localStorage`. On page load, `useState` is initialised directly
from `localStorage`, so the user does not need to log in again after a refresh.

**Token validation on mount** — on first render, `AuthProvider` pings `GET /auth/me`.
If the stored token is expired or the database has been reset (the user row no longer
exists), the API returns `401`, and `AuthProvider` calls `logout()` to clear the stale
session silently.

---

## Task state — `hooks/useTasks.ts`

`useTasks` is a custom hook that owns all task data and exposes three mutations. It uses
`useReducer` internally so the state transitions are explicit and testable.

### The reducer

The reducer is exported separately from the hook so it can be unit-tested in isolation
without mounting a component. It handles six action types:

| Action | Effect |
|--------|--------|
| `LOADING` | Sets `loading: true`, clears error |
| `LOADED` | Replaces the task array, sets `loading: false` |
| `ERROR` | Sets the error message, sets `loading: false` |
| `ADD` | Prepends the new task (matches server sort: newest first) |
| `UPDATE` | Replaces the task with a matching `id` in place |
| `DELETE` | Removes the task with the matching `id` |

### Optimistic updates

Both `toggleTask` and `deleteTask` apply changes to local state *before* the API call
resolves:

- **`toggleTask`** — immediately dispatches `UPDATE` with the flipped status, then awaits
  the server response. If the request fails, it dispatches `UPDATE` again with the original
  task to roll back.
- **`deleteTask`** — immediately dispatches `DELETE`, then awaits the server response. If
  the request fails, it calls `fetch()` to re-load the authoritative list from the server.

### Filtering and sorting

`useTasks` accepts a `statusFilter` and a `sort` parameter. These are forwarded as query
string parameters to `GET /tasks`. The `useCallback` + `useEffect` pattern ensures the
task list is re-fetched whenever either parameter changes.

---

## Components

### `TaskCard`

Renders a single task. Two pieces of visual logic worth noting:

- **Overdue state** — `isOverdue` is `true` when a due date exists, the task is not
  completed, and the due date is in the past. An overdue card renders a red border and
  displays the due date in red text.
- **Completed state** — completed cards are faded to 50% opacity and the title gains a
  strikethrough.

### `TaskSkeleton`

A static placeholder that mimics the shape of a `TaskCard` using `animate-pulse` from
Tailwind. Three skeletons are rendered side-by-side while the initial task fetch is in
flight.

---

## Pages

### `Login` / `Register`

Stateless forms that call `login()` or `register()` from `useAuth`. On success, the
`AuthProvider` updates the user state and the `PrivateRoute` guard allows navigation to
`/`. On failure, the caught error's response message (from the API's RFC 7807 Problem
Details body) is displayed inline below the form.

### `Dashboard`

The main view. Composes `useAuth` and `useTasks` to build the full task management UI:

- **Toolbar** — status filter buttons (All / Pending / Completed) and a "sort by due date"
  toggle. Both drive the `useTasks` parameters, which triggers a re-fetch.
- **Create form** — toggled by the "+ New task" button. On submit, calls `createTask()`,
  which appends the new task to the top of the list via the `ADD` reducer action.
- **Task list** — maps over the `tasks` array and renders a `TaskCard` per item, wiring
  `onToggle` → `handleToggle` and `onDelete` → `handleDelete`.

---

## End-to-end example — toggling a task complete

```
1. User clicks the checkbox on a TaskCard
2. TaskCard calls onToggle(task)
3. Dashboard.handleToggle calls useTasks.toggleTask(task)
4. toggleTask dispatches UPDATE { ...task, status: 'Completed' }
     → reducer replaces the task in state immediately
     → React re-renders: checkbox checked, title struck through, card fades
5. client.put('/tasks/:id', { ...task, status: 'Completed' }) fires
6a. Success → server returns the updated task
     → dispatch UPDATE with server response (no visible change if status matches)
6b. Failure → dispatch UPDATE with the original task to roll back
     → React re-renders: checkbox unchecked, card returns to normal
     → toast.error('Failed to update task')
```
